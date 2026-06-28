-- ============================================================
-- Davao Property Finder — PostgreSQL + PostGIS schema
-- ============================================================
-- Run against a Supabase (or plain Postgres 15+) instance.
-- Localized for the Davao City / Philippines market:
--   - "barangay" is used instead of a generic "district" field
--   - foreclosed_property is a first-class property type, not a status flag
--   - currency is implicitly PHP throughout (no multi-currency column —
--     add one only if you expand beyond the Philippines)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- fuzzy/full-text search support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & ROLES
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'agent', 'admin')),
  is_ofw BOOLEAN DEFAULT false,           -- flags OFW buyers for remote-buying flows (video tours, proxy viewings)
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agency_name TEXT,
  prc_license_number TEXT,                -- PRC real estate license, PH-specific
  bio TEXT,
  years_experience INT,
  rating NUMERIC(2, 1) DEFAULT 0,
  total_listings INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g. 'Vista Land', 'Filinvest', 'Camella'
  logo_url TEXT,
  description TEXT,
  website TEXT,
  founded_year INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TAXONOMY
-- ============================================================
CREATE TABLE property_types (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,               -- 'house-and-lot','condominium','lot-only',
                                            -- 'commercial','townhouse','foreclosed'
  label TEXT NOT NULL
);

CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g. 'Lanang', 'Buhangin', 'Catalunan Grande'
  slug TEXT UNIQUE NOT NULL,
  barangay TEXT,                           -- official barangay name, if distinct from the marketing name
  city TEXT NOT NULL DEFAULT 'Davao City',
  overview TEXT,
  avg_price_per_sqm NUMERIC,
  advantages TEXT[],
  disadvantages TEXT[],
  boundary GEOGRAPHY(Polygon, 4326),       -- enables "search this area" filtered by neighborhood shape
  centroid GEOGRAPHY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_neighborhoods_boundary ON neighborhoods USING GIST (boundary);
CREATE INDEX idx_neighborhoods_centroid ON neighborhoods USING GIST (centroid);

-- Points of interest — power "distance to X" on property pages and
-- "near schools" style lifestyle filters in the AI matcher.
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g. 'Ateneo de Davao University'
  type TEXT,                               -- 'university','elementary','high_school'
  location GEOGRAPHY(Point, 4326) NOT NULL
);
CREATE INDEX idx_schools_location ON schools USING GIST (location);

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g. 'Davao Doctors Hospital'
  location GEOGRAPHY(Point, 4326) NOT NULL
);
CREATE INDEX idx_hospitals_location ON hospitals USING GIST (location);

CREATE TABLE malls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g. 'SM Lanang Premier', 'Abreeza'
  location GEOGRAPHY(Point, 4326) NOT NULL
);
CREATE INDEX idx_malls_location ON malls USING GIST (location);

-- General landmarks that don't fit school/hospital/mall (airport, CBD, etc.)
CREATE TABLE landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g. 'Davao International Airport'
  category TEXT,                           -- 'airport','cbd','transport_hub'
  location GEOGRAPHY(Point, 4326) NOT NULL
);
CREATE INDEX idx_landmarks_location ON landmarks USING GIST (location);

-- ============================================================
-- PROPERTIES (core entity)
-- ============================================================
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  property_type_id INT REFERENCES property_types(id),
  developer_id UUID REFERENCES developers(id),
  agent_id UUID REFERENCES agents(id),
  seller_id UUID REFERENCES users(id),

  price NUMERIC NOT NULL,                  -- PHP
  monthly_amortization NUMERIC,            -- PHP
  downpayment_percent NUMERIC,
  payment_terms TEXT,                      -- e.g. 'Bank financing, in-house, Pag-IBIG'
  listing_intent TEXT NOT NULL DEFAULT 'sale' CHECK (listing_intent IN ('sale', 'rent', 'sale_or_rent')),
  availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'reserved', 'rented', 'sold', 'inactive')),
  rent_price NUMERIC,
  financing_available BOOLEAN NOT NULL DEFAULT false,
  assume_balance_available BOOLEAN NOT NULL DEFAULT false,
  previous_price NUMERIC,
  price_reduced_at TIMESTAMPTZ,

  bedrooms INT,
  bathrooms NUMERIC(3, 1),
  floor_area_sqm NUMERIC,
  lot_area_sqm NUMERIC,

  neighborhood_id UUID REFERENCES neighborhoods(id),
  barangay TEXT,                           -- denormalized for fast filter/display without a join
  address TEXT,
  location GEOGRAPHY(Point, 4326) NOT NULL, -- the core geospatial column

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'sold', 'inactive')),
  is_foreclosed BOOLEAN DEFAULT false,      -- foreclosed is its own filter, independent of property_type taxonomy
  is_featured BOOLEAN DEFAULT false,

  search_vector TSVECTOR,                  -- maintained via trigger, see below

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_properties_location ON properties USING GIST (location);
CREATE INDEX idx_properties_price ON properties (price);
CREATE INDEX idx_properties_type ON properties (property_type_id);
CREATE INDEX idx_properties_neighborhood ON properties (neighborhood_id);
CREATE INDEX idx_properties_status ON properties (status);
CREATE INDEX idx_properties_foreclosed ON properties (is_foreclosed) WHERE is_foreclosed = true;
CREATE INDEX idx_properties_search ON properties USING GIN (search_vector);

