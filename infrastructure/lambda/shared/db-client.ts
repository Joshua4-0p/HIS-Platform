import { Pool } from 'pg';
import { Signer } from '@aws-sdk/rds-signer';

let pool: Pool | null = null;

// REQ-NF-009: IAM database authentication - no stored DB password
// Signer generates a short-lived (15-min) auth token using the Lambda execution role
// The role must have rds-db:connect permission
export async function getDbPool(): Promise<Pool> {
  if (pool) return pool;

  const hostname = process.env.RDS_HOSTNAME!;
  const port = parseInt(process.env.RDS_PORT ?? '5432', 10);
  const dbName = process.env.RDS_DB_NAME ?? 'hisdb';
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const dbUser = 'his_app';

  const signer = new Signer({
    hostname,
    port,
    region,
    username: dbUser,
  });

  const token = await signer.getAuthToken();

  pool = new Pool({
    host: hostname,
    port,
    database: dbName,
    user: dbUser,
    password: token,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pool;
}
