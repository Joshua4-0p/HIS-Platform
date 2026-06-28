-- V4__create_roles_permissions_tables.sql
-- RBAC: roles, permissions, role-permission mapping, user-role assignment (REQ-F-008 to REQ-F-014)
-- Default roles seeded with NULL hospital_id as system templates.
-- Hospital service copies these templates per hospital at onboarding (REQ-F-009).

CREATE TABLE roles (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  UUID         REFERENCES hospitals(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  is_default   BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, name)
);

CREATE TABLE permissions (
  id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE role_permissions (
  role_id        UUID  REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  UUID  REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- One active role per user within a hospital (REQ-F-008)
CREATE TABLE user_roles (
  user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,
  role_id      UUID        REFERENCES roles(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Immutable log of all role assignment changes (REQ-F-014)
CREATE TABLE role_assignment_history (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID        NOT NULL,
  admin_user_id    UUID        NOT NULL,
  affected_user_id UUID        NOT NULL,
  previous_role_id UUID,
  new_role_id      UUID        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX role_assignment_history_hospital_idx ON role_assignment_history (hospital_id, created_at DESC);

-- Seed all 13 atomic permissions (REQ-F-010)
INSERT INTO permissions (name) VALUES
  ('patient:read'),
  ('patient:write'),
  ('patient:amend'),
  ('diagnosis:write'),
  ('lab_result:read'),
  ('lab_result:write'),
  ('prescription:write'),
  ('appointment:write'),
  ('analytics:view'),
  ('staff:manage'),
  ('role:assign'),
  ('transfer:request'),
  ('transfer:approve');

-- Seed default role templates with NULL hospital_id (REQ-F-009)
-- Pharmacist role explicitly NOT seeded (REQ-F-009, SRS Section 1.4.2)
INSERT INTO roles (id, name, is_default) VALUES
  (gen_random_uuid(), 'Hospital Admin',        true),
  (gen_random_uuid(), 'Doctor',                true),
  (gen_random_uuid(), 'Nurse',                 true),
  (gen_random_uuid(), 'Laboratory Technician', true),
  (gen_random_uuid(), 'Receptionist',          true),
  (gen_random_uuid(), 'Data Clerk',            true);
