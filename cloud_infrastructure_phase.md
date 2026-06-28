# HIS Cloud Infrastructure — Full Phased Implementation Plan

**Region:** us-east-1 | **CDK language:** TypeScript | **Lambda runtime:** Node.js 20
**Database:** PostgreSQL 15 (RDS db.t3.micro) | **Total phases:** 18

---

## Architecture Correction and Optimization

Lambda functions in a VPC cannot reach the internet or AWS service endpoints without either a
NAT Gateway or VPC Interface Endpoints — Lambda ENIs do not receive public IPs. The SRS v2.0
"public subnet, no NAT" framing assumed internet connectivity that VPC Lambda does not have.

**Optimization applied (3 endpoints reduced to 1 — cost back within SRS $10/month budget):**
- **auth-service** deployed without VPC attachment — it calls only Cognito (a public AWS
  endpoint) and has no RDS dependency. No VPC, no endpoint needed for it.
- **Secrets Manager endpoint removed** — RDS access switches to IAM database authentication.
  Lambda execution roles call `Signer.getAuthToken()` locally (no network call — uses
  Lambda execution role credentials from the runtime environment). No stored DB password.
- **Cognito-IDP endpoint removed** — auth-service was the only Lambda calling Cognito from
  within the VPC; it is now outside the VPC.
- **SNS VPC Interface Endpoint retained** (~$7.20/month single-AZ) — required by lab-service,
  transfer-service, notification-service, and bulk-ingestion for SNS event publishing.
- **S3 VPC Gateway Endpoint retained** (free).

**Revised cost estimates:**
- Year 1 (free tier): **~$7.20/month** (SNS endpoint only — within SRS $10/month constraint)
- Year 2+: **~$24.45/month** ($7.20 SNS + $13.50 RDS + $3.75 misc SES/S3/SQS)

---

## Phase 1 — CDK Project Initialization + Stack 1 (VPC & Networking)

**CDK Stack(s) involved:** HisVpcStack (Stack 1 — new)

### Reference documents to read before starting
- CLAUDE.md — full document (all rules apply from line 1)
- SRS v2.0 Section 2.4.1 (Cloud Infrastructure), Section 2.1.1 NAT Gateway and Lambda rows,
  Section 2.5 (Design Constraints), REQ-NF-013
- HIS_AWS_Architecture.drawio — VPC block, public and private subnet annotations, Lambda SG
  annotation rows, S3 Gateway Endpoint note, RDS private subnet label
- phases.md — no frontend pages activated yet; this phase is infrastructure-only

### AWS skills to load
```
retrieve_skill("aws-core:aws-cdk")
retrieve_skill("aws-dev-toolkit:networking")
retrieve_skill("aws-core:aws-iam")
```

### What this phase builds

**1. CDK TypeScript project** at `d:\HIS_Platform\infrastructure\`

Initialize with `cdk init app --language typescript`. Project structure:
```
infrastructure/
├── bin/his-infrastructure.ts         (app entry, all 6 stacks instantiated in order)
├── lib/stacks/
│   ├── his-vpc-stack.ts
│   ├── his-database-stack.ts
│   ├── his-auth-stack.ts
│   ├── his-backend-stack.ts
│   ├── his-frontend-stack.ts
│   └── his-observability-stack.ts
├── lib/constructs/
│   └── his-lambda-function.ts        (shared NodejsFunction wrapper with SG, VPC, role, concurrency)
├── lambda/
│   ├── shared/                       (audit-logger.ts, structured-logger.ts, db-client.ts, jwt-claims.ts)
│   ├── auth-service/
│   ├── hospital-service/
│   ├── patient-service/
│   ├── appointment-service/
│   ├── clinical-service/
│   ├── lab-service/
│   ├── transfer-service/
│   ├── analytics-service/
│   ├── notification-service/
│   └── bulk-ingestion/
└── migrations/
    ├── V1__enable_extensions.sql
    ├── V2__create_hospitals_table.sql
    └── ... (V1 through V14)
```

**2. HisVpcStack constructs**

**VPC** — `ec2.Vpc` (L2), CIDR `10.0.0.0/16`, `maxAzs: 2`, `natGateways: 0`,
`subnetConfiguration`:
- `ISOLATED` private subnets in both AZs (no route to internet, no NAT):
  `his-private-subnet-1a` (10.0.1.0/24), `his-private-subnet-1b` (10.0.2.0/24)
  — for Lambda and RDS
- No public subnets (no IGW needed for MVP; all external access via VPC Interface Endpoints)

**Lambda Security Group** — `ec2.SecurityGroup`, ID `his-lambda-sg`:
- Egress: TCP 5432, destination = RDS SG (cross-stack reference)
- Egress: TCP 443, destination = VPC CIDR 10.0.0.0/16 (for VPC endpoint traffic)
- No ingress rules

**RDS Security Group** — `ec2.SecurityGroup`, ID `his-rds-sg`:
- Ingress: TCP 5432, source = Lambda SG
- No egress rules needed

**S3 VPC Gateway Endpoint** (free) — `ec2.GatewayVpcEndpoint`:
- Service: `ec2.GatewayVpcEndpointAwsService.S3`
- Subnets: isolated subnets
- Added to route table automatically by CDK

**SNS VPC Interface Endpoint** — `ec2.InterfaceVpcEndpoint`:
- Service: `ec2.InterfaceVpcEndpointAwsService.SNS`
- Subnets: isolated private subnets (both AZs)
- `privateDnsEnabled: true`
- Required by: lab-service, transfer-service, notification-service, bulk-ingestion (all publish
  SNS events from within the VPC)
- Cost: ~$7.20/month single-AZ — the only interface endpoint in the MVP architecture

**Stack CfnOutputs** (consumed by downstream stacks):
- `VpcId`, `PrivateSubnetIds`, `LambdaSecurityGroupId`, `RdsSecurityGroupId`

**3. bin/his-infrastructure.ts**: instantiates all 6 stacks in dependency order. HisVpcStack first,
no deps. All other stacks receive `vpcStack` as constructor parameter.
`stackProps.env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' }`.

**4. cdk.json** `context` key: `"@aws-cdk/aws-ec2:restrictDefaultSecurityGroup": true`.

**5. package.json** dev dependencies: `aws-cdk-lib`, `constructs`, `@aws-cdk/aws-lambda-nodejs`,
`esbuild`, `typescript`, `@types/node`, `@types/pg`. Lambda runtime dependencies in
`lambda/package.json`: `pg`, `pg-format`, `uuid`.

### SRS requirements satisfied
- REQ-NF-013 (VPC isolation, Lambda SG, RDS SG) — fully satisfied
- Section 2.4.1 (region us-east-1) — fully satisfied
- Section 2.5 AWS Services Only constraint — established

### Frontend pages connected
None. This phase is infrastructure-only.

### API endpoints created
None.

### Database tables created or modified
None.

### Security considerations
- No public subnets eliminates all internet-facing attack surface
- VPC Interface Endpoints use `privateDnsEnabled: true` — all AWS SDK calls from Lambda resolve
  to private IPs within VPC (no internet traversal)
- Lambda SG egress is port-locked: 443 to VPC CIDR only, 5432 to RDS SG only
- RDS SG allows inbound 5432 exclusively from the Lambda SG
- `restrictDefaultSecurityGroup` CDK context flag removes the permissive default SG

### End-of-phase verification
```bash
aws cloudformation describe-stacks \
  --stack-name HisVpcStack \
  --query "Stacks[0].StackStatus"
# Expected: "CREATE_COMPLETE"

aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=HisVpcStack/HisVpc" \
  --query "Vpcs[0].VpcId"

aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=<vpc-id>" \
  --query "Subnets[*].{AZ:AvailabilityZone,CIDR:CidrBlock,SubnetId:SubnetId}"

aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=<vpc-id>" \
  --query "VpcEndpoints[*].{Service:ServiceName,State:State,Type:VpcEndpointType}"
# Expected: 2 entries (s3 gateway + sns interface endpoint only)
```

### Deliverables
VPC, subnets, security groups, and all required VPC endpoints deployed. No application
functionality yet.

---

## Phase 2 — Stack 2: RDS PostgreSQL + Secrets Manager + Parameter Group

**CDK Stack(s) involved:** HisDatabaseStack (Stack 2 — new)

### Reference documents to read before starting
- CLAUDE.md — Secret Safety section (mandatory before any secrets work; load
  `aws-secrets-manager` skill first)
- SRS v2.0 Section 3.1.3 (Database interface row), REQ-NF-007, REQ-NF-017, REQ-NF-018,
  REQ-NF-026
