-- Turni con più ragazzi/e: colonna youth_ids (array JSONB)
-- Resta youth_id come "primo ragazzo" per compatibilità con i dati esistenti.

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS youth_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: popola youth_ids con il ragazzo già assegnato
UPDATE shifts SET youth_ids = jsonb_build_array(youth_id)
WHERE youth_id IS NOT NULL AND youth_ids = '[]'::jsonb;
