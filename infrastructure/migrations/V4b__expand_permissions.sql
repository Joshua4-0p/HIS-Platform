-- V4b: Replace 13 coarse-grained permissions with 33 granular permissions (REQ-F-010)
-- and re-seed default role_permissions for all 6 null-hospital-id template roles.
-- Existing hospital-specific role_permissions are cleared; Hospital Admins
-- must re-assign permissions to custom roles via the Role Management UI.

DELETE FROM role_permissions;

DELETE FROM permissions;

INSERT INTO permissions (name) VALUES
  ('patient:create'),
  ('patient:read'),
  ('patient:update'),
  ('patient:delete'),
  ('patient:amend'),
  ('appointment:create'),
  ('appointment:read'),
  ('appointment:update'),
  ('appointment:cancel'),
  ('encounter:create'),
  ('encounter:read'),
  ('diagnosis:create'),
  ('diagnosis:read'),
  ('vitals:create'),
  ('vitals:read'),
  ('prescription:create'),
  ('prescription:read'),
  ('lab_result:create'),
  ('lab_result:read'),
  ('lab_result:update'),
  ('bulk_upload:create'),
  ('bulk_upload:read'),
  ('transfer:request'),
  ('transfer:approve'),
  ('analytics:view'),
  ('staff:create'),
  ('staff:read'),
  ('staff:update'),
  ('staff:deactivate'),
  ('role:create'),
  ('role:update'),
  ('role:delete'),
  ('role:assign');

-- Hospital Admin: all 33 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Hospital Admin' AND r.hospital_id IS NULL
ON CONFLICT DO NOTHING;

-- Doctor: clinical read/write + appointment management + transfers
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = ANY(ARRAY[
  'patient:read', 'patient:amend',
  'encounter:create', 'encounter:read',
  'diagnosis:create', 'diagnosis:read',
  'vitals:create', 'vitals:read',
  'prescription:create', 'prescription:read',
  'lab_result:read',
  'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel',
  'transfer:request',
  'analytics:view'
])
WHERE r.name = 'Doctor' AND r.hospital_id IS NULL
ON CONFLICT DO NOTHING;

-- Nurse: patient read, encounter/vitals/diagnosis/prescription read, appointment management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = ANY(ARRAY[
  'patient:read',
  'encounter:read',
  'vitals:create', 'vitals:read',
  'diagnosis:read',
  'prescription:read',
  'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel'
])
WHERE r.name = 'Nurse' AND r.hospital_id IS NULL
ON CONFLICT DO NOTHING;

-- Laboratory Technician: patient/encounter read, lab result create/read/update
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = ANY(ARRAY[
  'patient:read',
  'encounter:read',
  'lab_result:create', 'lab_result:read', 'lab_result:update'
])
WHERE r.name = 'Laboratory Technician' AND r.hospital_id IS NULL
ON CONFLICT DO NOTHING;

-- Receptionist: patient create/read/update, appointment management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = ANY(ARRAY[
  'patient:create', 'patient:read', 'patient:update',
  'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel'
])
WHERE r.name = 'Receptionist' AND r.hospital_id IS NULL
ON CONFLICT DO NOTHING;

-- Data Clerk: patient create/read/update, bulk upload
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = ANY(ARRAY[
  'patient:create', 'patient:read', 'patient:update',
  'bulk_upload:create', 'bulk_upload:read'
])
WHERE r.name = 'Data Clerk' AND r.hospital_id IS NULL
ON CONFLICT DO NOTHING;
