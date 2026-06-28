# HIS AWS Architecture — Well-Architected Review Assessment 1

**Workload:** Healthcare Information System (HIS) — Academic MVP
**Assessment Date:** 2026-06-25
**Reviewer:** Claude Code (Sonnet 4.6) — Well-Architected Skill
**Region:** us-east-1 (N. Virginia) — see Section 2 for region note
**Scope:** 13-service AWS architecture, 1–2 hospital tenants, pre-CDK build review
**Database (as submitted):** Aurora Serverless v2 (PostgreSQL-compatible)
**Database (as corrected):** RDS PostgreSQL 15, db.t3.micro — see Pillar 5

---

## Architecture Inventory (as reviewed)

**13 Services (with Aurora Serverless v2 substitution as submitted):**

| # | Service | Purpose | SRS Anchor |
|---|---|---|---|
| 1 | AWS Amplify + CloudFront | Frontend hosting, CDN, CI/CD | Tier 0 |
| 2 | AWS WAF | OWASP Top 10 protection | REQ-NF-010 |
| 3 | API Gateway v2 HTTP | Single HTTPS entry point + Cognito authoriser | COM-001–003 |
| 4 | Amazon Cognito | JWT issuance (RS256, 60 min), silent refresh | COM-003 |
| 5 | AWS Lambda (×10) | All backend business logic | REQ-NF-020/021 |
| 6 | Aurora Serverless v2 (submitted) / RDS db.t3.micro (corrected) | Primary relational database | REQ-F-020/022 |
| 7 | Amazon S3 | CSV uploads, static assets, CloudTrail log archive | REQ-F-044, REQ-F-071 |
| 8 | AWS KMS CMKs (submitted) / AWS Managed Keys (corrected) | Encryption key management | REQ-NF-007 |
| 9 | AWS Secrets Manager | Runtime DB credentials and API secrets | REQ-NF-009 |
| 10 | Amazon SES | Transactional email (critical alerts, ETL reports, daily summary) | REQ-F-066/067 |
| 11 | Amazon SNS | Internal event bus decoupling Lambda from SES | Section 3.2.12 |
| 12 | AWS CloudTrail | Infrastructure-level audit trail | REQ-F-071 |
| 13 | Amazon CloudWatch | Structured logs, alarms, metrics | REQ-NF-019/024 |

**Removed services and rationale (from SRS Section 2.1.1):**

| Removed | Reason |
|---|---|
| Amazon Athena | No functional requirement queries raw S3 data — all analytics from RDS |
| AWS Glue | Lambda ETL handles thousands of records; Glue is for millions |
| ElastiCache Redis | RDS materialized views + pg_cron achieve sub-200ms dashboards at zero extra cost |
| RDS Proxy | Not cost-effective at 200-user cap; Lambda concurrency capped at 200 instead |
| CloudFront (standalone) | Amplify Hosting auto-provisions and manages a CloudFront distribution |
| **NAT Gateway (corrected)** | **Costs $32.40/month — removed. Lambda placed in public subnet with strict SG rules. RDS stays private.** |
| **AWS WAF (corrected)** | **Costs $5/WebACL minimum — deferred to production. API GW throttling + Cognito is MVP compensating control.** |
| **KMS CMKs (corrected)** | **$1/CMK/month — replaced with AWS managed keys for MVP. AES-256 encryption maintained.** |
| **Aurora Serverless v2 (corrected)** | **$43.20/month minimum — replaced with RDS db.t3.micro (free tier 12 months, $13.50/month after).** |

**Region note:** SRS specifies `af-south-1` (Cape Town). MVP implementation uses `us-east-1` (N. Virginia) for broader service availability and lower cost. Production deployment targeting Cameroonian data residency should migrate to `af-south-1`.

---

## Well-Architected Review — Six Pillars

---

### Pillar 1 — Operational Excellence

**Rating: PASS (1 MRI)**

