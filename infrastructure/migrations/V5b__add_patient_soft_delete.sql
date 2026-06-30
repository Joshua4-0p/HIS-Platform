-- V5b: Add soft-delete columns to patients table (REQ-F-019, patient:delete permission)
-- Deactivated patients are hidden from search but records are preserved for audit.
-- Also adds lab_results correction columns for PUT /lab/results/{id}/correct (REQ-F-025).

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID;

CREATE INDEX IF NOT EXISTS patients_is_active_idx ON patients (hospital_id, is_active);

-- Lab result correction support: versioned correction rows (REQ-F-025 - no overwrite)
-- original_result_id: FK to the row being corrected (null for original entries)
-- superseded: true on the original row once a correction is entered
ALTER TABLE lab_results
  ADD COLUMN IF NOT EXISTS original_result_id UUID REFERENCES lab_results(id),
  ADD COLUMN IF NOT EXISTS superseded         BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS lab_results_original_idx   ON lab_results (original_result_id) WHERE original_result_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lab_results_superseded_idx ON lab_results (hospital_id, superseded);
