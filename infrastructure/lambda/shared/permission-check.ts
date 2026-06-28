import { Pool } from 'pg';

// REQ-F-012: permission check on every API request - reject with 403 if missing
// REQ-NF-011: JWT + permission check before any business logic
export type Permission =
  | 'patient:read'
  | 'patient:write'
  | 'patient:amend'
  | 'diagnosis:write'
  | 'lab_result:read'
  | 'lab_result:write'
  | 'prescription:write'
  | 'appointment:write'
  | 'analytics:view'
  | 'staff:manage'
  | 'role:assign'
  | 'transfer:request'
  | 'transfer:approve';

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