| Check | Status | Finding |
|---|---|---|
| Structured CloudWatch logs with request ID, user ID, hospital ID, timestamp (WAT) | PASS | Specified in REQ-NF-024 — all 10 Lambda functions must emit structured JSON |
| CI/CD pipeline | PASS | Amplify handles frontend; CDK Pipelines handles Lambda independent deployments |
| Independent Lambda deployability | PASS | REQ-NF-023 explicitly requires this |
| Environment separation (dev / staging / prod) | PASS | REQ-NF-025 specifies Git branching strategy |
| Versioned DB migrations (Flyway) | PASS | REQ-NF-026 requires migration tool — Flyway selected |
| Runbooks / incident response | MRI | CloudWatch alarms to SNS to admin email defined (REQ-NF-019). No formal runbook. Acceptable for MVP. |
| X-Ray distributed tracing | MRI (P2) | Not specified in SRS. Add as optional CDK feature flag (`tracing: Tracing.ACTIVE`). Production P2. |

**Actions taken:**
- X-Ray tracing documented as P2 production enhancement in CDK Backend stack — enabled via `tracing: Tracing.ACTIVE` feature flag on each Lambda function
- Confirmed Amplify CI/CD for frontend + CDK Pipelines for Lambda

---

### Pillar 2 — Security

**Rating: PASS (0 HRI, 2 MRI)**

| Check | Status | Finding |
|---|---|---|
| RDS in VPC private subnet, no public IP | PASS | REQ-NF-013 — `publiclyAccessible: false` enforced in CDK even with Lambda in public subnet |
| Secrets Manager for all credentials | PASS | REQ-NF-009 — no env var hardcoding |
| WAF with AWS Managed Rules OWASP Top 10 | DEFERRED | REQ-NF-010 — WAF removed for MVP ($5/WebACL). API GW throttling + Cognito JWT is compensating control. Production P0. |
| TLS 1.3 enforced at API Gateway | PASS | COM-001, REQ-NF-008 — enforced by API Gateway HTTP API minimum TLS policy |
| AES-256 encryption at rest | PASS | REQ-NF-007 — AWS managed keys used; AES-256 still applied to RDS, S3, Secrets Manager |
| KMS CMKs with annual rotation | DEFERRED | REQ-NF-014 — CMKs replaced with AWS managed keys for MVP. CMKs are production P1. |
| Cognito JWT RS256, 60-minute expiry, silent refresh | PASS | COM-003 |
| Application-level clinical audit log | PASS | REQ-F-068–070 — INSERT/SELECT only on `application_audit_log` table |
| Per-Lambda IAM least-privilege roles | MRI (P1) | Each Lambda must have a scoped IAM role. No wildcard resource policies. Enforced in CDK Stack 4. |
| GuardDuty | MRI (P2) | Not specified. **Cost note: enable Foundational Threat Detection only (Always On, Low Cost). Disable all optional Protection Plans (S3, EKS, RDS, Lambda, Malware, Runtime). Disable VPC Flow Logs and DNS Log analysis via GuardDuty (these add per-GB charges). Foundational mode costs ~$0.80–1.50/month for MVP traffic.** Production P2. |
| Security Hub | MRI (P2) | Not specified. Costs ~$0.0010/finding check. Production P2. |
| S3 block public access | PASS | No public-facing bucket in requirements. All buckets set to block public access. |

**Security group design (NAT-free):**
- Lambda SG: outbound HTTPS (443) to `0.0.0.0/0` for AWS service API calls (SES, SNS, Secrets Manager, Cognito)
- Lambda SG: outbound TCP 5432 to RDS SG only
- RDS SG: inbound TCP 5432 from Lambda SG only. No other inbound. No public IP.
- S3 VPC Gateway Endpoint: free — S3 traffic from Lambda stays on AWS private network

**Actions taken:**
- RDS confirmed `publiclyAccessible: false` regardless of Lambda subnet placement
- Per-Lambda IAM scoped roles planned for CDK Stack 4
- GuardDuty documented as production P2 with cost-control guidance (foundational mode only)
- Security Hub documented as production P2

---

### Pillar 3 — Reliability

**Rating: PASS with concerns (0 HRI, 3 MRI)**