- Section 2.1.1 RDS row and KMS row
- SRS Section 2.1.3 MVP vs Production Configuration table (DB row)
- HIS_AWS_Architecture.drawio — Private Subnet block, RDS annotation box (db.t3.micro,
  pg_trgm, materialized views, pg_cron, backup 2d, PITR, Aurora upgrade path)

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first (CLAUDE.md rule)
retrieve_skill("aws-dev-toolkit:rds-aurora")
retrieve_skill("aws-core:aws-cdk")
```

### What this phase builds

**1. RDS Parameter Group** — `rds.ParameterGroup` (L2):
- Engine: `rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 })`
- Parameters: `{ 'shared_preload_libraries': 'pg_cron', 'cron.database_name': 'hisdb' }`
- ID: `HisDbParamGroup`

**2. RDS DB Subnet Group** — created automatically by CDK from VPC isolated subnets (both AZs
— required even for single-AZ)

**3. RDS Instance** — `rds.DatabaseInstance` (L2):
- Engine: PostgreSQL 15
- `instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)`
- `vpc`, `vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }`
- `securityGroups: [rdsSecurityGroup]`
- `parameterGroup: HisDbParamGroup`
- `databaseName: 'hisdb'`
- `credentials: rds.Credentials.fromGeneratedSecret('hisadmin', { secretName: 'his/rds/master-credentials' })` (CDK-managed master credentials for initial setup and migrations only — Lambda application connections use IAM DB auth via `his_app` role, not this master secret)
- `storageEncrypted: true` (uses aws/rds managed key — no KMS CMK per MVP decision)
- `backupRetention: cdk.Duration.days(2)` (MVP: 2 days. Production target: 30 days)
- `deletionProtection: false` (MVP — enable for production)
- `multiAz: false` (single-AZ per REQ-NF-018 MVP decision)
- `enablePerformanceInsights: false` (deferred)
- `publiclyAccessible: false`
- `iamAuthentication: true`
- `cloudwatchLogsExports: ['postgresql']`
- `removalPolicy: cdk.RemovalPolicy.DESTROY` (MVP; RETAIN for production)

**4. Secrets Manager Secret** — auto-generated by `rds.Credentials.fromGeneratedSecret`.
Secret `his/rds/master-credentials` contains:
`{ "username": "hisadmin", "password": "...", "host": "...", "port": 5432, "dbname": "hisdb" }`.
Encrypted with `aws/secretsmanager` managed key.

Per CLAUDE.md: Lambda functions retrieve this secret at runtime using
`{{resolve:secretsmanager:his/rds/master-credentials:SecretString:password}}` pattern — never
hardcoded. In practice, Lambda uses `@aws-sdk/client-secrets-manager` at cold start to fetch
and cache credentials in the module scope.

**5. Stack CfnOutputs**: `RdsEndpointAddress`, `RdsEndpointPort`, `RdsSecretArn`,
`RdsDatabaseName`.

### SRS requirements satisfied
- REQ-NF-007 (AES-256 encryption at rest via aws/rds managed key) — fully satisfied
- REQ-NF-009 (no credentials in source code/env vars) — fully satisfied
- REQ-NF-013 (RDS in private subnet, no public IP) — fully satisfied
- REQ-NF-017 (backup retention 2 days MVP, CDK parameter annotated for 30 days) — fully satisfied
- REQ-NF-018 (single-AZ accepted for MVP) — fully satisfied

### Frontend pages connected
None.

### API endpoints created
None.

### Database tables created or modified
RDS instance created with empty `hisdb` database. Tables created in Phase 3.

### Security considerations
- `storageEncrypted: true` with AWS managed key satisfies REQ-NF-007
- `publiclyAccessible: false` — no public endpoint
- RDS SG allows inbound 5432 from Lambda SG only
- Secret in Secrets Manager (aws/secretsmanager managed key) — never in code
- `iamAuthentication: true` for future IAM auth support

### End-of-phase verification
```bash
aws rds describe-db-instances \
  --query "DBInstances[?DBName=='hisdb'].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,MultiAZ:MultiAZ,Encrypted:StorageEncrypted}"
# Expected: Status=available, MultiAZ=false, Encrypted=true

aws secretsmanager describe-secret \
  --secret-id his/rds/master-credentials \
  --query "Name"
# Expected: "his/rds/master-credentials"
```

### Deliverables
RDS PostgreSQL 15 instance running in private subnet, encrypted, with DB credentials in
Secrets Manager. Empty `hisdb` database. Ready for migrations.

---

## Phase 3 — Stack 2: Flyway-Style Database Migrations (All Tables, Extensions, Indexes, Views)

**CDK Stack(s) involved:** HisDatabaseStack (Stack 2 — extended with custom resource)

### Reference documents to read before starting
- SRS v2.0 REQ-F-001 through REQ-F-071 (all tables derive from functional requirements)
- REQ-NF-002 (GIN index on patients), REQ-NF-003 (materialized views), REQ-NF-026 (versioned
  migrations)
- SRS Section 3.1.3 Software Interface Requirements — Database row
- SRS Section 3.2.13 (application_audit_log schema: REQ-F-068)
- Section 2.4.3 Development Environment (Flyway mentioned)

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first (CLAUDE.md rule)
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-core:aws-cdk")
```

### What this phase builds

**Migration runner Lambda** (CDK Custom Resource): A Lambda function (`his-migration-runner`)
placed in the VPC, with access to Secrets Manager (via VPC endpoint) and RDS. On `CREATE` and
`UPDATE` CloudFormation events, it connects to RDS and executes SQL migration files in version
order, tracking applied migrations in a `schema_migrations` table.

The 14 migration files in `infrastructure/migrations/`:

**V1__enable_extensions.sql**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
```

**V2__create_hospitals_table.sql**
```sql
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  region_district VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('public','private','mission')),
  admin_email VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**V3__create_users_table.sql**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  cognito_user_id VARCHAR(255) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  region_district VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ward_head_unit VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, email)
);
```

**V4__create_roles_permissions_tables.sql**
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, name)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

CREATE TABLE role_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  affected_user_id UUID NOT NULL,
  previous_role_id UUID,
  new_role_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO permissions (name) VALUES
  ('patient:read'),('patient:write'),('patient:amend'),
  ('diagnosis:write'),('lab_result:read'),('lab_result:write'),
  ('prescription:write'),('appointment:write'),('analytics:view'),
  ('staff:manage'),('role:assign'),('transfer:request'),('transfer:approve');

INSERT INTO roles (id, name, is_default) VALUES
  (gen_random_uuid(), 'Hospital Admin', true),
  (gen_random_uuid(), 'Doctor', true),
  (gen_random_uuid(), 'Nurse', true),
  (gen_random_uuid(), 'Laboratory Technician', true),
  (gen_random_uuid(), 'Receptionist', true),
  (gen_random_uuid(), 'Data Clerk', true);
```

**V5__create_patients_table.sql** (REQ-F-019 to REQ-F-024, REQ-NF-002)
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_number VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  biological_sex VARCHAR(10) NOT NULL CHECK (biological_sex IN ('Male','Female','Other')),
  telephone VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  region_district VARCHAR(100) NOT NULL,
  emergency_contact_name VARCHAR(255) NOT NULL,
  emergency_contact_phone VARCHAR(30) NOT NULL,
  emergency_contact_relationship VARCHAR(50) NOT NULL,
  national_id VARCHAR(50),
  blood_group VARCHAR(5),
  known_allergies TEXT[],
  chronic_conditions TEXT[],
  consent_personal_data VARCHAR(10) NOT NULL DEFAULT 'Pending'
    CHECK (consent_personal_data IN ('Granted','Refused','Pending')),
  consent_public_reporting VARCHAR(10) NOT NULL DEFAULT 'Pending'
    CHECK (consent_public_reporting IN ('Granted','Refused','Pending')),
  consent_updated_at TIMESTAMPTZ,
  consent_updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX patients_name_trgm_idx ON patients USING GIN (full_name gin_trgm_ops);
CREATE INDEX patients_hospital_id_idx ON patients (hospital_id);
CREATE INDEX patients_telephone_idx ON patients (telephone);
```

**V6__create_appointments_table.sql** (REQ-F-029 to REQ-F-033)
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  date_time TIMESTAMPTZ NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('consultation','follow-up','laboratory','procedure')),
  clinician_id UUID NOT NULL REFERENCES users(id),
  clinical_unit VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','completed','cancelled')),
  cancellation_reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX appointments_hospital_id_idx ON appointments (hospital_id);
CREATE INDEX appointments_clinician_datetime_idx ON appointments (clinician_id, date_time);
```

**V7__create_encounters_tables.sql** (REQ-F-034 to REQ-F-038)
```sql
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  date_time TIMESTAMPTZ NOT NULL,
  clinical_unit VARCHAR(100) NOT NULL,
  presenting_complaint TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  hospital_id UUID NOT NULL,
  condition_name VARCHAR(255) NOT NULL,
  icd10_code VARCHAR(20),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('mild','moderate','severe')),
  status VARCHAR(10) NOT NULL CHECK (status IN ('active','resolved','suspected')),
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  hospital_id UUID NOT NULL,
  temperature NUMERIC(5,1),
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  pulse_rate INTEGER,
  respiratory_rate INTEGER,
  oxygen_saturation NUMERIC(5,1),
  weight NUMERIC(6,1),
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  hospital_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  route VARCHAR(50) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  prescribing_clinician_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**V8__create_lab_tables.sql** (REQ-F-039 to REQ-F-043)
```sql
CREATE TABLE lab_test_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounters(id),
  hospital_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  test_name VARCHAR(100) NOT NULL,
  urgency VARCHAR(10) NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine','urgent')),
  notes TEXT,
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  requested_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES lab_test_requests(id),
  hospital_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  test_name VARCHAR(100) NOT NULL,
  result_value NUMERIC NOT NULL,
  unit VARCHAR(30) NOT NULL,
  reference_range_min NUMERIC,
  reference_range_max NUMERIC,
  critical_range_min NUMERIC,
  critical_range_max NUMERIC,
  result_status VARCHAR(10) NOT NULL CHECK (result_status IN ('normal','abnormal','critical')),
  date_time_tested TIMESTAMPTZ NOT NULL,
  lab_technician_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX lab_results_hospital_patient_idx ON lab_results (hospital_id, patient_id);
```

**V9__create_record_amendments_table.sql** (REQ-F-025 to REQ-F-028)
```sql
CREATE TABLE record_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_record_type VARCHAR(30) NOT NULL
    CHECK (original_record_type IN
      ('encounter','diagnosis','vital_signs','prescription','lab_result')),
  original_record_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  amended_by UUID NOT NULL,
  amendment_reason TEXT NOT NULL,
  original_data JSONB NOT NULL,
  amended_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**V10__create_bulk_upload_table.sql** (REQ-F-044 to REQ-F-048)
