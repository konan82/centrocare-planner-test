-- CentroCare Planner - Migration: shift_consuntivo
-- Distingue pianificato da effettivo e traccia le cancellazioni

ALTER TABLE shifts
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pianificato',
  ADD COLUMN actual_start_time TEXT,
  ADD COLUMN actual_end_time TEXT,
  ADD COLUMN actual_notes TEXT DEFAULT '';

ALTER TABLE shifts
  ADD CONSTRAINT shifts_status_check CHECK (status IN ('pianificato', 'effettuato', 'cancellato'));
