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
  const logger    = createLogger({ functionName: 'his-lab-service', requestId });

  // Paths served:
  // GET  /lab/results              — lab technician work queue (pending requests)
  // POST /lab/results              — record a result for a lab_test_request
  // GET  /lab/results/{id}         — single result
  // PUT  /lab/results/{id}/correct — versioned correction (REQ-F-025: no overwrite)

  const segments = rawPath.split('/').filter(Boolean);
  if (segments[0] !== 'lab' || segments[1] !== 'results') return notFound();

  try {
    const pool   = await getDbPool();
    const body   = event.body ? JSON.parse(event.body) : {};
    const claims = getClaims(event);
    const { userId, hospitalId } = claims;

    // ── GET /lab/results ─────────────────────────────────────────────────────
    if (method === 'GET' && segments.length === 2) {
      await requirePermission(pool, userId, hospitalId, 'lab_result:read');

      const statusFilter = event.queryStringParameters?.status ?? 'pending';
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(statusFilter)) {
        return badRequest('status must be pending, in_progress, completed, or cancelled.');
      }

      const res = await pool.query(
        `SELECT ltr.id, ltr.test_name, ltr.urgency, ltr.status, ltr.notes,
                ltr.created_at AS requested_at,
                p.id AS patient_id, p.full_name AS patient_name, p.patient_number,
                u.full_name AS requested_by_name
         FROM lab_test_requests ltr
         JOIN patients p ON p.id = ltr.patient_id
         LEFT JOIN users u ON u.id = ltr.requested_by
         WHERE ltr.hospital_id = $1 AND ltr.status = $2
         ORDER BY
           CASE ltr.urgency WHEN 'urgent' THEN 0 ELSE 1 END,
           ltr.created_at ASC`,
        [hospitalId, statusFilter],
      );

      logger.info('GET /lab/results', userId, hospitalId, { statusFilter, count: res.rows.length });
      return ok({
        results: res.rows.map((r) => ({
          requestId:       r.id,
          testName:        r.test_name,
          urgency:         r.urgency,
          status:          r.status,
          notes:           r.notes,
          requestedAt:     r.requested_at,
          patientId:       r.patient_id,
          patientName:     r.patient_name,
          patientNumber:   r.patient_number,
          requestedByName: r.requested_by_name,
        })),
      });
    }

    // ── POST /lab/results ────────────────────────────────────────────────────
    if (method === 'POST' && segments.length === 2) {
      await requirePermission(pool, userId, hospitalId, 'lab_result:create');

      const { requestId: labRequestId, findings, referenceRange, interpretation, additionalNotes } = body;
      if (!labRequestId || !findings) {
        return badRequest('requestId and findings are required.');
      }
      if (!isUuid(labRequestId)) return badRequest('Invalid requestId.');

      const reqRes = await pool.query(
        `SELECT id, patient_id, test_name, status
         FROM lab_test_requests
         WHERE id = $1 AND hospital_id = $2`,
        [labRequestId, hospitalId],
      );
      if (reqRes.rows.length === 0) return notFound('Lab test request not found.');
      if (reqRes.rows[0].status === 'completed') {
        return badRequest('Result already recorded. Use PUT /lab/results/{id}/correct to issue a correction.');
      }

      const { patient_id: patientId, test_name: testName } = reqRes.rows[0];

      const insertRes = await pool.query(
        `INSERT INTO lab_results
           (hospital_id, patient_id, request_id, test_name, findings, reference_range,
            interpretation, additional_notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, test_name, findings, reference_range, interpretation, additional_notes, created_at`,
        [hospitalId, patientId, labRequestId, testName, findings,
          referenceRange ?? null, interpretation ?? null, additionalNotes ?? null, userId],
      );
      const result = insertRes.rows[0];

      await pool.query(
        "UPDATE lab_test_requests SET status = 'completed' WHERE id = $1",
        [labRequestId],
      );

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'CREATE', resourceType: 'lab_result', resourceId: result.id, ipAddress: ip,
      });

      logger.info('POST /lab/results', userId, hospitalId, { labResultId: result.id, patientId });
      return created({
        id:               result.id,
        testName:         result.test_name,
        findings:         result.findings,
        referenceRange:   result.reference_range,
        interpretation:   result.interpretation,
        additionalNotes:  result.additional_notes,
        createdAt:        result.created_at,
      });
    }

    const resultId = segments[2];
    if (!isUuid(resultId)) return badRequest('Invalid result ID.');

    // ── GET /lab/results/{id} ────────────────────────────────────────────────
    if (method === 'GET' && segments.length === 3) {
      await requirePermission(pool, userId, hospitalId, 'lab_result:read');

      const res = await pool.query(
        `SELECT lr.id, lr.test_name, lr.findings, lr.reference_range,
                lr.interpretation, lr.additional_notes, lr.created_at,
                lr.original_result_id, lr.superseded,
                u.full_name AS recorded_by_name,
                p.full_name AS patient_name, p.patient_number
         FROM lab_results lr
         JOIN patients p ON p.id = lr.patient_id
         LEFT JOIN users u ON u.id = lr.recorded_by
         WHERE lr.id = $1 AND lr.hospital_id = $2`,
        [resultId, hospitalId],
      );
      if (res.rows.length === 0) return notFound('Lab result not found.');
      const r = res.rows[0];

      // Fetch correction chain if this is an original (find correction that supersedes it)
      const correctionRes = await pool.query(
        `SELECT id, test_name, findings, interpretation, created_at
         FROM lab_results
         WHERE original_result_id = $1 AND hospital_id = $2
         ORDER BY created_at ASC`,
        [resultId, hospitalId],
      );

      await writeAuditLog(pool, {
        userId, hospitalId,
        actionType: 'READ', resourceType: 'lab_result', resourceId: resultId, ipAddress: ip,
      });

      logger.info('GET /lab/results/:id', userId, hospitalId, { resultId });
      return ok({
        id:               r.id,
        testName:         r.test_name,
        findings:         r.findings,
        referenceRange:   r.reference_range,
        interpretation:   r.interpretation,
        additionalNotes:  r.additional_notes,
        createdAt:        r.created_at,
        recordedByName:   r.recorded_by_name,
        patientName:      r.patient_name,
        patientNumber:    r.patient_number,
        isSuperseded:     r.superseded,
        originalResultId: r.original_result_id,
        corrections:      correctionRes.rows.map((c) => ({
          id: c.id, findings: c.findings, interpretation: c.interpretation, createdAt: c.created_at,
        })),
      });
    }

    const action = segments[3];

    // ── PUT /lab/results/{id}/correct ────────────────────────────────────────
    // REQ-F-025: clinical records are immutable. Corrections create a new versioned row
    // and mark the original as superseded=true — no overwrite.
    if (method === 'PUT' && action === 'correct' && segments.length === 4) {
      await requirePermission(pool, userId, hospitalId, 'lab_result:update');

      const { findings, referenceRange, interpretation, additionalNotes, correctionReason } = body;
      if (!findings) return badRequest('findings is required for a correction.');
      if (!correctionReason) return badRequest('correctionReason is required.');

      const origRes = await pool.query(
        `SELECT id, patient_id, test_name, superseded
         FROM lab_results
         WHERE id = $1 AND hospital_id = $2`,
        [resultId, hospitalId],
      );
      if (origRes.rows.length === 0) return notFound('Original lab result not found.');

      const { patient_id: patientId, test_name: testName, superseded } = origRes.rows[0];
      if (superseded) {
        return badRequest('This result has already been superseded. Correct the most recent active result instead.');
      }

      // Insert the correction row referencing the original
      const corrRes = await pool.query(
        `INSERT INTO lab_results
           (hospital_id, patient_id, request_id, test_name, findings, reference_range,
            interpretation, additional_notes, recorded_by, original_result_id)
         SELECT hospital_id, patient_id, request_id, test_name, $3, $4, $5, $6, $7, $1
         FROM lab_results WHERE id = $1 AND hospital_id = $2
         RETURNING id, test_name, findings, reference_range, interpretation, created_at`,
        [resultId, hospitalId, findings, referenceRange ?? null, interpretation ?? null,
          additionalNotes ?? null, userId],
      );
      const correction = corrRes.rows[0];

      // Mark original as superseded (flag only — row is never deleted per REQ-F-025)
      await pool.query(
        'UPDATE lab_results SET superseded = true WHERE id = $1',
        [resultId],
      );

      await writeAuditLog(pool, {
        userId, hospitalId, patientId,
        actionType: 'UPDATE',
        resourceType: 'lab_result',
        resourceId: correction.id,
        ipAddress: ip,
      });

      logger.info('PUT /lab/results/:id/correct', userId, hospitalId,
        { originalId: resultId, correctionId: correction.id, patientId });

      return ok({
        correctionId:    correction.id,
        originalResultId: resultId,
        testName:        correction.test_name,
        findings:        correction.findings,
        referenceRange:  correction.reference_range,
        interpretation:  correction.interpretation,
        createdAt:       correction.created_at,
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