```sql
CREATE TABLE bulk_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  file_key TEXT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','completed','failed')),
  total_records INTEGER DEFAULT 0,
  inserted_records INTEGER DEFAULT 0,
  duplicate_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**V11__create_transfers_tables.sql** (REQ-F-049 to REQ-F-057)
```sql
CREATE TABLE patient_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  source_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  requesting_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  reason TEXT NOT NULL,
  access_type VARCHAR(15) NOT NULL CHECK (access_type IN ('VIEW_ONLY','VIEW_AND_EDIT')),
  status VARCHAR(10) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','denied')),
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  grant_duration_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transfer_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_request_id UUID NOT NULL REFERENCES patient_transfers(id),
  patient_id UUID NOT NULL,
  source_hospital_id UUID NOT NULL,
  receiving_hospital_id UUID NOT NULL,
  access_type VARCHAR(15) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  expiry_warning_sent BOOLEAN NOT NULL DEFAULT false,
  revoked_by UUID,
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX transfer_grants_expiry_idx ON transfer_grants (expires_at, is_active, expiry_warning_sent);
```

**V12__create_notifications_audit_tables.sql** (REQ-F-064 to REQ-F-071)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  hospital_id UUID NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'critical_lab','transfer_request','transfer_approved','transfer_denied',
    'etl_complete','staff_created','appointment_created','appointment_cancelled')),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_delivered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notifications_user_delivered_idx ON notifications (user_id, is_delivered, created_at DESC);

CREATE TABLE application_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  patient_id UUID,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN (
    'READ','CREATE','UPDATE','AMEND','DELETE',
    'TRANSFER_GRANT','TRANSFER_REVOKE','CONSENT_CHANGE')),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_log_hospital_patient_idx ON application_audit_log
  (hospital_id, patient_id, created_at DESC);
CREATE INDEX audit_log_hospital_user_idx ON application_audit_log
  (hospital_id, user_id, created_at DESC);
```

**V13__create_materialized_views.sql** (REQ-NF-003, REQ-F-058 to REQ-F-063)
```sql
CREATE MATERIALIZED VIEW mv_hospital_monthly_stats AS
SELECT
  hospital_id,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS patient_count
FROM patients
GROUP BY hospital_id, DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX mv_hospital_monthly_stats_idx ON mv_hospital_monthly_stats (hospital_id, month);
-- Additional materialized views for diagnosis trends, lab turnaround, ministry aggregates
-- (full SQL with all columns in V13 file)
```

**V14__configure_roles_and_pg_cron.sql**
```sql
-- IAM database authentication role — no password, token-based (REQ-NF-009)
CREATE ROLE his_app WITH LOGIN;
GRANT rds_iam TO his_app;
GRANT CONNECT ON DATABASE hisdb TO his_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO his_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO his_app;
REVOKE UPDATE, DELETE ON application_audit_log FROM his_app;

SELECT cron.schedule(
  'refresh-mv-stats',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hospital_monthly_stats'
);
```

### SRS requirements satisfied
- REQ-F-001 to REQ-F-071 — all required tables created
- REQ-NF-002 (GIN index on patients) — fully satisfied
- REQ-NF-003 (materialized views for dashboard queries) — fully satisfied
- REQ-NF-026 (versioned migrations) — fully satisfied
- REQ-F-068 (application_audit_log table) — structure created
- REQ-F-070 (audit log immutable) — enforced via REVOKE UPDATE/DELETE in V14

### Frontend pages connected
None.

### End-of-phase verification
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/his-migration-runner \
  --filter-pattern "V14__configure_roles_and_pg_cron.sql applied"
# Expected: matching log event found
```

### Deliverables
All 14 database tables, GIN indexes, materialized views, and pg_cron jobs deployed.
Application role `his_app` created with scoped permissions. Database is schema-complete
and ready for application logic.

---

## Phase 4 — Stack 3: Cognito User Pool & Authentication

**CDK Stack(s) involved:** HisAuthStack (Stack 3 — new)

### Reference documents to read before starting
- SRS Section 3.1.3 Authentication interface row (JWT RS256, 60-min expiry, silent refresh)
- SRS REQ-F-001 to REQ-F-005 (registration, email verification, password policy)
- SRS COM-003 (refresh token silent renewal)
- SRS REQ-NF-009 (no credentials in code), REQ-NF-012 (passwords handled by Cognito only)
- phases.md Phase 1 (Auth pages), Phase 2 (Shell — role badge, session management)

### AWS skills to load
```
retrieve_skill("aws-core:aws-cdk")
retrieve_skill("aws-serverless:aws-lambda")
```

### What this phase builds

**1. Cognito User Pool** — `cognito.UserPool` (L2):
- `userPoolName: 'HisUserPool'`
- `selfSignUpEnabled: false`
- `signInAliases: { email: true }`
- `passwordPolicy`: `{ minLength: 10, requireUppercase: true, requireDigits: true, requireSymbols: true, tempPasswordValidity: Duration.days(7) }`
- `accountRecovery: cognito.AccountRecovery.EMAIL_ONLY`
- `autoVerify: { email: true }`
- `mfa: cognito.Mfa.OFF` (deferred to production)
- `removalPolicy: RemovalPolicy.DESTROY` (MVP)
- **Custom attributes** (all `mutable: true`):
  - `custom:hospital_id` (StringAttribute)
  - `custom:role_id` (StringAttribute)
  - `custom:role_name` (StringAttribute)
  - `custom:user_db_id` (StringAttribute)
  - `custom:is_super_admin` (StringAttribute — 'true'/'false')

**2. Cognito User Pool Client** — `cognito.UserPoolClient`:
- `userPoolClientName: 'HisWebClient'`
- `authFlows: { userPassword: true, userSrp: true }`
- `accessTokenValidity: Duration.minutes(60)` (REQ-NF-011, COM-003)
- `refreshTokenValidity: Duration.days(30)`
- `idTokenValidity: Duration.minutes(60)`
- `generateSecret: false` (SPA cannot keep secrets)
- `readAttributes`: all custom attributes
- `writeAttributes`: none (Lambda sets custom attributes via admin API)

**3. Super Admin User** — seeded via CDK Custom Resource (one-time):
`adminCreateUser` creating `superadmin@his-platform.internal` with
`custom:is_super_admin='true'`, `custom:hospital_id='SYSTEM'`.

**4. Stack CfnOutputs**: `UserPoolId`, `UserPoolClientId`, `UserPoolArn`.

### SRS requirements satisfied
- REQ-NF-009 (credentials in Cognito only) — fully satisfied
- REQ-NF-012 (password hashing by Cognito) — fully satisfied
- REQ-F-005 (password policy: 10 chars, uppercase, digit, special char) — fully satisfied
- COM-003 (JWT RS256, 60-min token expiry, refresh token support) — fully satisfied

### Frontend pages connected
- Page 1.1 (Login) — Cognito pool and client IDs needed by frontend Amplify config
- Page 1.2 (Forgot Password) — Cognito built-in password reset flow
- Pages 1.3/1.4 (Reset/Change Password) — Cognito built-in flow

### API endpoints created
None yet. Auth endpoints implemented in Phase 6.

### End-of-phase verification
```bash
aws cognito-idp describe-user-pool \
  --user-pool-id <pool-id> \
  --query "UserPool.{Name:Name,PasswordPolicy:Policies.PasswordPolicy}"

aws cognito-idp list-users \
  --user-pool-id <pool-id> \
  --query "Users[*].Username"
# Expected: "superadmin@his-platform.internal" exists
```

### Deliverables
Cognito User Pool with custom attributes, password policy, web client configured. Frontend
can be configured with real Cognito pool/client IDs. Super Admin account seeded.

---

## Phase 5 — Stack 4 Foundation: API Gateway + S3 + SQS + SNS + Shared Lambda Layer

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — new)

### Reference documents to read before starting
- SRS Section 3.1.3 (API Gateway, File Storage, ETL Processing, Notifications interfaces)
- SRS REQ-F-044, REQ-F-047, REQ-F-048 (S3 buckets, pre-signed URLs, Glacier lifecycle)
- SRS REQ-F-064 to REQ-F-067 (notification types, SES sandbox, 3 verified addresses)
- SRS REQ-F-071 (CloudTrail logs bucket — versioned, write-protected)
- SRS REQ-NF-001, REQ-NF-021 (Lambda concurrency cap 200)
- HIS_AWS_Architecture.drawio — TIER 3 (S3 boxes), SES sandbox annotation, SNS topics, SQS DLQ

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:api-gateway")
retrieve_skill("aws-core:aws-messaging-and-streaming")
retrieve_skill("aws-dev-toolkit:s3")
retrieve_skill("aws-core:aws-serverless")
```

### What this phase builds

**1. API Gateway HTTP API** — `apigw2.HttpApi`:
- `apiName: 'HisHttpApi'`
- CORS: `allowOrigins: ['*']`, `allowMethods: [HttpMethod.ANY]`, `allowHeaders: ['Content-Type','Authorization']`
- `defaultThrottle: { rateLimit: 1000, burstLimit: 200 }` (compensating control for deferred WAF)
- Cognito JWT Authorizer — `apigw2Auth.HttpJwtAuthorizer`:
  - `jwtAudience: [userPoolClientId]`
  - `jwtIssuer: <cognito-issuer-url>`
  - `authorizerName: 'HisCognitoAuthorizer'`
  - Applied as default authorizer on all routes (except public auth routes)
- CfnOutput: `ApiGatewayUrl`

**2. S3 Buckets** (all with `blockPublicAccess: BlockPublicAccess.BLOCK_ALL`,
`enforceSSL: true`, `encryption: BucketEncryption.S3_MANAGED`):

- **his-csv-uploads-{accountId}**: CORS for PUT/GET (pre-signed URL uploads)
- **his-csv-archive-{accountId}**: versioning enabled; lifecycle: transition to Glacier after 90 days (REQ-F-048)
- **his-cloudtrail-logs-{accountId}**: versioning enabled; `removalPolicy: RETAIN`;
  lifecycle expiration at 730 days (REQ-F-071)

**3. SQS Dead Letter Queue** — `sqs.Queue`:
- `queueName: 'his-bulk-ingestion-dlq'`
- `retentionPeriod: Duration.days(14)`
- `encryption: QueueEncryption.SQS_MANAGED`

**4. SNS Topics**:
- `his-critical-lab-alerts` — email subscriptions: josuefotseu02@gmail.com, joshuaer03@gmail.com, joshiboss04@gmail.com (REQ-F-041, REQ-F-066)
- `his-transfer-events` — same 3 email subscriptions (REQ-F-051, REQ-F-054)
- `his-system-alarms` — email: josuefotseu02@gmail.com (CloudWatch alarms)
- `his-etl-completions` — same 3 email subscriptions (REQ-F-047)
- `his-daily-summaries` — email: joshiboss04@gmail.com (REQ-F-067)

