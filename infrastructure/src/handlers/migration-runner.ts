import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

interface CfnEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResourceProperties: Record<string, string>;
  PhysicalResourceId?: string;
}

interface CfnResponse {
  PhysicalResourceId: string;
  Data?: Record<string, string>;
}

interface Migration {
  version: string;
  name: string;
  sql: string;
}

// Set from context.awsRequestId at handler entry so all log calls see the real ID.
let _requestId = 'local';

function log(level: string, message: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({
    function: 'his-migration-runner',
    requestId: _requestId,
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  }));
}

// All 14 migrations inlined to avoid fs/bundling issues with esbuild
const MIGRATIONS: Migration[] = [
  {
    version: 'V1',
    name: 'V1__enable_extensions.sql',
    sql: `
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     VARCHAR(50) PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    version: 'V2',
    name: 'V2__create_hospitals_table.sql',
    sql: `
      CREATE TABLE hospitals (
        id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(255) NOT NULL,
        address          TEXT         NOT NULL,
        region_district  VARCHAR(100) NOT NULL,
        type             VARCHAR(20)  NOT NULL CHECK (type IN ('public', 'private', 'mission')),
        admin_email      VARCHAR(255) NOT NULL UNIQUE,
        contact_phone    VARCHAR(30),
        contact_email    VARCHAR(255),
        status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'suspended')),
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX hospitals_status_idx ON hospitals (status);
    `,
  },
  {
    version: 'V3',
    name: 'V3__create_users_table.sql',
    sql: `
      CREATE TABLE users (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id       UUID         REFERENCES hospitals(id) ON DELETE CASCADE,
        cognito_user_id   VARCHAR(255) UNIQUE,
        full_name         VARCHAR(255) NOT NULL,
        email             VARCHAR(255) NOT NULL,
        job_title         VARCHAR(255) NOT NULL,
        region_district   VARCHAR(100) NOT NULL,
        is_active         BOOLEAN      NOT NULL DEFAULT true,
        ward_head_unit    VARCHAR(100),
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE(hospital_id, email)
      );
      CREATE INDEX users_hospital_active_idx ON users (hospital_id, is_active);
      CREATE INDEX users_cognito_id_idx      ON users (cognito_user_id);
    `,
  },
  {
    version: 'V4',
    name: 'V4__create_roles_permissions_tables.sql',
    sql: `
      CREATE TABLE roles (
        id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id  UUID         REFERENCES hospitals(id) ON DELETE CASCADE,
        name         VARCHAR(100) NOT NULL,
        is_default   BOOLEAN      NOT NULL DEFAULT false,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE(hospital_id, name)
      );
      CREATE TABLE permissions (
        id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        name  VARCHAR(100) NOT NULL UNIQUE
      );
      CREATE TABLE role_permissions (
        role_id        UUID  REFERENCES roles(id) ON DELETE CASCADE,
        permission_id  UUID  REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
      CREATE TABLE user_roles (
        user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,
        role_id      UUID        REFERENCES roles(id),
        assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id)
      );
      CREATE TABLE role_assignment_history (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id      UUID        NOT NULL,
        admin_user_id    UUID        NOT NULL,
        affected_user_id UUID        NOT NULL,
        previous_role_id UUID,
        new_role_id      UUID        NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX role_assignment_history_hospital_idx ON role_assignment_history (hospital_id, created_at DESC);
      INSERT INTO permissions (name) VALUES
        ('patient:read'),
        ('patient:write'),
        ('patient:amend'),
        ('diagnosis:write'),
        ('lab_result:read'),
        ('lab_result:write'),
        ('prescription:write'),
        ('appointment:write'),
        ('analytics:view'),
        ('staff:manage'),
        ('role:assign'),
        ('transfer:request'),
        ('transfer:approve');
      INSERT INTO roles (id, name, is_default) VALUES
        (gen_random_uuid(), 'Hospital Admin',        true),
        (gen_random_uuid(), 'Doctor',                true),
        (gen_random_uuid(), 'Nurse',                 true),
        (gen_random_uuid(), 'Laboratory Technician', true),
        (gen_random_uuid(), 'Receptionist',          true),
        (gen_random_uuid(), 'Data Clerk',            true);
    `,
  },
  {
    version: 'V5',
    name: 'V5__create_patients_table.sql',
    sql: `
      CREATE TABLE patients (
        id                             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id                    UUID         NOT NULL REFERENCES hospitals(id),
        patient_number                 VARCHAR(20)  NOT NULL UNIQUE,
        full_name                      VARCHAR(255) NOT NULL,
        date_of_birth                  DATE         NOT NULL,
        biological_sex                 VARCHAR(10)  NOT NULL CHECK (biological_sex IN ('Male', 'Female', 'Other')),
        telephone                      VARCHAR(30)  NOT NULL,
        address                        TEXT         NOT NULL,
        region_district                VARCHAR(100) NOT NULL,
        emergency_contact_name         VARCHAR(255) NOT NULL,
        emergency_contact_phone        VARCHAR(30)  NOT NULL,
        emergency_contact_relationship VARCHAR(50)  NOT NULL,
        national_id                    VARCHAR(50),
        blood_group                    VARCHAR(5),
        known_allergies                TEXT[],
        chronic_conditions             TEXT[],
        consent_personal_data          VARCHAR(10)  NOT NULL DEFAULT 'Pending'
                                         CHECK (consent_personal_data IN ('Granted', 'Refused', 'Pending')),
        consent_public_reporting       VARCHAR(10)  NOT NULL DEFAULT 'Pending'
                                         CHECK (consent_public_reporting IN ('Granted', 'Refused', 'Pending')),
        consent_updated_at             TIMESTAMPTZ,
        consent_updated_by             UUID,
        created_at                     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        created_by                     UUID         NOT NULL
      );
      CREATE INDEX patients_name_trgm_idx   ON patients USING GIN (full_name gin_trgm_ops);
      CREATE INDEX patients_hospital_id_idx ON patients (hospital_id);
      CREATE INDEX patients_telephone_idx   ON patients (telephone);
      CREATE INDEX patients_dob_idx         ON patients (date_of_birth);
    `,
  },
  {
    version: 'V6',
    name: 'V6__create_appointments_table.sql',
    sql: `
      CREATE TABLE appointments (
        id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id          UUID         NOT NULL REFERENCES hospitals(id),
        patient_id           UUID         NOT NULL REFERENCES patients(id),
        date_time            TIMESTAMPTZ  NOT NULL,
        type                 VARCHAR(20)  NOT NULL
                               CHECK (type IN ('consultation', 'follow-up', 'laboratory', 'procedure')),
        clinician_id         UUID         NOT NULL REFERENCES users(id),
        clinical_unit        VARCHAR(100) NOT NULL,
        status               VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
                               CHECK (status IN ('scheduled', 'completed', 'cancelled')),
        cancellation_reason  TEXT,
        created_by           UUID         NOT NULL,
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX appointments_hospital_id_idx        ON appointments (hospital_id);
      CREATE INDEX appointments_patient_id_idx         ON appointments (patient_id);
      CREATE INDEX appointments_clinician_datetime_idx ON appointments (clinician_id, date_time);
      CREATE INDEX appointments_hospital_date_idx      ON appointments (hospital_id, date_time);
    `,
  },
  {
    version: 'V7',
    name: 'V7__create_encounters_tables.sql',
    sql: `
      CREATE TABLE encounters (
        id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id          UUID         NOT NULL REFERENCES hospitals(id),
        patient_id           UUID         NOT NULL REFERENCES patients(id),
        appointment_id       UUID         REFERENCES appointments(id),
        date_time            TIMESTAMPTZ  NOT NULL,
        clinical_unit        VARCHAR(100) NOT NULL,
        presenting_complaint TEXT         NOT NULL,
        staff_id             UUID         NOT NULL REFERENCES users(id),
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX encounters_hospital_patient_idx ON encounters (hospital_id, patient_id);
      CREATE INDEX encounters_hospital_staff_idx   ON encounters (hospital_id, staff_id);
      CREATE INDEX encounters_patient_date_idx     ON encounters (patient_id, date_time DESC);

      CREATE TABLE diagnoses (
        id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id    UUID         NOT NULL REFERENCES encounters(id),
        hospital_id     UUID         NOT NULL,
        condition_name  VARCHAR(255) NOT NULL,
        icd10_code      VARCHAR(20),
        severity        VARCHAR(10)  NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
        status          VARCHAR(10)  NOT NULL CHECK (status IN ('active', 'resolved', 'suspected')),
        recorded_by     UUID         NOT NULL,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX diagnoses_encounter_id_idx ON diagnoses (encounter_id);
      CREATE INDEX diagnoses_hospital_idx     ON diagnoses (hospital_id, created_at DESC);

      CREATE TABLE vital_signs (
        id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id       UUID          NOT NULL REFERENCES encounters(id),
        hospital_id        UUID          NOT NULL,
        temperature        NUMERIC(5, 1),
        bp_systolic        INTEGER,
        bp_diastolic       INTEGER,
        pulse_rate         INTEGER,
        respiratory_rate   INTEGER,
        oxygen_saturation  NUMERIC(5, 1),
        weight             NUMERIC(6, 1),
        recorded_by        UUID          NOT NULL,
        created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      CREATE INDEX vital_signs_encounter_id_idx ON vital_signs (encounter_id);

      CREATE TABLE prescriptions (
        id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id             UUID         NOT NULL REFERENCES encounters(id),
        hospital_id              UUID         NOT NULL,
        patient_id               UUID         NOT NULL,
        medication_name          VARCHAR(255) NOT NULL,
        dosage                   VARCHAR(100) NOT NULL,
        frequency                VARCHAR(50)  NOT NULL,
        route                    VARCHAR(50)  NOT NULL,
        duration                 VARCHAR(50)  NOT NULL,
        prescribing_clinician_id UUID         NOT NULL,
        created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX prescriptions_encounter_id_idx ON prescriptions (encounter_id);
      CREATE INDEX prescriptions_patient_id_idx   ON prescriptions (patient_id);
    `,
  },
  {
    version: 'V8',
    name: 'V8__create_lab_tables.sql',
    sql: `
      CREATE TABLE lab_test_requests (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        encounter_id  UUID         REFERENCES encounters(id),
        hospital_id   UUID         NOT NULL,
        patient_id    UUID         NOT NULL REFERENCES patients(id),
        test_name     VARCHAR(100) NOT NULL,
        urgency       VARCHAR(10)  NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent')),
        notes         TEXT,
        status        VARCHAR(10)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
        requested_by  UUID         NOT NULL,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX lab_requests_hospital_status_idx ON lab_test_requests (hospital_id, status, created_at ASC);
      CREATE INDEX lab_requests_patient_id_idx      ON lab_test_requests (patient_id);

      CREATE TABLE lab_results (
        id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id            UUID          NOT NULL REFERENCES lab_test_requests(id),
        hospital_id           UUID          NOT NULL,
        patient_id            UUID          NOT NULL,
        test_name             VARCHAR(100)  NOT NULL,
        result_value          NUMERIC       NOT NULL,
        unit                  VARCHAR(30)   NOT NULL,
        reference_range_min   NUMERIC,
        reference_range_max   NUMERIC,
        critical_range_min    NUMERIC,
        critical_range_max    NUMERIC,
        result_status         VARCHAR(10)   NOT NULL CHECK (result_status IN ('normal', 'abnormal', 'critical')),
        date_time_tested      TIMESTAMPTZ   NOT NULL,
        lab_technician_id     UUID          NOT NULL,
        created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      CREATE INDEX lab_results_hospital_patient_idx ON lab_results (hospital_id, patient_id);
      CREATE INDEX lab_results_request_id_idx       ON lab_results (request_id);
      CREATE INDEX lab_results_status_idx           ON lab_results (hospital_id, result_status);
    `,
  },
  {
    version: 'V9',
    name: 'V9__create_record_amendments_table.sql',
    sql: `
      CREATE TABLE record_amendments (
        id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        original_record_type VARCHAR(30)  NOT NULL
          CHECK (original_record_type IN
            ('encounter', 'diagnosis', 'vital_signs', 'prescription', 'lab_result')),
        original_record_id   UUID         NOT NULL,
        hospital_id          UUID         NOT NULL,
        amended_by           UUID         NOT NULL,
        amendment_reason     TEXT         NOT NULL,
        original_data        JSONB        NOT NULL,
        amended_data         JSONB        NOT NULL,
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX record_amendments_original_idx   ON record_amendments (original_record_type, original_record_id);
      CREATE INDEX record_amendments_hospital_idx   ON record_amendments (hospital_id, created_at DESC);
      CREATE INDEX record_amendments_amended_by_idx ON record_amendments (amended_by);
    `,
  },
  {
    version: 'V10',
    name: 'V10__create_bulk_upload_table.sql',
    sql: `
      CREATE TABLE bulk_upload_jobs (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id       UUID         NOT NULL,
        uploaded_by       UUID         NOT NULL,
        file_key          TEXT         NOT NULL,
        status            VARCHAR(12)  NOT NULL DEFAULT 'processing'
                            CHECK (status IN ('processing', 'completed', 'failed')),
        total_records     INTEGER      NOT NULL DEFAULT 0,
        inserted_records  INTEGER      NOT NULL DEFAULT 0,
        duplicate_records INTEGER      NOT NULL DEFAULT 0,
        failed_records    INTEGER      NOT NULL DEFAULT 0,
        error_report      JSONB,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        completed_at      TIMESTAMPTZ
      );
      CREATE INDEX bulk_upload_jobs_hospital_idx ON bulk_upload_jobs (hospital_id, created_at DESC);
      CREATE INDEX bulk_upload_jobs_status_idx   ON bulk_upload_jobs (status);
    `,
  },
  {
    version: 'V11',
    name: 'V11__create_transfers_tables.sql',
    sql: `
      CREATE TABLE patient_transfers (
        id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id             UUID         NOT NULL REFERENCES patients(id),
        source_hospital_id     UUID         NOT NULL REFERENCES hospitals(id),
        requesting_hospital_id UUID         NOT NULL REFERENCES hospitals(id),
        reason                 TEXT         NOT NULL,
        access_type            VARCHAR(15)  NOT NULL CHECK (access_type IN ('VIEW_ONLY', 'VIEW_AND_EDIT')),
        status                 VARCHAR(10)  NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'approved', 'denied')),
        decided_by             UUID,
        decided_at             TIMESTAMPTZ,
        grant_duration_days    INTEGER      NOT NULL DEFAULT 7,
        created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX patient_transfers_source_hospital_idx     ON patient_transfers (source_hospital_id, status);
      CREATE INDEX patient_transfers_requesting_hospital_idx ON patient_transfers (requesting_hospital_id, status);

      CREATE TABLE transfer_grants (
        id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_request_id   UUID         NOT NULL REFERENCES patient_transfers(id),
        patient_id            UUID         NOT NULL,
        source_hospital_id    UUID         NOT NULL,
        receiving_hospital_id UUID         NOT NULL,
        access_type           VARCHAR(15)  NOT NULL CHECK (access_type IN ('VIEW_ONLY', 'VIEW_AND_EDIT')),
        expires_at            TIMESTAMPTZ  NOT NULL,
        expiry_warning_sent   BOOLEAN      NOT NULL DEFAULT false,
        revoked_by            UUID,
        revoked_at            TIMESTAMPTZ,
        is_active             BOOLEAN      NOT NULL DEFAULT true,
        created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX transfer_grants_expiry_idx    ON transfer_grants (expires_at, is_active, expiry_warning_sent);
      CREATE INDEX transfer_grants_receiving_idx ON transfer_grants (receiving_hospital_id, is_active);
      CREATE INDEX transfer_grants_patient_idx   ON transfer_grants (patient_id, is_active);
    `,
  },
  {
    version: 'V12',
    name: 'V12__create_notifications_audit_tables.sql',
    sql: `
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
      CREATE INDEX notifications_user_delivered_idx ON notifications (user_id, is_delivered, created_at DESC);
      CREATE INDEX notifications_hospital_idx       ON notifications (hospital_id, created_at DESC);

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
      CREATE INDEX audit_log_hospital_patient_idx ON application_audit_log (hospital_id, patient_id, created_at DESC);
      CREATE INDEX audit_log_hospital_user_idx    ON application_audit_log (hospital_id, user_id, created_at DESC);
      CREATE INDEX audit_log_action_type_idx      ON application_audit_log (hospital_id, action_type, created_at DESC);
    `,
  },
  {
    version: 'V13',
    name: 'V13__create_materialized_views.sql',
    sql: `
      CREATE MATERIALIZED VIEW mv_hospital_monthly_stats AS
      SELECT
        hospital_id,
        DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos') AS month,
        COUNT(*) AS patient_count
      FROM patients
      GROUP BY hospital_id, DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos')
      WITH DATA;
      CREATE UNIQUE INDEX mv_hospital_monthly_stats_idx ON mv_hospital_monthly_stats (hospital_id, month);

      CREATE MATERIALIZED VIEW mv_monthly_encounters AS
      SELECT
        hospital_id,
        DATE_TRUNC('month', date_time AT TIME ZONE 'Africa/Lagos') AS month,
        COUNT(*) AS encounter_count,
        COUNT(DISTINCT patient_id) AS unique_patients
      FROM encounters
      GROUP BY hospital_id, DATE_TRUNC('month', date_time AT TIME ZONE 'Africa/Lagos')
      WITH DATA;
      CREATE UNIQUE INDEX mv_monthly_encounters_idx ON mv_monthly_encounters (hospital_id, month);

      CREATE MATERIALIZED VIEW mv_top_diagnoses AS
      SELECT
        hospital_id,
        DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos') AS month,
        condition_name,
        COUNT(*) AS case_count
      FROM diagnoses
      GROUP BY hospital_id, DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos'), condition_name
      WITH DATA;
      CREATE UNIQUE INDEX mv_top_diagnoses_idx ON mv_top_diagnoses (hospital_id, month, condition_name);

      CREATE MATERIALIZED VIEW mv_lab_turnaround AS
      SELECT
        lr.hospital_id,
        DATE_TRUNC('month', lr.created_at AT TIME ZONE 'Africa/Lagos') AS month,
        ROUND(AVG(EXTRACT(EPOCH FROM (lr.date_time_tested - ltr.created_at)) / 3600)::NUMERIC, 2) AS avg_turnaround_hours,
        COUNT(*) AS result_count
      FROM lab_results lr
      JOIN lab_test_requests ltr ON lr.request_id = ltr.id
      GROUP BY lr.hospital_id, DATE_TRUNC('month', lr.created_at AT TIME ZONE 'Africa/Lagos')
      WITH DATA;
      CREATE UNIQUE INDEX mv_lab_turnaround_idx ON mv_lab_turnaround (hospital_id, month);

      CREATE MATERIALIZED VIEW mv_ministry_disease_stats AS
      SELECT
        d.condition_name,
        DATE_TRUNC('month', d.created_at AT TIME ZONE 'Africa/Lagos') AS month,
        p.region_district,
        COUNT(*) AS case_count
      FROM diagnoses d
      JOIN encounters e ON d.encounter_id = e.id
      JOIN patients p   ON e.patient_id = p.id
      WHERE p.consent_public_reporting = 'Granted'
      GROUP BY d.condition_name, DATE_TRUNC('month', d.created_at AT TIME ZONE 'Africa/Lagos'), p.region_district
      WITH DATA;
      CREATE UNIQUE INDEX mv_ministry_disease_stats_idx ON mv_ministry_disease_stats (condition_name, month, region_district);

      CREATE MATERIALIZED VIEW mv_regional_distribution AS
      SELECT
        p.region_district,
        DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos') AS month,
        COUNT(DISTINCT e.id) AS encounter_count,
        COUNT(DISTINCT e.patient_id) AS patient_count
      FROM encounters e
      JOIN patients p ON e.patient_id = p.id
      WHERE p.consent_public_reporting = 'Granted'
      GROUP BY p.region_district, DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos')
      WITH DATA;
      CREATE UNIQUE INDEX mv_regional_distribution_idx ON mv_regional_distribution (region_district, month);

      CREATE MATERIALIZED VIEW mv_staff_activity AS
      SELECT
        e.hospital_id,
        e.staff_id,
        DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos') AS month,
        COUNT(*) AS encounter_count,
        MAX(e.date_time) AS last_encounter_at
      FROM encounters e
      GROUP BY e.hospital_id, e.staff_id, DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos')
      WITH DATA;
      CREATE UNIQUE INDEX mv_staff_activity_idx ON mv_staff_activity (hospital_id, staff_id, month);
    `,
  },
  {
    version: 'V14',
    name: 'V14__configure_roles_and_pg_cron.sql',
    sql: `
      CREATE ROLE his_app WITH LOGIN;
      GRANT rds_iam TO his_app;
      GRANT CONNECT ON DATABASE hisdb TO his_app;
      GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO his_app;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO his_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO his_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO his_app;
      REVOKE UPDATE ON application_audit_log FROM his_app;
      REVOKE DELETE ON application_audit_log FROM his_app;
      REFRESH MATERIALIZED VIEW mv_hospital_monthly_stats;
      REFRESH MATERIALIZED VIEW mv_monthly_encounters;
      REFRESH MATERIALIZED VIEW mv_top_diagnoses;
      REFRESH MATERIALIZED VIEW mv_lab_turnaround;
      REFRESH MATERIALIZED VIEW mv_ministry_disease_stats;
      REFRESH MATERIALIZED VIEW mv_regional_distribution;
      REFRESH MATERIALIZED VIEW mv_staff_activity;
      SELECT cron.schedule('refresh-mv-hospital-stats', '*/5 5-21 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hospital_monthly_stats');
      SELECT cron.schedule('refresh-mv-encounters', '*/5 5-21 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_encounters');
      SELECT cron.schedule('refresh-mv-top-diagnoses', '*/5 5-21 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_diagnoses');
      SELECT cron.schedule('refresh-mv-lab-turnaround', '*/5 5-21 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lab_turnaround');
      SELECT cron.schedule('refresh-mv-ministry-stats', '*/5 5-21 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ministry_disease_stats');
      SELECT cron.schedule('refresh-mv-regional', '*/5 5-21 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_regional_distribution');
      SELECT cron.schedule('refresh-mv-staff-activity', '*/5 5-21 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_staff_activity');
    `,
  },
  {
    version: 'V15',
    name: 'V15__add_admin_name_to_hospitals.sql',
    sql: `
      ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);
    `,
  },
  {
    version: 'V16',
    name: 'V16__seed_default_role_permissions.sql',
    sql: `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'Hospital Admin' AND r.hospital_id IS NULL
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.name = ANY(ARRAY[
        'patient:read','patient:write','patient:amend','diagnosis:write',
        'lab_result:read','lab_result:write','prescription:write',
        'appointment:write','transfer:request'
      ])
      WHERE r.name = 'Doctor' AND r.hospital_id IS NULL
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.name = ANY(ARRAY[
        'patient:read','patient:write','appointment:write','lab_result:read'
      ])
      WHERE r.name = 'Nurse' AND r.hospital_id IS NULL
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.name = ANY(ARRAY[
        'patient:read','lab_result:read','lab_result:write'
      ])
      WHERE r.name = 'Laboratory Technician' AND r.hospital_id IS NULL
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.name = ANY(ARRAY[
        'patient:read','patient:write','appointment:write'
      ])
      WHERE r.name = 'Receptionist' AND r.hospital_id IS NULL
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.name = ANY(ARRAY[
        'patient:read','patient:write','analytics:view'
      ])
      WHERE r.name = 'Data Clerk' AND r.hospital_id IS NULL
      ON CONFLICT DO NOTHING;
    `,
  },
];

export const handler = async (
  event: CfnEvent,
  context: { awsRequestId: string },
): Promise<CfnResponse> => {
  _requestId = context.awsRequestId;
  log('INFO', 'Migration runner invoked', { requestType: event.RequestType });

  if (event.RequestType === 'Delete') {
    log('INFO', 'Delete event - schema retained, no action taken');
    return { PhysicalResourceId: 'his-database-migrations' };
  }

  // Fetch credentials from Secrets Manager at runtime (REQ-NF-009 - no credentials in env vars).
  // Requires a Secrets Manager VPC Interface Endpoint -- added in Phase 11 when new migrations run.
  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) throw new Error('DB_SECRET_ARN env var not set');

  const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const { SecretString } = await sm.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!SecretString) throw new Error('Secrets Manager returned empty SecretString');
  const { username, password } = JSON.parse(SecretString) as { username: string; password: string };

  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME ?? 'hisdb',
    user: username,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
  });

  await client.connect();
  log('INFO', 'Connected to RDS');

  try {
    // Ensure the tracking table exists before querying it (V1 also creates it
    // but this guard allows safe re-entry if V1 itself fails)
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     VARCHAR(50) PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version',
    );
    const applied = new Set(rows.map((r) => r.version));
    log('INFO', 'Checked applied migrations', { appliedCount: applied.size });

    let newlyApplied = 0;
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) {
        log('INFO', `Skipping ${migration.name} (already applied)`);
        continue;
      }

      log('INFO', `Applying ${migration.name}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [migration.version],
        );
        await client.query('COMMIT');
        newlyApplied += 1;
        log('INFO', `${migration.name} applied successfully`);
      } catch (err) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : String(err);
        log('ERROR', `${migration.name} failed, rolled back`, { error: message });
        throw new Error(`Migration ${migration.name} failed: ${message}`);
      }
    }

    log('INFO', 'All migrations complete', {
      newlyApplied,
      totalMigrations: MIGRATIONS.length,
    });

    return {
      PhysicalResourceId: 'his-database-migrations',
      Data: {
        NewlyApplied: String(newlyApplied),
        TotalMigrations: String(MIGRATIONS.length),
        SchemaVersion: 'V16',
      },
    };
  } finally {
    await client.end();
  }
};
