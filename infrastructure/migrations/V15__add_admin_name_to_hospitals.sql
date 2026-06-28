-- V15__add_admin_name_to_hospitals.sql
-- Add admin_name column to hospitals table (required by hospital-service handler
-- for POST /hospitals/register and GET /hospitals/{id}).
-- Column is nullable so existing rows (created before this migration) are unaffected.

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);