Note: SNS email subscriptions trigger a confirmation email. Demo operator must click
the confirmation link for each subscription before emails are delivered.

**5. Shared Lambda Layer** (built from `lambda/shared/`):
- `structured-logger.ts` — emits JSON to stdout:
  `{ level, timestamp (WAT ISO 8601), functionName, requestId, userId, hospitalId, message, ...metadata }` (REQ-NF-024)
- `audit-logger.ts` — `writeAuditLog(client, entry)` — INSERT into application_audit_log (REQ-F-068)
- `db-client.ts` — `getDbClient()` — module-level pg pool using IAM database authentication.
  Calls `Signer.getAuthToken({ hostname, port, region, username: 'his_app' })` locally at cold
  start (no network call — uses Lambda execution role credentials from the runtime environment)
  to generate a short-lived (15-min) RDS auth token used as the PostgreSQL password.
  Schedules token refresh before expiry. No Secrets Manager call at runtime (REQ-NF-009).
- `jwt-claims.ts` — `extractClaims(event)` — reads `event.requestContext.authorizer.jwt.claims`,
  returns typed `{ userId, hospitalId, roleId, roleName, isSuperAdmin }`
- `response.ts` — `ok(data)`, `err(statusCode, code, message)` — standard API response wrappers
- `permission-check.ts` — `assertPermission(client, userId, hospitalId, permission)`
  — queries user_roles -> role_permissions -> permissions

**6. his-lambda-function.ts construct** (shared L2 wrapper) creates `NodejsFunction` with:
- `runtime: NODEJS_20_X`
- VPC placement: accepts `inVpc: boolean` prop (default `true`). When `true`, sets
  `vpc: vpcStack.vpc`, `vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED }`,
  `securityGroups: [vpcStack.lambdaSecurityGroup]`. Set `inVpc: false` for auth-service
  (no VPC attachment — no RDS dependency, calls Cognito over the internet directly).
- `reservedConcurrentExecutions: 200` (REQ-NF-021)
- `timeout: Duration.seconds(30)`, `memorySize: 512`
- `environment: { LOG_LEVEL: 'INFO', AWS_REGION: 'us-east-1', RDS_SECRET_ARN: ... }`
- `bundling: { minify: true, sourceMap: false }`
- Each VPC-bound Lambda gets its own scoped IAM role (per-Lambda least privilege) including
  `rds:connect` permission on the RDS instance ARN (required for IAM database authentication).
  auth-service IAM role has no `rds:connect` permission (it never connects to RDS).

### SRS requirements satisfied
- REQ-NF-001 (API Gateway throttling configured) — partially satisfied
- REQ-NF-021 (Lambda concurrency cap 200) — applied via shared construct
- REQ-NF-024 (structured JSON logs) — shared layer created
- REQ-F-044 (S3 for CSV uploads) — bucket created
- REQ-F-048 (Glacier lifecycle 90 days, versioning) — fully satisfied
- REQ-F-071 (CloudTrail logs bucket — versioned, retention 2 years) — bucket created
- REQ-F-066 (SNS email subscriptions for 3 verified recipients) — topics + subscriptions created

### Frontend pages connected
None yet (API Gateway has no routes).

### End-of-phase verification
```bash
aws apigatewayv2 get-apis \
  --query "Items[?Name=='HisHttpApi'].{ApiId:ApiId,Endpoint:ApiEndpoint}"

aws s3 ls | grep his-

aws sns list-topics --query "Topics[*].TopicArn" | grep his-

aws sqs list-queues --query "QueueUrls" | grep bulk-ingestion
```

### Deliverables
API Gateway (no routes yet), all S3 buckets, SQS DLQ, SNS topics with pending email
subscriptions, shared Lambda layer and construct. Foundation for all Lambda functions.

---

## Phase 6 — Stack 4: auth-service Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS COM-003, UI-001, UI-008
- SRS REQ-F-005 (force password change on first login)
- phases.md Phase 1 (all 6 auth pages), Phase 2 (shell session timeout warning)


### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-core:aws-cdk")
```

### What this phase builds

**auth-service Lambda**: Deployed with `inVpc: false` — **no VPC attachment**. It calls only
Cognito and never accesses RDS, so it has direct internet access to Cognito endpoints without
needing a VPC endpoint or NAT Gateway. IAM role grants `cognito-idp:AdminInitiateAuth`,
`AdminRespondToAuthChallenge`, `ForgotPassword`, `ConfirmForgotPassword`, `ChangePassword`,
`AdminSetUserPassword` on HisUserPool ARN only. No RDS access, no `rds:connect` permission.

### API endpoints

| Method | Route | Auth Required | Description |
|---|---|---|---|
| POST | /auth/login | No | Calls Cognito AdminInitiateAuth |
| POST | /auth/refresh | No | Calls Cognito with RefreshToken |
| POST | /auth/logout | Yes (JWT) | Calls Cognito GlobalSignOut |
| POST | /auth/forgot-password | No | Calls ForgotPassword |
| POST | /auth/reset-password | No | Calls ConfirmForgotPassword |
| POST | /auth/change-password | Yes (JWT) | ChangePassword + NEW_PASSWORD_REQUIRED challenge |

**Request/Response shapes:**
```typescript
interface LoginRequest { email: string; password: string; }
interface LoginResponse {
  accessToken: string; idToken: string; refreshToken: string;
  expiresIn: number; tokenType: 'Bearer';
  user: { id: string; name: string; email: string; role: string;
          hospitalId: string; isSuperAdmin: boolean; }
}

interface ChangePasswordRequest {
  currentPassword: string; newPassword: string; session?: string;
}
```

Audit log: none (auth operations do not access patient data).
Structured logs: every invocation logs `{ level: 'INFO', message: 'auth-login-success', ... }`.

### SRS requirements satisfied
- REQ-F-005 (force password change on first login via NEW_PASSWORD_REQUIRED challenge)
- COM-003 (silent token refresh via /auth/refresh)
- UI-008 (session timeout warning — frontend uses token expiry from id_token claims)

### Frontend pages connected
- Page 1.1 (Login) — POST /auth/login replaces mock
- Page 1.2 (Forgot Password) — POST /auth/forgot-password
- Page 1.3 (Reset Password) — POST /auth/reset-password
- Page 1.4 (Force Password Change) — POST /auth/change-password with session
- Page 2.1 (Shell) — silent refresh on POST /auth/refresh

### End-of-phase verification
```bash
curl -X POST <ApiUrl>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@his-platform.internal","password":"<temp>"}' | jq .
# Expected: accessToken, idToken returned
```
Open frontend Page 1.1, enter valid credentials, confirm redirect to dashboard.
Check CloudWatch: structured JSON entry `{ level: "INFO", message: "auth-login-success" }`.

### Deliverables
Login, logout, password reset, and session refresh work end-to-end. Super Admin can log
in and see the shell. All other pages are still mocked.

---

## Phase 7 — Stack 4: hospital-service Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-001 to REQ-F-014 (hospital onboarding + staff management + RBAC)
- SRS REQ-F-006 (hospital_id isolation — ALL queries must include hospital_id filter)
- SRS REQ-F-007 (facility settings), REQ-NF-011 (permission check on every request)
- phases.md Phase 3 (Super Admin — Pages 3.1 to 3.4), Phase 4 (Staff & RBAC), Phase 15

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-core:aws-cdk")
```

### What this phase builds

**hospital-service Lambda**: IAM role grants `secretsmanager:GetSecretValue` on RDS secret;
`cognito-idp:AdminCreateUser`, `AdminDisableUser`, `AdminEnableUser`, `AdminSetUserAttributes`,
`AdminGetUser` on HisUserPool ARN; `sns:Publish` on `his-system-alarms` ARN.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| POST | /hospitals/register | None (public) | No | Self-register hospital (REQ-F-001/002) |
| GET | /hospitals/pending | Super Admin | No | List pending hospitals (REQ-F-003) |
| POST | /hospitals/{id}/approve | Super Admin | No | Approve + create admin Cognito user |
| POST | /hospitals/{id}/reject | Super Admin | No | Reject registration |
| GET | /hospitals | Super Admin | No | All hospitals list |
| GET | /settings/facility | None (hospital-scoped) | No | Get facility profile (REQ-F-007) |
| PUT | /settings/facility | None (hospital-scoped) | No | Update facility |
| GET | /staff | staff:manage | No | List staff (REQ-F-008) |
| POST | /staff | staff:manage | Yes (CREATE) | Create staff + Cognito user |
| GET | /staff/{id} | staff:manage | No | Get staff member |
| PUT | /staff/{id} | staff:manage | No | Update staff |
| PUT | /staff/{id}/role | role:assign | Yes (UPDATE) | Assign role + record history (REQ-F-014) |
| POST | /staff/{id}/deactivate | staff:manage | Yes (UPDATE) | Deactivate + AdminDisableUser (REQ-F-013) |
| GET | /roles | None (hospital-scoped) | No | List roles (defaults + custom) |
| POST | /roles | staff:manage | No | Create custom role (REQ-F-011) |
| PUT | /roles/{id} | staff:manage | No | Update custom role permissions |
| DELETE | /roles/{id} | staff:manage | No | Delete custom role (only if no users) |
| GET | /roles/history | staff:manage | No | Role assignment change history (REQ-F-014) |

**Key implementation notes:**
- `POST /hospitals/{id}/approve`: creates Hospital Admin Cognito user, calls
  `AdminSetUserPassword` with temp password and `Permanent: false` (triggers force password
  change), publishes to `his-system-alarms` SNS
- `POST /staff`: inserts into `users` table, calls `AdminCreateUser` on Cognito, sets all custom
  attributes, creates `staff_created` notification record (REQ-F-064)
- ALL queries include `WHERE hospital_id = $hospitalId` from JWT claims (REQ-F-006)

### SRS requirements satisfied
- REQ-F-001 to REQ-F-014 — fully satisfied
- REQ-F-006 (hospital_id isolation) — enforced in every query
- REQ-NF-011 (permission check via assertPermission helper) — enforced on every route

