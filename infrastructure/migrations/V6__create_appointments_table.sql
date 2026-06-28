-- V6__create_appointments_table.sql
-- Appointment scheduling (REQ-F-029 to REQ-F-033)
-- Double-booking prevented via unique index on (clinician_id, date_time) at API layer
-- Cancelled appointments retained with reason for continuity of care (REQ-F-032)

CREATE TABLE appointments (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id          UUID         NOT NULL REFERENCES hospitals(id),
  patient_id           UUID         NOT NULL REFERENCES patients(id),
  date_time            TIMESTAMPTZ  NOT NULL,
  type                 VARCHAR(20)  NOT NULL
                         CHECK (type IN ('consultation', 'follow-up', 'laboratory', 'procedure')),
  clinician_id         UUID         NOT NULL REFERENCES users(id),
  clinical_unit        VARCHAR(100) NOT NULL,
  status               VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  cancellation_reason  TEXT,
  created_by           UUID         NOT NULL,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX appointments_hospital_id_idx         ON appointments (hospital_id);
CREATE INDEX appointments_patient_id_idx          ON appointments (patient_id);
-- Supports double-booking check (REQ-F-030) and calendar view (REQ-F-031)
CREATE INDEX appointments_clinician_datetime_idx  ON appointments (clinician_id, date_time);
CREATE INDEX appointments_hospital_date_idx       ON appointments (hospital_id, date_time);
