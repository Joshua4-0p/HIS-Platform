*HIS SRS v2.0  |  University of Buea  |  Dept. of Computer Engineering*

**UNIVERSITY OF BUEA**

*Faculty of Engineering and Technology*

*Department of Computer Engineering*

**SOFTWARE REQUIREMENTS SPECIFICATION**

**Version 2.0**

*Design and Implementation of a Scalable Cloud-Based Architecture*

*for Healthcare Data Collection, Processing, and Visualisation*

| **Project Title** | Healthcare Information System (HIS) |
| --- | --- |
| **Version** | 2.0 — Revised Final |
| **Status** | Final Draft — For Supervisor Review |
| **Academic Year** | 2024 / 2025 |
| **Department** | Computer Engineering — Faculty of Engineering & Technology |
| **Supervisor** | Dr Djouela Ines |
| **Replaces** | SRS v1.0 (Draft) — All previous versions superseded |

---

# Revision History

| **Version** | **Date** | **Description** | **Author** |
| --- | --- | --- | --- |
| 1.0 | 2025 | Initial draft prepared for supervisor review. | Project Author |
| 2.0 | 2025 | Full revision: architecture simplified (removed Athena, Glue, ElastiCache; CloudFront consolidated into Amplify); 14 gaps resolved (patient consent, clinical audit trail, token refresh, in-app notifications, record amendment, grant expiry, attending clinician binding, appointment scheduling, bulk deduplication, GIN index spec, regional data, TLS alignment, Pharmacist scope); NFRs aligned to MVP; diagram placeholders added. | Project Author |

---

# CHAPTER 1 — INTRODUCTION

## 1.1  Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for the Healthcare Information System (HIS), a scalable cloud-based web platform designed to facilitate the collection, processing, storage, and visualisation of patient healthcare data across hospital facilities in Cameroon.

This document serves as the contractual specification between the project author and the project supervisor. It ensures all stakeholders share a common understanding of the intended behaviour of the system prior to implementation. It is the authoritative reference for development, testing, and academic evaluation.

This is version 2.0, which supersedes SRS v1.0. All gaps, architectural redundancies, and inconsistencies identified in the v1.0 requirements analysis have been resolved in this revision.

## 1.2  Document Conventions

| **Convention** | **Definition** |
| --- | --- |
| **SHALL** | Mandatory requirement — the system must satisfy this without exception. |
| **SHOULD** | Recommended requirement — strongly desired but not absolutely mandatory for the MVP. |
| **MAY** | Optional — may be implemented at the developer's discretion in a future release. |
| **REQ-F-XXX** | Functional requirement identifier. |
| **REQ-NF-XXX** | Non-functional requirement identifier. |
| **UI-XXX** | User interface requirement identifier. |
| **High / Medium / Low** | Priority classification based on criticality to core operation. |
| **Actor** | Any person, external system, or automated process that interacts with the HIS. |
| **AWS** | Amazon Web Services — cloud infrastructure provider. |
| **HIS** | Healthcare Information System — the system specified in this document. |
| **WAT** | West Africa Time (UTC+1) — Cameroon's local timezone, used for all scheduled operations. |

## 1.3  Intended Audience

| **Audience** | **Relevance** |
| --- | --- |
| **Project Supervisor (Dr Djouela Ines)** | Primary reviewer. Evaluates technical completeness, academic rigour, and alignment with project objectives. |
| **Project Author / Developer** | Primary implementer. Uses this as the authoritative specification during design and development. |
| **QA / Testers** | Uses functional and non-functional requirements as the basis for test case design and acceptance criteria. |
| **Hospital IT Administrators** | Understand system capabilities, access control model, and infrastructure requirements. |
| **Future Developers** | Reference document for understanding design decisions and extending the platform. |
| **University Examination Panel** | Evaluates thoroughness of requirements analysis as part of the FYP assessment. |

## 1.4  Project Scope

The Healthcare Information System is a multi-tenant, serverless, cloud-based web platform that enables hospitals and healthcare facilities in Cameroon to digitise, manage, and analyse patient health data. The system is accessible through any modern web browser and is hosted entirely on Amazon Web Services (AWS) in the af-south-1 (Cape Town) region.

### 1.4.1  In Scope

- Multi-facility onboarding with Super Admin approval and email domain verification.
- Patient consent recording and management.
- Patient record management: registration, profile creation, deduplication, search, amendment, and longitudinal record maintenance.
- Appointment scheduling: creation, viewing, and cancellation of patient appointments.
- Clinical encounter recording: diagnosis, vital signs, treatment plans, and prescriptions.
- Laboratory result management: structured entry, reference range validation, and critical value alerting.
- Role-based access control (RBAC): default and custom roles, fine-grained permissions, and JWT-enforced authorisation.
- Bulk data ingestion: CSV upload of historical patient records with automated Lambda-based ETL processing.
- Cross-hospital patient transfer: access request workflow with approval, time-limited grants, expiry notifications, and audit logging.
- Analytics and visualisation: role-specific dashboards and trend charts.
- In-application notifications via client-side polling and email delivery via Amazon SES.
- Application-level clinical audit trail (in database) plus infrastructure-level audit via AWS CloudTrail.
- Security and compliance: AES-256 encryption at rest, TLS 1.3 in transit, and alignment with Cameroon Data Protection Law No. 2010/012.

### 1.4.2  Out of Scope

- Integration with physical laboratory instruments via HL7 v2 or DICOM protocols.
- Billing, invoicing, insurance claims, or financial transaction processing.
- Telemedicine, video consultation, or real-time patient-to-clinician communication.
- Mobile native applications (iOS or Android). The platform is web-responsive only.
- Offline functionality or local-server deployment. An internet connection is required.
- Automated AI-driven clinical decision support or diagnostic suggestions.
- Pharmacy dispensing management. The Pharmacist role is not defined in this version and is reserved for a future Pharmacy module.

## 1.5  References

| **Ref.** | **Title / Source** | **Relevance** |
| --- | --- | --- |
| **[1]** | IEEE Std 830-1998: Recommended Practice for SRS | Template and structural guidance for this document. |
| **[2]** | Cameroon Data Protection Law No. 2010/012 | Legal basis for patient data privacy, consent, encryption, and access control requirements. |
| **[3]** | AWS Well-Architected Framework (2024) | Design principles for security, reliability, performance, and cost optimisation on AWS. |
| **[4]** | HL7 FHIR R4 Specification — hl7.org/fhir | Reference standard for healthcare data interoperability. Informs data model design. |
| **[5]** | DHIS2 Documentation — dhis2.org | Existing HIS platform used as comparative reference. |
| **[6]** | WHO Global Digital Health Strategy 2020-2025 | Policy context for digital health system design in low-income countries. |
| **[7]** | HIS AWS Architecture Pipeline Reference Document v2.0 | Internal document describing the revised, simplified AWS service pipeline. |

---

# CHAPTER 2 — OVERALL DESCRIPTION

## 2.1  Product Perspective

The HIS is a standalone product designed to address the gap in digital health infrastructure in Cameroon. It is not a replacement for any existing system. It is designed to complement DHIS2 (which handles national aggregate reporting) by providing individual patient-level clinical data, and to complement OpenMRS by adding a built-in serverless cloud-analytics layer and cross-hospital transfer workflows.

The system sits between end-users (clinicians, hospital administrators, ministry officers) and the cloud data layer. It has no hardware dependencies at the facility level beyond a computer or tablet with internet access and a modern web browser.

### 2.1.1  Revised Architecture Overview

Following architectural review of SRS v1.0, the service inventory has been rationalised for MVP cost-effectiveness and simplicity. The revised architecture uses 13 AWS services (down from 17+). The key decisions are:

| **Decision** | **Rationale** |
| --- | --- |
| **CloudFront consolidated into AWS Amplify** | Amplify Hosting automatically provisions and manages a CloudFront distribution. Listing CloudFront as a separate standalone service created an architectural redundancy. The CloudFront CDN layer is provided transparently through Amplify; no additional configuration is needed. |
| **Amazon Athena REMOVED** | No functional requirement justifies querying raw S3 data via Athena. All analytics are served from RDS. Athena adds cost and complexity with zero benefit in the current scope. |
| **AWS Glue REPLACED by Lambda-based ETL** | AWS Glue is designed for big-data ETL on millions of records. Hospital CSV onboarding involves thousands of records, well within Lambda's 15-minute timeout and 10 MB processing capacity. A dedicated bulk-ingestion Lambda function is simpler, faster to implement, and free within the AWS free tier. |
| **Amazon ElastiCache (Redis) REMOVED** | Redis requires a dedicated always-on VPC node (~$25+/month), cache invalidation logic, and operational overhead. For a 200-user MVP, PostgreSQL materialized views refreshed by pg_cron achieve sub-200 ms dashboard queries without any additional infrastructure. |
| **Amazon RDS Proxy REMOVED** | RDS Proxy is justified at 500+ concurrent Lambda executions and is not cost-effective for an MVP. Connection limits are managed by capping Lambda concurrency at 200 (REQ-NF-021). |
| **Multi-AZ RDS: SHOULD (not SHALL) for MVP** | Multi-AZ doubles RDS cost. For the academic MVP, automated snapshots with 2-day retention are the primary recovery mechanism. Multi-AZ is a SHOULD-level recommendation for production deployment (REQ-NF-018). |
| **NAT Gateway REMOVED (MVP)** | A NAT Gateway costs $32.40/month ($0.045/hr fixed + data charges) — unacceptable under the $10/month MVP budget. Instead: (1) auth-service Lambda is deployed without VPC attachment — it calls only Cognito (a public AWS endpoint) and has no RDS dependency, so it requires no VPC; (2) the remaining 9 Lambdas reside in VPC private isolated subnets with a single SNS VPC Interface Endpoint (~$7.20/month) and a free S3 VPC Gateway Endpoint; (3) RDS connections use IAM database authentication, eliminating any Secrets Manager VPC endpoint requirement. Total Year 1 cost: ~$7.20/month — within the $10/month constraint. NAT Gateway is a production P1 enhancement. |
| **VPC Interface Endpoints — REDUCED TO ONE (SNS)** | Lambda functions in VPC private isolated subnets cannot reach AWS APIs without VPC Interface Endpoints. Three endpoints were initially required (Secrets Manager, SNS, Cognito-IDP — $7.20/month each = $21.60/month). Optimization reduces this to one: auth-service (the only Lambda calling Cognito) is deployed outside the VPC; RDS IAM database authentication eliminates all Secrets Manager runtime calls from VPC Lambdas (no stored DB password, token generated locally by Lambda execution role). Only the SNS VPC Interface Endpoint is retained — required by lab-service, transfer-service, notification-service, and bulk-ingestion for event publishing from within the VPC. |
| **Aurora Serverless v2 NOT USED (MVP)** | A Well-Architected cost review established that Aurora Serverless v2 has a hard minimum floor of 0.5 ACU and never pauses to zero. At $0.12/ACU-hour, the minimum cost is $43.20/month — more than three times the cost of RDS db.t3.micro ($13.50/month post-free-tier, $0 during free tier). RDS PostgreSQL 15 satisfies all functional requirements identically (pg_trgm, GIN indexes, materialized views, pg_cron, Flyway). CDK Stack 2 is designed for a direct upgrade to Aurora Serverless v2 for production without any Lambda code changes. |
| **AWS WAF DEFERRED (MVP)** | AWS WAF costs a minimum of $5/WebACL/month regardless of traffic volume. For a 1–2 tenant academic MVP, API Gateway HTTP API usage plan throttling combined with Cognito JWT authorisation provides sufficient protection. WAF is a production P0 security requirement. |
| **KMS Customer Managed Keys DEFERRED (MVP)** | KMS CMKs cost $1/key/month. AWS managed encryption keys (aws/rds, aws/s3, aws/secretsmanager) provide identical AES-256 encryption at rest with no monthly key cost. The only capability lost is custom key policy control and manual rotation scheduling — both are production P1 requirements. |

**The final 13-service architecture is:**

| **#** | **AWS Service** | **Purpose** | **Tier** |
| --- | --- | --- | --- |
| 1 | **AWS Amplify (+ built-in CloudFront)** | Frontend hosting, CDN, CI/CD deployment pipeline. | Tier 0 — Presentation |
| 2 | **AWS WAF** *(Production only — deferred from MVP. API Gateway throttling and Cognito JWT authoriser serve as compensating controls during MVP. WAF is a go-live P0 requirement.)* | Web Application Firewall — OWASP Top 10 protection. | Tier 0 — Presentation |
| 3 | **Amazon API Gateway v2 (HTTP API)** | Single HTTPS entry point for all Lambda functions. Usage plan throttling applied for rate limiting during MVP (compensating control for deferred WAF). | Tier 0 — Presentation |
| 4 | **Amazon Cognito** | User authentication, JWT issuance, and password management. | Tier 0 — Presentation |
| 5 | **AWS Lambda (10 functions)** | All backend business logic — serverless, auto-scaling. auth-service deployed without VPC attachment (calls Cognito only — no RDS dependency). Nine Lambdas in VPC private isolated subnets with strict outbound security group rules. | Tier 1 — Backend |
| 6 | **Amazon RDS for PostgreSQL 15 (db.t3.micro, single-AZ, AWS managed encryption)** — MVP configuration. Free for 12 months under AWS free tier; $13.50/month after. Upgrade path to Aurora Serverless v2 is designed into CDK Stack 2 for production (no Lambda code changes required). | Primary relational database for all clinical and operational data. | Tier 2 — Data |
| 7 | **Amazon S3** | CSV uploads, static frontend assets, CloudTrail log storage. Accessed from Lambda via VPC Gateway Endpoint (free — no NAT required). | Tier 2 — Data |
| 8 | **AWS Managed Encryption Keys** *(aws/rds, aws/s3, aws/secretsmanager)* — MVP configuration. AES-256 encryption at rest is maintained. Customer Managed Keys (KMS CMKs) with annual rotation are a production P1 enhancement. | Encryption key management for RDS, S3, and Secrets Manager. | Tier 2 — Data |
| 9 | **AWS Secrets Manager** | Runtime retrieval of database credentials and API secrets. No credentials in source code or environment variables. | Tier 2 — Data |
| 10 | **Amazon SES** | Transactional email: alerts, notifications, daily summaries. Sandbox mode for MVP (3 verified demo addresses). Production access required before go-live. | Tier 3 — Notifications |
| 11 | **Amazon SNS** | Internal event bus: connects Lambda triggers to SES and other subscribers. No sandbox restrictions. | Tier 3 — Notifications |
| 12 | **Amazon SQS** *(Dead Letter Queue for bulk-ingestion Lambda)* | Captures failed bulk-ingestion Lambda invocations for retry and error analysis. Prevents silent mid-CSV data loss. | Tier 1 — Backend |
| 13 | **AWS CloudTrail** | Infrastructure-level audit: records all AWS API calls. | Tier 4 — Observability |
| 14 | **Amazon CloudWatch** | Monitoring, structured logs, and threshold alarms. | Tier 4 — Observability |

### 2.1.3  MVP vs Production Configuration

The following table documents which architectural decisions apply to the academic MVP and which are deferred to production, with cost justification for each deferral. All deferred services remain functionally satisfied through MVP-appropriate compensating controls. No SRS functional requirement is dropped.

| Feature | MVP Configuration | Cost (MVP) | Production Configuration | Cost (Prod) | SRS Ref |
| --- | --- | --- | --- | --- | --- |
| **Primary database** | RDS PostgreSQL 15, db.t3.micro, single-AZ | $0 (free tier 12 mo), $13.50/mo after | Aurora Serverless v2 or RDS Multi-AZ | $43+/mo | REQ-NF-017/018 |
| **DB backup retention** | 2 days (cost management) | Included | 30 days + PITR | Included | REQ-NF-017 |
| **Encryption keys** | AWS managed keys (aws/rds, aws/s3, aws/secretsmanager) | $0 | KMS Customer Managed Keys, annual rotation | $3/mo (3 CMKs) | REQ-NF-007/014 |
| **Web Application Firewall** | Deferred — API GW throttling + Cognito JWT as compensating control | $0 | AWS WAF with Managed Rules Common Rule Set | $7+/mo | REQ-NF-010 |
| **Lambda network placement** | auth-service: no VPC (direct Cognito access). 9 Lambdas in private isolated subnets + 1 SNS VPC Interface Endpoint. IAM DB auth eliminates Secrets Manager endpoint. | $7.20/mo | Private subnet + NAT Gateway | $32/mo | COM-004 |
| **Lambda provisioned concurrency** | Disabled — accept 1–2s cold starts | $0 | Enabled for patient-service and analytics-service | $5–15/mo | REQ-NF-005 |
| **SES email sending** | Sandbox — verified demo addresses only | $0.10/mo | Production access — all recipients | $0.10/mo | REQ-F-066/067 |
| **GuardDuty** | Disabled | $0 | Foundational mode only (no protection plans) | ~$1/mo | Security best practice |
| **AWS Region** | us-east-1 (N. Virginia) | — | af-south-1 (Cape Town) for data residency | — | Section 2.4.1 |
| **X-Ray tracing** | Disabled | $0 | Enabled on all Lambda functions | Trace-based pricing | REQ-NF-024 |

**Estimated monthly cost:**

- MVP Year 1 (within AWS free tier): **~$7.20/month** (SNS VPC Interface Endpoint only — all other services remain free-tier; within the $10/month budget constraint)
- MVP Year 2+ (post-free-tier): **~$24.45/month** ($7.20 SNS endpoint + $13.50 RDS db.t3.micro + $3.75 misc SES/S3/SQS)
- Full production configuration: **$89+/month**

### 2.1.2  System Context Diagram

| **System Context Diagram — Insert Here** |
| --- |
| [Export from Lucidchart and paste as image — approx. 15 cm height recommended] |
|  |
|  |

## 2.2  Product Functions

| **No.** | **Function** | **Description** |
| --- | --- | --- |
| **F1** | **Hospital Onboarding** | Hospitals self-register; Super Admin verifies and activates. Admin account auto-created. |
| **F2** | **Staff Management & RBAC** | Hospital administrators onboard staff, assign default or custom roles, manage permissions. |
| **F3** | **Patient Consent Management** | Record, display, and enforce patient consent before any data entry. |
| **F4** | **Patient Registration & Search** | Deduplication-guarded registration; fuzzy search; optional attributes. |
| **F5** | **Appointment Scheduling** | Create, view, update, and cancel patient appointments by Receptionist or Doctor. |
| **F6** | **Clinical Encounter Management** | Diagnoses, vital signs, treatment plans, prescriptions linked to patient records. |
| **F7** | **Laboratory Result Management** | Structured entry, automated reference range validation, critical value alerting. |
| **F8** | **Bulk Data Ingestion** | CSV upload; Lambda-based ETL; deduplication; completion notification. |
| **F9** | **Patient Transfer Workflow** | Cross-hospital access requests, approvals, time-limited grants, expiry alerts. |
| **F10** | **Analytics Dashboard** | Role-specific dashboards; filter-based queries; chart exports. |
| **F11** | **Notifications & Alerts** | In-app polling notifications; SES email for critical events and daily summaries. |
| **F12** | **Clinical Audit Trail** | Database-level audit log for every patient data access and modification. |