### Frontend pages connected
- Page 3.1 (Super Admin Dashboard) — GET /hospitals/pending + GET /hospitals
- Page 3.2 (Pending Registrations List) — GET /hospitals/pending
- Page 3.3 (Hospital Review/Approval) — POST /hospitals/{id}/approve or /reject
- Page 3.4 (All Hospitals) — GET /hospitals
- Page 4.1 (Staff List) — GET /staff
- Page 4.2 (Create/Edit Staff) — POST /staff, PUT /staff/{id}
- Page 4.3 (Role Management) — GET/POST/PUT/DELETE /roles; GET /roles/history
- Page 4.4 (Deactivate Dialog) — POST /staff/{id}/deactivate
- Page 4.5 (Facility Settings) — GET/PUT /settings/facility

### End-of-phase verification
1. Page 3.2 loads pending hospitals from API (not mock)
2. Approve a hospital — confirm admin account created in Cognito
3. Create a staff member — confirm user in RDS `users` table AND Cognito User Pool
4. Create a custom role, assign permissions — verify in `roles` and `role_permissions`
5. CloudWatch log: structured JSON with `hospitalId`, `userId`, `message: 'staff-create'`

### Deliverables
Hospital onboarding, staff management, and RBAC fully operational. Frontend Phases 3, 4,
and 15 (facility settings) connected to real API.

---

## Phase 8 — Stack 4: patient-service Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-015 to REQ-F-028 (consent, registration, search, deduplication, amendments)
- SRS REQ-NF-002 (GIN index + 500ms search target)
- phases.md Phase 5 (Patient Registration & Search), Phase 6 (Patient Profile & Consent)
- HIS_Design_Phases_7_15.md Phase 5/6 — search debounce, consent indicator, amendment form

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
```

### What this phase builds

**patient-service Lambda**: IAM role grants `secretsmanager:GetSecretValue` on RDS secret only.
RDS tables: patients, record_amendments, notifications, application_audit_log.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| GET | /patients | patient:read | Yes (READ) | Fuzzy search — pg_trgm, GIN index (REQ-F-022) |
| POST | /patients | patient:write | Yes (CREATE) | Register with dedup check (REQ-F-019/020) |
| GET | /patients/{id} | patient:read | Yes (READ) | Full patient profile (REQ-F-023) |
| PUT | /patients/{id} | patient:write | Yes (UPDATE) | Update optional attributes (REQ-F-024) |
| PUT | /patients/{id}/consent | patient:write | Yes (CONSENT_CHANGE) | Update consent (REQ-F-015/017) |
| POST | /patients/{id}/amend/{recordType}/{recordId} | patient:amend | Yes (AMEND) | Versioned amendment (REQ-F-025/026) |

**Key implementation details:**
- Search query: `SELECT ... FROM patients WHERE hospital_id=$1 AND (full_name % $2 OR telephone=$2 OR patient_number=$2) ORDER BY similarity(full_name,$2) DESC LIMIT 20`. GIN index on `full_name` gives sub-500ms response (REQ-NF-002).
- Dedup check on `POST /patients`: `SELECT id, full_name, date_of_birth, patient_number, similarity(full_name,$1) AS sim FROM patients WHERE hospital_id=$2 AND similarity(full_name,$1) > 0.85`. If results found, returns HTTP 409 with `{ duplicates: [...] }`. Frontend shows Page 5.3 (Duplicate Detection Dialog). User confirms with `?force=true` to proceed.
- Patient number generation: `PID-` + zero-padded sequential counter per hospital.
- Amendment permission guard: amending user must be original author OR Hospital Admin (REQ-F-028).
  Saves `original_data` and `amended_data` as JSONB snapshots.

### SRS requirements satisfied
- REQ-F-015 to REQ-F-028 — fully satisfied
- REQ-NF-002 (GIN index, 500ms search) — fully satisfied

### Frontend pages connected
- Page 5.1 (Patient Search) — GET /patients?q={query}
- Page 5.2 (Register New Patient) — POST /patients; Page 5.3 (Duplicate dialog) on 409
- Page 6.1 (Patient Profile) — GET /patients/{id} populates all tabs
- Page 6.2 (Update Consent) — PUT /patients/{id}/consent
- Page 6.3 (Amendment Form) — POST /patients/{id}/amend/{recordType}/{recordId}

### End-of-phase verification
1. Register patient — verify `patient_number` auto-assigned, consent set to Pending
2. Search "Joh" — verify fuzzy results in <500ms (CloudWatch logs show query duration)
3. Register duplicate (same name + DOB) — verify 409 + duplicate dialog on frontend
4. Update consent to Refused — verify encounter creation blocked
5. Audit log: verify READ and CREATE entries in `application_audit_log`

### Deliverables
Patient registration, fuzzy search, consent management, and amendments work end-to-end.
Frontend Phases 5 and 6 fully connected.

---

## Phase 9 — Stack 4: appointment-service Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-029 to REQ-F-033 (scheduling, conflict detection, cancellation, notifications)
- phases.md Phase 7 (Pages 7.1 to 7.4)
- HIS_Design_Phases_7_15.md Phase 7 — calendar grid, double-booking warning, cancellation dialog

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
```

### What this phase builds

**appointment-service Lambda**: RDS tables: appointments, patients, users, notifications,
application_audit_log.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| GET | /appointments | appointment:write | No | List by date/clinician/unit (REQ-F-031) |
| POST | /appointments | appointment:write | Yes (CREATE) | Create with conflict check (REQ-F-029/030) |
| GET | /appointments/{id} | appointment:write | No | Single appointment detail |
| PUT | /appointments/{id}/cancel | appointment:write | Yes (UPDATE) | Cancel with reason (REQ-F-032) |

**Key implementation notes:**
- Conflict check on `POST /appointments`: `SELECT id FROM appointments WHERE hospital_id=$1 AND clinician_id=$2 AND date_time=$3 AND status='scheduled'`. HTTP 409 if conflict found — frontend shows amber double-booking warning (Page 7.3).
- On successful creation: INSERT notification `{ user_id: clinician_id, type: 'appointment_created', ... }` (REQ-F-033).
- On cancellation: `cancellation_reason` required (empty string rejected as 400). INSERT notification `{ type: 'appointment_cancelled', ... }`.
- `GET /appointments?date={date}&clinicianId={id}&unit={unit}&view=day|week` for calendar views.

### SRS requirements satisfied
- REQ-F-029 to REQ-F-033 — fully satisfied

### Frontend pages connected
- Page 7.1 (Daily Calendar) — GET /appointments?date=today&view=day
- Page 7.2 (Weekly Calendar) — GET /appointments?week={week}&view=week
- Page 7.3 (Create Appointment Form) — POST /appointments; 409 shows conflict warning
- Page 7.4 (Cancel Dialog) — PUT /appointments/{id}/cancel

### Deliverables
Appointment scheduling, conflict detection, cancellation, and clinician notifications work
end-to-end. Frontend Phase 7 connected.

---

## Phase 10 — Stack 4: clinical-service Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-034 to REQ-F-038 (encounters, diagnoses, vitals, prescriptions, lab requests)
- SRS REQ-F-016 (consent guard — refused patients cannot have new clinical records)
- SRS REQ-F-025 to REQ-F-028 (amendments supported on clinical records)
- phases.md Phase 8 (Pages 8.1 to 8.6)
- HIS_Design_Phases_7_15.md Phase 8 — encounter form, tabs, modals

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
```

### What this phase builds

**clinical-service Lambda**: RDS tables: encounters, diagnoses, vital_signs, prescriptions,
lab_test_requests, patients, record_amendments, notifications, application_audit_log.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| POST | /patients/{id}/encounters | diagnosis:write | Yes (CREATE) | Create encounter — consent guard (REQ-F-034) |
| GET | /patients/{id}/encounters | patient:read | Yes (READ) | List encounters for patient |
| GET | /patients/{id}/encounters/{eid} | patient:read | Yes (READ) | Single encounter + all sub-records |
| POST | /patients/{id}/encounters/{eid}/diagnoses | diagnosis:write | Yes (CREATE) | Add diagnosis (REQ-F-035) |
| POST | /patients/{id}/encounters/{eid}/vitals | diagnosis:write | Yes (CREATE) | Record vital signs (REQ-F-036) |
| POST | /patients/{id}/encounters/{eid}/prescriptions | prescription:write | Yes (CREATE) | Add prescription (REQ-F-037) |
| POST | /patients/{id}/encounters/{eid}/lab-requests | diagnosis:write | Yes (CREATE) | Request lab test (REQ-F-038) |

**Key implementation notes:**
- Consent guard: Before any POST, check `patients.consent_personal_data`. If `'Refused'`, return HTTP 403 `{ code: 'CONSENT_REFUSED' }`. Frontend shows red banner (Page 8.1 design). Non-negotiable per REQ-F-016.
- `encounter.staff_id` set to `userId` from JWT claims (auto-populated attending clinician, REQ-F-034).
- Lab request creates `lab_test_requests` record with `status: 'pending'` — feeds the lab work queue in Phase 11.
- All queries include `hospital_id` filter (REQ-F-006).

### SRS requirements satisfied
- REQ-F-034 to REQ-F-038 — fully satisfied
- REQ-F-016 (consent guard non-negotiable) — fully satisfied

### Frontend pages connected
- Page 8.1 (Create Encounter Form) — POST /patients/{id}/encounters
- Page 8.2 (Encounter Detail + all tabs) — GET /patients/{id}/encounters/{eid}
- Pages 8.3-8.6 (Diagnosis/Vitals/Prescription/Lab Request modals) — respective POST endpoints

### Deliverables
Full clinical encounter workflow (encounter creation through lab test request) works
end-to-end. Frontend Phase 8 connected.

---

## Phase 11 — Stack 4: lab-service Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-039 to REQ-F-043 (lab queue, result entry, reference range validation, alerting)
- SRS REQ-F-041 (critical result: in-app + SNS email within 60 seconds)
- phases.md Phase 9 (Pages 9.1 to 9.3), Phase 12 (Lab Tech Dashboard — Page 12.3)
- HIS_Design_Phases_7_15.md Phase 9 — live status preview, critical result alert box

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-core:aws-messaging-and-streaming")
```

