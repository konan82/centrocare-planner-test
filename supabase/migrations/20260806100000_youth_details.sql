-- CentroCare Planner - Migration: youth_details
-- Estende la scheda anagrafica dei ragazzi (minori)

ALTER TABLE youths
  ADD COLUMN birth_date DATE,
  ADD COLUMN birth_place TEXT DEFAULT '',
  ADD COLUMN gender TEXT DEFAULT '',
  ADD COLUMN nationality TEXT DEFAULT '',
  ADD COLUMN fiscal_code TEXT DEFAULT '',
  ADD COLUMN phone TEXT DEFAULT '',
  ADD COLUMN parent_name TEXT DEFAULT '',
  ADD COLUMN parent_phone TEXT DEFAULT '',
  ADD COLUMN parent_email TEXT DEFAULT '',
  ADD COLUMN privacy_consent_date DATE,
  ADD COLUMN outings_authorized BOOLEAN DEFAULT false,
  ADD COLUMN diagnoses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN allergies TEXT DEFAULT '',
  ADD COLUMN medications TEXT DEFAULT '',
  ADD COLUMN doctor TEXT DEFAULT '',
  ADD COLUMN referring_tutor_id TEXT REFERENCES tutors(id) ON DELETE SET NULL,
  ADD COLUMN entry_date DATE,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'attivo',
  ADD COLUMN goals TEXT DEFAULT '';
