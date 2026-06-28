export interface HisClaims {
  sub: string;
  userId: string;
  hospitalId: string;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
  email: string;
}

type ApiGwEvent = {
  requestContext?: {
    authorizer?: { jwt?: { claims?: Record<string, string> } };
    http?: { sourceIp?: string };
  };
};

export function extractClaims(event: ApiGwEvent): HisClaims {
  const c = event.requestContext?.authorizer?.jwt?.claims ?? {};
  return {
    sub:          c['sub'] ?? '',
    userId:       c['custom:user_db_id'] ?? c['sub'] ?? '',
    hospitalId:   c['custom:hospital_id'] ?? '',
    roleId:       c['custom:role_id'] ?? '',
    roleName:     c['custom:role_name'] ?? '',
    isSuperAdmin: c['custom:is_super_admin'] === 'true',
    email:        c['email'] ?? '',
  };
}

export function getSourceIp(event: ApiGwEvent): string {
  return event.requestContext?.http?.sourceIp ?? '0.0.0.0';
}
