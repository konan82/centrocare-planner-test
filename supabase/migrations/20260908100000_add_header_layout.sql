-- Aggiunge la preferenza layout header per utente
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS header_layout JSONB
  DEFAULT '["GUIDA","FILTRA","VISTA","MODIFICA","STRUMENTI","CONDIVIDI","ATTENZIONE"]'::jsonb;