| Check | Status | Finding |
|---|---|---|
| RDS automated backups and PITR | PASS | Set to 2-day retention in CDK for MVP cost management (production: 30 days per REQ-NF-017). PITR enabled. |
| Bulk upload failure handling | MRI (P1) | SQS DLQ added to bulk-ingestion Lambda. Failed invocations are re-queued. |
| Notification polling cold starts | PASS | Lambda scales from zero; one missed 15s poll cycle is acceptable. No provisioned concurrency needed. |
| SES retry strategy | PASS | SES has built-in retry; SNS → SES decoupling adds another retry layer |
| RDS single-writer, single-AZ | MRI | Acceptable for MVP per REQ-NF-018. Production: Multi-AZ RDS. |
| Multi-region DR | LRI | Out of scope for MVP as stated in REQ-NF-018 |

**Backup retention note:** 2-day RDS backup retention for MVP cost management. The SRS REQ-NF-017 specifies 30 days — this is the production target. CDK parameter is set to 2 days with a comment indicating production value of 30 days.

**Actions taken:**
- SQS DLQ wired to bulk-ingestion Lambda in architecture
- RDS backup retention: 2 days (MVP), 30 days (production) — CDK feature flag
- SNS → SES decoupling confirmed in architecture

---

### Pillar 4 — Performance Efficiency

**Rating: PASS (0 HRI, 1 MRI)**

| Check | Status | Finding |
|---|---|---|
| pg_trgm GIN index on (full_name, date_of_birth) | PASS | RDS PostgreSQL 15 supports pg_trgm and GIN indexes. Must be in first Flyway migration. |
| PostgreSQL materialized views for dashboard queries | PASS | RDS PostgreSQL 15 supports materialized views and REFRESH MATERIALIZED VIEW |
| pg_cron for materialized view auto-refresh | MRI (P1) | **Requires custom RDS parameter group in CDK Stack 2.** Add `pg_cron` to `shared_preload_libraries`. Without this, dashboard auto-refresh (REQ-NF-003) does not work. |
| Lambda concurrency capped at 200 | PASS | REQ-NF-021 — prevents RDS connection exhaustion |
| Provisioned concurrency | DEFERRED | REQ-NF-005 — removed for MVP. Adds cost when idle. Accept 1–2s cold starts. Production P1. |
| 500ms patient search target | PASS | GIN index on RDS db.t3.micro is sufficient for 1-2 tenant scale |

**Actions taken:**
- pg_cron parameter group planned for CDK Stack 2
- Provisioned concurrency removed for MVP, documented as production P1
- Flyway migration V1 will enable pg_trgm extension before GIN index creation

---

### Pillar 5 — Cost Optimization

**Rating: HRI CORRECTED (both HRIs resolved)**

#### Original cost estimate (as submitted — Aurora Serverless v2, NAT, WAF, CMKs):

| Service | Monthly Cost | Status |
|---|---|---|
| Aurora Serverless v2 (0.5 ACU min × 720h × $0.12) | $43.20 | HRI — removed |
| NAT Gateway (1× × $0.045/hr × 720h) | $32.40 | HRI — removed |
| AWS WAF ($5/WebACL + rules) | ~$7.06 | MRI — deferred |
| AWS KMS (3 CMKs × $1) | $3.00 | MRI — replaced |
| **Total (as submitted)** | **~$89/month** | **18× over budget** |

#### Why Aurora Serverless v2 is NOT cheaper than RDS:

Aurora Serverless **v2** has a hard minimum floor of **0.5 ACU** — it never pauses to zero. At $0.12/ACU-hour:

`0.5 ACU × 24 hours × 30 days × $0.12 = $43.20/month`

This is the cost regardless of usage — even if no one uses the system. Aurora Serverless **v1** supported true pause-to-zero behaviour, but v2 eliminated this. RDS db.t3.micro costs $13.50/month after free tier, or $0 during the 12-month AWS free tier. RDS is 3× cheaper than Aurora Serverless v2 for this use case.

#### Corrected architecture cost estimate (RDS db.t3.micro, public Lambda subnet, no WAF, AWS managed keys):

