import { Pool } from 'pg';

// Throw if the user lacks the named permission (scoped to their hospital via JWT claims).
// Queries the RBAC tables created in Phase 3 (roles, role_permissions, permissions, user_roles).
export async function assertPermission(
  pool:       Pool,
  userId:     string,
  permission: string,
): Promise<void> {
  const { rowCount } = await pool.query(
    `SELECT 1
     FROM   permissions p
     JOIN   role_permissions rp ON rp.permission_id = p.id
     JOIN   user_roles       ur ON ur.role_id        = rp.role_id
     WHERE  ur.user_id = $1 AND p.name = $2
     LIMIT  1`,
    [userId, permission],
  );
  if (!rowCount) {
    const e = new Error(`FORBIDDEN: permission '${permission}' not granted`);
    (e as NodeJS.ErrnoException).code = 'FORBIDDEN';
    throw e;
  }
}

export async function hasPermission(
  pool:       Pool,
  userId:     string,
  permission: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1
     FROM   permissions p
     JOIN   role_permissions rp ON rp.permission_id = p.id
     JOIN   user_roles       ur ON ur.role_id        = rp.role_id
     WHERE  ur.user_id = $1 AND p.name = $2
     LIMIT  1`,
    [userId, permission],
  );
  return !!rowCount;
}