### What this phase builds

**lab-service Lambda**: IAM role adds `sns:Publish` on `his-critical-lab-alerts` ARN.
RDS tables: lab_test_requests, lab_results, encounters, users, patients, notifications,
application_audit_log.

**Additional migration V15__seed_lab_reference_ranges.sql**: Seeds reference ranges table
for all tests in the test catalogue (FBC, Malaria RDT, LFT, RFT, HbA1c, Blood Glucose, etc.)
with normal and critical range values.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| GET | /laboratory/queue | lab_result:write | No | Work queue — pending requests (REQ-F-043) |
| POST | /laboratory/results | lab_result:write | Yes (CREATE) | Enter result + validate range + alert (REQ-F-039/040/041) |
| GET | /laboratory/results/{id} | lab_result:read | Yes (READ) | Result detail view (REQ-F-042) |

**Critical alert flow — POST /laboratory/results (REQ-F-041):**
1. Save result to `lab_results`
2. Determine `result_status` by comparing value to reference ranges
3. If `result_status = 'critical'`:
   a. Look up `encounter.staff_id` → insert notification for attending clinician
   b. Look up ward head nurse: `SELECT id FROM users WHERE hospital_id=$1 AND ward_head_unit=$2` → insert notification or fallback to Hospital Admin
   c. Publish to `his-critical-lab-alerts` SNS topic — SNS email subscription delivers within 60 seconds (REQ-F-041)
   d. Mark lab_test_request `status: 'completed'`
4. All in a single DB transaction — failure rolls back completely

### SRS requirements satisfied
- REQ-F-039 to REQ-F-043 — fully satisfied
- REQ-F-041 (critical alert within 60 seconds) — fully satisfied via SNS

### Frontend pages connected
- Page 9.1 (Lab Work Queue) — GET /laboratory/queue
- Page 9.2 (Enter Result Form) — POST /laboratory/results; live preview uses reference ranges
- Page 9.3 (Result Detail) — GET /laboratory/results/{id}
- Page 12.3 (Lab Tech Dashboard) — GET /laboratory/queue?date=today

### End-of-phase verification
1. Enter a critical result — verify SNS email delivered to all 3 verified addresses within 60s
2. Verify in-app notification created for attending clinician and ward head nurse
3. Live status preview on Page 9.2 shows 'Critical' badge before form submission

### Deliverables
Lab results, reference range validation, and critical alerts work. Frontend Phase 9 and
Lab Tech Dashboard (Phase 12) connected.

---

