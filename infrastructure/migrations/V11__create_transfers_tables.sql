-- V11__create_transfers_tables.sql
-- Cross-hospital patient transfer workflow (REQ-F-049 to REQ-F-057)
-- patient_transfers: access request lifecycle (pending -> approved/denied)
-- transfer_grants: active time-limited access grants with expiry tracking (REQ-F-054, REQ-F-055)

CREATE TABLE patient_transfers (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id             UUID         NOT NULL REFERENCES patients(id),
  source_hospital_id     UUID         NOT NULL REFERENCES hospitals(id),
  requesting_hospital_id UUID         NOT NULL REFERENCES hospitals(id),
  reason                 TEXT         NOT NULL,
  access_type            VARCHAR(15)  NOT NULL CHECK (access_type IN ('VIEW_ONLY', 'VIEW_AND_EDIT')),
  status                 VARCHAR(10)  NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'denied')),
  decided_by             UUID,
  decided_at             TIMESTAMPTZ,
  grant_duration_days    INTEGER      NOT NULL DEFAULT 7,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX patient_transfers_source_hospital_idx     ON patient_transfers (source_hospital_id, status);
CREATE INDEX patient_transfers_requesting_hospital_idx ON patient_transfers (requesting_hospital_id, status);

CREATE TABLE transfer_grants (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_request_id   UUID         NOT NULL REFERENCES patient_transfers(id),
  patient_id            UUID         NOT NULL,
  source_hospital_id    UUID         NOT NULL,
  receiving_hospital_id UUID         NOT NULL,
  access_type           VARCHAR(15)  NOT NULL CHECK (access_type IN ('VIEW_ONLY', 'VIEW_AND_EDIT')),
  expires_at            TIMESTAMPTZ  NOT NULL,
  expiry_warning_sent   BOOLEAN      NOT NULL DEFAULT false,
  revoked_by            UUID,
  revoked_at            TIMESTAMPTZ,
  is_active             BOOLEAN      NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Supports expiry warning cron job (REQ-F-054): find grants expiring within 24h with no warning sent
CREATE INDEX transfer_grants_expiry_idx    ON transfer_grants (expires_at, is_active, expiry_warning_sent);
CREATE INDEX transfer_grants_receiving_idx ON transfer_grants (receiving_hospital_id, is_active);
CREATE INDEX transfer_grants_patient_idx   ON transfer_grants (patient_id, is_active);
