-- CentroCare Planner - Migration: mesi del consuntivo cancellati dall'utente.
-- La copia automatica della settimana tipo salta i giorni dei mesi presenti qui.

CREATE TABLE IF NOT EXISTS cleared_months (
  month TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cleared_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cleared_months"
  ON cleared_months FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert cleared_months"
  ON cleared_months FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can delete cleared_months"
  ON cleared_months FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );
