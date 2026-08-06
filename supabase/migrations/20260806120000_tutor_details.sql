-- CentroCare Planner - Migration: tutor_details
-- Estende la scheda tutor/educatori

ALTER TABLE tutors
  ADD COLUMN phone TEXT DEFAULT '',
  ADD COLUMN email TEXT DEFAULT '',
  ADD COLUMN birth_date DATE,
  ADD COLUMN city TEXT DEFAULT '',
  ADD COLUMN role TEXT DEFAULT '',
  ADD COLUMN qualifications TEXT DEFAULT '',
  ADD COLUMN years_experience INTEGER,
  ADD COLUMN criminal_record_expiry DATE,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'attivo',
  ADD COLUMN entry_date DATE;
