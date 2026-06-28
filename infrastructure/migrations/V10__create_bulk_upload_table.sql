-- V10__create_bulk_upload_table.sql
-- Bulk CSV ingestion job tracking (REQ-F-044 to REQ-F-048)
-- file_key: S3 object key for the uploaded CSV (archived per REQ-F-048)
-- error_report: JSONB array of per-row errors for SES completion email (REQ-F-047)

CREATE TABLE bulk_upload_jobs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID         NOT NULL,
  uploaded_by       UUID         NOT NULL,
  file_key          TEXT         NOT NULL,
  status            VARCHAR(12)  NOT NULL DEFAULT 'processing'
                      CHECK (status IN ('processing', 'completed', 'failed')),
  total_records     INTEGER      NOT NULL DEFAULT 0,
  inserted_records  INTEGER      NOT NULL DEFAULT 0,
  duplicate_records INTEGER      NOT NULL DEFAULT 0,
  failed_records    INTEGER      NOT NULL DEFAULT 0,
  error_report      JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX bulk_upload_jobs_hospital_idx ON bulk_upload_jobs (hospital_id, created_at DESC);
CREATE INDEX bulk_upload_jobs_status_idx   ON bulk_upload_jobs (status);
