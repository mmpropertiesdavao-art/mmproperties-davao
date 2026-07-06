-- MM Properties lead capture + drip campaign foundation.
-- Safe to run more than once in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  lead_type TEXT NOT NULL DEFAULT 'buyer'
    CHECK (lead_type IN ('buyer', 'seller', 'property_inquiry', 'developer_project', 'mm_pulse', 'general')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'lost')),
  property_type TEXT,
  preferred_location TEXT,
  budget TEXT,
  buying_timeline TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_title TEXT,
  listing_price NUMERIC,
  listing_url TEXT,
  property_address TEXT,
  lot_area TEXT,
  floor_area TEXT,
  reason_for_selling TEXT,
  message TEXT,
  source_page TEXT,
  traffic_source TEXT,
  ip_address TEXT,
  user_agent TEXT,
  recaptcha_score NUMERIC,
  internal_notes TEXT,
  follow_up_at TIMESTAMPTZ,
  external_crm_provider TEXT,
  external_crm_contact_id TEXT,
  external_crm_deal_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads (lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_email_mobile ON leads (lower(email), mobile);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads (property_id);

CREATE TABLE IF NOT EXISTS lead_drip_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'skipped', 'failed')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_drip_queue_due ON lead_drip_queue (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_lead_drip_queue_lead ON lead_drip_queue (lead_id);

CREATE TABLE IF NOT EXISTS lead_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identity_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_rate_limits_identity_created ON lead_rate_limits (identity_key, created_at DESC);
