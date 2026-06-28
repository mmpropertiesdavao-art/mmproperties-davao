-- Lightweight inquiry CRM fields for MM Properties.
-- Safe to run more than once.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inquiries_follow_up_at ON inquiries (follow_up_at);
