import { Pool, PoolClient } from 'pg';

export type AuditActionType =
  | 'READ' | 'CREATE' | 'UPDATE' | 'AMEND' | 'DELETE'
  | 'TRANSFER_GRANT' | 'TRANSFER_REVOKE' | 'CONSENT_CHANGE'
  | 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN';

export interface AuditEntry {
  userId:       string;
  hospitalId:   string;
  patientId?:   string;
  actionType:   AuditActionType;
  resourceType: string;
  resourceId?:  string;
  ipAddress:    string;
}

// Write to application_audit_log (his_app role: INSERT/SELECT only, UPDATE revoked per Phase 3)
export async function writeAuditLog(
  db: Pool | PoolClient,
  entry: AuditEntry,
): Promise<void> {
  await db.query(
    `INSERT INTO application_audit_log
       (user_id, hospital_id, patient_id, action_type, resource_type, resource_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.userId,
      entry.hospitalId,
      entry.patientId  ?? null,
      entry.actionType,
      entry.resourceType,
      entry.resourceId ?? null,
      entry.ipAddress,
    ],
  );
}
