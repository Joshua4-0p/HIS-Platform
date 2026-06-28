import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDbPool } from '../shared/db-client';
import { extractClaims } from '../shared/jwt-claims';
import { requirePermission } from '../shared/permission-check';
import { writeAuditLog } from '../shared/audit-logger';
import { createLogger } from '../shared/structured-logger';
import {
  ok, created, badRequest, forbidden, notFound, serverError,
} from '../shared/response';

const cognitoClient = new CognitoIdentityProviderClient({});
const snsClient = new SNSClient({});

const USER_POOL_ID = process.env.USER_POOL_ID!;
const SYSTEM_ALARMS_TOPIC_ARN = process.env.SYSTEM_ALARMS_TOPIC_ARN!;

type JwtEventShape = Parameters<typeof extractClaims>[0];
function getClaims(event: APIGatewayProxyEventV2) {
  return extractClaims(event as unknown as JwtEventShape);
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function mapStatus(dbStatus: string): string {
  if (dbStatus === 'active') return 'Approved';
  if (dbStatus === 'suspended') return 'Rejected';
  return 'Pending';
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isoDate(d: Date | string): string {
  return new Date(d).toISOString().split('T')[0];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asUuid(s: string): string | null {
  return UUID_RE.test(s) ? s : null;
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const requestId = event.requestContext.requestId;
  const logger = createLogger({ functionName: 'his-hospital-service', requestId });
  const ip = event.requestContext.http.sourceIp ?? 'unknown';

  try {
    const pool = await getDbPool();
    const body = event.body ? JSON.parse(event.body) : {};

    // ── POST /hospitals/register (public - no JWT) ──────────────────────────
    if (method === 'POST' && path === '/hospitals/register') {
      const { facilityName, address, region, facilityType, adminName, adminEmail } = body;
      if (!facilityName || !address || !region || !facilityType || !adminName || !adminEmail) {
        return badRequest('facilityName, address, region, facilityType, adminName, and adminEmail are required.');
      }
      const type = facilityType.toLowerCase() as string;
      if (!['public', 'private', 'mission'].includes(type)) {
        return badRequest('facilityType must be Public, Private, or Mission.');
      }
      const dupe = await pool.query('SELECT id FROM hospitals WHERE admin_email = $1', [adminEmail]);
      if (dupe.rows.length > 0) {
        return badRequest('A registration with this email already exists.');
      }
      const res = await pool.query(
        `INSERT INTO hospitals (name, address, region_district, type, admin_name, admin_email, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id, name, status`,
        [facilityName, address, region, type, adminName, adminEmail],
      );
      const h = res.rows[0];
      logger.info('Hospital registration submitted', 'anon', 'none', { hospitalId: h.id });
      return created({ id: h.id, name: h.name, status: h.status });
    }

    // ── GET /hospitals/pending (JWT - super admin) ──────────────────────────
    if (method === 'GET' && path === '/hospitals/pending') {
      const claims = getClaims(event);
      if (!claims.isSuperAdmin) return forbidden('Super admin access required.');
      const res = await pool.query(
        `SELECT id, name, region_district, type, admin_name, admin_email, status, created_at
         FROM hospitals WHERE status = 'pending' ORDER BY created_at ASC`,
      );
      return ok({
        hospitals: res.rows.map((h) => ({
          id: h.id,
          name: h.name,
          region: h.region_district,
          facilityType: capitalize(h.type),
          adminName: h.admin_name,
          adminEmail: h.admin_email,
          status: mapStatus(h.status),
          submittedDate: isoDate(h.created_at),
        })),
      });
    }

    // ── GET /hospitals (JWT - super admin, all statuses) ────────────────────
    if (method === 'GET' && path === '/hospitals') {
      const claims = getClaims(event);
      if (!claims.isSuperAdmin) return forbidden('Super admin access required.');
      const res = await pool.query(
        `SELECT id, name, region_district, type, admin_name, admin_email, status, created_at
         FROM hospitals ORDER BY created_at DESC`,
      );
      return ok({
        hospitals: res.rows.map((h) => ({
          id: h.id,
          name: h.name,
          region: h.region_district,
          facilityType: capitalize(h.type),
          adminName: h.admin_name,
          adminEmail: h.admin_email,
          status: mapStatus(h.status),
          registeredDate: formatDate(h.created_at),
          submittedDate: isoDate(h.created_at),
        })),
      });
    }

    // ── POST /hospitals (JWT - super admin direct registration) ─────────────
    if (method === 'POST' && path === '/hospitals') {
      const claims = getClaims(event);
      if (!claims.isSuperAdmin) return forbidden('Super admin access required.');

      const { facilityName, address, region, facilityType, adminName, adminEmail } = body;
      if (!facilityName || !address || !region || !facilityType || !adminName || !adminEmail) {
        return badRequest('facilityName, address, region, facilityType, adminName, and adminEmail are required.');
      }
      const type = facilityType.toLowerCase() as string;
      if (!['public', 'private', 'mission'].includes(type)) {
        return badRequest('facilityType must be Public, Private, or Mission.');
      }
      const dupe = await pool.query('SELECT id FROM hospitals WHERE admin_email = $1', [adminEmail]);
      if (dupe.rows.length > 0) {
        return badRequest('A hospital with this admin email already exists.');
      }

      const hospRes = await pool.query(
        `INSERT INTO hospitals (name, address, region_district, type, admin_name, admin_email, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id, name, status`,
        [facilityName, address, region, type, adminName, adminEmail],
      );
      const hosp = hospRes.rows[0];
      const hospitalId: string = hosp.id;

      const roleRes = await pool.query(
        `SELECT id FROM roles WHERE name = 'Hospital Admin' AND hospital_id IS NULL AND is_default = true`,
      );
      if (roleRes.rows.length === 0) return serverError('Hospital Admin role seed not found.');
      const adminRoleId = roleRes.rows[0].id;

      const userRes = await pool.query(
        `INSERT INTO users (hospital_id, full_name, email, job_title, region_district, is_active)
         VALUES ($1, $2, $3, 'Hospital Admin', $4, true) RETURNING id`,
        [hospitalId, adminName, adminEmail, region],
      );
      const userId: string = userRes.rows[0].id;

      await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, adminRoleId]);

      // Cognito auto-generates temp password and sends welcome email (no SUPPRESS).
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: adminEmail,
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          { Name: 'email', Value: adminEmail },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:user_db_id', Value: userId },
          { Name: 'custom:hospital_id', Value: hospitalId },
          { Name: 'custom:role_id', Value: adminRoleId },
          { Name: 'custom:role_name', Value: 'Hospital Admin' },
          { Name: 'custom:is_super_admin', Value: 'false' },
        ],
      }));

      logger.info('Hospital registered by SA', claims.userId, hospitalId, { adminUserId: userId });
      return created({ id: hospitalId, name: hosp.name, status: hosp.status, adminUserId: userId });
    }

    // ── Hospital /{id} routes ───────────────────────────────────────────────
    const hospActionMatch = path.match(/^\/hospitals\/([^/]+)\/([^/]+)$/);
    const hospOnlyMatch = path.match(/^\/hospitals\/([^/]+)$/);

    if (hospActionMatch) {
      const hospitalId = hospActionMatch[1];
      const action = hospActionMatch[2];
      const claims = getClaims(event);
      if (!claims.isSuperAdmin) return forbidden('Super admin access required.');

      // POST /hospitals/{id}/approve
      if (method === 'POST' && action === 'approve') {
        const hospRes = await pool.query(
          `SELECT id, name, region_district, admin_name, admin_email, status
           FROM hospitals WHERE id = $1`,
          [hospitalId],
        );
        if (hospRes.rows.length === 0) return notFound('Hospital not found.');
        const hosp = hospRes.rows[0];
        if (hosp.status !== 'pending') return badRequest(`Hospital is already ${hosp.status}.`);

        const roleRes = await pool.query(
          `SELECT id FROM roles WHERE name = 'Hospital Admin' AND hospital_id IS NULL AND is_default = true`,
        );
        if (roleRes.rows.length === 0) return serverError('Hospital Admin role seed not found.');
        const adminRoleId = roleRes.rows[0].id;

        const adminName = hosp.admin_name ?? hosp.admin_email.split('@')[0];

        const userRes = await pool.query(
          `INSERT INTO users (hospital_id, full_name, email, job_title, region_district, is_active)
           VALUES ($1, $2, $3, 'Hospital Admin', $4, true) RETURNING id`,
          [hospitalId, adminName, hosp.admin_email, hosp.region_district],
        );
        const userId: string = userRes.rows[0].id;

        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, adminRoleId],
        );

        // No TemporaryPassword: Cognito auto-generates and sends welcome email (REQ-F-004).
        await cognitoClient.send(new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: hosp.admin_email,
          DesiredDeliveryMediums: ['EMAIL'],
          UserAttributes: [
            { Name: 'email', Value: hosp.admin_email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'custom:user_db_id', Value: userId },
            { Name: 'custom:hospital_id', Value: hospitalId },
            { Name: 'custom:role_id', Value: adminRoleId },
            { Name: 'custom:role_name', Value: 'Hospital Admin' },
            { Name: 'custom:is_super_admin', Value: 'false' },
          ],
        }));

        await pool.query("UPDATE hospitals SET status = 'active' WHERE id = $1", [hospitalId]);

        await snsClient.send(new PublishCommand({
          TopicArn: SYSTEM_ALARMS_TOPIC_ARN,
          Subject: `HIS - Hospital Approved: ${hosp.name}`,
          Message: JSON.stringify({
            event: 'hospital_approved',
            hospitalId,
            hospitalName: hosp.name,
            adminEmail: hosp.admin_email,
            approvedBy: claims.userId,
            timestamp: new Date().toISOString(),
          }),
        }));

        logger.info('Hospital approved', claims.userId, hospitalId, { adminUserId: userId });
        return ok({ message: 'Hospital approved successfully.', hospitalId, adminUserId: userId });
      }

      // POST /hospitals/{id}/reject
      if (method === 'POST' && action === 'reject') {
        const hospRes = await pool.query(
          'SELECT id, status FROM hospitals WHERE id = $1',
          [hospitalId],
        );
        if (hospRes.rows.length === 0) return notFound('Hospital not found.');
        if (hospRes.rows[0].status !== 'pending') {
          return badRequest(`Hospital is already ${hospRes.rows[0].status}.`);
        }
        await pool.query("UPDATE hospitals SET status = 'suspended' WHERE id = $1", [hospitalId]);
        logger.info('Hospital rejected', claims.userId, hospitalId, { reason: body.reason });
        return ok({ message: 'Hospital registration rejected.' });
      }
    }

    if (hospOnlyMatch) {
      const hospitalId = hospOnlyMatch[1];
      const claims = getClaims(event);

      // GET /hospitals/{id}
      if (method === 'GET') {
        if (!claims.isSuperAdmin) return forbidden('Super admin access required.');
        const res = await pool.query(
          `SELECT id, name, address, region_district, type, admin_name, admin_email,
                  contact_phone, contact_email, status, created_at
           FROM hospitals WHERE id = $1`,
          [hospitalId],
        );
        if (res.rows.length === 0) return notFound('Hospital not found.');
        const h = res.rows[0];
        return ok({
          id: h.id,
          name: h.name,
          address: h.address,
          region: h.region_district,
          facilityType: capitalize(h.type),
          adminName: h.admin_name,
          adminEmail: h.admin_email,
          contactPhone: h.contact_phone,
          contactEmail: h.contact_email,
          status: mapStatus(h.status),
          submittedDate: isoDate(h.created_at),
        });
      }
    }

    // ── GET /staff (JWT) ────────────────────────────────────────────────────
    if (method === 'GET' && path === '/staff') {
      const claims = getClaims(event);
      const hospitalId = asUuid(claims.hospitalId);
      if (!hospitalId) return ok({ staff: [] });
      const res = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.job_title, u.region_district,
                u.is_active, u.ward_head_unit, u.created_at,
                r.name AS role_name, r.id AS role_id
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.hospital_id = $1
         ORDER BY u.created_at DESC`,
        [hospitalId],
      );
      return ok({
        staff: res.rows.map((s) => ({
          id: s.id,
          name: s.full_name,
          initials: getInitials(s.full_name),
          email: s.email,
          jobTitle: s.job_title,
          role: s.role_name ?? 'Unassigned',
          roleId: s.role_id,
          region: s.region_district,
          status: s.is_active ? 'Active' : 'Deactivated',
          wardHeadUnit: s.ward_head_unit,
          createdAt: formatDate(s.created_at),
        })),
      });
    }

    // ── POST /staff (JWT + staff:manage) ────────────────────────────────────
    if (method === 'POST' && path === '/staff') {
      const claims = getClaims(event);
      const hospitalId = claims.hospitalId;
      await requirePermission(pool, claims.userId, hospitalId, 'staff:manage');

      const { fullName, email, jobTitle, regionDistrict, roleId, wardHeadUnit } = body;
      if (!fullName || !email || !jobTitle || !regionDistrict || !roleId) {
        return badRequest('fullName, email, jobTitle, regionDistrict, and roleId are required.');
      }

      const roleRes = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)',
        [roleId, hospitalId],
      );
      if (roleRes.rows.length === 0) return notFound('Role not found.');
      const roleName: string = roleRes.rows[0].name;

      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE hospital_id = $1 AND email = $2',
        [hospitalId, email],
      );
      if (emailCheck.rows.length > 0) return badRequest('A staff member with this email already exists.');

      const userRes = await pool.query(
        `INSERT INTO users (hospital_id, full_name, email, job_title, region_district, is_active, ward_head_unit)
         VALUES ($1, $2, $3, $4, $5, true, $6)
         RETURNING id, full_name, email, job_title, region_district, created_at`,
        [hospitalId, fullName, email, jobTitle, regionDistrict, wardHeadUnit ?? null],
      );
      const u = userRes.rows[0];
      const userId: string = u.id;

      await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);

      // No TemporaryPassword: Cognito auto-generates and sends welcome email (REQ-F-013).
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:user_db_id', Value: userId },
          { Name: 'custom:hospital_id', Value: hospitalId },
          { Name: 'custom:role_id', Value: roleId },
          { Name: 'custom:role_name', Value: roleName },
          { Name: 'custom:is_super_admin', Value: 'false' },
        ],
      }));

      await writeAuditLog(pool, {
        userId: claims.userId,
        hospitalId,
        actionType: 'CREATE',
        resourceType: 'user',
        resourceId: userId,
        ipAddress: ip,
      });

      await pool.query(
        `INSERT INTO notifications (user_id, hospital_id, type, title, body, is_delivered)
         VALUES ($1, $2, 'staff_created', $3, $4, false)`,
        [claims.userId, hospitalId, 'New Staff Member Added', `${fullName} has been added as ${roleName}.`],
      );

      logger.info('Staff created', claims.userId, hospitalId, { staffId: userId });
      return created({
        id: userId,
        name: u.full_name,
        email: u.email,
        role: roleName,
        status: 'Active',
        createdAt: formatDate(u.created_at),
      });
    }

    // ── Staff /{id} routes ──────────────────────────────────────────────────
    const staffActionMatch = path.match(/^\/staff\/([^/]+)\/([^/]+)$/);
    const staffOnlyMatch = path.match(/^\/staff\/([^/]+)$/);

    if (staffActionMatch) {
      const staffId = staffActionMatch[1];
      const action = staffActionMatch[2];
      const claims = getClaims(event);
      const hospitalId = claims.hospitalId;

      if (method === 'PUT' && action === 'role') {
        await requirePermission(pool, claims.userId, hospitalId, 'role:assign');
        const { roleId } = body;
        if (!roleId) return badRequest('roleId is required.');

        const staffRes = await pool.query(
          'SELECT id, email FROM users WHERE id = $1 AND hospital_id = $2',
          [staffId, hospitalId],
        );
        if (staffRes.rows.length === 0) return notFound('Staff member not found.');
        const staffEmail: string = staffRes.rows[0].email;

        const roleRes = await pool.query(
          'SELECT id, name FROM roles WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)',
          [roleId, hospitalId],
        );
        if (roleRes.rows.length === 0) return notFound('Role not found.');
        const roleName: string = roleRes.rows[0].name;

        const prevRes = await pool.query('SELECT role_id FROM user_roles WHERE user_id = $1', [staffId]);
        const previousRoleId: string | null = prevRes.rows[0]?.role_id ?? null;

        await pool.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET role_id = $2, assigned_at = NOW()`,
          [staffId, roleId],
        );

        await pool.query(
          `INSERT INTO role_assignment_history
             (hospital_id, admin_user_id, affected_user_id, previous_role_id, new_role_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [hospitalId, claims.userId, staffId, previousRoleId, roleId],
        );

        await cognitoClient.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: staffEmail,
          UserAttributes: [
            { Name: 'custom:role_id', Value: roleId },
            { Name: 'custom:role_name', Value: roleName },
          ],
        }));

        await writeAuditLog(pool, {
          userId: claims.userId,
          hospitalId,
          actionType: 'UPDATE',
          resourceType: 'user',
          resourceId: staffId,
          ipAddress: ip,
        });

        logger.info('Role assigned', claims.userId, hospitalId, { staffId, roleId });
        return ok({ message: 'Role updated successfully.' });
      }

      if (method === 'POST' && action === 'deactivate') {
        await requirePermission(pool, claims.userId, hospitalId, 'staff:manage');
        const staffRes = await pool.query(
          'SELECT id, email FROM users WHERE id = $1 AND hospital_id = $2',
          [staffId, hospitalId],
        );
        if (staffRes.rows.length === 0) return notFound('Staff member not found.');

        await pool.query('UPDATE users SET is_active = false WHERE id = $1', [staffId]);
        await cognitoClient.send(new AdminDisableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: staffRes.rows[0].email,
        }));
        await writeAuditLog(pool, {
          userId: claims.userId,
          hospitalId,
          actionType: 'UPDATE',
          resourceType: 'user',
          resourceId: staffId,
          ipAddress: ip,
        });

        logger.info('Staff deactivated', claims.userId, hospitalId, { staffId });
        return ok({ message: 'Staff member deactivated.' });
      }

      if (method === 'POST' && action === 'activate') {
        await requirePermission(pool, claims.userId, hospitalId, 'staff:manage');
        const staffRes = await pool.query(
          'SELECT id, email FROM users WHERE id = $1 AND hospital_id = $2',
          [staffId, hospitalId],
        );
        if (staffRes.rows.length === 0) return notFound('Staff member not found.');

        await pool.query('UPDATE users SET is_active = true WHERE id = $1', [staffId]);
        await cognitoClient.send(new AdminEnableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: staffRes.rows[0].email,
        }));

        logger.info('Staff activated', claims.userId, hospitalId, { staffId });
        return ok({ message: 'Staff member activated.' });
      }
    }

    if (staffOnlyMatch) {
      const staffId = staffOnlyMatch[1];
      const claims = getClaims(event);
      const hospitalId = claims.hospitalId;

      if (method === 'GET') {
        const res = await pool.query(
          `SELECT u.id, u.full_name, u.email, u.job_title, u.region_district,
                  u.is_active, u.ward_head_unit, u.created_at,
                  r.name AS role_name, r.id AS role_id
           FROM users u
           LEFT JOIN user_roles ur ON u.id = ur.user_id
           LEFT JOIN roles r ON ur.role_id = r.id
           WHERE u.id = $1 AND u.hospital_id = $2`,
          [staffId, hospitalId],
        );
        if (res.rows.length === 0) return notFound('Staff member not found.');
        const s = res.rows[0];
        return ok({
          id: s.id,
          fullName: s.full_name,
          email: s.email,
          jobTitle: s.job_title,
          regionDistrict: s.region_district,
          roleName: s.role_name,
          roleId: s.role_id,
          isActive: s.is_active,
          wardHeadUnit: s.ward_head_unit,
          createdAt: formatDate(s.created_at),
        });
      }

      if (method === 'PUT') {
        await requirePermission(pool, claims.userId, hospitalId, 'staff:manage');
        const check = await pool.query(
          'SELECT id FROM users WHERE id = $1 AND hospital_id = $2',
          [staffId, hospitalId],
        );
        if (check.rows.length === 0) return notFound('Staff member not found.');

        const { fullName, jobTitle, regionDistrict, wardHeadUnit } = body;
        const res = await pool.query(
          `UPDATE users
           SET full_name       = COALESCE($1, full_name),
               job_title       = COALESCE($2, job_title),
               region_district = COALESCE($3, region_district),
               ward_head_unit  = COALESCE($4, ward_head_unit)
           WHERE id = $5 AND hospital_id = $6
           RETURNING id, full_name, email, job_title, region_district, ward_head_unit`,
          [fullName ?? null, jobTitle ?? null, regionDistrict ?? null, wardHeadUnit ?? null, staffId, hospitalId],
        );
        const u = res.rows[0];
        return ok({
          id: u.id, fullName: u.full_name, email: u.email,
          jobTitle: u.job_title, regionDistrict: u.region_district, wardHeadUnit: u.ward_head_unit,
        });
      }
    }

    // ── GET /roles (JWT) ────────────────────────────────────────────────────
    if (method === 'GET' && path === '/roles') {
      const claims = getClaims(event);
      const hospitalId = asUuid(claims.hospitalId);
      const res = await pool.query(
        `SELECT r.id, r.name, r.is_default, r.hospital_id,
                ARRAY_AGG(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) AS permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         WHERE r.hospital_id IS NULL OR r.hospital_id = $1
         GROUP BY r.id, r.name, r.is_default, r.hospital_id
         ORDER BY r.is_default DESC, r.name ASC`,
        [hospitalId],
      );
      return ok({
        roles: res.rows.map((r) => ({
          id: r.id,
          name: r.name,
          isDefault: r.is_default,
          hospitalId: r.hospital_id,
          kind: r.hospital_id === null ? 'default' : 'custom',
          permissions: r.permissions ?? [],
        })),
      });
    }

    // ── POST /roles (JWT + role:assign) ─────────────────────────────────────
    if (method === 'POST' && path === '/roles') {
      const claims = getClaims(event);
      const hospitalId = claims.hospitalId;
      await requirePermission(pool, claims.userId, hospitalId, 'role:assign');

      const { name, permissionKeys } = body;
      if (!name) return badRequest('name is required.');
      if (!Array.isArray(permissionKeys)) return badRequest('permissionKeys must be an array.');

      const dupe = await pool.query(
        'SELECT id FROM roles WHERE name = $1 AND hospital_id = $2',
        [name, hospitalId],
      );
      if (dupe.rows.length > 0) return badRequest('A role with this name already exists.');

      const roleRes = await pool.query(
        'INSERT INTO roles (hospital_id, name, is_default) VALUES ($1, $2, false) RETURNING id',
        [hospitalId, name],
      );
      const roleId: string = roleRes.rows[0].id;

      if (permissionKeys.length > 0) {
        const permRes = await pool.query(
          'SELECT id FROM permissions WHERE name = ANY($1)',
          [permissionKeys],
        );
        for (const perm of permRes.rows) {
          await pool.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [roleId, perm.id],
          );
        }
      }

      const updated = await pool.query(
        `SELECT r.id, r.name,
                ARRAY_AGG(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) AS permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         WHERE r.id = $1 GROUP BY r.id, r.name`,
        [roleId],
      );
      const role = updated.rows[0];
      logger.info('Role created', claims.userId, hospitalId, { roleId, name });
      return created({ id: role.id, name: role.name, permissions: role.permissions ?? [] });
    }

    // ── Roles /{id} routes ──────────────────────────────────────────────────
    const roleOnlyMatch = path.match(/^\/roles\/([^/]+)$/);

    if (roleOnlyMatch) {
      const roleId = roleOnlyMatch[1];
      const claims = getClaims(event);
      const hospitalId = claims.hospitalId;

      if (method === 'PUT') {
        await requirePermission(pool, claims.userId, hospitalId, 'role:assign');
        const roleRes = await pool.query(
          'SELECT id FROM roles WHERE id = $1 AND hospital_id = $2',
          [roleId, hospitalId],
        );
        if (roleRes.rows.length === 0) return notFound('Custom role not found or cannot be edited.');

        const { name, permissionKeys } = body;
        if (name) {
          await pool.query('UPDATE roles SET name = $1 WHERE id = $2', [name, roleId]);
        }
        if (Array.isArray(permissionKeys)) {
          await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
          if (permissionKeys.length > 0) {
            const permRes = await pool.query(
              'SELECT id FROM permissions WHERE name = ANY($1)',
              [permissionKeys],
            );
            for (const perm of permRes.rows) {
              await pool.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
                [roleId, perm.id],
              );
            }
          }
        }

        const updated = await pool.query(
          `SELECT r.id, r.name,
                  ARRAY_AGG(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) AS permissions
           FROM roles r
           LEFT JOIN role_permissions rp ON r.id = rp.role_id
           LEFT JOIN permissions p ON rp.permission_id = p.id
           WHERE r.id = $1 GROUP BY r.id, r.name`,
          [roleId],
        );
        const role = updated.rows[0];
        return ok({ id: role.id, name: role.name, permissions: role.permissions ?? [] });
      }

      if (method === 'DELETE') {
        await requirePermission(pool, claims.userId, hospitalId, 'role:assign');
        const roleRes = await pool.query(
          'SELECT id FROM roles WHERE id = $1 AND hospital_id = $2',
          [roleId, hospitalId],
        );
        if (roleRes.rows.length === 0) return notFound('Custom role not found or cannot be deleted.');

        const inUse = await pool.query('SELECT 1 FROM user_roles WHERE role_id = $1 LIMIT 1', [roleId]);
        if (inUse.rows.length > 0) {
          return badRequest('Cannot delete a role that is currently assigned to staff members.');
        }
        await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);
        return ok({ message: 'Role deleted.' });
      }
    }

    // ── GET /roles/history (JWT + staff:manage) ─────────────────────────────
    if (method === 'GET' && path === '/roles/history') {
      const claims = getClaims(event);
      const hospitalId = asUuid(claims.hospitalId);
      if (!hospitalId) return ok({ history: [] });
      await requirePermission(pool, claims.userId, hospitalId, 'staff:manage');
      const res = await pool.query(
        `SELECT rah.id, rah.created_at,
                admin_u.full_name AS admin_name,
                target_u.full_name AS target_name,
                prev_r.name AS previous_role,
                new_r.name AS new_role
         FROM role_assignment_history rah
         LEFT JOIN users admin_u ON rah.admin_user_id = admin_u.id
         LEFT JOIN users target_u ON rah.affected_user_id = target_u.id
         LEFT JOIN roles prev_r ON rah.previous_role_id = prev_r.id
         LEFT JOIN roles new_r ON rah.new_role_id = new_r.id
         WHERE rah.hospital_id = $1
         ORDER BY rah.created_at DESC
         LIMIT 50`,
        [hospitalId],
      );
      return ok({
        history: res.rows.map((r) => ({
          id: r.id,
          date: isoDate(r.created_at),
          adminName: r.admin_name ?? 'System',
          targetName: r.target_name ?? 'Unknown',
          previousRole: r.previous_role ?? '-',
          newRole: r.new_role ?? '-',
        })),
      });
    }

    // ── /settings/facility ──────────────────────────────────────────────────
    if (path === '/settings/facility') {
      const claims = getClaims(event);
      const hospitalId = asUuid(claims.hospitalId);
      if (!hospitalId) return notFound('Hospital not found.');

      if (method === 'GET') {
        const res = await pool.query(
          `SELECT id, name, address, region_district, type, admin_email, contact_phone, contact_email
           FROM hospitals WHERE id = $1`,
          [hospitalId],
        );
        if (res.rows.length === 0) return notFound('Hospital not found.');
        const h = res.rows[0];
        return ok({
          id: h.id, facilityName: h.name, address: h.address,
          region: h.region_district, facilityType: capitalize(h.type),
          adminEmail: h.admin_email, contactPhone: h.contact_phone, contactEmail: h.contact_email,
        });
      }

      if (method === 'PUT') {
        await requirePermission(pool, claims.userId, hospitalId, 'staff:manage');
        const { facilityName, address, region, contactPhone, contactEmail } = body;
        const name = facilityName;
        const regionDistrict = region;
        const res = await pool.query(
          `UPDATE hospitals
           SET name            = COALESCE($1, name),
               address         = COALESCE($2, address),
               region_district = COALESCE($3, region_district),
               contact_phone   = COALESCE($4, contact_phone),
               contact_email   = COALESCE($5, contact_email)
           WHERE id = $6
           RETURNING id, name, address, region_district, contact_phone, contact_email`,
          [name ?? null, address ?? null, regionDistrict ?? null, contactPhone ?? null, contactEmail ?? null, hospitalId],
        );
        if (res.rows.length === 0) return notFound('Hospital not found.');
        const h = res.rows[0];
        return ok({
          id: h.id, name: h.name, address: h.address,
          regionDistrict: h.region_district,
          contactPhone: h.contact_phone, contactEmail: h.contact_email,
        });
      }
    }

    return notFound('Route not found.');

  } catch (err: unknown) {
    const logger = createLogger({ functionName: 'his-hospital-service', requestId });
    if (err instanceof Error) {
      if ((err as Error & { statusCode?: number }).statusCode === 403) {
        return forbidden(err.message);
      }
      logger.error('Unexpected error', 'unknown', 'unknown', { error: err.message });
    }
    return serverError('An unexpected error occurred.');
  }
};