## 2.3  User Classes and Characteristics

| **User Class** | **Description** | **Proficiency** | **Primary Activities** |
| --- | --- | --- | --- |
| **System Super Admin** | Platform development team. Manages all tenants and global configuration. | Expert | System monitoring, hospital verification, global configuration. |
| **Hospital Admin** | Designated administrator at each facility. | Moderate | Staff onboarding, role assignment, facility settings. |
| **Doctor / Clinician** | Licensed medical practitioners. | Low to Moderate | Diagnose, prescribe, review records, order lab tests, manage appointments. |
| **Nurse** | Nursing staff. | Low | Enter vitals, update nursing notes, view assigned patients, manage appointments. |
| **Laboratory Technician** | Process tests and enter results. | Low to Moderate | Enter lab results, manage test queue. |
| **Receptionist / Data Clerk** | Front-desk staff. | Low | Register patients, schedule appointments, upload bulk data. |
| **Ministry / Public Health Officer** | Government health officials. | Moderate | View anonymised system-wide dashboards, export regional reports. |

## 2.4  Operating Environment

### 2.4.1  Cloud Infrastructure

The entire backend is deployed on Amazon Web Services (AWS) in the **us-east-1 (N. Virginia)** region for the MVP implementation. This region is selected for its broader service availability, lower cost compared to af-south-1, and wider AWS free tier coverage during the academic evaluation period. Production deployment targeting Cameroonian data residency under Law No. 2010/012 should migrate to af-south-1 (Cape Town) or consider AWS Local Zones in the region. The system uses a serverless architecture built on AWS Lambda, with no persistent virtual machines or dedicated application servers. The 14 AWS services and components listed in Section 2.1.1 constitute the complete operating environment for this version.

### 2.4.2  Client Environment

The frontend web application requires a modern web browser supporting ECMAScript 2020 or later (Google Chrome 90+, Mozilla Firefox 88+, Microsoft Edge 90+, or Safari 14+). No browser plugins or extensions are required. A stable internet connection with a minimum speed of 2 Mbps is recommended.

### 2.4.3  Development Environment

Frontend: React.js v18, Recharts for data visualisation, ShadCN UI for component styling. Backend: Node.js v20 Lambda functions. Infrastructure: AWS SAM (Serverless Application Model) or CloudFormation. Database migrations: managed by a migration tool (e.g., Flyway or Liquibase). Version control: Git with GitHub. All environments (development, staging, production) use separate AWS accounts or namespaced stacks.

## 2.5  Design and Implementation Constraints

| **Constraint** | **Description** |
| --- | --- |
| **Serverless Architecture** | All backend processing SHALL use AWS Lambda. No EC2 instances or persistent application servers are provisioned as part of the primary application tier. |
| **AWS Services Only** | All cloud infrastructure SHALL be provided exclusively by Amazon Web Services. |
| **Internet-Dependent** | The system requires a live internet connection. Offline modes are not supported. |
| **Cameroon Data Protection Law** | All personal health data SHALL be processed in accordance with Law No. 2010/012 of Cameroon, which mandates consent, data protection, and secure storage. |
| **Lambda Execution Limits** | Lambda functions have a 15-minute timeout and a 6 MB synchronous payload limit. Large file transfers MUST use pre-signed S3 URLs. |
| **Form-Based Data Entry** | All clinical data is entered manually via web forms. Instrument integration is out of scope. |
| **English Language Only** | The UI and documentation SHALL be in English. French/Pidgin support is deferred. |
| **Academic MVP Scope** | The system is implemented as a Minimum Viable Product for academic evaluation. Full production hardening and penetration testing are deferred to post-project phases. |
| **Cost-Effectiveness** | The architecture SHALL minimise recurring AWS costs. Services used SHALL be justifiable against at least one functional requirement. Unused or prematurely complex services SHALL NOT be included. |
| **MVP Budget Constraint** | The academic MVP architecture is constrained to a maximum of $10/month in recurring AWS costs. Services that would individually breach this ceiling — AWS WAF ($5/WebACL), KMS Customer Managed Keys ($1/key), NAT Gateway ($32.40/month), Aurora Serverless v2 ($43.20/month minimum), and Lambda provisioned concurrency — are deferred to the production configuration. Each deferral is compensated by a documented alternative control or an accepted risk appropriate to the MVP scope. See Section 2.1.3 for the full MVP vs Production configuration table. |

## 2.6  Assumptions and Dependencies

### 2.6.1  Assumptions

- Hospital staff have access to a computer or tablet with a functional internet connection at the point of care.
- Each hospital designates at least one technically competent individual to serve as Hospital Administrator.
- Historical patient records for bulk upload are in structured CSV format with clearly labelled column headers.
- AWS services will remain available and their APIs backward-compatible throughout the project lifecycle.
- Patients can be identified through a combination of full name, date of birth, and telephone number in the absence of a universal patient identifier.
- The system will not be used for emergency critical care where sub-second response times are life-critical during the MVP phase.
- All scheduled operations use West Africa Time (WAT, UTC+1) as the reference timezone, consistent with Cameroon's local time.

### 2.6.2  Dependencies

| **Dependency** | **Impact if Unavailable** |
| --- | --- |
| **Amazon Web Services (AWS)** | Complete system unavailability. |
| **Amazon Cognito** | Authentication fails. No user can log in or perform any operation. |
| **Amazon RDS (PostgreSQL)** | All patient record reads and writes fail. Core clinical functionality unavailable. |
| **Amazon S3** | Bulk CSV uploads fail. Static frontend assets become unavailable. |
| **Amazon SES** | Email notification delivery fails. Critical lab alerts and daily summaries are not sent. |
| **AWS KMS** | Encrypted data in RDS and S3 cannot be decrypted. System becomes non-functional. |
| **GitHub (Source Control)** | Deployment pipeline interrupted. Code pushes and pulls are unavailable. |

---

# CHAPTER 3 — SPECIFIC REQUIREMENTS

## 3.1  External Interface Requirements

### 3.1.1  User Interface Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **UI-001** | **High** | The system SHALL provide a login page with fields for email address and password, a login button, a "Forgot Password" link, and a read-only display of the session timeout duration. | Entry point for all authenticated users. |
| **UI-002** | **High** | The dashboard SHALL display role-appropriate content automatically upon successful login, without requiring the user to navigate manually. | Reduces cognitive load on clinical staff. |
| **UI-003** | **High** | All forms SHALL perform inline validation and display human-readable error messages adjacent to the offending field before submission. | Prevents invalid data from reaching the backend. |
| **UI-004** | **High** | The patient search interface SHALL return results within 500 milliseconds of the final keystroke using a 300-millisecond debounce mechanism. | Supports fast patient lookup at busy reception. |
| **UI-005** | **Medium** | The interface SHALL be responsive and render correctly on screen widths from 768 px (tablet) to 1920 px (desktop monitor). | Clinical staff may use tablets at point of care. |
| **UI-006** | **Medium** | The system SHALL use a consistent colour language: red for critical / urgent, amber for warnings, green for normal / completed. | Enables rapid visual triage by clinical staff. |
| **UI-007** | **Low** | All chart visualisations SHALL include a legend, axis labels, and a PNG export option. | Supports report preparation by administrators. |
| **UI-008** | **High** | The system SHALL display a session timeout warning 2 minutes before the JWT expires, and SHALL attempt a silent token refresh if the user is actively interacting. If the refresh fails, the system SHALL redirect to the login page. | Prevents loss of work and unauthorised access from unattended terminals. |
| **UI-009** | **High** | Every record displaying patient personal data SHALL include a visible consent status indicator (Consent Granted / Consent Pending / Consent Refused). Staff SHALL NOT be able to create new encounters or lab records for a patient whose consent status is Refused. | Enforces patient consent at the point of data capture. |
| **UI-010** | **Medium** | All destructive actions (deletion, deactivation, access revocation) SHALL require a two-step confirmation dialog before execution. | Prevents accidental permanent data loss. |
| **UI-011** | **Medium** | All non-obvious form fields SHALL display a contextual help tooltip (max two sentences) on hover. | Reduces user errors and support requests. |

### 3.1.2  Hardware Interface Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **HW-001** | **High** | The client device SHALL have a minimum screen resolution of 1280 × 768 pixels. | Ensures usability on standard hospital workstations. |
| **HW-002** | **High** | The client device SHALL have a minimum internet connection speed of 2 Mbps downstream. | Reflects typical broadband availability in Cameroonian urban facilities. |
| **HW-003** | **Medium** | All server-side infrastructure is managed by AWS. The development team is not responsible for physical hardware. | Serverless architecture eliminates hardware management. |

### 3.1.3  Software Interface Requirements