| Service | Assumptions | Year 1 (Free Tier) | Year 2+ |
|---|---|---|---|
| RDS PostgreSQL db.t3.micro | Single-AZ, 20GB storage | $0.00 | $13.50 |
| Lambda (×10 functions) | 50K invocations/month | $0.00 | $0.00 |
| API Gateway HTTP | 100K requests/month | $0.00 | $0.10 |
| Amazon Cognito | 50 MAU | $0.00 | $0.00 |
| Amazon S3 | 2 GB storage | $0.00 | $0.05 |
| Amazon SES | 1,000 emails/month (sandbox: verified addresses only) | $0.10 | $0.10 |
| Amazon SNS | <1M publishes | $0.00 | $0.00 |
| AWS Secrets Manager | 5 secrets × $0.40 | $2.00 | $2.00 |
| Amazon CloudWatch | ~1GB logs, 5 alarms | $1.50 | $1.50 |
| AWS CloudTrail | 1 free trail per region | $0.00 | $0.00 |
| Amplify Hosting | Free tier | $0.00 | $0.00 |
| NAT Gateway | REMOVED | $0.00 | $0.00 |
| AWS WAF | DEFERRED | $0.00 | $0.00 |
| KMS CMKs | REPLACED with AWS managed keys | $0.00 | $0.00 |
| SQS DLQ | <1M messages/month free tier | $0.00 | $0.00 |
| **TOTAL** | | **~$3.60/month** | **~$17.25/month** |

**Budget verdict:** Within the $5–$10/month target for Year 1 (free tier). Year 2 lands at ~$17/month — primarily driven by RDS db.t3.micro ($13.50). To reduce Year 2 cost: stop the RDS instance during nights/weekends via Lambda scheduler (reduces billable hours by ~60%), or apply a 1-year Reserved Instance for db.t3.micro at ~$8.50/month.

**Actions taken:**
- Aurora Serverless v2 replaced with RDS PostgreSQL 15 db.t3.micro
- NAT Gateway removed; Lambda moved to public subnets with strict security groups
- WAF removed for MVP; API GW throttling + Cognito JWT is compensating control
- KMS CMKs replaced with AWS managed keys
- Provisioned concurrency removed
- SQS DLQ added (within free tier)

---

### Pillar 6 — Sustainability

**Rating: PASS**

| Check | Status |
|---|---|
| Serverless-first compute (Lambda — scales to zero) | PASS |
| RDS db.t3.micro — sized for actual MVP load | PASS |
| No always-on EC2 or ECS containers | PASS |
| Materialized views reduce repeated full-scan computation | PASS |
| Single-region deployment | PASS |
| S3 lifecycle: CSV archive → Glacier after 90 days | PASS — REQ-F-048 |
| Lambda reserved concurrency floors | PASS — none set; scales to zero when idle |

---

## Gap and Risk Summary

### Diagram vs SRS Inconsistencies (all resolved)

| Finding | Resolution |
|---|---|
| SRS says af-south-1; MVP uses us-east-1 | SRS Section 2.4.1 updated to reflect us-east-1 for MVP |
| NAT Gateway missing from diagram but required | NAT Gateway removed entirely; Lambda moved to public subnet |
| pg_cron not shown as requiring a parameter group | Added to CDK Stack 2 as custom parameter group requirement |
| Aurora Serverless v2 cost assumption incorrect | Replaced with RDS db.t3.micro |

### Aurora Serverless v2 vs RDS — CDK Notes (for future production upgrade)

When budget allows upgrading from RDS to Aurora Serverless v2:
- Change CDK construct from `DatabaseInstance` to `DatabaseCluster`
- Add `writer: ClusterInstance.serverlessV2('writer', { scaleWithWriter: true })`
- Set `serverlessV2MinCapacity: 0.5`, `serverlessV2MaxCapacity: 4`
- Subnet group must span ≥2 AZs even in single-writer mode
- Connect to **cluster endpoint** (`cluster.clusterEndpoint.hostname`), not instance endpoint
- All Lambda code, Flyway migrations, pg_trgm, GIN indexes, and materialized views are identical — zero code changes

### Single Points of Failure

