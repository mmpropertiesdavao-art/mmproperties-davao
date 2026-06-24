-- Incremental marketplace features migration. Safe to run more than once.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_intent TEXT NOT NULL DEFAULT 'sale';
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_listing_intent_check;
ALTER TABLE properties ADD CONSTRAINT properties_listing_intent_check CHECK (listing_intent IN ('sale', 'rent', 'sale_or_rent'));
ALTER TABLE properties ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'available';
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_availability_check;
ALTER TABLE properties ADD CONSTRAINT properties_availability_check CHECK (availability IN ('available', 'reserved', 'rented', 'sold', 'inactive'));
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_price NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS financing_available BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS assume_balance_available BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS previous_price NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_reduced_at TIMESTAMPTZ;

ALTER TABLE property_views ADD COLUMN IF NOT EXISTS visitor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_property_views_visitor ON property_views(property_id, visitor_id);

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_properties_listing_intent ON properties(listing_intent);
CREATE INDEX IF NOT EXISTS idx_properties_availability ON properties(availability);
