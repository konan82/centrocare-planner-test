-- CentroCare Planner - Migration: ore settimanali minime tutor
-- Aggiunge min_hours_per_week ai tutor (range 1-60 con max_hours_per_week).

ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS min_hours_per_week INTEGER;

-- Backfill: chi non ha un minimo parte da 1
UPDATE tutors
SET min_hours_per_week = 1
WHERE min_hours_per_week IS NULL;
