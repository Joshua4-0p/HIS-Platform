import { Pool } from 'pg';

// REQ-F-012: permission check on every API request - reject with 403 if missing
// REQ-NF-011: JWT + permission check before any business logic
// REQ-F-010: granular permission set - 33 atomic permissions across 13 resource groups
export type Permission =
  // Patient management
  | 'patient:create' | 'patient:read' | 'patient:update' | 'patient:delete' | 'patient:amend'
  // Appointment management
  | 'appointment:create' | 'appointment:read' | 'appointment:update' | 'appointment:cancel'
  // Clinical encounters (create-only per REQ-F-025 - no update/delete)
  | 'encounter:create' | 'encounter:read'
  // Diagnoses (create-only per REQ-F-025)
  | 'diagnosis:create' | 'diagnosis:read'
  // Vital signs (create-only per REQ-F-025)
  | 'vitals:create' | 'vitals:read'
  // Prescriptions (create-only per REQ-F-025)
  | 'prescription:create' | 'prescription:read'
  // Lab results (update = correction via new versioned row, not overwrite - REQ-F-025)
  | 'lab_result:create' | 'lab_result:read' | 'lab_result:update'
  // Bulk data ingestion
  | 'bulk_upload:create' | 'bulk_upload:read'
  // Patient transfers
  | 'transfer:request' | 'transfer:approve'
  // Analytics and reporting
  | 'analytics:view'
  // Staff management
  | 'staff:create' | 'staff:read' | 'staff:update' | 'staff:deactivate'
  // Role management
  | 'role:create' | 'role:update' | 'role:delete' | 'role:assign';

export async function hasPermission(
  pool: Pool,
  userId: string,
  hospitalId: string,
  permission: Permission
): Promise<boolean> {
  // user_roles(user_id, role_id) — no hospital_id column; hospital isolation via users table
  // permissions(id, name) — column is 'name', not 'permission_name'
  const result = await pool.query(
    `SELECT 1
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
       AND u.hospital_id = $2
       AND p.name = $3
     LIMIT 1`,
    [userId, hospitalId, permission]
  );
  return result.rowCount! > 0;
}

export async function requirePermission(
  pool: Pool,
  userId: string,
  hospitalId: string,
  permission: Permission
): Promise<void> {
  const allowed = await hasPermission(pool, userId, hospitalId, permission);
  if (!allowed) {
    const err = new Error(`Forbidden: missing permission ${permission}`);
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
}
