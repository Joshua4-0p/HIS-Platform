-- V2__create_hospitals_table.sql
-- Hospital tenant table (REQ-F-001, REQ-F-006, REQ-F-007)
-- Each row is one hospital tenant. All patient and staff queries include hospital_id filter.

CREATE TABLE hospitals (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  address          TEXT         NOT NULL,
  region_district  VARCHAR(100) NOT NULL,
  type             VARCHAR(20)  NOT NULL CHECK (type IN ('public', 'private', 'mission')),
  admin_email      VARCHAR(255) NOT NULL UNIQUE,
  contact_phone    VARCHAR(30),
  contact_email    VARCHAR(255),
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'active', 'suspended')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX hospitals_status_idx ON hospitals (status);
