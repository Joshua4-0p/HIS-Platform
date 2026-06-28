import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDbPool } from '../shared/db-client';
import { extractClaims } from '../shared/jwt-claims';
import { requirePermission } from '../shared/permission-check';
import { writeAuditLog } from '../shared/audit-logger';
import { createLogger } from '../shared/structured-logger';
import {
  ok, created, badRequest, forbidden, notFound, conflict, serverError,
} from '../shared/response';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean { return UUID_RE.test(s); }

type JwtEventShape = Parameters<typeof extractClaims>[0];
function getClaims(event: APIGatewayProxyEventV2) {
  return extractClaims(event as unknown as JwtEventShape);
}

// DD/MM/YYYY from ISO date string
function fmtDob(isoDate: string): string {
  const d = new Date(isoDate);
  return [
    String(d.getUTCDate()).padStart(2, '0'),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    d.getUTCFullYear(),
  ].join('/');
}

// "Oct 12, 2023"
function fmtRegistered(ts: Date | string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

async function generatePatientNumber(pool: import('pg').Pool, hospitalId: string): Promise<string> {
  const res = await pool.query(
    'SELECT COUNT(*) + 1 AS next_num FROM patients WHERE hospital_id = $1',
    [hospitalId],
  );
  const seq = Number(res.rows[0].next_num);
  return `HIS-${String(seq).padStart(6, '0')}`;
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  const method   = event.requestContext.http.method;
  const rawPath  = event.rawPath;
  const requestId = event.requestContext.requestId;
  const ip       = event.requestContext.http.sourceIp ?? 'unknown';
  const logger   = createLogger({ functionName: 'his-patient-service', requestId });

  // Segment-based routing
  const segments = rawPath.split('/').filter(Boolean);
  // segments: ['patients'] | ['patients', id] | ['patients', id, 'consent']
  //         | ['patients', id, 'amend', recordType, recordId]

  if (segments[0] !== 'patients') return notFound();

  try {
    const pool   = await getDbPool();
    const body   = event.body ? JSON.parse(event.body) : {};
    const claims = getClaims(event);
    const { userId, hospitalId } = claims;

    // ── GET /patients ────────────────────────────────────────────────────────
    if (method === 'GET' && segments.length === 1) {
      await requirePermission(pool, userId, hospitalId, 'patient:read');

      const q = (event.queryStringParameters?.q ?? '').trim();

      let patients: Array<Record<string, unknown>> = [];

      if (q) {
        const res = await pool.query(
          `SELECT id, patient_number, full_name, date_of_birth, telephone,
                  region_district, created_at, consent_personal_data
           FROM patients
           WHERE hospital_id = $1
             AND (full_name % $2 OR telephone = $2 OR patient_number = $2)
           ORDER BY similarity(full_name, $2) DESC, created_at DESC
           LIMIT 20`,
          [hospitalId, q],
        );
        patients = res.rows;
      } else {
        const res = await pool.query(
          `SELECT id, patient_number, full_name, date_of_birth, telephone,
                  region_district, created_at, consent_personal_data
           FROM patients
           WHERE hospital_id = $1
           ORDER BY created_at DESC`,
          [hospitalId],
        );
        patients = res.rows;
      }

      // Compute stats from full dataset (ignores search filter for accurate counts)
      const statsRes = await pool.query(
        `SELECT
           COUNT(*)                                                   AS total,
           COUNT(*) FILTER (WHERE consent_personal_data = 'Granted') AS granted,
           COUNT(*) FILTER (WHERE consent_personal_data != 'Granted') AS pending_or_refused,
           COUNT(*) FILTER (
             WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
           )                                                          AS this_month
         FROM patients
         WHERE hospital_id = $1`,
        [hospitalId],
      );
      const s = statsRes.rows[0];

      const mapped = patients.map((p) => ({
        id:            p.id,
        patientId:     p.patient_number,
        name:          p.full_name,
        dob:           fmtDob(String(p.date_of_birth)),
        phone:         p.telephone,
        region:        p.region_district,
        registered:    fmtRegistered(p.created_at as string),
        consentStatus: p.consent_personal_data,
      }));

      await writeAuditLog(pool, {
        userId, hospitalId, patientId: null,
        actionType: 'READ', resourceType: 'patient_list', resourceId: null, ipAddress: ip,
      });

      logger.info('GET /patients', userId, hospitalId, { count: mapped.length, search: !!q });

      return ok({
        patients: mapped,
        stats: {
          total:            Number(s.total),
          granted:          Number(s.granted),
          pendingOrRefused: Number(s.pending_or_refused),
          thisMonth:        Number(s.this_month),
        },
      });
    }

    // ── POST /patients ───────────────────────────────────────────────────────
    if (method === 'POST' && segments.length === 1) {
      await requirePermission(pool, userId, hospitalId, 'patient:write');

      const {
        fullName, dob, sex, phone, region, address,
        emergencyName, emergencyPhone, relationship,
        consentData, consentReporting,
        nationalId, bloodGroup, allergies, conditions,
      } = body;

      if (!fullName || !dob || !sex || !phone || !region || !address
        || !emergencyName || !emergencyPhone || !relationship || !consentData) {
        return badRequest(
          'fullName, dob, sex, phone, region, address, emergencyName, emergencyPhone, relationship, and consentData are required.',
        );
      }

      if (!['Male', 'Female', 'Other'].includes(sex)) {
        return badRequest('sex must be Male, Female, or Other.');
      }

      if (!['Granted', 'Refused', 'Pending'].includes(consentData)) {
        return badRequest('consentData must be Granted, Refused, or Pending.');
      }

      const force = event.queryStringParameters?.force === 'true';

      // Duplicate detection (similarity > 0.85 on full_name within same hospital)
      if (!force) {
        const dupRes = await pool.query(
          `SELECT id, patient_number, full_name, date_of_birth, hospital_id,
                  (similarity(full_name, $2) * 100)::INT AS match_pct
           FROM patients
           WHERE hospital_id = $1
             AND similarity(full_name, $2) > 0.85
           ORDER BY similarity(full_name, $2) DESC
           LIMIT 5`,
          [hospitalId, fullName],
        );

        if (dupRes.rows.length > 0) {
          logger.warn('Duplicate patient detected', userId, hospitalId, { fullName, count: dupRes.rows.length });
          return conflict({
            error: 'Possible duplicate patient detected.',
            duplicates: dupRes.rows.map((d) => ({
              id:            d.id,
              name:          d.full_name,
              matchPct:      d.match_pct,
              dob:           fmtDob(String(d.date_of_birth)),
              patientId:     d.patient_number,
              lastLocation:  null,
            })),
          });
        }
      }

      const patientNumber = await generatePatientNumber(pool, hospitalId);

      const insertRes = await pool.query(
        `INSERT INTO patients (
           hospital_id, patient_number, full_name, date_of_birth, biological_sex,
           telephone, address, region_district,
           emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
           consent_personal_data, consent_public_reporting,
           national_id, blood_group, known_allergies, chronic_conditions,
           created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id, patient_number, full_name`,
        [
          hospitalId, patientNumber, fullName, dob, sex,
          phone, address, region,
          emergencyName, emergencyPhone, relationship,
          consentData, consentReporting ?? 'Pending',
          nationalId ?? null, bloodGroup ?? null,
          allergies ?? null, conditions ?? null,
          userId,
        ],
      );

      const p = insertRes.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId: p.id,
        actionType: 'CREATE', resourceType: 'patient', resourceId: p.id, ipAddress: ip,
      });

      logger.info('Patient registered', userId, hospitalId, { patientId: p.id, patientNumber: p.patient_number });

      return created({ id: p.id, patientId: p.patient_number, name: p.full_name });
    }

    // Remaining routes require a patient ID as segments[1]
    const patientId = segments[1];
    if (!patientId) return notFound();
    if (!isUuid(patientId)) return badRequest('Invalid patient ID.');

    // ── GET /patients/{id} ───────────────────────────────────────────────────
    if (method === 'GET' && segments.length === 2) {
      await requirePermission(pool, userId, hospitalId, 'patient:read');

      const res = await pool.query(
        `SELECT id, patient_number, full_name, date_of_birth, biological_sex,
                telephone, address, region_district,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                national_id, blood_group, known_allergies, chronic_conditions,
                consent_personal_data, consent_public_reporting,
                consent_updated_at, created_at, created_by
         FROM patients
         WHERE id = $1 AND hospital_id = $2`,
        [patientId, hospitalId],
      );

      if (res.rows.length === 0) return notFound('Patient not found.');

      const p = res.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId: p.id,
        actionType: 'READ', resourceType: 'patient', resourceId: p.id, ipAddress: ip,
      });

      logger.info('GET /patients/:id', userId, hospitalId, { patientId: p.id });

      const dob = new Date(p.date_of_birth);
      const today = new Date();
      const ageYears = today.getUTCFullYear() - dob.getUTCFullYear()
        - (today.getUTCMonth() < dob.getUTCMonth()
          || (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate())
          ? 1 : 0);

      return ok({
        id:                          p.id,
        patientId:                   p.patient_number,
        name:                        p.full_name,
        dob:                         fmtDob(String(p.date_of_birth)),
        age:                         ageYears,
        sex:                         p.biological_sex,
        phone:                       p.telephone,
        address:                     p.address,
        region:                      p.region_district,
        emergencyContactName:        p.emergency_contact_name,
        emergencyContactPhone:       p.emergency_contact_phone,
        emergencyContactRelationship: p.emergency_contact_relationship,
        nationalId:                  p.national_id,
        bloodGroup:                  p.blood_group,
        knownAllergies:              p.known_allergies ?? [],
        chronicConditions:           p.chronic_conditions ?? [],
        consentPersonalData:         p.consent_personal_data,
        consentPublicReporting:      p.consent_public_reporting,
        consentUpdatedAt:            p.consent_updated_at,
        registeredAt:                p.created_at,
      });
    }

    // ── PUT /patients/{id} ───────────────────────────────────────────────────
    if (method === 'PUT' && segments.length === 2) {
      await requirePermission(pool, userId, hospitalId, 'patient:write');

      // Verify patient belongs to this hospital
      const check = await pool.query(
        'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
        [patientId, hospitalId],
      );
      if (check.rows.length === 0) return notFound('Patient not found.');

      const { nationalId, bloodGroup, allergies, conditions } = body;

      await pool.query(
        `UPDATE patients
         SET national_id        = COALESCE($3, national_id),
             blood_group        = COALESCE($4, blood_group),
             known_allergies    = COALESCE($5, known_allergies),
             chronic_conditions = COALESCE($6, chronic_conditions)
         WHERE id = $1 AND hospital_id = $2`,
        [patientId, hospitalId, nationalId ?? null, bloodGroup ?? null,
          allergies ?? null, conditions ?? null],
      );

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'UPDATE', resourceType: 'patient', resourceId: patientId, ipAddress: ip,
      });

      logger.info('PUT /patients/:id', userId, hospitalId, { patientId });

      return ok({ updated: true });
    }

    // ── PUT /patients/{id}/consent ───────────────────────────────────────────
    if (method === 'PUT' && segments.length === 3 && segments[2] === 'consent') {
      await requirePermission(pool, userId, hospitalId, 'patient:write');

      const check = await pool.query(
        'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
        [patientId, hospitalId],
      );
      if (check.rows.length === 0) return notFound('Patient not found.');

      const { consentPersonalData, consentReporting } = body;

      const validChoices = ['Granted', 'Refused', 'Pending'];
      if (consentPersonalData && !validChoices.includes(consentPersonalData)) {
        return badRequest('consentPersonalData must be Granted, Refused, or Pending.');
      }
      if (consentReporting && !validChoices.includes(consentReporting)) {
        return badRequest('consentReporting must be Granted, Refused, or Pending.');
      }

      await pool.query(
        `UPDATE patients
         SET consent_personal_data    = COALESCE($3, consent_personal_data),
             consent_public_reporting = COALESCE($4, consent_public_reporting),
             consent_updated_at       = NOW(),
             consent_updated_by       = $5
         WHERE id = $1 AND hospital_id = $2`,
        [patientId, hospitalId,
          consentPersonalData ?? null,
          consentReporting ?? null,
          userId],
      );

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'CONSENT_CHANGE', resourceType: 'patient_consent', resourceId: patientId, ipAddress: ip,
      });

      logger.info('PUT /patients/:id/consent', userId, hospitalId, { patientId, consentPersonalData, consentReporting });

      return ok({ updated: true });
    }

    // ── POST /patients/{id}/amend/{recordType}/{recordId} ────────────────────
    if (method === 'POST' && segments.length === 5 && segments[2] === 'amend') {
      await requirePermission(pool, userId, hospitalId, 'patient:amend');

      const recordType = segments[3];
      const recordId   = segments[4];

      const validTypes = ['encounter', 'diagnosis', 'vital_signs', 'prescription', 'lab_result'];
      if (!validTypes.includes(recordType)) {
        return badRequest(`recordType must be one of: ${validTypes.join(', ')}.`);
      }
      if (!isUuid(recordId)) return badRequest('Invalid record ID.');

      const check = await pool.query(
        'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
        [patientId, hospitalId],
      );
      if (check.rows.length === 0) return notFound('Patient not found.');

      // REQ-F-028: only the original record's author OR a Hospital Admin may amend
      // Each table uses a different column name for the authoring clinician
      const recordMeta: Record<string, { table: string; authorCol: string }> = {
        encounter:    { table: 'encounters',    authorCol: 'staff_id' },
        diagnosis:    { table: 'diagnoses',     authorCol: 'recorded_by' },
        vital_signs:  { table: 'vital_signs',   authorCol: 'recorded_by' },
        prescription: { table: 'prescriptions', authorCol: 'prescribing_clinician_id' },
        lab_result:   { table: 'lab_results',   authorCol: 'lab_technician_id' },
      };
      const { table: srcTable, authorCol } = recordMeta[recordType];
      const originalRes = await pool.query(
        `SELECT ${authorCol} AS author_id FROM ${srcTable} WHERE id = $1 AND hospital_id = $2`,
        [recordId, hospitalId],
      );
      if (originalRes.rows.length === 0) return notFound('Original record not found.');

      const isAuthor = originalRes.rows[0].author_id === userId;
      if (!isAuthor) {
        // Check if user holds Hospital Admin role in this hospital
        const adminCheck = await pool.query(
          `SELECT 1
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           JOIN users u ON u.id = ur.user_id
           WHERE ur.user_id = $1 AND u.hospital_id = $2 AND r.name = 'Hospital Admin'
           LIMIT 1`,
          [userId, hospitalId],
        );
        if (adminCheck.rows.length === 0) {
          return forbidden('Only the original author or a Hospital Admin may amend this record.');
        }
      }

      const { originalData, amendedData, reason } = body;

      if (!originalData || !amendedData || !reason?.trim()) {
        return badRequest('originalData, amendedData, and reason are required.');
      }
      if (reason.trim().length < 10) {
        return badRequest('Amendment reason must be at least 10 characters.');
      }

      const insertRes = await pool.query(
        `INSERT INTO record_amendments (
           original_record_type, original_record_id, hospital_id,
           amended_by, amendment_reason, original_data, amended_data
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at`,
        [recordType, recordId, hospitalId, userId, reason.trim(),
          JSON.stringify(originalData), JSON.stringify(amendedData)],
      );

      const amend = insertRes.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'AMEND', resourceType: `patient_${recordType}`, resourceId: recordId, ipAddress: ip,
      });

      logger.info('POST /patients/:id/amend', userId, hospitalId, { patientId, recordType, recordId, amendId: amend.id });

      return created({ id: amend.id, createdAt: amend.created_at });
    }

    return notFound();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ level: 'ERROR', requestId, message: errMsg }));
    if (err instanceof Error && (err as Error & { statusCode?: number }).statusCode === 403) {
      return forbidden();
    }
    return serverError();
  }
};