## Phase 12 — Stack 4: bulk-ingestion Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-044 to REQ-F-048 (CSV upload, validation, ETL, dedup, notification, archival)
- SRS REQ-NF-006 (500 records/min rate, 10K records in 25 minutes)
- phases.md Phase 10 (Pages 10.1, 10.2)
- HIS_Design_Phases_7_15.md Phase 10 — upload states

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-dev-toolkit:s3")
retrieve_skill("aws-core:aws-messaging-and-streaming")
```

### What this phase builds

**Two Lambda functions:**

**1. bulk-upload-api Lambda** (HTTP-triggered):
- IAM: `s3:PutObject` on `his-csv-uploads/uploads/*`, `secretsmanager:GetSecretValue` on RDS secret
- `GET /bulk-upload/template` → pre-signed S3 GET URL for `template/his-patient-template.csv`
- `POST /bulk-upload/presigned-url` → generates pre-signed S3 PUT URL (60s expiry), creates
  `bulk_upload_jobs` record with `status: 'processing'`, returns `{ jobId, uploadUrl }` (REQ-F-044)
- `GET /bulk-upload/status/{jobId}` → reads `bulk_upload_jobs` stats (REQ-F-046)

**2. bulk-ingestion Lambda** (S3-triggered):
- Trigger: S3 Event on `his-csv-uploads` bucket (PUT events on `uploads/*` prefix)
- **SQS DLQ**: `deadLetterQueue: sqsDlq` — failed invocations go to `his-bulk-ingestion-dlq`
- `timeout: Duration.minutes(15)`, `memorySize: 1024`
- IAM: `s3:GetObject` on `his-csv-uploads`, `s3:PutObject` on `his-csv-archive`,
  `sns:Publish` on `his-etl-completions`, `secretsmanager:GetSecretValue` on RDS secret

**ETL algorithm:**
1. Download CSV from S3
2. Validate structure — if invalid, update job to `'failed'`, publish to `his-etl-completions`
3. Parse rows, process in batches of 100
4. Per row: compute pg_trgm similarity vs existing patients → if >0.85, classify as duplicate; else validate fields and INSERT
5. Track counts: inserted, duplicates, failed
6. UPDATE `bulk_upload_jobs` with final stats and `status: 'completed'`
7. Copy file to `his-csv-archive` (REQ-F-048)
8. Publish completion summary to `his-etl-completions` SNS (REQ-F-047)

### SRS requirements satisfied
- REQ-F-044 to REQ-F-048 — fully satisfied
- REQ-NF-006 (500 records/min throughput) — satisfied at 1024MB Lambda

### Frontend pages connected
- Page 10.1 (Upload Page) — GET /bulk-upload/template, POST /bulk-upload/presigned-url
- Page 10.2 (Processing Status) — GET /bulk-upload/status/{jobId} (polled every 5 seconds)

### Deliverables
Full CSV ETL pipeline — upload, validate, deduplicate, insert, archive, notify. DLQ catches
failed invocations. Frontend Phase 10 connected.

---

## Phase 13 — Stack 4: transfer-service Lambda

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-049 to REQ-F-057 (all cross-hospital transfer requirements)
- SRS REQ-F-054 (24-hour expiry warning notification)
- SRS REQ-F-049 (privacy: search returns name + source hospital only)
- phases.md Phase 11 (Pages 11.1 to 11.6)
- HIS_Design_Phases_7_15.md Phase 11 — expiry banner, VIEW_ONLY restrictions, renewal flow

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-core:aws-messaging-and-streaming")
```

### What this phase builds

**transfer-service Lambda**: IAM adds `sns:Publish` on `his-transfer-events`. RDS tables:
patient_transfers, transfer_grants, patients, hospitals, users, notifications,
application_audit_log.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| GET | /transfers/search | patient:read | No | Cross-hospital patient search — name only (REQ-F-049) |
| POST | /transfers/requests | transfer:request | Yes (CREATE) | Submit access request (REQ-F-050) |
| GET | /transfers/requests | transfer:approve | No | List incoming/outgoing requests |
| GET | /transfers/requests/{id} | transfer:approve | No | Single request detail |
| POST | /transfers/requests/{id}/approve | transfer:approve | Yes (TRANSFER_GRANT) | Approve with duration (REQ-F-052) |
| POST | /transfers/requests/{id}/deny | transfer:approve | Yes (UPDATE) | Deny request (REQ-F-052) |
| POST | /transfers/grants/{id}/revoke | transfer:approve | Yes (TRANSFER_REVOKE) | Revoke active grant (REQ-F-053) |
| POST | /transfers/grants | transfer:approve | Yes (TRANSFER_GRANT) | Proactive grant (REQ-F-057) |
| GET | /transfers/patients/{patientId} | patient:read | Yes (READ) | Transferred patient full profile |
| GET | /transfers/grants | transfer:request | No | List active/expired grants |

**Key implementation notes:**
- `GET /transfers/search` PRIVACY RULE (REQ-F-049): Returns ONLY `{ patientName, sourceHospitalName }` — no DOB, phone, address, patient ID, or clinical data.
- `POST /transfers/requests/{id}/approve`: Creates `transfer_grants` record with
  `expires_at = NOW() + interval '${grantDays} days'`. Publishes to `his-transfer-events` SNS.
  Inserts notifications for requesting hospital users with `transfer:request` permission.
- `GET /transfers/patients/{patientId}`: Validates active grant exists for requesting hospital
  before returning data. Enforces VIEW_ONLY restrictions if `access_type = 'VIEW_ONLY'`.
- Expiry warning (REQ-F-054): Handled by EventBridge scheduler in Phase 15.

### SRS requirements satisfied
- REQ-F-049 to REQ-F-057 — fully satisfied
- REQ-F-049 (privacy on search) — enforced at query level

### Frontend pages connected
- Page 11.1 (Cross-Hospital Search) — GET /transfers/search
- Page 11.2 (Access Request Form) — POST /transfers/requests
- Page 11.3 (Transfer List — all tabs) — GET /transfers/requests, GET /transfers/grants
- Page 11.4 (Review/Approval) — POST /transfers/requests/{id}/approve or /deny
- Page 11.5 (Transferred Patient View) — GET /transfers/patients/{patientId}
- Page 11.6 (Proactive Grant) — POST /transfers/grants

### Deliverables
Full cross-hospital transfer workflow — search, request, approve/deny, revoke, proactive
grant — works end-to-end. Frontend Phase 11 connected.

---

## Phase 14 — Stack 4: analytics-service Lambda + EventBridge Materialized View Refresh

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-058 to REQ-F-063 (dashboards, query builder, ministry anonymized view)
- SRS REQ-NF-003 (materialized views refreshed every 5 min during 06:00-22:00 WAT)
- phases.md Phase 12 (Role-Specific Dashboards — Pages 12.1 to 12.6), Phase 13 (Analytics)
- HIS_Design_Phases_7_15.md Phase 12, 13 — chart patterns, filter schema, Recharts integration

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-core:aws-cdk")
```

### What this phase builds

**analytics-service Lambda**: Read-only queries only — no INSERT/UPDATE. IAM:
`secretsmanager:GetSecretValue` on RDS secret only.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| GET | /analytics/dashboard | analytics:view | No | Role-specific dashboard data (REQ-F-058-063) |
| GET | /analytics/query | analytics:view | No | Filter-based query builder (REQ-F-061/062) |
| GET | /analytics/ministry | analytics:view | No | Anonymized cross-hospital data (REQ-F-063) |

**GET /analytics/dashboard**: Reads `custom:role_name` from JWT claims:
- Doctor: today's appointments + pending lab results + last 10 diagnoses
- Hospital Admin: patient count, encounter count, lab turnaround, active staff, top 5 diagnoses, monthly trend
- Nurse: assigned patients today, pending vitals
- Lab Tech: queue stats (today pending/completed/critical)
- Receptionist: today appointments + registrations this week + pending uploads
- Ministry Officer: cross-hospital aggregate stats from `mv_hospital_monthly_stats`
  (consent_public_reporting='Granted' only — REQ-F-063)

**GET /analytics/query**: Accepts filters (`dateFrom`, `dateTo`, `clinicalUnit`,
`diagnosisCategory`, `ageGroups`, `regionDistricts`, `testTypes`, `groupBy`) and returns
`{ labels, datasets }` compatible with Recharts.

**EventBridge Scheduler**: `events.Rule` with schedule `cron(*/5 5-21 * * ? *)`
(every 5 min, 05:00-21:00 UTC = 06:00-22:00 WAT) triggers analytics-service with
`{ source: 'scheduled-refresh' }`. Handler calls
`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hospital_monthly_stats` (REQ-NF-003).

### SRS requirements satisfied
- REQ-F-058 to REQ-F-063 — fully satisfied
- REQ-NF-003 (materialized view refresh schedule) — fully satisfied

### Frontend pages connected
- Pages 12.1-12.6 (All Role Dashboards) — GET /analytics/dashboard (role-switched by backend)
- Page 13.1 (Analytics Filter Builder) — GET /analytics/query with filter params

### Deliverables
All 6 role-specific dashboards load real data. Analytics query builder returns real filtered
results. Materialized views refresh on schedule. Frontend Phases 12 and 13 connected.

---

## Phase 15 — Stack 4: notification-service Lambda + EventBridge Schedulers

**CDK Stack(s) involved:** HisBackendStack (Stack 4 — extended)

### Reference documents to read before starting
- SRS REQ-F-064, REQ-F-065 (in-app notifications via polling), REQ-F-067 (daily summary 08:00 WAT)
- SRS REQ-F-054 (24-hour transfer expiry warning)
- SRS REQ-F-068 to REQ-F-071 (clinical audit log — viewing, immutability)
- phases.md Phase 14 (Pages 14.1, 14.2), Phase 2 (notification bell + slide-over panel)
- HIS_Design_Phases_7_15.md Phase 14 — notification list, audit log table, pagination

### AWS skills to load
```
retrieve_skill("aws-core:aws-secrets-manager")   <- MUST load first
retrieve_skill("aws-serverless:aws-lambda")
retrieve_skill("aws-core:aws-messaging-and-streaming")
```

### What this phase builds

**notification-service Lambda**: IAM adds `sns:Publish` on `his-daily-summaries` and
`his-transfer-events`. RDS tables: notifications (SELECT + UPDATE), application_audit_log
(SELECT only — immutable per REQ-F-070), transfer_grants, users, hospitals.

### API endpoints

| Method | Route | Permission | Audit | Description |
|---|---|---|---|---|
| GET | /notifications | None (user-scoped) | No | Unread notifications for JWT user (REQ-F-064/065) |
| PUT | /notifications/{id}/read | None (user-scoped) | No | Mark single notification as read |
| PUT | /notifications/read-all | None (user-scoped) | No | Mark all as read |
| GET | /audit | staff:manage | No | Clinical audit log with filters (REQ-F-069) |

**GET /notifications** (REQ-F-065): Returns unread notifications for the JWT user_id.
Frontend polls every 15 seconds. UPDATE `is_delivered=true` after fetch.

**GET /audit**: Parameterized SQL with optional filters (`patientId`, `staffId`, `actionType`,
`dateFrom`, `dateTo`). Always enforces `hospital_id=$hospitalId` (REQ-F-006). SELECT only —
zero modification endpoints (REQ-F-070).

**EventBridge Rule 1 — Daily Summary (REQ-F-067)**:
- Schedule: `cron(0 7 * * ? *)` (07:00 UTC = 08:00 WAT)
- Handler: for each active hospital, query yesterday's stats, publish to `his-daily-summaries`
  SNS — email subscription delivers to Hospital Admins

**EventBridge Rule 2 — Transfer Expiry Check (REQ-F-054)**:
- Schedule: `cron(0 * * * ? *)` (every hour)
- Handler: `SELECT * FROM transfer_grants WHERE is_active=true AND expiry_warning_sent=false AND expires_at <= NOW() + interval '24 hours'`. For each: INSERT in-app notification, publish to `his-transfer-events` SNS, SET `expiry_warning_sent=true`.

### SRS requirements satisfied
- REQ-F-054 (24-hour expiry warning) — fully satisfied
- REQ-F-064, REQ-F-065 (in-app notification polling) — fully satisfied
- REQ-F-067 (daily summary at 08:00 WAT) — fully satisfied
- REQ-F-068 to REQ-F-071 (audit log viewing, immutability enforced at DB grant level) — fully satisfied

### Frontend pages connected
- Page 2.1 Shell (notification bell + slide-over panel) — GET /notifications polled every 15s
- Page 14.1 (Notifications Full List) — GET /notifications with filters
- Page 14.2 (Clinical Audit Log) — GET /audit with filters

### Deliverables
In-app notification polling works. Audit log viewable by Hospital Admins. Daily summary
emails fire at 08:00 WAT. Transfer expiry warnings fire 24 hours before grant expiry.
Frontend Phase 14 connected. All 10 Lambda functions now deployed.

---

## Phase 16 — Stack 5: Amplify Frontend Hosting

**CDK Stack(s) involved:** HisFrontendStack (Stack 5 — new)

### Reference documents to read before starting
- SRS Section 2.4.3 (Development Environment — React 18, Recharts, ShadCN)
- SRS Section 2.4.2 (Client Environment — browser compatibility)
- phases.md — all 15 phases (frontend already built; this phase connects to live infrastructure)
- Frontend codebase at `d:\HIS_Platform\src\` (existing React app)

### AWS skills to load
```
retrieve_skill("aws-core:aws-amplify")
retrieve_skill("aws-core:aws-cdk")
```

### What this phase builds

**Amplify App** — `amplify.App` (L2):
- `appName: 'HisPortal'`
- `sourceCodeProvider: new amplify.GitHubSourceCodeProvider({ owner: '<github-user>', repository: '<repo-name>', oauthToken: secretsManager.Secret.fromSecretNameV2(this, 'GithubToken', 'his/github/oauth-token') })`
- `buildSpec`: CodeBuild spec running `npm ci` and `npm run build`
- `environmentVariables`:
  - `VITE_API_URL` → HisBackendStack.ApiGatewayUrl CfnOutput
  - `VITE_COGNITO_USER_POOL_ID` → HisAuthStack.UserPoolId
  - `VITE_COGNITO_CLIENT_ID` → HisAuthStack.UserPoolClientId
  - `VITE_COGNITO_REGION` → `us-east-1`
  - `VITE_APP_ENV` → `production`

**Amplify Branch** — `main` branch: auto-deploys on push to GitHub main.

**Frontend configuration update**: Before deploying, update `src/aws-exports.ts` (or
`.env.production`) with real values from CDK CfnOutputs. Replace mock API base URL
(localhost/stub) with `VITE_API_URL`. Wire Cognito pool configuration with real pool/client IDs.

**Mock elimination sweep**: For each page still reading from a mock constant file
(e.g., `src/mocks/patients.ts`), replace the import with the real API hook. The hooks
already call the correct routes from phases 6-15. After this sweep, no page reads mock data.

**CfnOutput**: `AmplifyAppUrl` (e.g., `https://main.d1abcdef.amplifyapp.com`)

### SRS requirements satisfied
- REQ-NF-030 (browser compatibility — Amplify serves the React SPA on CDN) — fully satisfied
- All 15 frontend phases connected to real endpoints

### Frontend pages connected
All 59 pages across all 15 frontend phases. This is the milestone where the full application
is end-to-end functional.

### End-of-phase verification
```bash
aws amplify list-apps --query "apps[?name=='HisPortal'].defaultDomain"
```
1. Open Amplify URL in browser
2. Log in as Super Admin — confirm dashboard loads real data
3. Navigate through all 15 frontend phases — confirm no mock/hardcoded placeholder values remain

### Deliverables
Full HIS frontend hosted on Amplify, accessible at `*.amplifyapp.com`, connected to all
10 real Lambda endpoints. Application is fully functional end-to-end.

---

## Phase 17 — Stack 6: Observability (CloudWatch Alarms, Dashboard, CloudTrail)

**CDK Stack(s) involved:** HisObservabilityStack (Stack 6 — new)

### Reference documents to read before starting
- SRS REQ-NF-019 (CloudWatch alarms — Lambda error rate >5/min, RDS CPU >80% → SNS alert)
- SRS REQ-NF-024 (structured JSON logs — already in all Lambdas via shared logger)
- SRS REQ-F-071 (CloudTrail — all AWS API calls, versioned S3, 2-year retention)
- HIS_AWS_Architecture.drawio — TIER 4 (SNS + CloudWatch annotation boxes, CloudTrail note)

### AWS skills to load
```
retrieve_skill("aws-core:aws-observability")
retrieve_skill("aws-dev-toolkit:observability")
retrieve_skill("aws-core:aws-cdk")
```

### What this phase builds

**CloudWatch Log Groups** — `logs.LogGroup` with `retention: RetentionDays.SIX_MONTHS` for
all 10 Lambda functions (log groups auto-created when Lambdas deployed; this sets retention).

**CloudWatch Alarms** (REQ-NF-019):
- **Lambda Error Rate Alarm**: `MetricFilters` on each Lambda log group counting `level=ERROR`
  entries. `Threshold: 5`, `EvaluationPeriods: 1`, `Period: 60 seconds`.
  On ALARM: `AlarmActions: [systemAlarmsTopic]` SNS ARN.
- **RDS CPU Alarm**: `cloudwatch.Alarm` on `aws/rds` namespace, `CPUUtilization` metric,
  `Threshold: 80`, `EvaluationPeriods: 5`, `Period: 60 seconds`.
  On ALARM: publishes to `his-system-alarms` SNS topic.
