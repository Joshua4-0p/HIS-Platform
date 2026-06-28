-- V8__create_lab_tables.sql
-- Laboratory test requests and results (REQ-F-039 to REQ-F-043)
-- result_status drives critical alert routing (REQ-F-040, REQ-F-041)
-- lab_results.lab_technician_id: auto-populated from session for REQ-F-039

CREATE TABLE lab_test_requests (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id  UUID         REFERENCES encounters(id),
  hospital_id   UUID         NOT NULL,
  patient_id    UUID         NOT NULL REFERENCES patients(id),
  test_name     VARCHAR(100) NOT NULL,
  urgency       VARCHAR(10)  NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent')),
  notes         TEXT,
  status        VARCHAR(10)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  requested_by  UUID         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX lab_requests_hospital_status_idx ON lab_test_requests (hospital_id, status, created_at ASC);
CREATE INDEX lab_requests_patient_id_idx      ON lab_test_requests (patient_id);

CREATE TABLE lab_results (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID          NOT NULL REFERENCES lab_test_requests(id),
  hospital_id           UUID          NOT NULL,
  patient_id            UUID          NOT NULL,
  test_name             VARCHAR(100)  NOT NULL,
  result_value          NUMERIC       NOT NULL,
  unit                  VARCHAR(30)   NOT NULL,
  reference_range_min   NUMERIC,
  reference_range_max   NUMERIC,
  critical_range_min    NUMERIC,
  critical_range_max    NUMERIC,
  result_status         VARCHAR(10)   NOT NULL CHECK (result_status IN ('normal', 'abnormal', 'critical')),
  date_time_tested      TIMESTAMPTZ   NOT NULL,
  lab_technician_id     UUID          NOT NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX lab_results_hospital_patient_idx ON lab_results (hospital_id, patient_id);
CREATE INDEX lab_results_request_id_idx       ON lab_results (request_id);
CREATE INDEX lab_results_status_idx           ON lab_results (hospital_id, result_status);