| **Interface** | **Service** | **Description** |
| --- | --- | --- |
| **Authentication** | Amazon Cognito | The system SHALL use Amazon Cognito User Pools for all user authentication. JWT tokens SHALL be validated on every API request via an API Gateway Cognito Authoriser. Refresh tokens SHALL be used by the frontend to silently renew access tokens. |
| **Database** | Amazon RDS for PostgreSQL 15 (db.t3.micro, single-AZ) | The system SHALL use Amazon RDS for PostgreSQL 15 as the primary relational database. MVP configuration: db.t3.micro instance, single-AZ, AWS managed encryption keys, 2-day automated backup retention. The 9 Lambda functions that access RDS SHALL connect via IAM database authentication: Lambda execution roles are granted `rds:connect` permission and generate a short-lived auth token locally at cold start using `Signer.getAuthToken()` — no stored database password and no Secrets Manager call at runtime. auth-service Lambda is deployed without VPC attachment (it has no RDS dependency). The 9 VPC-bound Lambdas reside in VPC private isolated subnets; RDS resides in the VPC private subnet with no public IP, accessible only from the Lambda security group on port 5432. The CDK stack is designed for direct upgrade to Aurora Serverless v2 (PostgreSQL-compatible) for production without any Lambda code changes. |
| **File Storage** | Amazon S3 | The system SHALL use S3 for CSV uploads, static frontend assets, and CloudTrail log storage. Pre-signed URLs SHALL be used for all client-initiated uploads to bypass Lambda payload limits. |
| **ETL Processing** | AWS Lambda (Bulk Ingestion Function) | A dedicated bulk-ingestion Lambda function SHALL process uploaded CSV files from S3, validate each row, resolve duplicates, and batch-insert records into RDS PostgreSQL using parameterised bulk inserts. |
| **Notifications** | Amazon SES | The system SHALL use Amazon SES to deliver all outbound email notifications, including critical lab alerts, transfer approvals, ETL completion reports, and daily summaries. |
| **In-App Notifications** | RDS Notifications Table + Polling | In-application notifications SHALL be delivered by a client-side polling mechanism. The frontend SHALL call GET /notifications every 15 seconds. Notification records SHALL be stored in the notifications table in RDS. |
| **Monitoring** | Amazon CloudWatch | All Lambda functions SHALL emit structured JSON logs to CloudWatch Logs. CloudWatch alarms SHALL be configured for critical metrics. |
| **Audit — Infrastructure** | AWS CloudTrail | CloudTrail SHALL be enabled for all AWS API calls in the account, with logs delivered to a dedicated, versioned S3 bucket. |
| **Audit — Clinical** | RDS Application Audit Table | Every patient data read, write, or delete event SHALL create a record in the application_audit_log table in RDS, capturing: user_id, patient_id, action_type, resource_type, resource_id, timestamp (WAT), and ip_address. |

### 3.1.4  Communication Interface Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **COM-001** | **High** | All communication between the client browser and API Gateway SHALL use HTTPS with TLS version 1.3. Connections using TLS 1.2 or lower SHALL be rejected by the WAF policy. | TLS 1.3 is the current standard. Older versions have known vulnerabilities. All references to TLS in this document specify TLS 1.3 as the minimum. |
| **COM-002** | **High** | All API responses SHALL follow REST conventions and return JSON with appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500). | Standard interface simplifies frontend development. |
| **COM-003** | **High** | Authentication tokens SHALL use JWT with RS256 signing, issued by Cognito, with a 60-minute expiry. The frontend SHALL use the Cognito Refresh Token to silently renew the access token without user interruption, as long as the session is active. | Short token lifetime limits exposure; silent refresh prevents workflow interruption. |
| **COM-004** | **Medium** | Lambda functions communicating with RDS SHALL use TCP/IP connections within the VPC private subnet. No Lambda function SHALL have a public IP address or direct internet access to the database. | Ensures the database layer is never exposed to the public internet. |

## 3.2  Functional Requirements

### 3.2.1  Hospital Onboarding and Account Management

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-001** | **High** | The system SHALL allow a new hospital to self-register by providing: facility name, physical address, region/district, type (public, private, or mission), and a primary administrator email address. | Each hospital must have a distinct tenant account. |
| **REQ-F-002** | **High** | The self-registration form SHALL verify the administrator email address by sending a one-time verification link. Registration SHALL NOT proceed until the link is clicked. | Prevents fraudulent or mistyped email addresses from blocking account activation. |
| **REQ-F-003** | **High** | All new hospital registrations SHALL be placed in a Pending state. The System Super Admin SHALL receive a notification and SHALL review, approve, or reject each registration from the Super Admin console. Only approved hospitals SHALL be activated on the platform. | Prevents unauthorised access to the platform by unverified facilities. |
| **REQ-F-004** | **High** | Upon Super Admin approval, the system SHALL automatically create a Hospital Admin account for the verified email address and send a temporary password via email. | Enables self-service completion of onboarding without system administrator manual steps. |
| **REQ-F-005** | **High** | The Hospital Admin SHALL be required to change the temporary password on first login. The new password must meet: minimum 10 characters, at least one uppercase letter, one digit, and one special character. | Enforces minimum security standard for all accounts. |
| **REQ-F-006** | **High** | Each hospital tenant SHALL operate in strict isolation. Data belonging to one hospital SHALL NOT be accessible to staff of another hospital, except through the explicit patient transfer workflow (Section 3.2.9). All database queries SHALL include a hospital_id filter enforced at the API layer. | Mandatory multi-tenancy isolation for patient data privacy. |
| **REQ-F-007** | **Medium** | The Hospital Admin SHALL be able to update the facility profile (name, address, region/district, contact details) at any time from the settings panel. | Facilities undergo name changes and relocations. |

### 3.2.2  Staff Management and Role-Based Access Control

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-008** | **High** | The Hospital Admin SHALL create new staff accounts by providing: full name, email address, job title, region/district assignment, and assigned role. | Hospital administrators must manage their own staff independently. |
| **REQ-F-009** | **High** | The system SHALL provide the following default roles at hospital onboarding: Hospital Admin, Doctor, Nurse, Laboratory Technician, Receptionist, and Data Clerk. The Pharmacist role is not defined in this version and SHALL NOT appear as a default option until a Pharmacy module is implemented. | Removes the undefined Pharmacist role identified as a gap in SRS v1.0. |
| **REQ-F-010** | **High** | A role SHALL consist of a named bundle of permissions. The system SHALL provide atomic permissions including: patient:read, patient:write, patient:amend, diagnosis:write, lab_result:read, lab_result:write, prescription:write, appointment:write, analytics:view, staff:manage, role:assign, transfer:request, and transfer:approve. | Fine-grained permissions enable precise access control. |
| **REQ-F-011** | **High** | The Hospital Admin SHALL create custom roles by selecting any combination of available permissions and saving under a unique role name. | Different hospitals have unique organisational structures. |
| **REQ-F-012** | **High** | The system SHALL enforce permission checks on every API request. A request lacking the required permission SHALL be rejected with HTTP 403 Forbidden. | Prevents privilege escalation and unauthorised data access. |
| **REQ-F-013** | **Medium** | The Hospital Admin SHALL deactivate a staff account without deleting it, immediately revoking all access without removing historical audit records. Deactivated accounts SHALL also have their active Cognito sessions invalidated. | Preserves audit history and prevents continued access after departure. |
| **REQ-F-014** | **Medium** | The system SHALL maintain a log of all role assignment changes, recording: administrator ID, affected staff ID, previous role, new role, and timestamp (WAT). | Supports accountability and dispute resolution. |

### 3.2.3  Patient Consent Management

Patient consent is a legal requirement under Cameroon Data Protection Law No. 2010/012. The system SHALL enforce consent at every point of clinical data capture.

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-015** | **High** | At the time of patient registration, the registering staff member SHALL record the patient's (or guardian's) consent decision for: (a) storage of personal health data, (b) use of data for anonymised public health reporting. The consent decision SHALL be recorded as one of: Granted, Refused, or Pending (awaiting decision). | Legal requirement under Cameroon Data Protection Law No. 2010/012. |
| **REQ-F-016** | **High** | The system SHALL display the patient's consent status prominently on the patient profile page. Staff SHALL NOT be able to create a new clinical encounter, record a laboratory result, or add a prescription for a patient whose consent status is Refused. | Prevents data processing without consent. |
| **REQ-F-017** | **High** | The Hospital Admin or authorised staff SHALL be able to update a patient's consent status at any time, recording the date of change and the staff member who recorded the update. | Consent can be granted, withdrawn, or modified at any time. |
| **REQ-F-018** | **Medium** | For the Ministry / Public Health Officer dashboard (analytics view), the system SHALL only include data from patients whose consent for anonymised public health reporting is Granted. | Ensures aggregated reports only include consenting patients' data. |

### 3.2.4  Patient Registration and Record Management

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-019** | **High** | Authorised staff SHALL register a new patient by capturing mandatory fields: full name, date of birth, biological sex, telephone number, residential address, region/district, and emergency contact details (name, phone, relationship). Consent status SHALL also be recorded (REQ-F-015) before the registration is saved. | These fields are the minimum required for patient identification, contact, and compliance. |
| **REQ-F-020** | **High** | Before creating a new patient record, the system SHALL search existing records for duplicates using a PostgreSQL pg_trgm trigram similarity score on the combination of full_name and date_of_birth. If any existing record has a similarity score above 0.85, the system SHALL display the matched records and ask the user to confirm: create new record, or open existing record. | Prevents duplicate patient records that fragment clinical history. The pg_trgm algorithm is explicit to make this requirement verifiable. |
| **REQ-F-021** | **High** | The system SHALL assign each patient a unique, system-generated, immutable patient identifier (Patient ID) at registration. | Provides a stable, unique reference for all clinical records. |
| **REQ-F-022** | **High** | The patient search function SHALL support queries by patient name, telephone number, or Patient ID. Partial and typographically similar name matches SHALL use a pg_trgm GIN index with a similarity threshold of 0.3. The first page of results (up to 20 records) SHALL be returned within 500 milliseconds. A GIN index SHALL be maintained on the (name, date_of_birth) fields. | Clinicians often search with incomplete information. The GIN index specification is explicit to make the performance requirement achievable. |
| **REQ-F-023** | **High** | A patient's full profile page SHALL display all historical encounters, laboratory results, prescriptions, diagnoses, and appointments in reverse chronological order. | Longitudinal record visibility is essential for continuity of care. |
| **REQ-F-024** | **Medium** | Authorised staff SHALL add optional patient attributes: national identification number, blood group, known allergies (multi-valued), and chronic conditions (multi-valued). | These fields support clinical decision-making at point of care. |

### 3.2.5  Clinical Record Amendment

Healthcare standards and legal accountability require that clinical records be corrected through versioned amendments, not silent overwrites. This section defines the amendment policy.

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-025** | **High** | The system SHALL NOT allow any existing clinical record (encounter, diagnosis, vital signs, prescription, or laboratory result) to be overwritten. All modifications SHALL be implemented as amendments. | Prevents undetectable alteration of clinical records, which is a medico-legal requirement. |
| **REQ-F-026** | **High** | When an authorised clinician submits an amendment to a clinical record, the system SHALL: (a) preserve the original record unchanged with its original timestamp and author, (b) create a new amendment record containing the corrected values, the amending clinician's ID, the amendment timestamp, and a mandatory free-text reason for amendment (minimum 10 characters), and (c) link the amendment to the original record. | Creates a verifiable, auditable chain of custody for all clinical data changes. |
| **REQ-F-027** | **High** | The patient record view SHALL display both original and amended values, clearly distinguishing them with labels "Original" and "Amended — [date] by [clinician name]". | Clinicians and auditors must see the complete edit history at a glance. |
| **REQ-F-028** | **Medium** | Only the original author of a clinical record or a Hospital Admin SHALL have the patient:amend permission required to submit an amendment. | Limits amendment authority to accountable parties. |

### 3.2.6  Appointment Scheduling

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-029** | **High** | Authorised staff (Receptionist, Doctor, Nurse) SHALL create an appointment for an existing patient by specifying: patient, appointment date and time, appointment type (consultation, follow-up, laboratory, procedure), assigned clinician, and clinical unit. | Appointment scheduling is a stated primary activity of Receptionists. This gap existed in SRS v1.0. |
| **REQ-F-030** | **High** | The system SHALL prevent double-booking by checking for existing appointments for the same clinician at the same date and time. If a conflict exists, the system SHALL reject the booking and display the conflicting appointment. | Prevents scheduling errors that waste clinical time. |
| **REQ-F-031** | **High** | Authorised staff SHALL view a daily or weekly appointment calendar filtered by clinician, clinical unit, or appointment type. | Clinicians and receptionists need a structured view of the day's schedule. |
| **REQ-F-032** | **Medium** | Authorised staff SHALL cancel an appointment by selecting it and providing a mandatory cancellation reason. The patient record SHALL retain a record of cancelled appointments. | Cancellation history supports continuity of care review. |
| **REQ-F-033** | **Medium** | The system SHALL send an in-app notification to the assigned clinician when a new appointment is created or cancelled for them. | Keeps clinicians informed of schedule changes without manual checking. |

### 3.2.7  Clinical Encounter Management

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-034** | **High** | An authorised clinician SHALL create a new clinical encounter for an existing patient by recording: encounter date and time, presenting complaint, attending clinician (staff_id FK — the creating clinician is pre-populated), and clinical unit. The encounter SHALL be linked to a patient appointment if one exists for that date. | Encounter binds to a specific clinician, enabling critical alert routing (resolves G-05 from SRS v1.0 analysis). |
| **REQ-F-035** | **High** | During an encounter, the clinician SHALL record one or more diagnoses. Each diagnosis SHALL include: condition name, ICD-10 code (optional), severity (mild / moderate / severe), and status (active / resolved / suspected). | Structured diagnosis data enables disease trend analysis. |
| **REQ-F-036** | **High** | The clinician SHALL record patient vital signs: temperature (°C), blood pressure (systolic/diastolic mmHg), pulse rate (bpm), respiratory rate (breaths/min), oxygen saturation (%), and weight (kg). | Vital signs are foundational clinical data. |
| **REQ-F-037** | **High** | The clinician SHALL write prescriptions during an encounter, recording: medication name, dosage, frequency, route of administration, duration, and prescribing clinician ID (auto-populated). | Prescription records are critical for medication safety and continuity. |
| **REQ-F-038** | **Medium** | The clinician SHALL request one or more laboratory tests during an encounter. The request SHALL automatically create a pending test in the laboratory technician's work queue for the specified test types. | Closes the loop between clinical request and laboratory fulfilment. |

### 3.2.8  Laboratory Result Management

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-039** | **High** | The system SHALL provide a structured form for laboratory technicians to enter test results. The form SHALL include: test name (from a predefined list), result value, unit of measurement, date and time of test (WAT), and laboratory technician ID (auto-populated from session). | Structured entry ensures consistent, queryable result data. |
| **REQ-F-040** | **High** | Upon submission, the system SHALL compare the result value against the predefined reference range for the test type. Results outside the normal range SHALL be flagged Abnormal; results in a critical range SHALL be flagged Critical. | Automated flagging supports timely clinical response. |
| **REQ-F-041** | **High** | When a result is flagged Critical, the system SHALL immediately: (a) create an in-app notification for the attending clinician linked to the associated encounter (encounter.staff_id), (b) create an in-app notification for any staff member holding the role of Ward Head Nurse for the clinical unit of the encounter, and (c) trigger a SES email to the same recipients within 60 seconds. If no Ward Head Nurse is assigned to the unit, the email SHALL be sent to the Hospital Admin. | Critical values require urgent clinical response. Alert recipients are now precisely defined using encounter.staff_id, resolving G-05 from SRS v1.0. |
| **REQ-F-042** | **High** | Laboratory results SHALL be permanently linked to both the patient record and, where available, the encounter during which the test was requested. | Results must be traceable to their clinical ordering context. |
| **REQ-F-043** | **Medium** | The laboratory technician SHALL view and manage their work queue, listing all pending test requests ordered by request time. | Supports organised laboratory workflow management. |

### 3.2.9  Bulk Data Ingestion

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-044** | **High** | Authorised Data Clerk or Hospital Admin users SHALL upload historical patient records in CSV format using a pre-signed S3 URL generated by the backend. The system SHALL provide a downloadable CSV template specifying required column headers and data formats. | Pre-signed URLs bypass Lambda payload limits. A template prevents format errors. |
| **REQ-F-045** | **High** | The bulk-ingestion Lambda function SHALL validate the CSV structure before processing. If mandatory columns are absent or data types are incorrect, the function SHALL reject the file and return a descriptive error report listing the specific columns or rows with errors. | Prevents malformed data from being loaded into the database. |
| **REQ-F-046** | **High** | The bulk-ingestion function SHALL process valid CSV rows as follows: (a) for each row, compute a pg_trgm similarity score against existing patient records using full_name + date_of_birth; (b) if similarity > 0.85, classify the row as a duplicate and skip it, logging the row number, the matched patient_id, and the similarity score; (c) if similarity <= 0.85, insert the row as a new patient record; (d) rows that fail individual field validation SHALL be classified as failed and logged with the specific validation error. | Explicit duplicate resolution strategy for bulk ingestion, resolving G-10 from SRS v1.0. The same algorithm as REQ-F-020 ensures consistency. |
| **REQ-F-047** | **High** | The system SHALL notify the uploading user by SES email upon completion of the ETL job, reporting: total records processed, records successfully inserted, records skipped as duplicates (with count), and records failed (with count and error summary). | Users require confirmation that their data has been processed correctly. |
| **REQ-F-048** | **Medium** | The original uploaded CSV file SHALL be archived in a dedicated S3 Archive bucket with versioning enabled and a lifecycle policy that transitions files to S3 Glacier after 90 days. | Regulatory compliance requires retention of original source data. |

### 3.2.10  Cross-Hospital Patient Transfer Workflow

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-049** | **High** | A receiving hospital SHALL search for a patient by name and date of birth. If the patient's record belongs to another hospital, the system SHALL display only the patient's name and source hospital name. No clinical details SHALL be visible until access is explicitly granted. | Balances discoverability with privacy protection. |
| **REQ-F-050** | **High** | The receiving hospital SHALL submit an access request specifying: patient, reason for transfer, and requested access type (VIEW_ONLY or VIEW_AND_EDIT). | Different transfer scenarios require different access levels. |
| **REQ-F-051** | **High** | The source hospital's Hospital Admin SHALL receive an immediate in-app notification and SES email upon receipt of a transfer access request, containing: requesting hospital name, patient name, and requested access type. | Source hospitals must respond promptly to enable timely patient care. |
| **REQ-F-052** | **High** | The source hospital administrator SHALL approve or deny the access request from within the application. Upon approval, an access grant record SHALL be created with a configurable expiry period defaulting to 7 days. | Time-limited grants prevent indefinite data exposure. |
| **REQ-F-053** | **High** | The source hospital administrator SHALL revoke an active access grant at any time before its expiry. Revocation SHALL take effect immediately. | Access revocation must be immediate in case of dispute or data misuse. |
| **REQ-F-054** | **High** | The system SHALL send an in-app notification and SES email to the receiving hospital 24 hours before an active access grant expires, including the expiry date/time and a link to submit a renewal request if continued access is required. | Prevents silent mid-treatment access failure when the 7-day grant expires, resolving G-06 from SRS v1.0. |
| **REQ-F-055** | **High** | The receiving hospital SHALL see a visible "Access Expires On: [date and time]" indicator on all pages displaying transferred patient data. | Keeps the receiving hospital informed of their access window. |
| **REQ-F-056** | **Medium** | The receiving hospital SHALL submit a transfer renewal request before or after expiry. The renewal request SHALL follow the same approval workflow as the original request (REQ-F-050 to REQ-F-052). | Provides a structured path for extending access without starting a new transfer from scratch. |
| **REQ-F-057** | **Medium** | The source hospital SHALL proactively grant access to a receiving hospital before a patient's physical transfer by searching for the receiving hospital by name and initiating the grant. | Supports planned inter-facility transfers. |

### 3.2.11  Analytics and Visualisation Dashboard

Note: Dashboard queries SHALL be served by PostgreSQL materialized views maintained in the RDS database. The analytics-service Lambda function SHALL refresh these views on a configurable schedule (default: every 5 minutes during business hours). This replaces the ElastiCache Redis caching layer from SRS v1.0 with a simpler, cost-free equivalent.

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-058** | **High** | The system SHALL provide a role-specific dashboard loaded automatically upon login. Dashboard content SHALL be determined by the user's role and SHALL display only metrics relevant to their function. | Role-appropriate dashboards reduce cognitive overload. |
| **REQ-F-059** | **High** | The Doctor dashboard SHALL display: today's appointment list, pending laboratory results for their patients, and the ten most recent diagnoses they have recorded. | Prioritises the clinician's immediate workload. |
| **REQ-F-060** | **High** | The Hospital Admin dashboard SHALL display: total patient registrations this month, total clinical encounters this month, lab result turnaround times, top five most frequent diagnoses, and staff activity summary. | Operational metrics support facility management decisions. |
| **REQ-F-061** | **High** | The system SHALL provide a filter-based query builder. Users SHALL filter by date range, clinical unit, diagnosis category, patient age group, patient region/district, and test type. Results SHALL be groupable by day, week, or month. | Self-service analytics reduces dependence on IT for ad-hoc reports. Region/district filter is now possible because this field is captured at registration (REQ-F-019), resolving G-12 from SRS v1.0. |
| **REQ-F-062** | **High** | All dashboard charts SHALL offer bar chart, line chart, and pie chart rendering options, selectable without reloading the page. | Different metrics communicate better with different chart types. |
| **REQ-F-063** | **Medium** | The Ministry / Public Health Officer view SHALL display cross-hospital aggregate statistics: total cases by disease category, monthly admission trends, and regional distribution maps by district. All data in this view SHALL include only patients who have consented to anonymised public health reporting (REQ-F-018), and SHALL display no individual patient identifiers. | Policy and resource allocation decisions require population-level data. |

### 3.2.12  Notification and Alerting

In-application notifications are delivered via a client-side polling mechanism (GET /notifications every 15 seconds). Email notifications are delivered via Amazon SES. Amazon SNS is used as the internal event bus to decouple Lambda functions from SES delivery.

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-064** | **High** | The system SHALL create in-app notification records (stored in the notifications table in RDS) for the following events: critical laboratory result, transfer access request received, transfer request approved or denied, ETL job completion, staff account creation, and new appointment created or cancelled. | In-app notifications ensure users are informed without leaving the platform. |
| **REQ-F-065** | **High** | The frontend SHALL poll GET /notifications every 15 seconds to check for unread notifications. The API SHALL return only unread notifications for the authenticated user. Each notification returned SHALL be marked as delivered in the database. | Client-side polling is the MVP-appropriate mechanism for in-app notifications, as it requires no WebSocket infrastructure. |
| **REQ-F-066** | **High** | For critical laboratory result events, the system SHALL also send an SES email to the attending clinician and the relevant ward head nurse (or Hospital Admin if no ward head nurse is assigned) within 60 seconds of result submission. | Email ensures delivery even if the clinician is not actively using the application. |
| **REQ-F-067** | **Medium** | Hospital Admins SHALL receive a daily summary SES email at 08:00 WAT (UTC+1) listing the previous day's key statistics: total encounters, new patient registrations, pending unresolved critical laboratory results, and upcoming appointment count. | Daily summaries support proactive facility management. Timezone is now explicitly WAT/UTC+1, resolving the ambiguity in SRS v1.0. |

### 3.2.13  Clinical Audit Trail

This section addresses the critical gap identified in SRS v1.0 analysis: AWS CloudTrail logs only infrastructure-level API calls, not application-level clinical data access. A separate application audit log is required to satisfy Cameroon Data Protection Law No. 2010/012 compliance.

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-F-068** | **High** | Every Lambda function that reads or modifies patient data SHALL write an entry to the application_audit_log table in RDS. Each entry SHALL capture: log_id (PK), user_id (FK), hospital_id (FK), patient_id (FK, nullable for non-patient actions), action_type (READ / CREATE / UPDATE / AMEND / DELETE / TRANSFER_GRANT / TRANSFER_REVOKE / CONSENT_CHANGE), resource_type, resource_id, timestamp (WAT), and ip_address. | Creates a complete, queryable clinical audit trail at the application level. This is separate from CloudTrail (which records AWS API actions) and is the mechanism that satisfies Cameroon Data Protection Law audit requirements. |
| **REQ-F-069** | **High** | The Hospital Admin SHALL view the clinical audit log for their facility through a filtered interface, searchable by patient, staff member, action type, and date range. | Enables administrators to investigate data access or dispute claims. |
| **REQ-F-070** | **High** | Entries in the application_audit_log table SHALL be immutable. No Lambda function SHALL have permission to UPDATE or DELETE rows in this table. The table's IAM policy SHALL restrict it to INSERT and SELECT operations only. | Guarantees the audit trail cannot be tampered with. |
| **REQ-F-071** | **Medium** | AWS CloudTrail SHALL remain enabled for all AWS API calls, with logs stored in a dedicated, versioned, write-protected S3 bucket with a minimum 2-year retention period. CloudTrail serves as the infrastructure-level audit trail complementing the application-level audit log. | Provides an immutable trail for forensic investigation of infrastructure-level events. |

## 3.3  Non-Functional Requirements

### 3.3.1  Performance Requirements

Performance benchmarks apply under normal operating conditions: up to 200 concurrent authenticated users across all registered hospital facilities.

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-NF-001** | **High** | The API Gateway SHALL return a response from any Lambda function within 3 seconds for 95% of all requests. | Clinical staff cannot wait for slow responses at point of care. |
| **REQ-NF-002** | **High** | Patient search queries using the pg_trgm GIN index SHALL return the first page of results (up to 20 records) within 500 milliseconds for databases containing up to 500,000 patient records. The GIN index on (full_name, date_of_birth) SHALL be created as part of the initial database migration. | Fast search is critical at busy hospital reception desks. The index is now explicitly specified, making this performance target achievable. |
| **REQ-NF-003** | **High** | Dashboard queries served from PostgreSQL materialized views SHALL return results within 500 milliseconds on a warm database. The materialized views SHALL be refreshed on a schedule no less frequent than every 5 minutes during business hours (06:00–22:00 WAT). | Dashboard responsiveness directly affects user adoption. |
| **REQ-NF-004** | **High** | The system SHALL support a minimum of 200 concurrent authenticated users without degradation beyond the limits in REQ-NF-001. | Multiple hospitals using the system simultaneously during peak hours. |
| **REQ-NF-005** | **Medium** | Lambda functions SHALL be configured with provisioned concurrency for the patient-service and analytics-service to eliminate cold start latency during peak hours. | Cold starts add 1–3 seconds of latency on first invocation after idle periods. |
| **REQ-NF-006** | **Medium** | Bulk CSV ETL jobs SHALL process at a rate of no less than 500 records per minute. A file containing 10,000 records SHALL complete within 25 minutes. | Hospital onboarding with large historical datasets must complete within a working session. |

