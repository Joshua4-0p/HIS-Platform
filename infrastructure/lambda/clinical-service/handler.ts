import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDbPool } from '../shared/db-client';
import { extractClaims } from '../shared/jwt-claims';
import { requirePermission } from '../shared/permission-check';
import { writeAuditLog } from '../shared/audit-logger';
import { createLogger } from '../shared/structured-logger';
import {
  ok, created, badRequest, forbidden, notFound, serverError,
} from '../shared/response';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean { return UUID_RE.test(s); }

type JwtEventShape = Parameters<typeof extractClaims>[0];
function getClaims(event: APIGatewayProxyEventV2) {
  return extractClaims(event as unknown as JwtEventShape);
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  const method    = event.requestContext.http.method;
  const rawPath   = event.rawPath;
  const requestId = event.requestContext.requestId;
  const ip        = event.requestContext.http.sourceIp ?? 'unknown';
  const logger    = createLogger({ functionName: 'his-clinical-service', requestId });

  // Expected paths:
  // /patients/{pid}/encounters
  // /patients/{pid}/encounters/{eid}
  // /patients/{pid}/encounters/{eid}/diagnoses
  // /patients/{pid}/encounters/{eid}/vitals
  // /patients/{pid}/encounters/{eid}/prescriptions
  // /patients/{pid}/encounters/{eid}/lab-requests
  const segments = rawPath.split('/').filter(Boolean);

  if (segments[0] !== 'patients' || segments[2] !== 'encounters') return notFound();
  const patientId = segments[1];
  if (!isUuid(patientId)) return badRequest('Invalid patient ID.');

  try {
    const pool   = await getDbPool();
    const body   = event.body ? JSON.parse(event.body) : {};
    const claims = getClaims(event);
    const { userId, hospitalId } = claims;

    // ── GET /patients/{pid}/encounters ───────────────────────────────────────
    if (method === 'GET' && segments.length === 3) {
      await requirePermission(pool, userId, hospitalId, 'encounter:read');

      const res = await pool.query(
        `SELECT e.id, e.date_time, e.clinical_unit, e.presenting_complaint,
                u.full_name AS clinician_name, e.staff_id,
                COUNT(DISTINCT d.id) AS diagnosis_count
         FROM encounters e
         LEFT JOIN users u ON u.id = e.staff_id
         LEFT JOIN diagnoses d ON d.encounter_id = e.id
         WHERE e.patient_id = $1 AND e.hospital_id = $2
         GROUP BY e.id, u.full_name
         ORDER BY e.date_time DESC`,
        [patientId, hospitalId],
      );

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'READ', resourceType: 'encounter_list', resourceId: patientId, ipAddress: ip,
      });

      logger.info('GET /patients/:pid/encounters', userId, hospitalId, { patientId });
      return ok({
        encounters: res.rows.map((e) => ({
          id:                 e.id,
          dateTime:           e.date_time,
          clinicalUnit:       e.clinical_unit,
          presentingComplaint: e.presenting_complaint,
          clinicianName:      e.clinician_name,
          clinicianId:        e.staff_id,
          diagnosisCount:     Number(e.diagnosis_count),
        })),
      });
    }

    // ── POST /patients/{pid}/encounters ──────────────────────────────────────
    if (method === 'POST' && segments.length === 3) {
      await requirePermission(pool, userId, hospitalId, 'encounter:create');

      // REQ-F-016: consent guard — Refused patients cannot have new clinical records
      const consentRes = await pool.query(
        'SELECT consent_personal_data FROM patients WHERE id = $1 AND hospital_id = $2',
        [patientId, hospitalId],
      );
      if (consentRes.rows.length === 0) return notFound('Patient not found.');
      if (consentRes.rows[0].consent_personal_data === 'Refused') {
        return { statusCode: 403, body: JSON.stringify({ code: 'CONSENT_REFUSED', error: 'Patient has refused consent for personal data.' }) };
      }

      const { clinicalUnit, presentingComplaint, appointmentId } = body;
      if (!clinicalUnit || !presentingComplaint) {
        return badRequest('clinicalUnit and presentingComplaint are required.');
      }

      const insertRes = await pool.query(
        `INSERT INTO encounters (hospital_id, patient_id, appointment_id, date_time, clinical_unit, presenting_complaint, staff_id)
         VALUES ($1, $2, $3, NOW(), $4, $5, $6)
         RETURNING id, date_time, clinical_unit, presenting_complaint, staff_id`,
        [hospitalId, patientId, appointmentId ?? null, clinicalUnit, presentingComplaint, userId],
      );
      const enc = insertRes.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'CREATE', resourceType: 'encounter', resourceId: enc.id, ipAddress: ip,
      });

      logger.info('POST /patients/:pid/encounters', userId, hospitalId, { patientId, encounterId: enc.id });
      return created({
        id: enc.id,
        dateTime: enc.date_time,
        clinicalUnit: enc.clinical_unit,
        presentingComplaint: enc.presenting_complaint,
        clinicianId: enc.staff_id,
      });
    }

    const encounterId = segments[3];
    if (!isUuid(encounterId)) return badRequest('Invalid encounter ID.');

    // ── GET /patients/{pid}/encounters/{eid} ─────────────────────────────────
    if (method === 'GET' && segments.length === 4) {
      await requirePermission(pool, userId, hospitalId, 'encounter:read');

      const encRes = await pool.query(
        `SELECT e.id, e.date_time, e.clinical_unit, e.presenting_complaint,
                e.appointment_id, e.created_at,
                u.full_name AS clinician_name, u.id AS clinician_id
         FROM encounters e
         LEFT JOIN users u ON u.id = e.staff_id
         WHERE e.id = $1 AND e.hospital_id = $2 AND e.patient_id = $3`,
        [encounterId, hospitalId, patientId],
      );
      if (encRes.rows.length === 0) return notFound('Encounter not found.');
      const enc = encRes.rows[0];

      const [diagRes, vitalsRes, prescRes, labReqRes] = await Promise.all([
        pool.query(
          `SELECT id, condition_name, icd10_code, severity, status, created_at, recorded_by
           FROM diagnoses WHERE encounter_id = $1 ORDER BY created_at ASC`,
          [encounterId],
        ),
        pool.query(
          `SELECT id, temperature, bp_systolic, bp_diastolic, pulse_rate,
                  respiratory_rate, oxygen_saturation, weight, created_at, recorded_by
           FROM vital_signs WHERE encounter_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [encounterId],
        ),
        pool.query(
          `SELECT id, medication_name, dosage, frequency, route, duration, created_at
           FROM prescriptions WHERE encounter_id = $1 ORDER BY created_at ASC`,
          [encounterId],
        ),
        pool.query(
          `SELECT id, test_name, urgency, status, notes, created_at
           FROM lab_test_requests WHERE encounter_id = $1 ORDER BY created_at ASC`,
          [encounterId],
        ),
      ]);

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'READ', resourceType: 'encounter', resourceId: encounterId, ipAddress: ip,
      });

      logger.info('GET /patients/:pid/encounters/:eid', userId, hospitalId, { patientId, encounterId });
      return ok({
        id:                  enc.id,
        dateTime:            enc.date_time,
        clinicalUnit:        enc.clinical_unit,
        presentingComplaint: enc.presenting_complaint,
        appointmentId:       enc.appointment_id,
        clinicianName:       enc.clinician_name,
        clinicianId:         enc.clinician_id,
        createdAt:           enc.created_at,
        diagnoses:           diagRes.rows.map((d) => ({
          id: d.id, conditionName: d.condition_name, icd10Code: d.icd10_code,
          severity: d.severity, status: d.status, createdAt: d.created_at,
        })),
        vitals:              vitalsRes.rows[0] ?? null,
        prescriptions:       prescRes.rows.map((p) => ({
          id: p.id, medicationName: p.medication_name, dosage: p.dosage,
          frequency: p.frequency, route: p.route, duration: p.duration, createdAt: p.created_at,
        })),
        labRequests:         labReqRes.rows.map((l) => ({
          id: l.id, testName: l.test_name, urgency: l.urgency,
          status: l.status, notes: l.notes, createdAt: l.created_at,
        })),
      });
    }

    const subResource = segments[4];

    // ── POST /patients/{pid}/encounters/{eid}/diagnoses ───────────────────────
    if (method === 'POST' && subResource === 'diagnoses') {
      await requirePermission(pool, userId, hospitalId, 'diagnosis:create');

      const { conditionName, icd10Code, severity, status } = body;
      if (!conditionName || !severity || !status) {
        return badRequest('conditionName, severity, and status are required.');
      }
      const validSeverity = ['mild', 'moderate', 'severe'];
      const validStatus   = ['active', 'resolved', 'suspected'];
      if (!validSeverity.includes(severity)) return badRequest('severity must be mild, moderate, or severe.');
      if (!validStatus.includes(status)) return badRequest('status must be active, resolved, or suspected.');

      const res = await pool.query(
        `INSERT INTO diagnoses (encounter_id, hospital_id, condition_name, icd10_code, severity, status, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, condition_name, icd10_code, severity, status, created_at`,
        [encounterId, hospitalId, conditionName, icd10Code ?? null, severity, status, userId],
      );
      const d = res.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'CREATE', resourceType: 'diagnosis', resourceId: d.id, ipAddress: ip,
      });

      logger.info('POST /patients/:pid/encounters/:eid/diagnoses', userId, hospitalId, { encounterId, diagnosisId: d.id });
      return created({
        id: d.id, conditionName: d.condition_name, icd10Code: d.icd10_code,
        severity: d.severity, status: d.status, createdAt: d.created_at,
      });
    }

    // ── POST /patients/{pid}/encounters/{eid}/vitals ──────────────────────────
    if (method === 'POST' && subResource === 'vitals') {
      await requirePermission(pool, userId, hospitalId, 'vitals:create');

      const { temperature, bpSystolic, bpDiastolic, pulseRate, respiratoryRate, oxygenSaturation, weight } = body;
      if (!temperature && !bpSystolic && !pulseRate) {
        return badRequest('At least one vital sign measurement is required.');
      }

      const res = await pool.query(
        `INSERT INTO vital_signs (encounter_id, hospital_id, temperature, bp_systolic, bp_diastolic,
           pulse_rate, respiratory_rate, oxygen_saturation, weight, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, temperature, bp_systolic, bp_diastolic, pulse_rate,
                   respiratory_rate, oxygen_saturation, weight, created_at`,
        [encounterId, hospitalId,
          temperature ?? null, bpSystolic ?? null, bpDiastolic ?? null,
          pulseRate ?? null, respiratoryRate ?? null, oxygenSaturation ?? null,
          weight ?? null, userId],
      );
      const v = res.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'CREATE', resourceType: 'vital_signs', resourceId: v.id, ipAddress: ip,
      });

      logger.info('POST /patients/:pid/encounters/:eid/vitals', userId, hospitalId, { encounterId, vitalsId: v.id });
      return created({
        id: v.id, temperature: v.temperature, bpSystolic: v.bp_systolic, bpDiastolic: v.bp_diastolic,
        pulseRate: v.pulse_rate, respiratoryRate: v.respiratory_rate,
        oxygenSaturation: v.oxygen_saturation, weight: v.weight, createdAt: v.created_at,
      });
    }

    // ── POST /patients/{pid}/encounters/{eid}/prescriptions ──────────────────
    if (method === 'POST' && subResource === 'prescriptions') {
      await requirePermission(pool, userId, hospitalId, 'prescription:create');

      const { medicationName, dosage, frequency, route, duration } = body;
      if (!medicationName || !dosage || !frequency || !route || !duration) {
        return badRequest('medicationName, dosage, frequency, route, and duration are required.');
      }

      const res = await pool.query(
        `INSERT INTO prescriptions (encounter_id, hospital_id, patient_id, medication_name,
           dosage, frequency, route, duration, prescribing_clinician_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, medication_name, dosage, frequency, route, duration, created_at`,
        [encounterId, hospitalId, patientId, medicationName, dosage, frequency, route, duration, userId],
      );
      const p = res.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'CREATE', resourceType: 'prescription', resourceId: p.id, ipAddress: ip,
      });

      logger.info('POST .../prescriptions', userId, hospitalId, { encounterId, prescriptionId: p.id });
      return created({
        id: p.id, medicationName: p.medication_name, dosage: p.dosage,
        frequency: p.frequency, route: p.route, duration: p.duration, createdAt: p.created_at,
      });
    }

    // ── POST /patients/{pid}/encounters/{eid}/lab-requests ───────────────────
    if (method === 'POST' && subResource === 'lab-requests') {
      await requirePermission(pool, userId, hospitalId, 'lab_result:create');

      const { testName, urgency, notes } = body;
      if (!testName) return badRequest('testName is required.');
      const dbUrgency = urgency === 'urgent' ? 'urgent' : 'routine';

      const res = await pool.query(
        `INSERT INTO lab_test_requests (encounter_id, hospital_id, patient_id, test_name, urgency, notes, requested_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, test_name, urgency, status, notes, created_at`,
        [encounterId, hospitalId, patientId, testName, dbUrgency, notes ?? null, userId],
      );
      const l = res.rows[0];

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'CREATE', resourceType: 'lab_request', resourceId: l.id, ipAddress: ip,
      });

      logger.info('POST .../lab-requests', userId, hospitalId, { encounterId, requestId: l.id });
      return created({
        id: l.id, testName: l.test_name, urgency: l.urgency,
        status: l.status, notes: l.notes, createdAt: l.created_at,
      });
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
