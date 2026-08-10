-- CentroCare Planner - Migration: youth_card_v2
-- Nuova scheda Ragazzi: scuola, contratto, doppio genitore, tutor multipli.

-- 1) Nuove colonne su youths
ALTER TABLE youths
  ADD COLUMN school TEXT DEFAULT '',
  ADD COLUMN contract_start_date DATE,
  ADD COLUMN contract_end_date DATE,
  ADD COLUMN parent2_name TEXT DEFAULT '',
  ADD COLUMN parent2_phone TEXT DEFAULT '',
  ADD COLUMN parent2_email TEXT DEFAULT '';

-- 2) Rinomina parent_* in parent1_* (Genitore 1 / Genitore 2)
ALTER TABLE youths RENAME COLUMN parent_name TO parent1_name;
ALTER TABLE youths RENAME COLUMN parent_phone TO parent1_phone;
ALTER TABLE youths RENAME COLUMN parent_email TO parent1_email;

-- 3) Tabella youth_tutors: tutor multipli per ragazzo
CREATE TABLE youth_tutors (
  youth_id TEXT NOT NULL REFERENCES youths(id) ON DELETE CASCADE,
  tutor_id TEXT NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  PRIMARY KEY (youth_id, tutor_id)
);

ALTER TABLE youth_tutors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read youth_tutors"
  ON youth_tutors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert youth_tutors"
  ON youth_tutors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can update youth_tutors"
  ON youth_tutors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can delete youth_tutors"
  ON youth_tutors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

-- 4) Migra i dati: referring_tutor_id -> youth_tutors
INSERT INTO youth_tutors (youth_id, tutor_id)
  SELECT id, referring_tutor_id FROM youths WHERE referring_tutor_id IS NOT NULL;

-- 5) Rimuove i campi obsoleti
ALTER TABLE youths DROP COLUMN gender;
ALTER TABLE youths DROP COLUMN nationality;
ALTER TABLE youths DROP COLUMN doctor;
ALTER TABLE youths DROP COLUMN referring_tutor_id;

-- Indici per performance
CREATE INDEX idx_youth_tutors_youth_id ON youth_tutors(youth_id);
CREATE INDEX idx_youth_tutors_tutor_id ON youth_tutors(tutor_id);
