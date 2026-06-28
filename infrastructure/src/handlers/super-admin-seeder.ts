import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

interface CfnEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  PhysicalResourceId?: string;
  ResourceProperties: {
    UserPoolId: string;
    Version: string;
  };
}

interface CfnResponse {
  PhysicalResourceId: string;
  Data?: Record<string, string>;
}

const SUPER_ADMIN_EMAIL = 'josuefotseu02@gmail.com';
const OLD_PLACEHOLDER   = 'superadmin@his-platform.internal';

let _requestId = 'local';

function log(level: string, message: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({
    function: 'his-super-admin-seeder',
    requestId: _requestId,
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  }));
}

async function deleteUserIfExists(
  cognito: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
): Promise<void> {
  try {
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }));
    log('INFO', 'Deleted Cognito user', { username });
  } catch (err: unknown) {
    const name = (err as { name?: string }).name;
    if (name !== 'UserNotFoundException') {
      log('WARN', 'Could not delete Cognito user (non-fatal)', { username, error: name });
    }
  }
}

async function createSuperAdmin(
  cognito: CognitoIdentityProviderClient,
  userPoolId: string,
): Promise<void> {
  // No TemporaryPassword supplied — Cognito auto-generates a cryptographically
  // secure one and delivers it via the welcome email (REQ-F-005).
  // No MessageAction: SUPPRESS — Cognito sends the welcome email (REQ-F-004).
  await cognito.send(new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username:   SUPER_ADMIN_EMAIL,
    DesiredDeliveryMediums: ['EMAIL'],
    UserAttributes: [
      { Name: 'email',                Value: SUPER_ADMIN_EMAIL },
      { Name: 'email_verified',        Value: 'true'            },
      { Name: 'custom:is_super_admin', Value: 'true'            },
      { Name: 'custom:hospital_id',    Value: 'SYSTEM'          },
    ],
  }));
  log('INFO', 'Super-admin user created', {
    email:  SUPER_ADMIN_EMAIL,
    status: 'FORCE_CHANGE_PASSWORD',
    note:   'Cognito auto-generated temp password sent to email',
  });
}

export const handler = async (
  event: CfnEvent,
  context: { awsRequestId: string },
): Promise<CfnResponse> => {
  _requestId = context.awsRequestId;
  log('INFO', 'SuperAdminSeeder invoked', { requestType: event.RequestType });

  const userPoolId = event.ResourceProperties.UserPoolId ?? process.env.USER_POOL_ID;
  const region     = process.env.REGION ?? process.env.AWS_REGION ?? 'us-east-1';
  const cognito    = new CognitoIdentityProviderClient({ region });

  // DELETE: clean up user (best effort)
  if (event.RequestType === 'Delete') {
    await deleteUserIfExists(cognito, userPoolId, SUPER_ADMIN_EMAIL);
    return { PhysicalResourceId: event.PhysicalResourceId ?? 'his-super-admin-seed' };
  }

  // UPDATE: Version bump signals an intentional re-seed.
  // Delete old placeholder (v1 used a fake mailbox) and current SA user so
  // they are recreated with the correct settings and a fresh welcome email.
  if (event.RequestType === 'Update') {
    await deleteUserIfExists(cognito, userPoolId, OLD_PLACEHOLDER);
    await deleteUserIfExists(cognito, userPoolId, SUPER_ADMIN_EMAIL);
  }

  // CREATE / UPDATE (after deletion): idempotency guard then create
  const listRes = await cognito.send(new ListUsersCommand({
    UserPoolId: userPoolId,
    Filter:     `email = "${SUPER_ADMIN_EMAIL}"`,
    Limit:      1,
  }));

  if ((listRes.Users ?? []).length > 0) {
    log('INFO', 'Super-admin user already exists - skipping creation (idempotent)');
    return { PhysicalResourceId: 'his-super-admin-seed' };
  }

  await createSuperAdmin(cognito, userPoolId);

  return {
    PhysicalResourceId: 'his-super-admin-seed',
    Data: { Email: SUPER_ADMIN_EMAIL },
  };
};