- **RDS FreeStorageSpace Alarm**: threshold 2 GB (early warning for MVP small storage).

**CloudWatch Dashboard** — `cloudwatch.Dashboard` named `HisDashboard`:
- Row 1: Lambda invocation counts + error counts (all 10 functions in single graph)
- Row 2: Lambda duration (p50, p95, p99) — tracks REQ-NF-001 3-second target
- Row 3: RDS CPU + FreeStorage + DatabaseConnections
- Row 4: API Gateway 4xx + 5xx counts

**CloudTrail Trail** (REQ-F-071):
- `cloudtrail.Trail` with `trailName: 'his-audit-trail'`
- `bucket: cloudtrailLogsBucket` (from Stack 4 — `his-cloudtrail-logs-{accountId}`)
- `isMultiRegionTrail: false` (us-east-1 only for MVP)
- `includeGlobalServiceEvents: true` (captures IAM, Cognito events)
- `enableFileValidation: true` (log file integrity validation)
- `sendToCloudWatchLogs: true` with a dedicated log group

### SRS requirements satisfied
- REQ-NF-019 (CloudWatch alarms, SNS notification within 5 min) — fully satisfied
- REQ-NF-024 (structured logs + CloudWatch log groups with retention) — fully satisfied
- REQ-F-071 (CloudTrail — all API calls, versioned, write-protected S3, 2-year retention) — fully satisfied

### Frontend pages connected
None (monitoring layer — no user-facing pages).

### End-of-phase verification
```bash
aws cloudwatch describe-alarms \
  --alarm-names "HisLambdaErrorAlarm" "HisRdsCpuAlarm" \
  --query "MetricAlarms[*].{Name:AlarmName,State:StateValue}"

aws cloudtrail get-trail \
  --name his-audit-trail \
  --query "Trail.{S3Bucket:S3BucketName}"

aws cloudtrail get-trail-status \
  --name his-audit-trail \
  --query "IsLogging"
# Expected: true

aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/his- \
  --query "logGroups[*].{Name:logGroupName,Retention:retentionInDays}"
# Expected: 10 log groups, each with retentionInDays=180
```

### Deliverables
CloudWatch alarms monitoring Lambda errors and RDS health. CloudTrail recording all AWS
API activity to versioned S3 bucket. CloudWatch dashboard providing operational visibility.

---

## Phase 18 — End-to-End Integration Verification

**CDK Stack(s) involved:** No new stacks. Verification only.

### Reference documents to read before starting
- SRS REQ-F-001 through REQ-F-071 (full requirements coverage check)
- phases.md — all 15 phases (confirm all pages connected)
- Implementation plan Expected Phase Outcomes (6 end-state conditions)

### What this phase verifies

Complete end-to-end user journey confirming the application is production-ready for
academic evaluation. No code changes — only testing and documentation of results.

### Complete journey test script

**1. Super Admin flow:**
- Log in at `/login` as Super Admin
- Approve a pending hospital registration (Page 3.3)
- Verify admin account created in Cognito and confirmation email received
- Verify CloudWatch log: `{ message: 'hospital-approve', hospitalId: '...' }`

**2. Hospital Admin flow:**
- Log in as new hospital admin with temp password → force password change (Page 1.4)
- Create 4 staff: 1 Doctor, 1 Nurse (ward head for Medical Ward), 1 Lab Tech, 1 Receptionist
- Create a custom role with limited permissions (Page 4.3)
- Verify role assignment history entry (Page 4.3 Change History tab)

**3. Receptionist flow:**
- Log in as Receptionist
- Register a new patient with consent Granted (Page 5.2)
- Search patient by partial name — verify <500ms response (Page 5.1)
- Schedule an appointment for the Doctor (Page 7.3)
- Verify clinician gets in-app notification (notification bell)

**4. Doctor flow:**
- Log in as Doctor — dashboard shows today's appointment (Page 12.1)
- Open patient profile, create a clinical encounter (Page 8.1)
- Record diagnoses, vitals, prescriptions, request a lab test (Pages 8.2-8.6)

**5. Lab Technician flow:**
- Log in as Lab Tech — work queue shows pending test (Page 9.1)
- Enter a critical result (Page 9.2)
- Verify: critical alert in-app notification appears for Doctor; SNS email delivered within 60s

**6. Bulk upload flow:**
- Log in as Receptionist
- Download CSV template (Page 10.1)
- Upload CSV with 50 patient records including 5 intentional duplicates
- Verify processing status page confirms 45 inserted + 5 duplicates (Page 10.2)
- Verify SNS completion email received

**7. Transfer flow:**
- Log in as Hospital Admin of Hospital 2
- Search for a patient from Hospital 1 — verify no clinical data shown (Page 11.1)
- Submit access request (Page 11.2)
- Log in as Hospital Admin of Hospital 1 — review and approve (Page 11.4)
- Verify SNS transfer event email sent
- Access transferred patient records as Hospital 2 — verify VIEW_ONLY restriction (Page 11.5)

**8. Analytics flow:**
- Log in as Ministry Officer — verify anonymized dashboard (Page 12.6)
- Use analytics query builder, apply filters, export PNG (Page 13.1)

**9. Audit log verification:**
- Log in as Hospital Admin
- Open Audit Log (Page 14.2) — confirm entries for all operations above
- Verify zero delete/update buttons present in the table

**10. Settings flow:**
- Hospital Admin changes session timeout (Page 15.3)
- Change password (Page 15.1) — verify login with new password on next session

### CloudWatch verification
```bash
for fn in auth-service hospital-service patient-service appointment-service \
  clinical-service lab-service transfer-service analytics-service \
  notification-service bulk-ingestion; do
  aws logs filter-log-events \
    --log-group-name /aws/lambda/his-${fn} \
    --filter-pattern '{ $.level = "INFO" }' \
    --limit 1 \
    --query "events[0].message"
done

aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --query "Events[0].{Time:EventTime,User:Username}"
```

### All 6 Expected Phase Outcomes verified
1. All 13 services from architecture diagram deployed and running
2. All 71 functional requirements (REQ-F-001 to REQ-F-071) implemented and testable
3. All applicable NFRs implemented or documented as production deferrals
4. All 15 frontend phases connected to real API endpoints — no mock data remains
5. Complete end-to-end user journey works from the frontend against live AWS infrastructure
6. CloudWatch logs show structured JSON entries for every API call
7. CloudTrail recording all AWS API activity
8. Application accessible via Amplify default domain

### Deliverables
Signed-off implementation of the full HIS cloud infrastructure. All 18 phases complete.
Platform ready for FYP academic evaluation.

---

## Implementation Plan Summary

| Phase | CDK Stack | Key Resources Built | Frontend Phases Connected |
|---|---|---|---|
| 1 | Stack 1 | VPC, subnets, SGs, 3 VPC Interface Endpoints, S3 Gateway Endpoint | None |
| 2 | Stack 2 | RDS db.t3.micro, Secrets Manager secret, pg_cron param group | None |
| 3 | Stack 2 | Migration runner Lambda, 14 SQL migration files, all tables + indexes + views | None |
| 4 | Stack 3 | Cognito User Pool, User Pool Client, Super Admin account | Phase 1 (partial) |
| 5 | Stack 4 | API Gateway, S3 buckets, SQS DLQ, SNS topics, shared Lambda layer + construct | None |
| 6 | Stack 4 | auth-service Lambda (6 endpoints) | Phases 1, 2 (session) |
| 7 | Stack 4 | hospital-service Lambda (18 endpoints) | Phases 3, 4, 15 |
| 8 | Stack 4 | patient-service Lambda (6 endpoints) | Phases 5, 6 |
| 9 | Stack 4 | appointment-service Lambda (4 endpoints) | Phase 7 |
| 10 | Stack 4 | clinical-service Lambda (7 endpoints) | Phase 8 |
| 11 | Stack 4 | lab-service Lambda (3 endpoints), lab reference ranges seed | Phases 9, 12 (lab dash) |
| 12 | Stack 4 | bulk-ingestion Lambda (S3 trigger + 3 HTTP endpoints), DLQ wiring | Phase 10 |
| 13 | Stack 4 | transfer-service Lambda (10 endpoints) | Phase 11 |
| 14 | Stack 4 | analytics-service Lambda (3 endpoints), EventBridge MV refresh | Phases 12, 13 |
| 15 | Stack 4 | notification-service Lambda (4 endpoints), EventBridge daily summary + expiry | Phases 14, 2 (bell) |
| 16 | Stack 5 | Amplify app, CI/CD pipeline, mock elimination sweep | All 15 phases |
| 17 | Stack 6 | CloudWatch alarms/dashboard, CloudTrail trail | None (monitoring) |
| 18 | -- | End-to-end verification, structured log checks, CloudTrail confirmation | All 15 phases verified |

**Totals:**
- API endpoints: ~76 across 10 Lambda functions
- Database tables: 14 tables + 3 materialized views + 1 seeded reference table
- Frontend pages connected: 59 pages across 15 frontend phases
- SRS functional requirements: REQ-F-001 to REQ-F-071 (71 total)
- SRS non-functional requirements: REQ-NF-001 to REQ-NF-031 (31 total;
  production deferrals documented for WAF, KMS CMKs, provisioned concurrency,
  NAT Gateway, Multi-AZ, X-Ray)

**Revised cost estimates (after VPC endpoint optimization):**
- Year 1 (free tier): **~$7.20/month** (SNS VPC Interface Endpoint only — within SRS $10 budget)
- Year 2+: **~$24.45/month** (SNS endpoint $7.20 + RDS $13.50 + misc SES/S3/SQS $3.75)
- Optimization: auth-service outside VPC (removes Cognito-IDP endpoint $7.20) + IAM DB auth
  (removes Secrets Manager endpoint $7.20). 3 endpoints → 1 endpoint. $21.60 → $7.20/month.

---

*HIS Platform — Cloud Infrastructure Implementation Plan*
*Healthcare Information System v2.0 | University of Buea — Department of Computer Engineering*
*CDK TypeScript | us-east-1 | 18 phases | 6 CDK stacks*
