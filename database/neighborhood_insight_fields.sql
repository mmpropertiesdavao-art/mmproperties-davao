-- Optional editorial fields for neighborhood insight cards.
-- Safe to run more than once in Supabase SQL editor.

ALTER TABLE neighborhoods
  ADD COLUMN IF NOT EXISTS character_text TEXT,
  ADD COLUMN IF NOT EXISTS who_buys_here TEXT,
  ADD COLUMN IF NOT EXISTS market_reality TEXT,
  ADD COLUMN IF NOT EXISTS best_for TEXT,
  ADD COLUMN IF NOT EXISTS caution_text TEXT;
