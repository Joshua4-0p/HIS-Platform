import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import type { Pool } from 'pg';
import { getDbPool } from '../shared/db-client';
import { extractClaims } from '../shared/jwt-claims';
import { requirePermission } from '../shared/permission-check';
import { writeAuditLog } from '../shared/audit-logger';
import { createLogger } from '../shared/structured-logger';
import {
  ok, created, badRequest, forbidden, notFound, serverError,
} from '../shared/response';

const sns = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean { return UUID_RE.test(s); }

type JwtEventShape = Parameters<typeof extractClaims>[0];
function getClaims(event: APIGatewayProxyEventV2) {
  return extractClaims(event as unknown as JwtEventShape);
}

// REQ-F-040: classify result status from numeric value vs reference ranges
function classify(
  value: number,
  normalMin: number,
  normalMax: number,
  criticalMin: number,
  criticalMax: number,
): 'normal' | 'abnormal' | 'critical' {
  if (value < criticalMin || value > criticalMax) return 'critical';
  if (value < normalMin   || value > normalMax)   return 'abnormal';
  return 'normal';
}

function statusLabel(s: string): 'Normal' | 'Abnormal' | 'Critical' {
  if (s === 'critical') return 'Critical';
  if (s === 'abnormal') return 'Abnormal';
  return 'Normal';
}

function buildBreachNote(
  value: number,
  unit: string,
  normalMin: number,
  normalMax: number,
  status: string,
): string | null {
  if (status === 'normal') return null;
  if (value < normalMin) {
    const diff = Math.abs(normalMin - value).toFixed(2);
    const suffix = status === 'critical' ? ' Critical low — immediate clinical attention required.' : '';
    return `Result is ${diff} ${unit} below the lower limit of normal (${normalMin} ${unit}).${suffix}`;
  }
  const diff = Math.abs(value - normalMax).toFixed(2);
  const suffix = status === 'critical' ? ' Critical high — immediate clinical attention required.' : '';
  return `Result is ${diff} ${unit} above the upper limit of normal (${normalMax} ${unit}).${suffix}`;
}

