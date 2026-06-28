import {
  AuthFlowType,
  ChallengeNameType,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createLogger } from '../shared/structured-logger';
import { badRequest, ok, serverError, unauthorized } from '../shared/response';

const cognito   = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const CLIENT_ID = process.env.CLIENT_ID!;

interface APIEvent {
  rawPath: string;
  requestContext: { http: { method: string }; requestId: string };
  headers: Record<string, string>;
  body?: string;
}

function decodeIdToken(token: string): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
  } catch {
    return {};
  }
}

function buildUser(idToken: string, fallbackEmail: string) {
  const c = decodeIdToken(idToken);
  return {
    id:          c['custom:user_db_id']   ?? c['sub'] ?? '',
    name:        c['name']                ?? fallbackEmail,
    email:       c['email']               ?? fallbackEmail,
    role:        c['custom:role_name']    ?? '',
    hospitalId:  c['custom:hospital_id']  ?? '',
    isSuperAdmin: c['custom:is_super_admin'] === 'true',
  };
}

export async function handler(event: APIEvent) {
  const { rawPath } = event;
  const requestId   = event.requestContext.requestId;
  const body        = JSON.parse(event.body ?? '{}') as Record<string, string>;
  const authHeader  = event.headers?.['authorization'] ?? event.headers?.['Authorization'] ?? '';
  const log         = createLogger({ functionName: 'his-auth-service', requestId });

  try {
    // ── POST /auth/login ────────────────────────────────────────────────────
    if (rawPath === '/auth/login') {
      const { email, password } = body;
      if (!email || !password) return badRequest('email and password are required');

      const res = await cognito.send(new InitiateAuthCommand({
        ClientId:         CLIENT_ID,
        AuthFlow:         AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters:   { USERNAME: email, PASSWORD: password },
      }));

      if (res.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
        log.info('auth-login-challenge', '', '', { email });
        return ok({ challengeName: 'NEW_PASSWORD_REQUIRED', session: res.Session, user: { email } });
      }

      const auth = res.AuthenticationResult!;
      log.info('auth-login-success', '', '', { email });
      return ok({
        accessToken:  auth.AccessToken,
        idToken:      auth.IdToken,
        refreshToken: auth.RefreshToken,
        expiresIn:    auth.ExpiresIn,
        tokenType:    'Bearer',
        user: buildUser(auth.IdToken!, email),
      });
    }

    // ── POST /auth/refresh ──────────────────────────────────────────────────
    if (rawPath === '/auth/refresh') {
      const { refreshToken } = body;
      if (!refreshToken) return badRequest('refreshToken is required');

      const res = await cognito.send(new InitiateAuthCommand({
        ClientId:       CLIENT_ID,
        AuthFlow:       AuthFlowType.REFRESH_TOKEN_AUTH,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }));

      const auth = res.AuthenticationResult!;
      log.info('auth-refresh-success', '', '');
      return ok({
        accessToken: auth.AccessToken,
        idToken:     auth.IdToken,
        expiresIn:   auth.ExpiresIn,
        tokenType:   'Bearer',
      });
    }

    // ── POST /auth/logout ───────────────────────────────────────────────────
    if (rawPath === '/auth/logout') {
      const accessToken = authHeader.replace(/^Bearer\s+/i, '');
      if (!accessToken) return unauthorized('Access token required');

      await cognito.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
      log.info('auth-logout-success', '', '');
      return ok({ message: 'Logged out successfully' });
    }

    // ── POST /auth/forgot-password ──────────────────────────────────────────
    if (rawPath === '/auth/forgot-password') {
      const { email } = body;
      if (!email) return badRequest('email is required');

      await cognito.send(new ForgotPasswordCommand({ ClientId: CLIENT_ID, Username: email }));
      log.info('auth-forgot-password', '', '', { email });
      return ok({ message: 'Password reset code sent to your email' });
    }

    // ── POST /auth/reset-password ───────────────────────────────────────────
    if (rawPath === '/auth/reset-password') {
      const { email, code, newPassword } = body;
      if (!email || !code || !newPassword) return badRequest('email, code, and newPassword are required');

      await cognito.send(new ConfirmForgotPasswordCommand({
        ClientId:         CLIENT_ID,
        Username:         email,
        ConfirmationCode: code,
        Password:         newPassword,
      }));
      log.info('auth-reset-password-success', '', '', { email });
      return ok({ message: 'Password reset successfully' });
    }

    // ── POST /auth/change-password ──────────────────────────────────────────
    // Handles two flows:
    // 1. First-login NEW_PASSWORD_REQUIRED challenge: { email, newPassword, session }
    // 2. Regular change (authenticated user):         { currentPassword, newPassword } + Authorization header
    if (rawPath === '/auth/change-password') {
      const { email, newPassword, session, currentPassword } = body;

      if (session && email && newPassword) {
        const res = await cognito.send(new RespondToAuthChallengeCommand({
          ClientId:      CLIENT_ID,
          ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
          Session:       session,
          ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
        }));

        const auth = res.AuthenticationResult!;
        log.info('auth-first-login-complete', '', '', { email });
        return ok({
          accessToken:  auth.AccessToken,
          idToken:      auth.IdToken,
          refreshToken: auth.RefreshToken,
          expiresIn:    auth.ExpiresIn,
          tokenType:    'Bearer',
          user: buildUser(auth.IdToken!, email),
        });
      }

      const accessToken = authHeader.replace(/^Bearer\s+/i, '');
      if (!accessToken || !currentPassword || !newPassword) {
        return badRequest('currentPassword, newPassword, and Authorization header are required');
      }

      await cognito.send(new ChangePasswordCommand({
        AccessToken:      accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      }));
      log.info('auth-change-password-success', '', '');
      return ok({ message: 'Password changed successfully' });
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Route not found' }) };

  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    log.error('auth-error', '', '', { path: rawPath, error: err.message });

    if (err.name === 'NotAuthorizedException')    return unauthorized('Invalid credentials');
    if (err.name === 'UserNotFoundException')     return unauthorized('Invalid credentials');
    if (err.name === 'InvalidPasswordException')  return badRequest(err.message ?? 'Invalid password');
    if (err.name === 'CodeMismatchException')     return badRequest('Invalid verification code');
    if (err.name === 'ExpiredCodeException')      return badRequest('Verification code has expired. Request a new one.');
    if (err.name === 'LimitExceededException')    return { statusCode: 429, body: JSON.stringify({ error: 'Too many attempts. Try again later.' }) };
    if (err.name === 'TooManyRequestsException')  return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Try again later.' }) };
    if (err.name === 'UserNotConfirmedException') return { statusCode: 403, body: JSON.stringify({ error: 'Account not confirmed' }) };

    return serverError('Authentication service error');
  }
}
