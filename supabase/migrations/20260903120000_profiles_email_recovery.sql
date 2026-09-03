-- CentroCare Planner - Migration: profiles_email_recovery
-- Aggiunge una email reale per il recupero credenziali (invio nuove password via Resend).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Il trigger sulla creazione utente salva anche l'email metadata (se presente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, permissions, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'permissions', '["DASHBOARD","TUTORS","YOUTHS","SUMMARY"]')::jsonb,
    NULLIF(NEW.raw_user_meta_data->>'email', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;