### 3.3.2  Security and Privacy Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-NF-007** | **High** | All patient data stored in Amazon RDS and Amazon S3 SHALL be encrypted at rest using AES-256 encryption. **MVP:** AWS managed encryption keys (aws/rds, aws/s3, aws/secretsmanager) are used — AES-256 is fully applied at no additional cost. **Production:** AWS KMS Customer Managed Keys (CMKs) SHALL be used to satisfy Cameroon Data Protection Law audit requirements for key policy control. | Mandatory for Cameroon Data Protection Law No. 2010/012 compliance. AES-256 at rest is achieved in both configurations. |
| **REQ-NF-008** | **High** | All data transmitted between the client browser and the API SHALL be encrypted using TLS 1.3. Connections using TLS 1.2 or lower SHALL be rejected. **MVP compensating control:** TLS 1.3 minimum is enforced by API Gateway HTTP API security policy. WAF TLS enforcement is a production enhancement. (Note: all references to TLS in this document refer to TLS 1.3 as the minimum, resolving the TLS version inconsistency identified in SRS v1.0.) | TLS 1.3 is the current standard. |
| **REQ-NF-009** | **High** | No database credentials, API keys, or authentication secrets SHALL be stored in application source code, environment variables, or deployment packages. RDS database access SHALL use IAM database authentication tokens generated at runtime by the Lambda execution role — no database password is stored or transmitted at any point. API and infrastructure secrets (e.g., GitHub OAuth token for the CI/CD pipeline) SHALL be stored in AWS Secrets Manager and accessed at CDK deploy time only; no VPC-bound Lambda calls Secrets Manager at runtime. | Hardcoded credentials are the most common cause of cloud data breaches. IAM DB auth is more secure than password-based access: tokens are short-lived (15 minutes) and auto-rotate. |
| **REQ-NF-010** | **High** | AWS WAF SHALL be configured with the AWS Managed Rules Common Rule Set to block OWASP Top 10 attack vectors including SQL injection, XSS, and HTTP flood attacks. **MVP status: Deferred to production.** MVP compensating controls: (a) API Gateway HTTP API usage plan throttling limits HTTP flood vectors; (b) Cognito JWT RS256 authorisation on every request blocks unauthenticated SQL injection; (c) parameterised queries in all Lambda functions prevent SQL injection at the application layer. WAF is a go-live P0 security hardening requirement before real hospital use. | Provides baseline protection against the most prevalent web threats. |
| **REQ-NF-011** | **High** | Every Lambda function SHALL validate the JWT token and check the user's permissions against the RDS permissions table before processing any business logic. | Prevents any endpoint from being called without verified authorisation. |
| **REQ-NF-012** | **High** | User account passwords SHALL be stored exclusively in Amazon Cognito using Cognito's built-in secure password hashing. The application layer SHALL never handle or store plaintext passwords. | Password security is delegated entirely to Cognito's battle-tested implementation. |
| **REQ-NF-013** | **High** | The Amazon RDS instance SHALL reside in a VPC private subnet with no public IP address. RDS accepts inbound connections on port 5432 exclusively from the Lambda security group. **MVP configuration:** auth-service Lambda is deployed without VPC attachment (no RDS access needed; calls only Cognito over the internet). Nine Lambda functions reside in VPC private isolated subnets; Lambda SG restricts outbound to port 5432 to RDS SG only, and port 443 to VPC CIDR only (for the SNS VPC Interface Endpoint). One SNS VPC Interface Endpoint (~$7.20/month) serves Lambdas that publish events from within the VPC. RDS remains in the private subnet and is unreachable from the internet. | Eliminates direct internet access to the database layer regardless of Lambda subnet placement. |
| **REQ-NF-014** | **Medium** | KMS Customer Managed Keys SHALL be rotated automatically on an annual basis. **MVP status: Not applicable** — AWS managed keys are used for MVP and managed automatically by AWS. CMK rotation is a production P1 requirement when KMS CMKs are introduced. | Key rotation limits the impact of key compromise. |
| **REQ-NF-015** | **Medium** | Ministry-level dashboards and cross-hospital aggregate reports SHALL display only anonymised, de-identified data. No individual patient names, identifiers, or contact details SHALL appear in these views. | Protects patient privacy in public health reporting contexts. |

### 3.3.3  Reliability and Availability Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-NF-016** | **High** | The system SHALL achieve a minimum uptime of 99.5% measured on a monthly basis, excluding scheduled maintenance windows. | Hospital information systems must be consistently available during working hours. |
| **REQ-NF-017** | **High** | Automated RDS database snapshots SHALL be taken daily and retained for a minimum of 30 days. Point-in-time recovery SHALL be enabled. This is the primary recovery mechanism. **MVP configuration:** Backup retention is set to 2 days for cost management (RDS backup storage is charged beyond the instance storage size). The CDK parameter is annotated with the production target of 30 days and can be changed in a single configuration update. | Provides a recovery path in the event of data corruption or accidental deletion. |
| **REQ-NF-018** | **Medium** | Amazon RDS SHOULD be configured with Multi-AZ deployment for production deployment after the MVP phase. For the academic MVP, single-AZ with daily snapshots (REQ-NF-017) is the accepted configuration. This resolves the MVP vs. Multi-AZ contradiction in SRS v1.0. | Multi-AZ doubles RDS cost and is not cost-effective for an academic MVP. |
| **REQ-NF-019** | **Medium** | CloudWatch alarms SHALL notify the system administrator via SNS within 5 minutes of any Lambda function error rate exceeding 5 errors per minute or any RDS CPU utilisation exceeding 80% for more than 5 consecutive minutes. | Early warning enables preventive intervention. |

### 3.3.4  Scalability Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-NF-020** | **High** | The system SHALL scale horizontally and automatically. AWS Lambda SHALL scale from 0 to a minimum of 500 concurrent executions in response to demand. | Serverless architecture must handle unpredictable load spikes. |
| **REQ-NF-021** | **High** | The RDS PostgreSQL instance SHALL support a minimum of 200 concurrent database connections. Lambda concurrency SHALL be capped at 200 to prevent connection exhaustion without requiring RDS Proxy. | Lambda's scale-out behaviour can overwhelm a database's connection limit. For 200 users, capping concurrency at 200 is the cost-effective solution vs. RDS Proxy. |
| **REQ-NF-022** | **Medium** | The system architecture SHALL support addition of new hospital tenants without modification to application code or database schema. New tenants are isolated via hospital_id in all queries. | A multi-tenant SaaS model must scale through configuration, not code changes. |

### 3.3.5  Maintainability Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-NF-023** | **High** | Each Lambda function SHALL be deployed independently via a CI/CD pipeline. Deploying an update to one function SHALL NOT require redeployment of any other function. | Independent deployability is the core benefit of a microservices architecture. |
| **REQ-NF-024** | **High** | All Lambda functions SHALL emit structured JSON logs to CloudWatch Logs. Each log entry SHALL include: function name, request ID, user ID, hospital ID, timestamp (WAT), log level, and message. | Structured logs enable automated search, filtering, and alerting. |
| **REQ-NF-025** | **Medium** | All application source code SHALL be maintained in a Git repository with separate branches for development, staging, and production environments. | Version control and environment separation are fundamental software engineering practices. |
| **REQ-NF-026** | **Medium** | The database schema SHALL use versioned migrations managed by a migration tool. No schema change SHALL be applied to a production database without a corresponding migration script. | Versioned migrations enable rollback in the event of a failed deployment. |

### 3.3.6  Usability Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-NF-027** | **High** | A newly onboarded hospital staff member with basic computer literacy (ability to use a web browser and complete online forms) SHALL be able to register a patient, create an encounter, and enter a laboratory result in a structured usability test session, with task completion rates above 80% and an average task completion time under 5 minutes per task, without formal training. | The v1.0 requirement ("30 minutes without training") was not objectively measurable. This version specifies a measurable usability test protocol: task completion rate and task time. |
| **REQ-NF-028** | **Medium** | All destructive actions SHALL require a two-step confirmation dialog (already specified in UI-010). | Prevents accidental permanent data loss. |
| **REQ-NF-029** | **Medium** | The system SHALL provide contextual help tooltips on all non-obvious form fields (already specified in UI-011). | Reduces user errors and support requests. |

### 3.3.7  Portability Requirements

| **Req. ID** | **Priority** | **Description** | **Rationale** |
| --- | --- | --- | --- |
| **REQ-NF-030** | **High** | The frontend web application SHALL function correctly on Google Chrome 90+, Firefox 88+, Microsoft Edge 90+, and Safari 14+. | Hospital facilities use a variety of browser versions. |
| **REQ-NF-031** | **Medium** | The backend Lambda functions SHALL be implemented such that cloud provider-specific calls (AWS SDK calls) are isolated in dedicated service adapter modules, separate from business logic. | Isolating cloud dependencies reduces vendor lock-in in future versions. |

---

# CHAPTER 4 — APPENDICES

## Appendix A — Glossary of Terms

| **Term** | **Definition** |
| --- | --- |
| **API Gateway** | A managed AWS service that acts as the single HTTPS entry point for all backend Lambda functions. |
| **application_audit_log** | The RDS database table that records every application-level patient data access and modification event. Distinct from CloudTrail. |
| **AWS Lambda** | Serverless compute service that runs backend business logic on demand without dedicated server management. |
| **CloudFront** | AWS CDN service. In this system, CloudFront is provisioned and managed internally by AWS Amplify Hosting and is not a separately configured service. |
| **CloudTrail** | AWS service that records all AWS API calls (infrastructure-level audit). Does NOT record application-level clinical data access — that is handled by the application_audit_log. |
| **CRUD** | Create, Read, Update, Delete — the four fundamental database operations. |
| **EHR / EMR** | Electronic Health Record / Electronic Medical Record — a digital version of a patient's paper chart. |
| **ETL** | Extract, Transform, Load — the data pipeline process handled by the bulk-ingestion Lambda function. |
| **FHIR** | Fast Healthcare Interoperability Resources — international standard for exchanging healthcare information. |
| **GIN Index** | Generalised Inverted Index — a PostgreSQL index type required for pg_trgm trigram similarity searches. Used for patient name and fuzzy matching queries. |
| **ICD-10** | International Classification of Diseases, 10th Revision — classification system for diagnoses. |
| **JWT** | JSON Web Token — a compact, digitally signed token used to transmit authentication claims. |
| **KMS** | AWS Key Management Service — manages cryptographic keys for data encryption. |
| **Materialized View** | A PostgreSQL database object that stores the result of a query as a physical table and can be refreshed on a schedule. Used for dashboard analytics instead of ElastiCache. |
| **pg_trgm** | A PostgreSQL extension that enables trigram-based string similarity matching. Used for patient name deduplication and fuzzy search. |
| **RBAC** | Role-Based Access Control — model where access to resources is determined by the user's assigned role. |
| **RDS** | Amazon Relational Database Service — managed cloud database hosting PostgreSQL. |
| **SES** | Amazon Simple Email Service — managed email delivery service for transactional emails. |
| **SNS** | Amazon Simple Notification Service — used as an internal event bus in this system. |
| **TLS** | Transport Layer Security — cryptographic protocol for secure communication. Minimum version in this system: TLS 1.3. |
| **VPC** | Virtual Private Cloud — logically isolated AWS network used to host private resources (RDS, Lambda). |
| **WAF** | Web Application Firewall — filters and monitors HTTP requests to protect against OWASP Top 10 attacks. |
| **WAT** | West Africa Time (UTC+1) — Cameroon's local timezone. All timestamps and scheduled operations in this system use WAT. |

