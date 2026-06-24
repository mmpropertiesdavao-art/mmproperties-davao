-- Flexible place taxonomy, moderated developer suggestions and safe listing lifecycle.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('pending','approved','rejected'));
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS suggested_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.developers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.developer_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'neighborhood' CHECK (kind IN ('barangay','neighborhood','subdivision','landmark','district','other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','archived')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  merged_into_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON public.places USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.place_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_places (
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('primary','nearby')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (property_id, place_id, relation)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_primary_place ON public.property_places(property_id) WHERE relation='primary';
CREATE INDEX IF NOT EXISTS idx_property_places_place ON public.property_places(place_id, relation);

INSERT INTO public.places(name, normalized_name, slug, kind, status)
SELECT n.name,
  lower(regexp_replace(trim(n.name), '[^a-zA-Z0-9]+', ' ', 'g')),
  n.slug, 'neighborhood', 'active'
FROM public.neighborhoods n
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO public.property_places(property_id, place_id, relation, sort_order)
SELECT p.id, pl.id, 'primary', 0
FROM public.properties p
JOIN public.neighborhoods n ON n.id=p.neighborhood_id
JOIN public.places pl ON pl.normalized_name=lower(regexp_replace(trim(n.name), '[^a-zA-Z0-9]+', ' ', 'g'))
ON CONFLICT DO NOTHING;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