// REQ-F-041: SNS + in-app notifications for critical results, within 60 seconds
async function dispatchCriticalAlert(opts: {
  pool: Pool;
  hospitalId: string;
  patientId: string;
  testName: string;
  resultValue: number;
  unit: string;
  requestedBy: string;
  encounterId: string | null;
  userId: string;
  logger: ReturnType<typeof createLogger>;
}): Promise<void> {
  const { pool, hospitalId, patientId, testName, resultValue, unit, requestedBy, encounterId, userId, logger } = opts;

  await sns.send(new PublishCommand({
    TopicArn: process.env.CRITICAL_LAB_ALERTS_TOPIC_ARN,
    Subject: `CRITICAL LAB RESULT - ${testName} - Immediate Action Required`,
    Message: [
      'CRITICAL LABORATORY RESULT',
      '',
      `Test:       ${testName}`,
      `Result:     ${resultValue} ${unit}`,
      `Status:     CRITICAL`,
      `Patient ID: ${patientId}`,
      `Hospital:   ${hospitalId}`,
      `Entered by: ${userId}`,
      `Time (WAT): ${new Date(Date.now() + 3600000).toISOString().replace('Z', '+01:00')}`,
      '',
      'Immediate clinical attention required.',
    ].join('\n'),
  }));

  // Notify the requesting clinician
  await pool.query(
    `INSERT INTO notifications (user_id, hospital_id, type, title, body)
     VALUES ($1, $2, 'critical_lab', $3, $4)`,
    [
      requestedBy, hospitalId,
      `CRITICAL: ${testName} Result`,
      `A critical lab result (${resultValue} ${unit}) has been recorded for your patient. Immediate clinical review required.`,
    ],
  );

  // Notify ward head nurse (or Hospital Admin as fallback)
  if (encounterId) {
    const encRow = await pool.query(
      `SELECT clinical_unit FROM encounters WHERE id = $1 AND hospital_id = $2`,
      [encounterId, hospitalId],
    );
    if (encRow.rowCount && encRow.rows[0].clinical_unit) {
      const clinicalUnit = encRow.rows[0].clinical_unit as string;
      const nurseRow = await pool.query(
        `SELECT id FROM users WHERE hospital_id = $1 AND ward_head_unit = $2 AND is_active = true LIMIT 1`,
        [hospitalId, clinicalUnit],
      );
      if (nurseRow.rowCount) {
        await pool.query(
          `INSERT INTO notifications (user_id, hospital_id, type, title, body)
           VALUES ($1, $2, 'critical_lab', $3, $4)`,
          [
            nurseRow.rows[0].id, hospitalId,
            `CRITICAL: ${testName} Result`,
            `Critical lab result (${resultValue} ${unit}) for a patient in ward ${clinicalUnit}. Immediate review required.`,
          ],
        );
      } else {
        const adminRow = await pool.query(
          `SELECT u.id FROM users u
           JOIN user_roles ur ON ur.user_id = u.id
           JOIN roles r ON r.id = ur.role_id
           WHERE u.hospital_id = $1 AND r.name = 'Hospital Admin' AND u.is_active = true
           LIMIT 1`,
          [hospitalId],
        );
        if (adminRow.rowCount) {
          await pool.query(
            `INSERT INTO notifications (user_id, hospital_id, type, title, body)
             VALUES ($1, $2, 'critical_lab', $3, $4)`,
            [
              adminRow.rows[0].id, hospitalId,
              `CRITICAL: ${testName} Result`,
              `Critical lab result (${resultValue} ${unit}). No ward head nurse for unit ${clinicalUnit}. Please ensure clinical review.`,
            ],
          );
        }
      }
    }
  }

  logger.info('Critical alert dispatched', userId, hospitalId, { testName, resultValue, unit });
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  const method    = event.requestContext.http.method;
  const rawPath   = event.rawPath;
  const requestId = event.requestContext.requestId;
  const ip        = event.requestContext.http.sourceIp ?? 'unknown';
  const logger    = createLogger({ functionName: 'his-lab-service', requestId });

  // Routes:
  // GET  /laboratory/queue
  // GET  /laboratory/requests/{id}
  // POST /laboratory/results
  // GET  /laboratory/results/{id}
  // PUT  /laboratory/results/{id}/correct
  const segments = rawPath.split('/').filter(Boolean);

  // ── GET /laboratory/queue ─────────────────────────────────────────────
  if (method === 'GET' && segments[0] === 'laboratory' && segments[1] === 'queue' && segments.length === 2) {
    try {
      const pool   = await getDbPool();
      const claims = getClaims(event);
      const { userId, hospitalId } = claims;
      await requirePermission(pool, userId, hospitalId, 'lab_result:read');

      const statsRes = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed,
           COUNT(*) FILTER (WHERE urgency = 'urgent')   AS urgent
         FROM lab_test_requests WHERE hospital_id = $1`,
        [hospitalId],
      );
      const s = statsRes.rows[0];
      const stats = {
        total:     Number(s.pending) + Number(s.completed),
        pending:   Number(s.pending),
        completed: Number(s.completed),
        urgent:    Number(s.urgent),
      };

      const qp = event.queryStringParameters ?? {};
      const statusFilter = qp['status'] ?? '';
      const conditions = ['ltr.hospital_id = $1'];
      const params: unknown[] = [hospitalId];
      if (statusFilter === 'Pending' || statusFilter === 'pending') {
        conditions.push(`ltr.status = 'pending'`);
      } else if (statusFilter === 'Completed' || statusFilter === 'completed') {
        conditions.push(`ltr.status = 'completed'`);
      }

      const listRes = await pool.query(
        `SELECT
           ltr.id,
           ltr.patient_id                                                        AS "patientId",
           p.full_name                                                           AS "patientName",
           p.patient_number                                                      AS "patientNumber",
           ltr.test_name                                                         AS "testName",
           ltr.created_at                                                        AS "requestTime",
           u.full_name                                                           AS "requestedBy",
           CASE ltr.urgency WHEN 'urgent' THEN 'Urgent' ELSE 'Routine' END      AS urgency,
           CASE ltr.status  WHEN 'pending' THEN 'Pending' ELSE 'Completed' END  AS status,
           lr.id                                                                 AS "resultId"
         FROM lab_test_requests ltr
         JOIN patients p  ON p.id  = ltr.patient_id
         JOIN users u     ON u.id  = ltr.requested_by
         LEFT JOIN lab_results lr ON lr.request_id = ltr.id AND lr.superseded = false
         WHERE ${conditions.join(' AND ')}
         ORDER BY ltr.urgency DESC, ltr.created_at ASC`,
        params,
      );

      logger.info('Lab queue fetched', userId, hospitalId, { count: listRes.rows.length });
      return ok({ stats, requests: listRes.rows });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Missing JWT')) return forbidden();
      if (err instanceof Error && err.message.includes('Forbidden')) return forbidden(err.message);
      logger.error('GET /laboratory/queue failed', '', '', { error: String(err) });
      return serverError();
    }
  }

  // ── GET /laboratory/requests/{id} ─────────────────────────────────────
  if (method === 'GET' && segments[0] === 'laboratory' && segments[1] === 'requests' && segments.length === 3 && isUuid(segments[2])) {
    const reqId = segments[2];
    try {
      const pool   = await getDbPool();
      const claims = getClaims(event);
      const { userId, hospitalId } = claims;
      await requirePermission(pool, userId, hospitalId, 'lab_result:create');

      const res = await pool.query(
        `SELECT
           ltr.id,
           ltr.patient_id                                                        AS "patientId",
           p.full_name                                                           AS "patientName",
           p.patient_number                                                      AS "patientNumber",
           ltr.test_name                                                         AS "testName",
           ltr.created_at                                                        AS "requestTime",
           u.full_name                                                           AS "requestedBy",
           CASE ltr.urgency WHEN 'urgent' THEN 'Urgent' ELSE 'Routine' END      AS urgency,
           CASE ltr.status  WHEN 'pending' THEN 'Pending' ELSE 'Completed' END  AS status
         FROM lab_test_requests ltr
         JOIN patients p ON p.id = ltr.patient_id
         JOIN users u    ON u.id = ltr.requested_by
         WHERE ltr.id = $1 AND ltr.hospital_id = $2`,
        [reqId, hospitalId],
      );
      if (res.rowCount === 0) return notFound('Lab request not found');
      return ok({ request: res.rows[0] });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Missing JWT')) return forbidden();
      if (err instanceof Error && err.message.includes('Forbidden')) return forbidden(err.message);
      logger.error('GET /laboratory/requests/{id} failed', '', '', { error: String(err) });
      return serverError();
    }
  }

  // ── POST /laboratory/results ──────────────────────────────────────────
  if (method === 'POST' && segments[0] === 'laboratory' && segments[1] === 'results' && segments.length === 2) {
    try {
      const pool   = await getDbPool();
      const claims = getClaims(event);
      const { userId, hospitalId } = claims;
      await requirePermission(pool, userId, hospitalId, 'lab_result:create');

      const body = JSON.parse(event.body ?? '{}') as {
        requestId?: string;
        resultValue?: unknown;
        dateTimeTested?: string;
      };
      if (!body.requestId || !isUuid(body.requestId)) return badRequest('requestId must be a valid UUID');
      if (body.resultValue === undefined || body.resultValue === null) return badRequest('resultValue is required');
      const resultValue = Number(body.resultValue);
      if (isNaN(resultValue)) return badRequest('resultValue must be a number');
      if (!body.dateTimeTested) return badRequest('dateTimeTested is required');

      const reqRes = await pool.query(
        `SELECT id, test_name, patient_id, requested_by, encounter_id, status
         FROM lab_test_requests WHERE id = $1 AND hospital_id = $2`,
        [body.requestId, hospitalId],
      );
      if (reqRes.rowCount === 0) return notFound('Lab request not found');
      const req = reqRes.rows[0] as {
        id: string; test_name: string; patient_id: string;
        requested_by: string; encounter_id: string | null; status: string;
      };
      if (req.status === 'completed') return badRequest('This lab request already has a result');

      // REQ-F-040: look up reference ranges
      const rangeRes = await pool.query(
        `SELECT normal_min, normal_max, critical_min, critical_max, unit
         FROM lab_reference_ranges WHERE test_name = $1`,
        [req.test_name],
      );
      let normalMin = 0, normalMax = 9999, criticalMin = 0, criticalMax = 99999, unit = '';
      if (rangeRes.rowCount) {
        const r = rangeRes.rows[0];
        normalMin = Number(r.normal_min); normalMax = Number(r.normal_max);
        criticalMin = Number(r.critical_min); criticalMax = Number(r.critical_max);
        unit = r.unit as string;
      }

      const resultStatus = classify(resultValue, normalMin, normalMax, criticalMin, criticalMax);

      // REQ-F-025: always INSERT, never UPDATE existing clinical records
      const insertRes = await pool.query(
        `INSERT INTO lab_results
           (request_id, hospital_id, patient_id, test_name,
            result_value, unit,
            reference_range_min, reference_range_max,
            critical_range_min,  critical_range_max,
            result_status, date_time_tested, lab_technician_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          body.requestId, hospitalId, req.patient_id, req.test_name,
          resultValue, unit, normalMin, normalMax, criticalMin, criticalMax,
          resultStatus, new Date(body.dateTimeTested).toISOString(), userId,
        ],
      );
      const newResultId = insertRes.rows[0].id as string;

      await pool.query(
        `UPDATE lab_test_requests SET status = 'completed' WHERE id = $1 AND hospital_id = $2`,
        [body.requestId, hospitalId],
      );

      await writeAuditLog(pool, {
        userId, hospitalId, patientId: req.patient_id,
        actionType: 'CREATE', resourceType: 'lab_result',
        resourceId: newResultId, ipAddress: ip,
      });

      logger.info('Lab result created', userId, hospitalId, { newResultId, resultStatus });

      // REQ-F-041: dispatch critical alert (must not fail the result save)
      if (resultStatus === 'critical') {
        try {
          await dispatchCriticalAlert({
            pool, hospitalId, patientId: req.patient_id,
            testName: req.test_name, resultValue, unit,
            requestedBy: req.requested_by,
            encounterId: req.encounter_id,
            userId, logger,
          });
        } catch (alertErr: unknown) {
          logger.error('Critical alert dispatch failed', userId, hospitalId, { error: String(alertErr) });
        }
      }

      return created({ result: { id: newResultId, resultStatus: statusLabel(resultStatus) } });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Missing JWT')) return forbidden();
      if (err instanceof Error && err.message.includes('Forbidden')) return forbidden(err.message);
      logger.error('POST /laboratory/results failed', '', '', { error: String(err) });
      return serverError();
    }
  }

  // ── GET /laboratory/results/{id} ──────────────────────────────────────
  if (method === 'GET' && segments[0] === 'laboratory' && segments[1] === 'results' && segments.length === 3 && isUuid(segments[2])) {
    const resultId = segments[2];
    try {
      const pool   = await getDbPool();
      const claims = getClaims(event);
      const { userId, hospitalId } = claims;
      await requirePermission(pool, userId, hospitalId, 'lab_result:read');

      const res = await pool.query(
        `SELECT
           lr.id,
           lr.patient_id,
           p.full_name            AS "patientName",
           p.patient_number       AS "patientNumber",
           lr.test_name           AS "testName",
           lr.result_value        AS "resultValue",
           lr.unit,
           lr.reference_range_min AS "referenceRangeMin",
           lr.reference_range_max AS "referenceRangeMax",
           lr.result_status       AS "resultStatus",
           lr.date_time_tested    AS "dateTimeTested",
           u.full_name            AS "technician",
           lr.lab_technician_id   AS "technicianId",
           ltr.encounter_id       AS "encounterId",
           lr.original_result_id  AS "originalResultId",
           lr.correction_reason   AS "correctionReason",
           lr.created_at          AS "createdAt"
         FROM lab_results lr
         JOIN lab_test_requests ltr ON ltr.id = lr.request_id
         JOIN patients p ON p.id = lr.patient_id
         JOIN users u    ON u.id = lr.lab_technician_id
         WHERE lr.id = $1 AND lr.hospital_id = $2`,
        [resultId, hospitalId],
      );
      if (res.rowCount === 0) return notFound('Lab result not found');
      const row = res.rows[0];

      // Build amendment history: if this result corrected another, show original value
      const amendments: Array<{ amendedAt: string; amendedBy: string; originalValue: string; reason: string }> = [];
      if (row.originalResultId) {
        const origRes = await pool.query(
          `SELECT result_value, unit FROM lab_results WHERE id = $1`,
          [row.originalResultId],
        );
        if (origRes.rowCount) {
          amendments.push({
            amendedAt:     row.createdAt,
            amendedBy:     row.technician,
            originalValue: `${origRes.rows[0].result_value} ${origRes.rows[0].unit}`,
            reason:        (row.correctionReason as string | null) ?? '',
          });
        }
      }

      await writeAuditLog(pool, {
        userId, hospitalId, patientId: row.patient_id,
        actionType: 'READ', resourceType: 'lab_result',
        resourceId: resultId, ipAddress: ip,
      });

      const rv       = Number(row.resultValue);
      const rMin     = Number(row.referenceRangeMin);
      const rMax     = Number(row.referenceRangeMax);
      const status   = statusLabel(row.resultStatus as string);
      const bn       = buildBreachNote(rv, row.unit as string, rMin, rMax, row.resultStatus as string);
      const refRange = (row.referenceRangeMin !== null && row.referenceRangeMax !== null)
        ? `Normal: ${rMin} - ${rMax} ${row.unit}`
        : 'Reference range not available';

      logger.info('Lab result fetched', userId, hospitalId, { resultId });
      return ok({
        result: {
          id:             row.id,
          patientId:      row.patient_id,
          patientNumber:  row.patientNumber,
          patientName:    row.patientName,
          testName:       row.testName,
          resultDisplay:  String(rv),
          unit:           row.unit,
          referenceRange: refRange,
          status,
          breachNote:     bn,
          testedAt:       row.dateTimeTested,
          technician:     row.technician,
          encounterId:    row.encounterId,
          encPatientId:   row.patient_id,
          isOwnResult:    row.technicianId === userId,
          amendments:     amendments.length > 0 ? amendments : undefined,
          documentUrl:    null,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Missing JWT')) return forbidden();
      if (err instanceof Error && err.message.includes('Forbidden')) return forbidden(err.message);
      logger.error('GET /laboratory/results/{id} failed', '', '', { error: String(err) });
      return serverError();
    }
  }

  // ── PUT /laboratory/results/{id}/correct ─────────────────────────────
  if (
    method === 'PUT' &&
    segments[0] === 'laboratory' && segments[1] === 'results' &&
    segments.length === 4 && isUuid(segments[2]) && segments[3] === 'correct'
  ) {
    const originalId = segments[2];
    try {
      const pool   = await getDbPool();
      const claims = getClaims(event);
      const { userId, hospitalId } = claims;
      await requirePermission(pool, userId, hospitalId, 'lab_result:update');

      const body = JSON.parse(event.body ?? '{}') as {
        resultValue?: unknown;
        dateTimeTested?: string;
        reason?: string;
      };
      if (body.resultValue === undefined) return badRequest('resultValue is required');
      if (!body.reason) return badRequest('reason is required for a result correction');
      const resultValue = Number(body.resultValue);
      if (isNaN(resultValue)) return badRequest('resultValue must be a number');

      const origRes = await pool.query(
        `SELECT id, request_id, patient_id, test_name, unit,
                reference_range_min, reference_range_max,
                critical_range_min, critical_range_max,
                lab_technician_id, date_time_tested, superseded
         FROM lab_results WHERE id = $1 AND hospital_id = $2`,
        [originalId, hospitalId],
      );
      if (origRes.rowCount === 0) return notFound('Lab result not found');
      const orig = origRes.rows[0];
      if (orig.superseded) return badRequest('This result has already been superseded by a correction');
      if (orig.lab_technician_id !== userId) {
        return forbidden('Only the original lab technician can correct this result');
      }

      const normalMin   = Number(orig.reference_range_min);
      const normalMax   = Number(orig.reference_range_max);
      const criticalMin = Number(orig.critical_range_min);
      const criticalMax = Number(orig.critical_range_max);
      const resultStatus = classify(resultValue, normalMin, normalMax, criticalMin, criticalMax);
      const testedAt    = body.dateTimeTested
        ? new Date(body.dateTimeTested).toISOString()
        : (orig.date_time_tested as string);

      // REQ-F-025: insert corrected row, mark original superseded
      const newRes = await pool.query(
        `INSERT INTO lab_results
           (request_id, hospital_id, patient_id, test_name,
            result_value, unit,
            reference_range_min, reference_range_max,
            critical_range_min,  critical_range_max,
            result_status, date_time_tested, lab_technician_id,
            original_result_id, correction_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [
          orig.request_id, hospitalId, orig.patient_id, orig.test_name,
          resultValue, orig.unit, normalMin, normalMax, criticalMin, criticalMax,
          resultStatus, testedAt, userId, originalId, body.reason,
        ],
      );
      const newId = newRes.rows[0].id as string;

      await pool.query(
        `UPDATE lab_results SET superseded = true WHERE id = $1 AND hospital_id = $2`,
        [originalId, hospitalId],
      );

      await writeAuditLog(pool, {
        userId, hospitalId, patientId: orig.patient_id,
        actionType: 'AMEND', resourceType: 'lab_result',
        resourceId: newId, ipAddress: ip,
      });

      logger.info('Lab result corrected', userId, hospitalId, { originalId, newId, resultStatus });

      if (resultStatus === 'critical') {
        try {
          await sns.send(new PublishCommand({
            TopicArn: process.env.CRITICAL_LAB_ALERTS_TOPIC_ARN,
            Subject: `CRITICAL LAB RESULT (CORRECTED) - ${orig.test_name}`,
            Message: `CORRECTED CRITICAL LAB RESULT\n\nTest: ${orig.test_name}\nResult: ${resultValue} ${orig.unit}\nPatient: ${orig.patient_id}\nCorrected by: ${userId}`,
          }));
        } catch (alertErr: unknown) {
          logger.error('Critical alert for correction failed', userId, hospitalId, { error: String(alertErr) });
        }
      }

      return ok({ result: { id: newId, originalId, resultStatus: statusLabel(resultStatus) } });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Missing JWT')) return forbidden();
      if (err instanceof Error && err.message.includes('Forbidden')) return forbidden(err.message);
      logger.error('PUT /laboratory/results/{id}/correct failed', '', '', { error: String(err) });
      return serverError();
    }
  }

  return notFound('Route not found');
};
