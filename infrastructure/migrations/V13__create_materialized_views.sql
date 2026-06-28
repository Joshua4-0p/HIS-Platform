-- V13__create_materialized_views.sql
-- Materialized views for dashboard analytics (REQ-NF-003, REQ-F-058 to REQ-F-063)
-- All views created WITH DATA (tables are empty at migration time - creates empty views).
-- Unique indexes required for REFRESH MATERIALIZED VIEW CONCURRENTLY (scheduled in V14).
-- Timestamps converted to WAT (Africa/Lagos = UTC+1) for month-boundary correctness.

-- 1. Monthly patient registrations per hospital (REQ-F-060 - Hospital Admin dashboard)
CREATE MATERIALIZED VIEW mv_hospital_monthly_stats AS
SELECT
  hospital_id,
  DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos') AS month,
  COUNT(*) AS patient_count
FROM patients
GROUP BY hospital_id, DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos')
WITH DATA;

CREATE UNIQUE INDEX mv_hospital_monthly_stats_idx
  ON mv_hospital_monthly_stats (hospital_id, month);

-- 2. Monthly clinical encounters per hospital (REQ-F-060)
CREATE MATERIALIZED VIEW mv_monthly_encounters AS
SELECT
  hospital_id,
  DATE_TRUNC('month', date_time AT TIME ZONE 'Africa/Lagos') AS month,
  COUNT(*) AS encounter_count,
  COUNT(DISTINCT patient_id) AS unique_patients
FROM encounters
GROUP BY hospital_id, DATE_TRUNC('month', date_time AT TIME ZONE 'Africa/Lagos')
WITH DATA;

CREATE UNIQUE INDEX mv_monthly_encounters_idx
  ON mv_monthly_encounters (hospital_id, month);

-- 3. Top diagnoses per hospital by month (REQ-F-060 - top 5 most frequent diagnoses)
CREATE MATERIALIZED VIEW mv_top_diagnoses AS
SELECT
  hospital_id,
  DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos') AS month,
  condition_name,
  COUNT(*) AS case_count
FROM diagnoses
GROUP BY
  hospital_id,
  DATE_TRUNC('month', created_at AT TIME ZONE 'Africa/Lagos'),
  condition_name
WITH DATA;

CREATE UNIQUE INDEX mv_top_diagnoses_idx
  ON mv_top_diagnoses (hospital_id, month, condition_name);

-- 4. Lab result turnaround times (REQ-F-060 - average turnaround in hours)
CREATE MATERIALIZED VIEW mv_lab_turnaround AS
SELECT
  lr.hospital_id,
  DATE_TRUNC('month', lr.created_at AT TIME ZONE 'Africa/Lagos') AS month,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (lr.date_time_tested - ltr.created_at)) / 3600)::NUMERIC,
    2
  ) AS avg_turnaround_hours,
  COUNT(*) AS result_count
FROM lab_results lr
JOIN lab_test_requests ltr ON lr.request_id = ltr.id
GROUP BY
  lr.hospital_id,
  DATE_TRUNC('month', lr.created_at AT TIME ZONE 'Africa/Lagos')
WITH DATA;

CREATE UNIQUE INDEX mv_lab_turnaround_idx
  ON mv_lab_turnaround (hospital_id, month);

-- 5. Cross-hospital disease statistics for Ministry view (REQ-F-063)
-- Only includes patients who consented to anonymised public health reporting (REQ-F-018)
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
GROUP BY
  d.condition_name,
  DATE_TRUNC('month', d.created_at AT TIME ZONE 'Africa/Lagos'),
  p.region_district
WITH DATA;

CREATE UNIQUE INDEX mv_ministry_disease_stats_idx
  ON mv_ministry_disease_stats (condition_name, month, region_district);

-- 6. Regional case distribution for Ministry dashboard (REQ-F-063)
CREATE MATERIALIZED VIEW mv_regional_distribution AS
SELECT
  p.region_district,
  DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos') AS month,
  COUNT(DISTINCT e.id) AS encounter_count,
  COUNT(DISTINCT e.patient_id) AS patient_count
FROM encounters e
JOIN patients p ON e.patient_id = p.id
WHERE p.consent_public_reporting = 'Granted'
GROUP BY
  p.region_district,
  DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos')
WITH DATA;

CREATE UNIQUE INDEX mv_regional_distribution_idx
  ON mv_regional_distribution (region_district, month);

-- 7. Staff activity summary (REQ-F-060 - Hospital Admin staff activity card)
CREATE MATERIALIZED VIEW mv_staff_activity AS
SELECT
  e.hospital_id,
  e.staff_id,
  DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos') AS month,
  COUNT(*) AS encounter_count,
  MAX(e.date_time) AS last_encounter_at
FROM encounters e
GROUP BY
  e.hospital_id,
  e.staff_id,
  DATE_TRUNC('month', e.date_time AT TIME ZONE 'Africa/Lagos')
WITH DATA;

CREATE UNIQUE INDEX mv_staff_activity_idx
  ON mv_staff_activity (hospital_id, staff_id, month);
