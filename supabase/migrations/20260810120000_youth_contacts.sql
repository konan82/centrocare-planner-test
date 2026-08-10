-- Contatti di riferimento dinamici per i ragazzi
-- Sostituiscono i campi fissi parent1_*/parent2_* con una lista JSONB di contatti (label libera).

ALTER TABLE youths ADD COLUMN IF NOT EXISTS contacts JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: converte i contatti già inseriti nei campi Genitore 1 / Genitore 2
UPDATE youths
SET contacts = COALESCE(
  (SELECT jsonb_agg(x ORDER BY ord)
   FROM (VALUES
     (1, jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Genitore 1', 'name', parent1_name, 'phone', parent1_phone, 'email', parent1_email)),
     (2, jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Genitore 2', 'name', parent2_name, 'phone', parent2_phone, 'email', parent2_email))
   ) AS v(ord, x)
   WHERE x->>'name' <> '' OR x->>'phone' <> '' OR x->>'email' <> ''),
  '[]'::jsonb)
WHERE contacts = '[]'::jsonb;
