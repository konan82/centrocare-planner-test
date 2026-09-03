-- CentroCare Planner - Migration: tutor_unavailable_ranges
-- Fasce orarie in cui il tutor non è disponibile (es. "08:00".."19:00")

ALTER TABLE tutors
  ADD COLUMN unavailable_ranges JSONB NOT NULL DEFAULT '[]'::jsonb;