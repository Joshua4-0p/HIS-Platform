-- V5__create_patients_table.sql
-- Patient registration and consent (REQ-F-015, REQ-F-016, REQ-F-019 to REQ-F-024)
-- GIN index on full_name enables pg_trgm trigram similarity for deduplication (REQ-NF-002)
-- patient_number: system-generated immutable identifier displayed in UI (REQ-F-021)

CREATE TABLE patients (
  id                             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id                    UUID         NOT NULL REFERENCES hospitals(id),
  patient_number                 VARCHAR(20)  NOT NULL UNIQUE,
  full_name                      VARCHAR(255) NOT NULL,
  date_of_birth                  DATE         NOT NULL,
  biological_sex                 VARCHAR(10)  NOT NULL CHECK (biological_sex IN ('Male', 'Female', 'Other')),
  telephone                      VARCHAR(30)  NOT NULL,
  address                        TEXT         NOT NULL,
  region_district                VARCHAR(100) NOT NULL,
  emergency_contact_name         VARCHAR(255) NOT NULL,
  emergency_contact_phone        VARCHAR(30)  NOT NULL,
  emergency_contact_relationship VARCHAR(50)  NOT NULL,
  national_id                    VARCHAR(50),
  blood_group                    VARCHAR(5),
  known_allergies                TEXT[],
  chronic_conditions             TEXT[],
  consent_personal_data          VARCHAR(10)  NOT NULL DEFAULT 'Pending'
                                   CHECK (consent_personal_data IN ('Granted', 'Refused', 'Pending')),
  consent_public_reporting       VARCHAR(10)  NOT NULL DEFAULT 'Pending'
                                   CHECK (consent_public_reporting IN ('Granted', 'Refused', 'Pending')),
  consent_updated_at             TIMESTAMPTZ,
  consent_updated_by             UUID,
  created_at                     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by                     UUID         NOT NULL
);

-- GIN trigram index for fast fuzzy name search (REQ-NF-002, REQ-F-022)
-- similarity threshold 0.3 for search, 0.85 for duplicate detection
CREATE INDEX patients_name_trgm_idx   ON patients USING GIN (full_name gin_trgm_ops);
CREATE INDEX patients_hospital_id_idx ON patients (hospital_id);
CREATE INDEX patients_telephone_idx   ON patients (telephone);
CREATE INDEX patients_dob_idx         ON patients (date_of_birth);
