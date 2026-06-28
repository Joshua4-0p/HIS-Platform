-- V12__create_notifications_audit_tables.sql
-- In-app notification store (REQ-F-064, REQ-F-065)
-- Application-level clinical audit log (REQ-F-068 to REQ-F-071)
-- application_audit_log is append-only: INSERT and SELECT only (REVOKE applied in V14)

CREATE TABLE notifications (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id),
  hospital_id  UUID         NOT NULL,
  type         VARCHAR(30)  NOT NULL CHECK (type IN (
                 'critical_lab',
                 'transfer_request',
                 'transfer_approved',
                 'transfer_denied',
                 'etl_complete',
                 'staff_created',
                 'appointment_created',
                 'appointment_cancelled'
               )),
  title        VARCHAR(255) NOT NULL,
  body         TEXT         NOT NULL,
  is_delivered BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- GET /notifications polls every 15 seconds for unread (REQ-F-065)
CREATE INDEX notifications_user_delivered_idx ON notifications (user_id, is_delivered, created_at DESC);
CREATE INDEX notifications_hospital_idx       ON notifications (hospital_id, created_at DESC);

-- Clinical audit trail - immutable, INSERT-only at application layer (REQ-F-068 to REQ-F-070)
-- Satisfies Cameroon Data Protection Law No. 2010/012 audit requirements
CREATE TABLE application_audit_log (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL,
  hospital_id    UUID         NOT NULL,
  patient_id     UUID,
  action_type    VARCHAR(20)  NOT NULL CHECK (action_type IN (
                   'READ', 'CREATE', 'UPDATE', 'AMEND', 'DELETE',
                   'TRANSFER_GRANT', 'TRANSFER_REVOKE', 'CONSENT_CHANGE'
                 )),
  resource_type  VARCHAR(50)  NOT NULL,
  resource_id    UUID,
  ip_address     VARCHAR(45)  NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit log query patterns: filter by hospital+patient or hospital+user (REQ-F-069)
CREATE INDEX audit_log_hospital_patient_idx ON application_audit_log
  (hospital_id, patient_id, created_at DESC);
CREATE INDEX audit_log_hospital_user_idx ON application_audit_log
  (hospital_id, user_id, created_at DESC);
CREATE INDEX audit_log_action_type_idx ON application_audit_log
  (hospital_id, action_type, created_at DESC);
