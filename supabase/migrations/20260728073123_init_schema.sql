-- CentroCare Planner - Supabase Schema
-- Migration: init_schema

-- ============================================
-- TABELLA: tutors (tutor/educatori)
-- ============================================
CREATE TABLE tutors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_hours_per_week INTEGER NOT NULL DEFAULT 20,
  unavailable_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT ''
);

-- ============================================
-- TABELLA: youths (ragazzi)
-- ============================================
CREATE TABLE youths (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  needs JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_hours_per_week INTEGER NOT NULL DEFAULT 4,
  notes TEXT DEFAULT ''
);

-- ============================================
-- TABELLA: shifts (turni)
-- ============================================
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  tutor_id TEXT NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  youth_id TEXT NOT NULL REFERENCES youths(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  activity TEXT DEFAULT ''
);

-- Indici per performance
CREATE INDEX idx_shifts_tutor_id ON shifts(tutor_id);
CREATE INDEX idx_shifts_youth_id ON shifts(youth_id);
CREATE INDEX idx_shifts_date ON shifts(date);

-- ============================================
-- TABELLA: profiles (profili utente con permessi)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE youths ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: tutti gli utenti autenticati possono leggere
CREATE POLICY "Authenticated users can read tutors"
  ON tutors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read youths"
  ON youths FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy: solo gli admin possono modificare tutors/youths/shifts
CREATE POLICY "Admins can insert tutors"
  ON tutors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can update tutors"
  ON tutors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can delete tutors"
  ON tutors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can insert youths"
  ON youths FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can update youths"
  ON youths FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can delete youths"
  ON youths FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can insert shifts"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can update shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Admins can delete shifts"
  ON shifts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permissions @> '["ALL"]'::jsonb
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- FUNZIONE: crea profilo automaticamente dopo registrazione
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, permissions)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'permissions', '["DASHBOARD","TUTORS","YOUTHS","SUMMARY"]')::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: crea profile quando un utente si registra
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
