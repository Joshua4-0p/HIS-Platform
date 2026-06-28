-- V1__enable_extensions.sql
-- Enable required PostgreSQL extensions and create migration tracking table
-- pg_trgm: trigram similarity for patient deduplication (REQ-F-020, REQ-F-022, REQ-NF-002)
-- pg_cron: scheduled materialized view refreshes and daily summaries (REQ-NF-003, REQ-F-067)

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
