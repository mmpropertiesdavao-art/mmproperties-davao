-- Homepage featured carousel controls.
-- Safe to run more than once.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS carousel_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carousel_order INTEGER NOT NULL DEFAULT 100 CHECK (carousel_order >= 0);

CREATE INDEX IF NOT EXISTS idx_properties_carousel
  ON public.properties (carousel_enabled, carousel_order, created_at DESC)
  WHERE status = 'active';
