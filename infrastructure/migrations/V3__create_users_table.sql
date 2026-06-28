-- V3__create_users_table.sql
-- Staff user accounts linked to Cognito identities (REQ-F-008, REQ-F-013)
-- cognito_user_id is populated when Cognito user is created at onboarding
-- ward_head_unit: designates nurse as ward head for a unit (REQ-F-041 alert routing)

CREATE TABLE users (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID         REFERENCES hospitals(id) ON DELETE CASCADE,
  cognito_user_id   VARCHAR(255) UNIQUE,
  full_name         VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  job_title         VARCHAR(255) NOT NULL,
  region_district   VARCHAR(100) NOT NULL,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  ward_head_unit    VARCHAR(100),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, email)
);

CREATE INDEX users_hospital_active_idx ON users (hospital_id, is_active);
CREATE INDEX users_cognito_id_idx      ON users (cognito_user_id);
