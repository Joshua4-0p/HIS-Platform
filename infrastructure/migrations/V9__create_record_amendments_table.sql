-- V9__create_record_amendments_table.sql
-- Versioned clinical record amendments (REQ-F-025 to REQ-F-028)
-- Original records are NEVER modified. Amendments create a new row referencing the original.
-- original_data / amended_data stored as JSONB for flexibility across all record types.

CREATE TABLE record_amendments (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  original_record_type VARCHAR(30)  NOT NULL
    CHECK (original_record_type IN
      ('encounter', 'diagnosis', 'vital_signs', 'prescription', 'lab_result')),
  original_record_id   UUID         NOT NULL,
  hospital_id          UUID         NOT NULL,
  amended_by           UUID         NOT NULL,
  amendment_reason     TEXT         NOT NULL,
  original_data        JSONB        NOT NULL,
  amended_data         JSONB        NOT NULL,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX record_amendments_original_idx   ON record_amendments (original_record_type, original_record_id);
CREATE INDEX record_amendments_hospital_idx   ON record_amendments (hospital_id, created_at DESC);
CREATE INDEX record_amendments_amended_by_idx ON record_amendments (amended_by);