-- Keep search_vector current on insert/update instead of recomputing per query
CREATE FUNCTION properties_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_search_vector
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION properties_search_vector_trigger();

CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  is_cover BOOLEAN DEFAULT false
);
CREATE INDEX idx_property_images_property ON property_images (property_id);

CREATE TABLE property_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  video_type TEXT DEFAULT 'tour'            -- 'tour','drone','walkthrough'
);

CREATE TABLE property_features (
  id SERIAL PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  feature TEXT NOT NULL                     -- 'swimming pool','gated community','pet friendly'
);
CREATE INDEX idx_property_features_property ON property_features (property_id);

-- ============================================================
-- ENGAGEMENT & LEADS
-- ============================================================
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  is_remote_buyer BOOLEAN DEFAULT false,    -- e.g. OFW inquiring from abroad; surfaces in agent workflow
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'follow_up', 'interested', 'under_contract', 'closed', 'lost')),
  internal_notes TEXT,
  follow_up_at TIMESTAMPTZ,
  lead_source TEXT DEFAULT 'website',
  assigned_user_id UUID REFERENCES users(id),
  assigned_agent_id UUID REFERENCES agents(id),
  assigned_seller_id UUID REFERENCES users(id),
  external_crm_provider TEXT,
  external_crm_contact_id TEXT,
  external_crm_deal_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT,
  sync_error TEXT,
  scheduled_viewing_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_inquiries_status ON inquiries (status);
CREATE INDEX idx_inquiries_property ON inquiries (property_id);

CREATE TABLE favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  filters JSONB NOT NULL,                   -- serialized filter state; keeps schema flexible
  notify_on_new_match BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE property_views (
  id BIGSERIAL PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  viewed_at TIMESTAMPTZ DEFAULT now(),
  source TEXT                               -- 'search','map','featured','direct'
  ,visitor_id TEXT
);
CREATE INDEX idx_property_views_property ON property_views (property_id);

-- ============================================================
-- CONTENT & COMMERCE
-- ============================================================
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,                            -- 'buying_guide','investment_guide','ofw_guide',
                                             -- 'neighborhood_guide','financing_guide','comparison_guide'
  content TEXT,
  cover_image_url TEXT,
  author_id UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  content_json JSONB,
  excerpt TEXT,
  seo_title TEXT,
  meta_description TEXT,
  featured_position INTEGER CHECK (featured_position IS NULL OR featured_position BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  property_id UUID REFERENCES properties(id),
  amount NUMERIC,
  payment_type TEXT,                        -- 'reservation','downpayment','listing_fee'
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE analytics (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,                 -- 'search','filter_applied','property_view','inquiry_sent'
  payload JSONB,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Notes
-- ============================================================
-- 1. GEOGRAPHY (not GEOMETRY) is used for every point/polygon column so
--    ST_DWithin/ST_Distance return meters directly, no manual SRID math.
-- 2. is_foreclosed is a boolean, not folded into property_type_id, because
--    a foreclosed unit is still fundamentally a house-and-lot/condo/etc —
--    foreclosure is a status/provenance, but it's also the single most
--    common saved-search filter in this market, so it's denormalized here
--    for a one-column WHERE clause instead of a join.
-- 3. barangay is stored on both neighborhoods and properties — neighborhoods
--    is the SEO/content entity (one page per area), barangay on properties
--    is the precise administrative filter buyers actually search by, and
--    the two don't always map 1:1.
