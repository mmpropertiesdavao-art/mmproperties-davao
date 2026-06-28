-- Lightweight inquiry CRM fields for MM Properties.
-- Safe to run more than once.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agents(id),
  ADD COLUMN IF NOT EXISTS assigned_seller_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS external_crm_provider TEXT,
  ADD COLUMN IF NOT EXISTS external_crm_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS external_crm_deal_id TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_status TEXT,
  ADD COLUMN IF NOT EXISTS sync_error TEXT;

ALTER TABLE inquiries
  DROP CONSTRAINT IF EXISTS inquiries_status_check;

ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_status_check
  CHECK (status IN ('new', 'contacted', 'follow_up', 'interested', 'under_contract', 'closed', 'lost'));

CREATE INDEX IF NOT EXISTS idx_inquiries_follow_up_at ON inquiries (follow_up_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_user ON inquiries (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_agent ON inquiries (assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_seller ON inquiries (assigned_seller_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_external_crm ON inquiries (external_crm_provider, external_crm_contact_id, external_crm_deal_id);
