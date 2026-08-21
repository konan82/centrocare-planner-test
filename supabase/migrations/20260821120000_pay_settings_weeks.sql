-- CentroCare Planner - Migration: settimane per mese nel calcolo paga
-- Moltiplicatore settimane/mese (default 4) salvato con le tariffe.

ALTER TABLE pay_settings
  ADD COLUMN IF NOT EXISTS weeks_per_month NUMERIC NOT NULL DEFAULT 4;
