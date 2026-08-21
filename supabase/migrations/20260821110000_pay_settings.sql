-- CentroCare Planner - Migration: tariffe orarie globali per il calcolo paga
-- Tabella con riga unica 'global' contenente paga oraria turno singolo e doppio.

CREATE TABLE IF NOT EXISTS pay_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  rate_single NUMERIC NOT NULL DEFAULT 0,
  rate_double NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pay_settings (id) VALUES ('global')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE pay_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pay_settings"
  ON pay_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert pay_settings"
  ON pay_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can update pay_settings"
  ON pay_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );
