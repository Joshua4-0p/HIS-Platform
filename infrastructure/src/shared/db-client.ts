import { Pool, PoolClient } from 'pg';
import { Signer } from '@aws-sdk/rds-signer';

// IAM DB auth: generates a short-lived token (15 min) used as the PostgreSQL password.
// his_app is the application role granted rds_iam (Phase 3 migration V13).
// No Secrets Manager call at Lambda runtime (REQ-NF-009).

let _pool: Pool | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  const signer = new Signer({
    hostname: process.env.DB_HOST!,
    port:     parseInt(process.env.DB_PORT ?? '5432'),
    region:   process.env.AWS_REGION ?? 'us-east-1',
    username: 'his_app',
  });
  return signer.getAuthToken();
}

export async function getDb(): Promise<Pool> {
  const now = Date.now();
  if (!_pool || now >= _tokenExpiry) {
    const token = await getToken();
    _tokenExpiry = now + 13 * 60 * 1000; // refresh 2 min before 15-min expiry

    if (_pool) await _pool.end().catch(() => undefined);

    _pool = new Pool({
      host:     process.env.DB_HOST,
      port:     parseInt(process.env.DB_PORT ?? '5432'),
      database: process.env.DB_NAME ?? 'hisdb',
      user:     'his_app',
      password: token,
      ssl:      { rejectUnauthorized: false },
      max:      1, // 1 connection per Lambda worker (prevent RDS exhaustion)
      idleTimeoutMillis: 10_000,
    });
  }
  return _pool;
}

// Convenience: run a query inside a transaction and return the client for chaining.
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