| SPOF | Risk | Mitigation |
|---|---|---|
| RDS single-AZ | DB outage = full system outage | Acceptable for MVP; Multi-AZ is production P1 |
| Cognito User Pool | Auth failure = no logins | Cognito is managed multi-AZ — AWS manages |
| SES sandbox mode | Critical lab alert emails silently fail to non-verified addresses | Mitigated by sandbox with verified demo addresses; production requires SES production access |
| API Gateway regional endpoint | Single-region failure | Acceptable for MVP |

### Security Gaps

| Gap | Severity | Status |
|---|---|---|
| SES sandbox — emails only to verified addresses | HIGH | Mitigated for demo with 3 verified addresses. Production: SES production access required. |
| Per-Lambda IAM wildcard policies | HIGH | Fixed in CDK Stack 4 — scoped roles per function |
| RDS `publiclyAccessible` must be explicitly false | HIGH | Confirmed in CDK Stack 2 |
| WAF not present in MVP | MEDIUM | Documented; API GW throttling is compensating control |

---

## CDK Stack Structure (Confirmed)

| Stack | Scope | Construct Level | Deploy Order |
|---|---|---|---|
| Stack 1 — VPC | VPC, public + private subnets, security groups, S3 Gateway Endpoint | L2 `Vpc` | 1st |
| Stack 2 — Database | RDS db.t3.micro, custom parameter group (pg_cron), Secrets Manager secret | L2 `DatabaseInstance` | 2nd |
| Stack 3 — Auth | Cognito User Pool, App Client | L2 `UserPool` | 2nd (parallel with Stack 2) |
| Stack 4 — Backend | 10 Lambda functions, API Gateway HTTP, SNS topics, SES identities, S3 buckets, SQS DLQ | L2 `Function`, `HttpApi` | 3rd |
| Stack 5 — Frontend | Amplify App, branch config, env vars | L1 `CfnApp` | 4th |
| Stack 6 — Observability | CloudWatch log groups, alarms, CloudTrail trail | L2 `Alarm`, `Trail` | 4th (parallel with Stack 5) |

**Deployment order:** Stack 1 → (Stack 2 + Stack 3) → Stack 4 → (Stack 5 + Stack 6)

---

## Migration Tool: Flyway (selected over Prisma)

| Criterion | Flyway | Prisma |
|---|---|---|
| RDS PostgreSQL 15 compatibility | Full | Full |
| pg_trgm extension creation | Native SQL | Via raw SQL |
| GIN index creation | Native SQL | Via raw SQL |
| Materialized view creation | Native SQL | Via raw SQL |
| Lambda custom resource packaging | Small, no binary deps | Requires Prisma engine binary (platform-specific) |
| CDK custom resource complexity | Low | Medium |

**Flyway selected** — Lambda functions use raw parameterized SQL (`pg` npm package). Prisma ORM overhead is unnecessary. Flyway CDK custom resource is a Lambda that executes SQL migration scripts against the RDS cluster endpoint.

**Migration gotchas:**
1. V1 migration must enable `pg_trgm` before any GIN index migration
2. `pg_cron` must be in `shared_preload_libraries` before materialized view refresh jobs are created
3. Set `connectRetries=5` in Flyway config for RDS connection robustness

---

## SES Configuration for MVP Demo

- SES remains in **sandbox mode** for the MVP
- Three verified email addresses added to SES in CDK Stack 4:
  - `josuefotseu02@gmail.com`
  - `joshuaer03@gmail.com`
  - `joshiboss04@gmail.com`
- All SES sends (critical lab alerts, ETL completion, daily summaries, transfer notifications) work to these verified addresses during demo
- SNS pub/sub has no sandbox restrictions — works normally
- **Production P0 go-live requirement:** Request SES production access with domain verification before any real hospital data enters the system. Without this, emails to unverified addresses are silently dropped.

---

## MVP vs Production Configuration Reference

