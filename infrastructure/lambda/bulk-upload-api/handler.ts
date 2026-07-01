import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { getDbPool } from '../shared/db-client';
import { extractClaims } from '../shared/jwt-claims';
import { requirePermission } from '../shared/permission-check';
import { createLogger } from '../shared/structured-logger';
import { ok, created, badRequest, forbidden, notFound, serverError } from '../shared/response';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean { return UUID_RE.test(s); }

type JwtEventShape = Parameters<typeof extractClaims>[0];

function getClaims(event: APIGatewayProxyEventV2) {
  try {
    return extractClaims(event as unknown as JwtEventShape);
  } catch {
    return null;
  }
}

export async function handler(event: APIGatewayProxyEventV2) {
  const logger = createLogger({
    functionName: 'his-bulk-upload-api',
    requestId: event.requestContext.requestId,
  });
  const method = event.requestContext.http.method.toUpperCase();
  const rawPath = event.rawPath;

  try {
    const pool = await getDbPool();

    // GET /bulk-upload/template — return pre-signed GET URL for the CSV template
    if (method === 'GET' && rawPath === '/bulk-upload/template') {
      const claims = getClaims(event);
      if (!claims) return forbidden();

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.CSV_UPLOADS_BUCKET!,
          Key:    'template/his-patient-template.csv',
        }),
        { expiresIn: 3600 },
      );
      logger.info('Template URL generated', claims.userId, claims.hospitalId);
      return ok({ templateUrl: url });
    }

    // POST /bulk-upload/presigned-url — create job + return 60-second PUT URL (REQ-F-044)
    if (method === 'POST' && rawPath === '/bulk-upload/presigned-url') {
      const claims = getClaims(event);
      if (!claims) return forbidden();
      const { userId, hospitalId } = claims;

      try {
        await requirePermission(pool, userId, hospitalId, 'bulk_upload:create');
      } catch {
        return forbidden();
      }

      const jobId   = uuidv4();
      const fileKey = `uploads/${hospitalId}/${jobId}.csv`;

      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket:      process.env.CSV_UPLOADS_BUCKET!,
          Key:         fileKey,
          ContentType: 'text/csv',
        }),
        { expiresIn: 60 },
      );

      await pool.query(
        `INSERT INTO bulk_upload_jobs (id, hospital_id, uploaded_by, file_key, status)
         VALUES ($1, $2, $3, $4, 'processing')`,
        [jobId, hospitalId, userId, fileKey],
      );

      logger.info('Bulk upload job created', userId, hospitalId, { jobId, fileKey });
      return created({ jobId, uploadUrl });
    }

    // GET /bulk-upload/status/{jobId} — poll job progress (REQ-F-046)
    const statusMatch = /^\/bulk-upload\/status\/([^/]+)$/.exec(rawPath);
    if (method === 'GET' && statusMatch) {
      const claims = getClaims(event);
      if (!claims) return forbidden();
      const { userId, hospitalId } = claims;

      const jobId = statusMatch[1];
      if (!isUuid(jobId)) return badRequest('Invalid job ID');

      try {
        await requirePermission(pool, userId, hospitalId, 'bulk_upload:read');
      } catch {
        return forbidden();
      }

      const res = await pool.query(
        `SELECT id, status, total_records, inserted_records, duplicate_records,
                failed_records, error_report, created_at, completed_at
         FROM bulk_upload_jobs WHERE id = $1 AND hospital_id = $2`,
        [jobId, hospitalId],
      );

      if (!res.rowCount) return notFound('Job not found');
      logger.info('Job status queried', userId, hospitalId, {
        jobId,
        status: res.rows[0].status as string,
      });
      return ok(res.rows[0]);
    }

    return notFound('Route not found');
  } catch (err) {
    logger.error('Unhandled error', '', '', { err: String(err) });
    return serverError();
  }
}
