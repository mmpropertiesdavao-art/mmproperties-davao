ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 100 CHECK(display_order>=0);
CREATE INDEX IF NOT EXISTS idx_developers_featured_order ON public.developers(is_featured,display_order,name) WHERE is_active=true;
