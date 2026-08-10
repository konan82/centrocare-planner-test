-- CentroCare Planner - Migration: profiles_tutor_link
-- Associazione opzionale di un tutor a un utente (per limitare i turni visibili).

ALTER TABLE profiles
  ADD COLUMN tutor_id TEXT REFERENCES tutors(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_tutor_id ON profiles(tutor_id);

-- Gli admin possono aggiornare qualsiasi profilo (permessi e tutor associato)
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.permissions @> '["ALL"]'::jsonb
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.permissions @> '["ALL"]'::jsonb
    )
  );
