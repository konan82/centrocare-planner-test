-- CentroCare Planner - Migration: profiles_perm_matrix
-- Aggiunge la colonna perm_matrix con i flag Visualizza/Modifica/Elimina per ogni area.
-- La gestione admin resta su 'permissions' (['ALL']) per non alterare le policy RLS esistenti.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS perm_matrix JSONB;
COMMENT ON COLUMN profiles.perm_matrix IS
  '{"PIANIFICAZIONE":{"r":bool,"w":bool,"d":bool},"CONSUNTIVO":{...},"TUTORS":{...},"YOUTHS":{...},"SUMMARY":{...},"USERS":{...}} per utenti non-admin. r=Visualizza, w=Modifica, d=Elimina.';