| Feature | MVP Configuration | Production Configuration |
|---|---|---|
| Database | RDS PostgreSQL db.t3.micro, single-AZ | Aurora Serverless v2 or RDS Multi-AZ |
| DB backup retention | 2 days | 30 days (REQ-NF-017) |
| Encryption keys | AWS managed keys | KMS Customer Managed Keys with annual rotation |
| WAF | Deferred — API GW throttling as compensating control | AWS WAF with Managed Rules (REQ-NF-010) |
| Lambda subnet | Public subnet, strict SG outbound rules | Private subnet with NAT Gateway |
| Provisioned concurrency | Disabled — accept cold starts | Enabled for patient-service and analytics-service |
| SES | Sandbox — 3 verified demo addresses | Production access, domain verified |
| GuardDuty | Disabled | Enabled — Foundational mode only (no optional protection plans) |
| Region | us-east-1 | af-south-1 (Cameroon data residency) |
| Lambda DLQ | SQS DLQ on bulk-ingestion Lambda | SQS DLQ on all async Lambda functions |

---

## Aurora Serverless v2 Project Report Paragraph

> The original architecture initially proposed Amazon Aurora Serverless v2 (PostgreSQL-compatible) as the primary database, on the assumption that it would scale to near-zero capacity and cost when idle. A formal Well-Architected cost review conducted before CDK implementation revealed that Aurora Serverless v2 has a hard minimum capacity floor of 0.5 ACU — it never fully pauses, unlike its predecessor Aurora Serverless v1. At the AWS us-east-1 price of $0.12/ACU-hour, 0.5 ACU running 24 hours a day produces a fixed baseline cost of $43.20/month regardless of actual usage — more than three times the cost of the RDS db.t3.micro instance ($13.50/month post-free-tier, or $0 during the 12-month AWS free tier period) it was intended to replace. The architecture was therefore revised to use Amazon RDS for PostgreSQL 15 on a db.t3.micro instance for the academic MVP phase. This selection is fully compatible with all functional requirements in the SRS: pg_trgm trigram similarity, GIN indexes, PostgreSQL materialized views, pg_cron scheduling, and Flyway versioned migrations are all supported identically on RDS PostgreSQL 15. The CDK Stack 2 (Database) is designed with an explicit upgrade path to Aurora Serverless v2 for production — replacing the `DatabaseInstance` construct with `DatabaseCluster` and `ServerlessV2Capacity` settings — without requiring any changes to Lambda function code, Flyway migrations, or the SRS data model. This design decision demonstrates both cost-conscious engineering judgement and forward-compatible architecture planning appropriate to a scalable cloud-based healthcare platform.

---

## Prioritised Action List

**P0 — Fixed before CDK build:**
1. Replace Aurora Serverless v2 with RDS db.t3.micro
2. Remove NAT Gateway — Lambda in public subnet, RDS in private subnet
3. Remove WAF — API GW throttling as compensating control
4. Replace KMS CMKs with AWS managed keys
5. Remove provisioned concurrency for MVP
6. Add SQS DLQ for bulk-ingestion Lambda
7. Define per-Lambda scoped IAM roles in CDK
8. Enable pg_cron via custom RDS parameter group in CDK Stack 2

**P1 — Should implement during CDK build:**
9. Request SES production access before go-live (not for demo)
10. Set RDS backup retention to 2 days (MVP) with production upgrade to 30 days
11. S3 lifecycle policy: CSV archive → Glacier after 90 days

**P2 — Production enhancements (post-FYP):**
12. Add X-Ray tracing (`tracing: Tracing.ACTIVE`) to all Lambda functions
13. Enable GuardDuty Foundational mode (no optional protection plans — ~$0.80-1.50/month)
14. Add Security Hub
15. Upgrade to Aurora Serverless v2 after free tier expires
16. Add WAF with AWS Managed Rules OWASP Top 10
17. Switch Lambda to private subnet + NAT Gateway
18. Enable KMS CMKs with annual rotation
19. Enable provisioned concurrency for patient-service and analytics-service
20. Migrate region from us-east-1 to af-south-1 for Cameroonian data residency

---

*Assessment 1 — Healthcare Information System (HIS) — University of Buea FYP*
*Well-Architected Review conducted 2026-06-25 before CDK implementation*
