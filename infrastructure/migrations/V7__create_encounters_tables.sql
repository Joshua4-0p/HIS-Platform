-- V7__create_encounters_tables.sql
-- Clinical encounter management: encounters, diagnoses, vitals, prescriptions (REQ-F-034 to REQ-F-038)
-- encounter.staff_id: attending clinician FK, used for critical alert routing (REQ-F-041, resolves G-05)

CREATE TABLE encounters (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID         NOT NULL REFERENCES hospitals(id),
  patient_id          UUID         NOT NULL REFERENCES patients(id),
  appointment_id      UUID         REFERENCES appointments(id),
  date_time           TIMESTAMPTZ  NOT NULL,
  clinical_unit       VARCHAR(100) NOT NULL,
  presenting_complaint TEXT        NOT NULL,
  staff_id            UUID         NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX encounters_hospital_patient_idx  ON encounters (hospital_id, patient_id);
CREATE INDEX encounters_hospital_staff_idx    ON encounters (hospital_id, staff_id);
CREATE INDEX encounters_patient_date_idx      ON encounters (patient_id, date_time DESC);

-- Diagnoses linked to encounters (REQ-F-035)
CREATE TABLE diagnoses (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id    UUID         NOT NULL REFERENCES encounters(id),
  hospital_id     UUID         NOT NULL,
  condition_name  VARCHAR(255) NOT NULL,
  icd10_code      VARCHAR(20),
  severity        VARCHAR(10)  NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  status          VARCHAR(10)  NOT NULL CHECK (status IN ('active', 'resolved', 'suspected')),
  recorded_by     UUID         NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX diagnoses_encounter_id_idx  ON diagnoses (encounter_id);
CREATE INDEX diagnoses_hospital_idx      ON diagnoses (hospital_id, created_at DESC);

-- Vital signs per encounter (REQ-F-036)
CREATE TABLE vital_signs (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id       UUID          NOT NULL REFERENCES encounters(id),
  hospital_id        UUID          NOT NULL,
  temperature        NUMERIC(5, 1),
  bp_systolic        INTEGER,
  bp_diastolic       INTEGER,
  pulse_rate         INTEGER,
  respiratory_rate   INTEGER,
  oxygen_saturation  NUMERIC(5, 1),
  weight             NUMERIC(6, 1),
  recorded_by        UUID          NOT NULL,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX vital_signs_encounter_id_idx ON vital_signs (encounter_id);

-- Prescriptions per encounter (REQ-F-037)
CREATE TABLE prescriptions (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id            UUID         NOT NULL REFERENCES encounters(id),
  hospital_id             UUID         NOT NULL,
  patient_id              UUID         NOT NULL,
  medication_name         VARCHAR(255) NOT NULL,
  dosage                  VARCHAR(100) NOT NULL,
  frequency               VARCHAR(50)  NOT NULL,
  route                   VARCHAR(50)  NOT NULL,
  duration                VARCHAR(50)  NOT NULL,
  prescribing_clinician_id UUID        NOT NULL,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX prescriptions_encounter_id_idx ON prescriptions (encounter_id);
CREATE INDEX prescriptions_patient_id_idx   ON prescriptions (patient_id);
