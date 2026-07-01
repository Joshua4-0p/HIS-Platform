import type { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import { getDbPool } from '../shared/db-client';
import { createLogger } from '../shared/structured-logger';

const s3  = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const sns = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const REQUIRED_COLUMNS = [
  'full_name', 'date_of_birth', 'sex', 'phone', 'address', 'region',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
];

interface RowError {
  row:         number;
  column:      string;
  description: string;
}

// Normalise sex from CSV input to DB CHECK constraint values
function normalizeSex(raw: string): 'Male' | 'Female' | 'Other' | null {
  const s = raw.trim().toLowerCase();
  if (s === 'm' || s === 'male')   return 'Male';
  if (s === 'f' || s === 'female') return 'Female';
  if (s === 'o' || s === 'other')  return 'Other';
  return null;
}

// RFC-4180-compliant CSV line splitter (handles quoted fields with embedded commas)
function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current  = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length < headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

async function publishCompletion(
  hospitalId: string,
  jobId:      string,
  total:      number,
  inserted:   number,
  duplicates: number,
  failed:     number,
  status:     string,
  logger:     ReturnType<typeof createLogger>,
): Promise<void> {
  try {
    await sns.send(new PublishCommand({
      TopicArn: process.env.ETL_COMPLETIONS_TOPIC_ARN!,
      Subject:  `HIS Bulk Upload ${status === 'completed' ? 'Complete' : 'Failed'} - Job ${jobId}`,
      Message:  [
        `HIS Bulk Patient Upload - ${status.toUpperCase()}`,
        '',
        `Job ID:    ${jobId}`,
        `Hospital:  ${hospitalId}`,
        `Status:    ${status}`,
        '',
        `Total Rows:   ${total}`,
        `Inserted:     ${inserted}`,
        `Duplicates:   ${duplicates}`,
        `Failed:       ${failed}`,
      ].join('\n'),
    }));
  } catch (snsErr) {
    logger.warn('SNS publish failed', '', hospitalId, { err: String(snsErr) });
  }
}

export async function handler(event: S3Event): Promise<void> {
  const pool = await getDbPool();

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const fileKey    = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Derive hospitalId and jobId from key format: uploads/{hospitalId}/{jobId}.csv
    const keyMatch = /^uploads\/([^/]+)\/([^/]+)\.csv$/.exec(fileKey);
    if (!keyMatch) {
      console.error(JSON.stringify({ level: 'ERROR', message: 'Unexpected S3 key format', fileKey }));
      continue;
    }

    const hospitalId = keyMatch[1];
    const jobId      = keyMatch[2];

    const logger = createLogger({
      functionName: 'his-bulk-ingestion',
      requestId:    jobId,
    });

    logger.info('Processing bulk upload', '', hospitalId, { jobId, fileKey });

    // Look up the uploader from the job record
    const jobRow = await pool.query(
      'SELECT uploaded_by FROM bulk_upload_jobs WHERE id = $1 AND hospital_id = $2',
      [jobId, hospitalId],
    );
    const uploadedBy: string = (jobRow.rows[0]?.uploaded_by as string) ?? uuidv4();

    try {
      // 1. Download CSV from S3
      const s3Obj  = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: fileKey }));
      const chunks: Buffer[] = [];
      for await (const chunk of s3Obj.Body as AsyncIterable<Buffer>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const csvText = Buffer.concat(chunks).toString('utf-8');

      // 2. Validate structure
      const { headers, rows } = parseCsv(csvText);
      const missingColumns = REQUIRED_COLUMNS.filter(c => !headers.includes(c));

      if (missingColumns.length > 0) {
        await pool.query(
          `UPDATE bulk_upload_jobs
           SET status = 'failed', completed_at = NOW(),
               error_report = $1
           WHERE id = $2`,
          [JSON.stringify([{ error: `Missing required columns: ${missingColumns.join(', ')}` }]), jobId],
        );
        await publishCompletion(hospitalId, jobId, 0, 0, 0, 0, 'failed', logger);
        logger.warn('CSV structure validation failed', '', hospitalId, {
          missingColumns: missingColumns.join(', '),
        });
        continue;
      }

      if (rows.length === 0) {
        await pool.query(
          `UPDATE bulk_upload_jobs
           SET status = 'completed', total_records = 0, inserted_records = 0,
               duplicate_records = 0, failed_records = 0, completed_at = NOW()
           WHERE id = $1`,
          [jobId],
        );
        await publishCompletion(hospitalId, jobId, 0, 0, 0, 0, 'completed', logger);
        continue;
      }

      // 3. Initialise counters; get current patient_number sequence
      const totalRecords = rows.length;
      let inserted   = 0;
      let duplicates = 0;
      let failed     = 0;
      const errors: RowError[] = [];

      const countRes = await pool.query(
        'SELECT COUNT(*) AS cnt FROM patients WHERE hospital_id = $1',
        [hospitalId],
      );
      let seq = Number(countRes.rows[0].cnt) + 1;

      // 4. Process in batches of 100 (REQ-NF-006: 500 records/min at 1024 MB)
      for (let batchStart = 0; batchStart < rows.length; batchStart += 100) {
        const batch = rows.slice(batchStart, batchStart + 100);

        for (let i = 0; i < batch.length; i++) {
          const rowNum = batchStart + i + 2; // 2 = 1-based + skip header
          const row    = batch[i];

          try {
            const fullNameVal = (row['full_name'] ?? '').trim();

            // Check pg_trgm similarity against existing patients (REQ-F-020)
            if (fullNameVal.length >= 3) {
              const dupCheck = await pool.query(
                `SELECT MAX(similarity(full_name, $1)) AS max_sim
                 FROM patients WHERE hospital_id = $2`,
                [fullNameVal, hospitalId],
              );
              const maxSim = parseFloat(dupCheck.rows[0]?.max_sim ?? '0');
              if (maxSim > 0.85) {
                duplicates++;
                continue;
              }
            }

            // Validate required fields
            const dobVal    = (row['date_of_birth'] ?? '').trim();
            const sexRaw    = (row['sex']           ?? '').trim();
            const phoneVal  = (row['phone']         ?? '').trim();
            const addrVal   = (row['address']       ?? '').trim();
            const regionVal = (row['region']        ?? '').trim();
            const ecName    = (row['emergency_contact_name']         ?? '').trim();
            const ecPhone   = (row['emergency_contact_phone']        ?? '').trim();
            const ecRel     = (row['emergency_contact_relationship'] ?? '').trim();

            const rowErrors: RowError[] = [];
            if (!fullNameVal) rowErrors.push({ row: rowNum, column: 'full_name', description: 'Required field is empty' });
            if (!dobVal) {
              rowErrors.push({ row: rowNum, column: 'date_of_birth', description: 'Required field is empty' });
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dobVal) || isNaN(Date.parse(dobVal))) {
              rowErrors.push({ row: rowNum, column: 'date_of_birth', description: 'Invalid date format (expected YYYY-MM-DD)' });
            }
            const sexVal = normalizeSex(sexRaw);
            if (!sexVal) rowErrors.push({ row: rowNum, column: 'sex', description: 'Value must be Male, Female, or Other' });
            if (!phoneVal)  rowErrors.push({ row: rowNum, column: 'phone',   description: 'Required field is empty' });
            if (!addrVal)   rowErrors.push({ row: rowNum, column: 'address', description: 'Required field is empty' });
            if (!regionVal) rowErrors.push({ row: rowNum, column: 'region',  description: 'Required field is empty' });
            if (!ecName)    rowErrors.push({ row: rowNum, column: 'emergency_contact_name',         description: 'Required field is empty' });
            if (!ecPhone)   rowErrors.push({ row: rowNum, column: 'emergency_contact_phone',        description: 'Required field is empty' });
            if (!ecRel)     rowErrors.push({ row: rowNum, column: 'emergency_contact_relationship', description: 'Required field is empty' });

            if (rowErrors.length > 0) {
              errors.push(...rowErrors);
              failed++;
              continue;
            }

            // INSERT patient with auto-generated patient_number
            const patientNumber = `HIS-${String(seq).padStart(6, '0')}`;
            seq++;

            await pool.query(
              `INSERT INTO patients (
                 hospital_id, patient_number, full_name, date_of_birth, biological_sex,
                 telephone, address, region_district,
                 emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                 consent_personal_data, consent_public_reporting, created_by
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Pending','Pending',$12)`,
              [
                hospitalId, patientNumber, fullNameVal, dobVal, sexVal,
                phoneVal, addrVal, regionVal,
                ecName, ecPhone, ecRel,
                uploadedBy,
              ],
            );
            inserted++;
          } catch (rowErr) {
            logger.error('Row processing error', '', hospitalId, { rowNum, err: String(rowErr) });
            errors.push({ row: rowNum, column: 'unknown', description: `Processing error: ${String(rowErr)}` });
            failed++;
          }
        }

        // Progress update after each batch
        await pool.query(
          `UPDATE bulk_upload_jobs
           SET total_records = $1, inserted_records = $2,
               duplicate_records = $3, failed_records = $4
           WHERE id = $5`,
          [totalRecords, inserted, duplicates, failed, jobId],
        );
      }

      // 6. Final status update
      const finalStatus = (inserted === 0 && failed > 0) ? 'failed' : 'completed';
      await pool.query(
        `UPDATE bulk_upload_jobs
         SET status = $1, total_records = $2, inserted_records = $3,
             duplicate_records = $4, failed_records = $5,
             error_report = $6, completed_at = NOW()
         WHERE id = $7`,
        [
          finalStatus, totalRecords, inserted, duplicates, failed,
          errors.length > 0 ? JSON.stringify(errors) : null,
          jobId,
        ],
      );

      // 7. Copy to csv-archive (REQ-F-048)
      try {
        await s3.send(new CopyObjectCommand({
          CopySource: `${bucketName}/${fileKey}`,
          Bucket:     process.env.CSV_ARCHIVE_BUCKET!,
          Key:        `${hospitalId}/${jobId}.csv`,
        }));
      } catch (copyErr) {
        logger.warn('Archive copy failed (non-fatal)', '', hospitalId, { err: String(copyErr) });
      }

      // 8. Publish ETL completion to SNS (REQ-F-047)
      await publishCompletion(
        hospitalId, jobId, totalRecords, inserted, duplicates, failed, finalStatus, logger,
      );

      logger.info('Bulk ingestion complete', uploadedBy, hospitalId, {
        jobId, totalRecords, inserted, duplicates, failed, finalStatus,
      });
    } catch (err) {
      logger.error('Bulk ingestion fatal error', '', hospitalId, { jobId, err: String(err) });

      await pool.query(
        `UPDATE bulk_upload_jobs SET status = 'failed', completed_at = NOW() WHERE id = $1`,
        [jobId],
      ).catch(() => {});

      await publishCompletion(hospitalId, jobId, 0, 0, 0, 0, 'failed', logger).catch(() => {});

      // Re-throw so Lambda marks invocation as failed (routes to DLQ)
      throw err;
    }
  }
}
