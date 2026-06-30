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

// DB type values → frontend display labels
function mapType(dbType: string): string {
  const m: Record<string, string> = {
    'consultation': 'Consultation',
    'follow-up': 'Follow-up',
    'laboratory': 'Laboratory',
    'procedure': 'Procedure',
  };
  return m[dbType] ?? dbType;
}

// DB status values → frontend display labels
function mapStatus(dbStatus: string): string {
  const m: Record<string, string> = {
    'scheduled': 'Scheduled',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  return m[dbStatus] ?? dbStatus;
}

// Default appointment duration in minutes by type (no duration column in DB)
function defaultDuration(dbType: string): number {
  const m: Record<string, number> = {
    'consultation': 45,
    'follow-up': 30,
    'laboratory': 60,
    'procedure': 90,
  };
  return m[dbType] ?? 30;
}

// Extract WAT (UTC+1) date string and startMin from a stored TIMESTAMPTZ
function extractWat(dt: Date): { date: string; startMin: number } {
  const watMs = dt.getTime() + 60 * 60 * 1000; // add 1 hour
  const w = new Date(watMs);
  const date = w.toISOString().split('T')[0];
  const startMin = w.getUTCHours() * 60 + w.getUTCMinutes();
  return { date, startMin };
}

function rowToAppt(row: Record<string, unknown>) {
  const { date, startMin } = extractWat(new Date(row.date_time as string));
  return {
    id:                 row.id,
    patientId:          row.patient_id,
    patientName:        row.patient_name,
    clinicianId:        row.clinician_id,
    clinician:          row.clinician_name,
    type:               mapType(row.type as string),
    unit:               row.clinical_unit,
    date,
    startMin,
    durationMin:        defaultDuration(row.type as string),
    status:             mapStatus(row.status as string),
    cancellationReason: row.cancellation_reason ?? null,
  };
}

const APPT_SELECT = `
  SELECT a.id, a.patient_id, p.full_name AS patient_name,
         a.clinician_id, u.full_name AS clinician_name,
         a.type, a.clinical_unit, a.date_time,
         a.status, a.cancellation_reason, a.created_at
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN users   u ON u.id = a.clinician_id
`;

export const handler = async (event: APIGatewayProxyEventV2) => {
  const method    = event.requestContext.http.method;
  const rawPath   = event.rawPath;
  const requestId = event.requestContext.requestId;
  const ip        = event.requestContext.http.sourceIp ?? 'unknown';
  const logger    = createLogger({ functionName: 'his-appointment-service', requestId });

  // segments: ['appointments'] | ['appointments', id] | ['appointments', id, 'cancel']
  const segments = rawPath.split('/').filter(Boolean);

  if (segments[0] !== 'appointments') return notFound();

  try {
    const pool   = await getDbPool();
    const body   = event.body ? JSON.parse(event.body) : {};
    const claims = getClaims(event);
    const { userId, hospitalId } = claims;

    // ── GET /appointments ─────────────────────────────────────────────────────
    if (method === 'GET' && segments.length === 1) {
      await requirePermission(pool, userId, hospitalId, 'appointment:read');

      const qs = event.queryStringParameters ?? {};
      const conditions: string[] = ['a.hospital_id = $1'];
      const params: unknown[] = [hospitalId];

      if (qs.view === 'week' && qs.week) {
        // WAT week: from Monday 00:00 WAT to Sunday 23:59 WAT (7-day window)
        const weekStart = new Date(`${qs.week}T00:00:00+01:00`);
        const weekEnd   = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        conditions.push(`a.date_time >= $${params.length + 1}`);
        params.push(weekStart.toISOString());
        conditions.push(`a.date_time < $${params.length + 1}`);
        params.push(weekEnd.toISOString());
      } else if (qs.date) {
        // WAT day: from 00:00 WAT to 23:59:59 WAT
        const dayStart = new Date(`${qs.date}T00:00:00+01:00`);
        const dayEnd   = new Date(`${qs.date}T23:59:59+01:00`);
        conditions.push(`a.date_time >= $${params.length + 1}`);
        params.push(dayStart.toISOString());
        conditions.push(`a.date_time <= $${params.length + 1}`);
        params.push(dayEnd.toISOString());
      }

      if (qs.clinicianId && isUuid(qs.clinicianId)) {
        conditions.push(`a.clinician_id = $${params.length + 1}`);
        params.push(qs.clinicianId);
      }
      if (qs.unit) {
        conditions.push(`a.clinical_unit = $${params.length + 1}`);
        params.push(qs.unit);
      }

      const res = await pool.query(
        `${APPT_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY a.date_time ASC`,
        params,
      );

      logger.info('GET /appointments', userId, hospitalId, { count: res.rows.length });
      return ok({ appointments: res.rows.map(rowToAppt) });
    }

    // ── POST /appointments ────────────────────────────────────────────────────
    if (method === 'POST' && segments.length === 1) {
      await requirePermission(pool, userId, hospitalId, 'appointment:create');

      const { patientId, date, time, type, clinicianId, clinicalUnit } = body;

      if (!patientId || !date || !time || !type || !clinicianId || !clinicalUnit) {
        return badRequest(
          'patientId, date, time, type, clinicianId, and clinicalUnit are required.',
        );
      }
      if (!isUuid(patientId)) return badRequest('patientId must be a valid UUID.');
      if (!isUuid(clinicianId)) return badRequest('clinicianId must be a valid UUID.');

      // Normalize front-end "followup" → "follow-up" to match DB check constraint
      const dbType = type === 'followup' ? 'follow-up' : String(type).toLowerCase();
      if (!['consultation', 'follow-up', 'laboratory', 'procedure'].includes(dbType)) {
        return badRequest('type must be consultation, follow-up, laboratory, or procedure.');
      }

      const dateTime = new Date(`${date}T${time}:00+01:00`); // WAT → UTC
      if (isNaN(dateTime.getTime())) return badRequest('Invalid date or time format.');

      // REQ-F-030: conflict check — same clinician + same date_time + scheduled
      const conflictRes = await pool.query(
        `SELECT a.id, p.full_name AS patient_name, a.date_time
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.hospital_id = $1 AND a.clinician_id = $2
           AND a.date_time = $3 AND a.status = 'scheduled'`,
        [hospitalId, clinicianId, dateTime.toISOString()],
      );

      if (conflictRes.rowCount! > 0) {
        const c = conflictRes.rows[0];
        return conflict({
          error: 'Scheduling conflict: this clinician already has an appointment at that time.',
          conflictingAppointment: {
            id: c.id,
            patientName: c.patient_name,
            dateTime: c.date_time,
          },
        });
      }

      const insertRes = await pool.query(
        `INSERT INTO appointments
           (hospital_id, patient_id, date_time, type, clinician_id, clinical_unit, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
         RETURNING id, patient_id, clinician_id, type, clinical_unit, date_time,
                   status, cancellation_reason, created_at`,
        [hospitalId, patientId, dateTime.toISOString(), dbType, clinicianId, clinicalUnit, userId],
      );
      const newAppt = insertRes.rows[0];

      // REQ-F-033: appointment_created notification for assigned clinician
      if (clinicianId !== userId) {
        await pool.query(
          `INSERT INTO notifications (user_id, hospital_id, type, title, body)
           VALUES ($1, $2, 'appointment_created', 'New Appointment Scheduled', $3)`,
          [
            clinicianId,
            hospitalId,
            `You have a new ${dbType} appointment scheduled for ${date} at ${time}.`,
          ],
        );
      }

      // Fetch names for response
      const namesRes = await pool.query(
        `SELECT p.full_name AS patient_name, u.full_name AS clinician_name
         FROM patients p, users u
         WHERE p.id = $1 AND u.id = $2`,
        [patientId, clinicianId],
      );
      const names = namesRes.rows[0] ?? {};

      await writeAuditLog(pool, {
        userId,
        hospitalId,
        patientId,
        actionType:   'CREATE',
        resourceType: 'appointment',
        resourceId:   newAppt.id,
        ipAddress:    ip,
      });

      logger.info('POST /appointments', userId, hospitalId, { appointmentId: newAppt.id });
      return created({
        appointment: rowToAppt({
          ...newAppt,
          patient_name:   names.patient_name ?? '',
          clinician_name: names.clinician_name ?? '',
        }),
      });
    }

    // ── GET /appointments/:id ─────────────────────────────────────────────────
    if (method === 'GET' && segments.length === 2) {
      const apptId = segments[1];
      if (!isUuid(apptId)) return badRequest('Invalid appointment ID.');

      await requirePermission(pool, userId, hospitalId, 'appointment:read');

      const res = await pool.query(
        `${APPT_SELECT} WHERE a.id = $1 AND a.hospital_id = $2`,
        [apptId, hospitalId],
      );
      if (res.rowCount === 0) return notFound();

      logger.info('GET /appointments/:id', userId, hospitalId, { appointmentId: apptId });
      return ok({ appointment: rowToAppt(res.rows[0]) });
    }

    // ── PUT /appointments/:id ─────────────────────────────────────────────────
    if (method === 'PUT' && segments.length === 2) {
      const apptId = segments[1];
      if (!isUuid(apptId)) return badRequest('Invalid appointment ID.');

      await requirePermission(pool, userId, hospitalId, 'appointment:update');

      const { date, time, clinicianId, type, clinicalUnit } = body;
      if (!date && !time && !clinicianId && !type && !clinicalUnit) {
        return badRequest('At least one field to update is required: date, time, clinicianId, type, clinicalUnit.');
      }

      const existingRes = await pool.query(
        `SELECT id, patient_id, clinician_id, date_time, type, clinical_unit, status
         FROM appointments WHERE id = $1 AND hospital_id = $2`,
        [apptId, hospitalId],
      );
      if (existingRes.rowCount === 0) return notFound();
      const existing = existingRes.rows[0];
      if (existing.status === 'cancelled') return badRequest('Cancelled appointments cannot be edited.');

      const dbType = type
        ? (type === 'followup' ? 'follow-up' : String(type).toLowerCase())
        : (existing.type as string);
      if (!['consultation', 'follow-up', 'laboratory', 'procedure'].includes(dbType)) {
        return badRequest('type must be consultation, follow-up, laboratory, or procedure.');
      }

      const newClinicianId = clinicianId && isUuid(clinicianId) ? clinicianId : (existing.clinician_id as string);
      const newUnit = clinicalUnit ?? existing.clinical_unit;

      let newDateTime: Date;
      if (date || time) {
        const currentWat = extractWat(new Date(existing.date_time as string));
        const useDate = date ?? currentWat.date;
        const useHour = String(Math.floor((time ? parseInt(time.split(':')[0], 10) : Math.floor(currentWat.startMin / 60)))).padStart(2, '0');
        const useMin  = String(time ? parseInt(time.split(':')[1] ?? '0', 10) : currentWat.startMin % 60).padStart(2, '0');
        newDateTime = new Date(`${useDate}T${useHour}:${useMin}:00+01:00`);
        if (isNaN(newDateTime.getTime())) return badRequest('Invalid date or time format.');
      } else {
        newDateTime = new Date(existing.date_time as string);
      }

      // REQ-F-030: re-check conflict excluding this appointment
      const conflictRes = await pool.query(
        `SELECT a.id FROM appointments a
         WHERE a.hospital_id = $1 AND a.clinician_id = $2 AND a.date_time = $3
           AND a.status = 'scheduled' AND a.id <> $4`,
        [hospitalId, newClinicianId, newDateTime.toISOString(), apptId],
      );
      if (conflictRes.rowCount! > 0) {
        return conflict({
          error: 'Scheduling conflict: this clinician already has an appointment at that time.',
          conflictingAppointment: { id: conflictRes.rows[0].id },
        });
      }

      const updateRes = await pool.query(
        `UPDATE appointments
         SET date_time = $1, type = $2, clinician_id = $3, clinical_unit = $4
         WHERE id = $5 AND hospital_id = $6
         RETURNING id, patient_id, clinician_id, type, clinical_unit, date_time,
                   status, cancellation_reason, created_at`,
        [newDateTime.toISOString(), dbType, newClinicianId, newUnit, apptId, hospitalId],
      );
      const updated = updateRes.rows[0];

      // Notify new clinician if clinician changed
      if (clinicianId && clinicianId !== existing.clinician_id) {
        await pool.query(
          `INSERT INTO notifications (user_id, hospital_id, type, title, body)
           VALUES ($1, $2, 'appointment_created', 'Appointment Rescheduled to You', $3)`,
          [newClinicianId, hospitalId, `An appointment has been reassigned to you for ${date ?? ''}.`],
        );
      }

      const namesRes = await pool.query(
        `SELECT p.full_name AS patient_name, u.full_name AS clinician_name
         FROM patients p, users u
         WHERE p.id = $1 AND u.id = $2`,
        [updated.patient_id as string, updated.clinician_id as string],
      );
      const names = namesRes.rows[0] ?? {};

      await writeAuditLog(pool, {
        userId,
        hospitalId,
        patientId:    updated.patient_id as string,
        actionType:   'UPDATE',
        resourceType: 'appointment',
        resourceId:   apptId,
        ipAddress:    ip,
      });

      logger.info('PUT /appointments/:id', userId, hospitalId, { appointmentId: apptId });
      return ok({
        appointment: rowToAppt({
          ...updated,
          patient_name:   names.patient_name ?? '',
          clinician_name: names.clinician_name ?? '',
        }),
      });
    }

    // ── PUT /appointments/:id/cancel ──────────────────────────────────────────
    if (method === 'PUT' && segments.length === 3 && segments[2] === 'cancel') {
      const apptId = segments[1];
      if (!isUuid(apptId)) return badRequest('Invalid appointment ID.');

      await requirePermission(pool, userId, hospitalId, 'appointment:cancel');

      const cancellationReason = String(body.cancellationReason ?? '').trim();
      if (!cancellationReason) return badRequest('cancellationReason is required.');

      const res = await pool.query(
        `UPDATE appointments
         SET status = 'cancelled', cancellation_reason = $1
         WHERE id = $2 AND hospital_id = $3 AND status = 'scheduled'
         RETURNING id, patient_id, clinician_id`,
        [cancellationReason, apptId, hospitalId],
      );

      if (res.rowCount === 0) {
        const check = await pool.query(
          `SELECT status FROM appointments WHERE id = $1 AND hospital_id = $2`,
          [apptId, hospitalId],
        );
        if (check.rowCount === 0) return notFound();
        return badRequest('Only scheduled appointments can be cancelled.');
      }

      const cancelled = res.rows[0];

      // REQ-F-032: appointment_cancelled notification for clinician
      await pool.query(
        `INSERT INTO notifications (user_id, hospital_id, type, title, body)
         VALUES ($1, $2, 'appointment_cancelled', 'Appointment Cancelled', $3)`,
        [
          cancelled.clinician_id,
          hospitalId,
          `An appointment has been cancelled. Reason: ${cancellationReason}`,
        ],
      );

      await writeAuditLog(pool, {
        userId,
        hospitalId,
        patientId:    cancelled.patient_id,
        actionType:   'UPDATE',
        resourceType: 'appointment',
        resourceId:   apptId,
        ipAddress:    ip,
      });

      logger.info('PUT /appointments/:id/cancel', userId, hospitalId, { appointmentId: apptId });
      return ok({ message: 'Appointment cancelled successfully.' });
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
