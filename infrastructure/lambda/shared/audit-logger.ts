import { Pool } from 'pg';

// REQ-F-068: every patient data read/write must INSERT an audit log entry
// REQ-F-070: INSERT/SELECT only - no UPDATE or DELETE on this table
export type AuditActionType =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'AMEND'
  | 'DELETE'
  | 'TRANSFER_GRANT'
  | 'TRANSFER_REVOKE'
  | 'CONSENT_CHANGE';

export interface AuditEntry {
  userId: string;
  hospitalId: string;
  patientId?: string;
  actionType: AuditActionType;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
}

export async function writeAuditLog(pool: Pool, entry: AuditEntry): Promise<void> {
  await pool.query(
    `INSERT INTO application_audit_log
       (user_id, hospital_id, patient_id, action_type, resource_type, resource_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.userId,
      entry.hospitalId,
      entry.patientId ?? null,
      entry.actionType,
      entry.resourceType,
      entry.resourceId,
      entry.ipAddress,
    ]
  );
}
