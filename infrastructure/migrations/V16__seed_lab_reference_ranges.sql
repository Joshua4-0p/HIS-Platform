-- V16__seed_lab_reference_ranges.sql
-- Versioned correction support for lab_results (REQ-F-025)
-- Lab reference ranges table for REQ-F-040 result classification (normal/abnormal/critical)
-- Ranges match the frontend TEST_CATALOG in enter-lab-result-page.tsx

ALTER TABLE lab_results
  ADD COLUMN IF NOT EXISTS superseded         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_result_id UUID    REFERENCES lab_results(id),
  ADD COLUMN IF NOT EXISTS correction_reason  TEXT;

-- Partial index: only non-superseded results need fast lookup by request
CREATE INDEX lab_results_active_idx ON lab_results (hospital_id, request_id)
  WHERE superseded = false;

CREATE TABLE lab_reference_ranges (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name    VARCHAR(100) NOT NULL UNIQUE,
  unit         VARCHAR(30)  NOT NULL,
  normal_min   NUMERIC      NOT NULL,
  normal_max   NUMERIC      NOT NULL,
  critical_min NUMERIC      NOT NULL,
  critical_max NUMERIC      NOT NULL
);

INSERT INTO lab_reference_ranges (test_name, unit, normal_min, normal_max, critical_min, critical_max) VALUES
  ('Full Blood Count',      'g/dL',    11.0,  16.0,  7.0,  20.0),
  ('Malaria RDT',           'index',    0.0,   1.0,  0.0,   3.0),
  ('Fasting Blood Glucose', 'mmol/L',   3.9,   6.1,  2.5,  13.9),
  ('HbA1c',                 '%',        4.0,   5.6,  3.0,  10.0),
  ('Creatinine',            'mg/dL',    0.6,   1.2,  0.1,   4.0),
  ('Liver Function Test',   'U/L',      7.0,  56.0,  0.0, 200.0);
