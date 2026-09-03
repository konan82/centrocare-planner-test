-- CentroCare Planner - Migration: audit_logs
-- Registro di riferimento (Audit Trail): chi ha creato/modificato/cancellato cosa.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT,
  username TEXT,
  action TEXT NOT NULL,        -- 'create' | 'update' | 'delete'
  entity TEXT NOT NULL,         -- 'shift' | 'tutor' | 'youth' | 'user'
  entity_id TEXT,
  entity_name TEXT,
  details JSONB
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity);
CREATE INDEX IF NOT EXISTS audit_logs_entity_id_idx ON audit_logs (entity_id);

-- RLS (default locked)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: consentito a qualsiasi utente autenticato (l'app registra le azioni)
CREATE POLICY "auth_users_can_insert_audit"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT: solo gli amministratori (permesso ALL) possono consultare l'Audit Trail
CREATE POLICY "admins_can_read_audit"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.permissions @> '["ALL"]'::jsonb
    )
  );