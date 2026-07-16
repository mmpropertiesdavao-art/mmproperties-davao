-- Developer inventory is additive. It does not alter brokerage listing behavior.

ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS public.developer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  project_type TEXT
    CHECK (project_type IN ('condominium','house-and-lot','lot-only','townhouse','commercial','mixed-use')),
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  barangay TEXT,
  city TEXT NOT NULL DEFAULT 'Davao City',
  province TEXT NOT NULL DEFAULT 'Davao del Sur',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pre_selling'
    CHECK (status IN ('pre_selling','under_construction','ready_for_occupancy','completed','inactive')),
  completion_date DATE,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  hero_image TEXT,
  video_url TEXT,
  gallery TEXT[] NOT NULL DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_projects_developer ON public.developer_projects(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_projects_active ON public.developer_projects(active, status);
CREATE INDEX IF NOT EXISTS idx_developer_projects_location ON public.developer_projects(latitude, longitude);

CREATE TABLE IF NOT EXISTS public.developer_house_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.developer_projects(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL DEFAULT 'house_model'
    CHECK (model_type IN ('house_model','lot_only','studio','one_bedroom','two_bedroom','three_bedroom','four_bedroom','penthouse')),
  name TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  floor_area NUMERIC,
  lot_area NUMERIC,
  parking_slots INTEGER,
  current_price NUMERIC,
  description TEXT,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  floor_plan_image TEXT,
  video_url TEXT,
  gallery TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_house_models_project ON public.developer_house_models(project_id, active);

ALTER TABLE public.developer_projects ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.developer_projects ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE public.developer_projects DROP CONSTRAINT IF EXISTS developer_projects_project_type_check;
ALTER TABLE public.developer_projects ADD CONSTRAINT developer_projects_project_type_check
  CHECK (project_type IS NULL OR project_type IN ('condominium','house-and-lot','lot-only','townhouse','commercial','mixed-use'));
ALTER TABLE public.developer_house_models ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.developer_house_models ADD COLUMN IF NOT EXISTS model_type TEXT NOT NULL DEFAULT 'house_model';
ALTER TABLE public.developer_house_models DROP CONSTRAINT IF EXISTS developer_house_models_model_type_check;
ALTER TABLE public.developer_house_models ADD CONSTRAINT developer_house_models_model_type_check
  CHECK (model_type IN ('house_model','lot_only','studio','one_bedroom','two_bedroom','three_bedroom','four_bedroom','penthouse'));

CREATE TABLE IF NOT EXISTS public.developer_model_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.developer_house_models(id) ON DELETE CASCADE,
  previous_price NUMERIC,
  new_price NUMERIC NOT NULL,
  price_difference NUMERIC,
  percentage_change NUMERIC,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_model_price_history_model ON public.developer_model_price_history(model_id, effective_date DESC);

CREATE TABLE IF NOT EXISTS public.developer_model_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.developer_house_models(id) ON DELETE CASCADE,
  available_units INTEGER NOT NULL DEFAULT 0,
  reserved_units INTEGER NOT NULL DEFAULT 0,
  sold_units INTEGER NOT NULL DEFAULT 0,
  phase TEXT,
  block TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(model_id, phase, block)
);

CREATE INDEX IF NOT EXISTS idx_developer_model_inventory_model ON public.developer_model_inventory(model_id);

CREATE TABLE IF NOT EXISTS public.developer_project_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.developer_projects(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.developer_house_models(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','follow_up','interested','under_contract','closed','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_project_inquiries_project ON public.developer_project_inquiries(project_id, created_at DESC);
