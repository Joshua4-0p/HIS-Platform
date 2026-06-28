// Extract verified JWT claims injected by API Gateway Cognito authorizer
// The authorizer validates the JWT - Lambda receives claims as requestContext
export interface HisClaims {
  sub: string;         // Cognito user ID
  userId: string;      // user_db_id custom attribute
  hospitalId: string;  // hospital_id custom attribute
  roleId: string;      // role_id custom attribute
  roleName: string;    // role_name custom attribute
  isSuperAdmin: boolean;
  email: string;
}

export function extractClaims(event: {
  requestContext?: { authorizer?: { jwt?: { claims?: Record<string, string> } } };
}): HisClaims {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) throw new Error('Missing JWT claims - request not authorized');

  return {
    sub: claims['sub'] ?? '',
    userId: claims['custom:user_db_id'] ?? '',
    hospitalId: claims['custom:hospital_id'] ?? '',
    roleId: claims['custom:role_id'] ?? '',
    roleName: claims['custom:role_name'] ?? '',
    isSuperAdmin: claims['custom:is_super_admin'] === 'true',
    email: claims['email'] ?? '',
  };
}
