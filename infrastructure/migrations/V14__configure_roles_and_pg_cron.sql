-- V14__configure_roles_and_pg_cron.sql
-- IAM database authentication role for all VPC Lambda functions (REQ-NF-009)
-- pg_cron schedules for materialized view refreshes (REQ-NF-003)
-- Audit log immutability enforcement (REQ-F-070)

-- Create the application role - uses RDS IAM token auth, no stored password
CREATE ROLE his_app WITH LOGIN;
GRANT rds_iam TO his_app;
GRANT CONNECT ON DATABASE hisdb TO his_app;

-- Grant scoped permissions on all current tables (REQ-F-012, REQ-NF-011)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO his_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO his_app;

-- Ensure future tables also have correct permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO his_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO his_app;

-- application_audit_log must be append-only (REQ-F-070)
-- Lambda functions may INSERT and SELECT only - no UPDATE or DELETE permitted
REVOKE UPDATE, DELETE ON application_audit_log FROM his_app;

-- Initial population of materialized views (non-CONCURRENTLY since no user traffic yet)
REFRESH MATERIALIZED VIEW mv_hospital_monthly_stats;
REFRESH MATERIALIZED VIEW mv_monthly_encounters;
REFRESH MATERIALIZED VIEW mv_top_diagnoses;
REFRESH MATERIALIZED VIEW mv_lab_turnaround;
REFRESH MATERIALIZED VIEW mv_ministry_disease_stats;
REFRESH MATERIALIZED VIEW mv_regional_distribution;
REFRESH MATERIALIZED VIEW mv_staff_activity;

-- Schedule CONCURRENTLY refreshes every 5 minutes during 06:00-22:00 WAT (05:00-21:00 UTC)
-- Satisfies REQ-NF-003: dashboard queries served from materialized views refreshed <= every 5 minutes
SELECT cron.schedule('refresh-mv-hospital-stats',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hospital_monthly_stats');

SELECT cron.schedule('refresh-mv-encounters',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_encounters');

SELECT cron.schedule('refresh-mv-top-diagnoses',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_diagnoses');

SELECT cron.schedule('refresh-mv-lab-turnaround',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lab_turnaround');

SELECT cron.schedule('refresh-mv-ministry-stats',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ministry_disease_stats');

SELECT cron.schedule('refresh-mv-regional',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_regional_distribution');

SELECT cron.schedule('refresh-mv-staff-activity',
  '*/5 5-21 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_staff_activity');
