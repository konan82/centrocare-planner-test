-- Aggiunge la preferenza layout header Resoconto Turni per utente
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS report_header_layout JSONB
  DEFAULT '["VISTA","FILTRA","GUIDA"]'::jsonb;