## Appendix B — Diagram Placeholders

The following diagrams are to be inserted once finalised in Lucidchart. Export each diagram as a PNG or PDF and paste into the indicated spaces below.

### B.1  System Context Diagram

(Already placed in Section 2.1.2 above)

### B.2  Use Case Diagrams (M1–M9)

| **M1 — Authentication & Access Control — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M2 — Hospital Onboarding — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M3 — Staff Management & RBAC — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M4 — Patient Record Management — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M5 — Clinical Encounter — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M6 — Laboratory Results Management — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M7 — Bulk Data Ingestion — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M8 — Patient Transfer Workflow — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M9 — Analytics, Visualisation & Notifications — Use Case Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

### B.3  ER Diagrams (M1–M9)

| **M1 — Authentication & Access Control — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M2 — Hospital Onboarding — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M3 — Staff Management & RBAC — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M4 — Patient Record Management — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M5 — Clinical Encounter — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M6 — Laboratory Results Management — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M7 — Bulk Data Ingestion — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M8 — Patient Transfer Workflow — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

| **M9 — Analytics, Visualisation & Notifications — ER Diagram** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

### B.4  AWS Architecture Diagram

| **Scalable Cloud-Based Healthcare Architecture (AWS) — Revised v2.0** |
| --- |
| [Insert diagram here — copy and paste from Lucidchart export] |
|  |
|  |

## Appendix C — Requirements Traceability Matrix

| **System Function** | **Requirement Identifiers** |
| --- | --- |
| **Hospital Onboarding & Account Management** | REQ-F-001, REQ-F-002, REQ-F-003, REQ-F-004, REQ-F-005, REQ-F-006, REQ-F-007 |
| **Staff Management & RBAC** | REQ-F-008, REQ-F-009, REQ-F-010, REQ-F-011, REQ-F-012, REQ-F-013, REQ-F-014 |
| **Patient Consent Management** | REQ-F-015, REQ-F-016, REQ-F-017, REQ-F-018 |
| **Patient Registration & Record Management** | REQ-F-019, REQ-F-020, REQ-F-021, REQ-F-022, REQ-F-023, REQ-F-024 |
| **Clinical Record Amendment** | REQ-F-025, REQ-F-026, REQ-F-027, REQ-F-028 |
| **Appointment Scheduling** | REQ-F-029, REQ-F-030, REQ-F-031, REQ-F-032, REQ-F-033 |
| **Clinical Encounter Management** | REQ-F-034, REQ-F-035, REQ-F-036, REQ-F-037, REQ-F-038 |
| **Laboratory Result Management** | REQ-F-039, REQ-F-040, REQ-F-041, REQ-F-042, REQ-F-043 |
| **Bulk Data Ingestion** | REQ-F-044, REQ-F-045, REQ-F-046, REQ-F-047, REQ-F-048 |
| **Cross-Hospital Patient Transfer** | REQ-F-049, REQ-F-050, REQ-F-051, REQ-F-052, REQ-F-053, REQ-F-054, REQ-F-055, REQ-F-056, REQ-F-057 |
| **Analytics & Visualisation Dashboard** | REQ-F-058, REQ-F-059, REQ-F-060, REQ-F-061, REQ-F-062, REQ-F-063 |
| **Notification & Alerting** | REQ-F-064, REQ-F-065, REQ-F-066, REQ-F-067 |
| **Clinical Audit Trail** | REQ-F-068, REQ-F-069, REQ-F-070, REQ-F-071 |
| **User Interface** | UI-001 through UI-011 |
| **Hardware Interface** | HW-001, HW-002, HW-003 |
| **Communication Interface** | COM-001, COM-002, COM-003, COM-004 |
| **Performance** | REQ-NF-001 through REQ-NF-006 |
| **Security & Privacy** | REQ-NF-007 through REQ-NF-015 |
| **Reliability & Availability** | REQ-NF-016 through REQ-NF-019 |
| **Scalability** | REQ-NF-020, REQ-NF-021, REQ-NF-022 |
| **Maintainability** | REQ-NF-023, REQ-NF-024, REQ-NF-025, REQ-NF-026 |
| **Usability** | REQ-NF-027, REQ-NF-028, REQ-NF-029 |
| **Portability** | REQ-NF-030, REQ-NF-031 |

## Appendix D — Gap Resolution Summary (SRS v1.0 → v2.0)

The following table documents how each gap identified in the SRS v1.0 requirements analysis has been resolved in this version.

| **Gap ID** | **Severity** | **Gap Description (Summary)** | **Resolution in SRS v2.0** |
| --- | --- | --- | --- |
| **G-01** | **CRITICAL** | No token refresh requirement. | COM-003 updated: silent token refresh using Cognito Refresh Token specified. UI-008 updated: system attempts refresh before redirecting to login. |
| **G-02** | **CRITICAL** | CloudTrail does not record clinical data access. | New module REQ-F-068 to REQ-F-071 defines the application_audit_log table in RDS. Distinction between CloudTrail (infrastructure) and application audit (clinical) is explicit. |
| **G-03** | **HIGH** | No patient consent requirement. | New module Section 3.2.3 (REQ-F-015 to REQ-F-018) defines consent capture, display, enforcement, and update. UI-009 enforces consent at the UI level. |
| **G-04** | **HIGH** | No clinical record amendment/versioning requirement. | New module Section 3.2.5 (REQ-F-025 to REQ-F-028) defines the versioned amendment policy. Overwrites are explicitly prohibited. |
| **G-05** | **HIGH** | Attending clinician and ward head nurse not identified for critical alerts. | REQ-F-034: encounter is linked to attending clinician (staff_id FK). REQ-F-041: critical alert routes to encounter.staff_id. Ward Head Nurse defined as a role attribute in REQ-F-010. Fallback to Hospital Admin specified. |
| **G-06** | **HIGH** | No grant expiry notification or renewal flow. | REQ-F-054: 24-hour expiry warning notification via in-app and SES email. REQ-F-055: visible expiry indicator. REQ-F-056: renewal request workflow. |
| **G-07** | **HIGH** | In-app notification mechanism not specified. | Section 3.1.3: in-app notifications delivered via client-side polling (GET /notifications every 15 seconds) backed by notifications table in RDS. REQ-F-064 and REQ-F-065 specify the mechanism. |
| **G-08** | **HIGH** | No hospital email verification or Super Admin approval. | REQ-F-002: email verification via one-time link. REQ-F-003: Super Admin review and approval before hospital activation. |
| **G-09** | **MEDIUM** | Appointment scheduling stated as Receptionist activity but no requirements. | New module Section 3.2.6 (REQ-F-029 to REQ-F-033) defines appointment creation, conflict checking, calendar view, cancellation, and clinician notification. |
| **G-10** | **MEDIUM** | Bulk ETL duplicate resolution logic undefined. | REQ-F-046 defines the explicit duplicate resolution strategy for bulk ingestion: same pg_trgm 0.85 threshold as REQ-F-020, with skip + log for duplicates, insert for new, and failed rows logged with errors. |
| **G-11** | **MEDIUM** | GIN index not specified — 500 ms search target may be unachievable. | REQ-F-022 and REQ-NF-002 explicitly specify the pg_trgm GIN index on (full_name, date_of_birth) as a database migration requirement. |
| **G-12** | **MEDIUM** | Regional distribution maps required data not captured. | REQ-F-019: region/district added as a mandatory field in patient registration. REQ-F-001: region/district added to hospital onboarding. REQ-F-061: filter by region/district added to analytics. |
| **G-13** | **LOW** | TLS version inconsistency (scope said 1.3, requirements said 1.2+). | COM-001 and REQ-NF-008 updated to specify TLS 1.3 as the minimum. All references are now consistent. Glossary updated to note TLS 1.3 as the minimum. |
| **G-14** | **LOW** | Pharmacist role defined but no module or permissions exist. | REQ-F-009: Pharmacist explicitly removed from default role list with a note that it is reserved for a future Pharmacy module. Section 1.4.2 (Out of Scope) updated to include Pharmacy dispensing management. |

---

*End of HIS Software Requirements Specification v2.0*

*University of Buea — Faculty of Engineering and Technology — Department of Computer Engineering*
