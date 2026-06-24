-- Dynamic developer directory, public listing references, parking, matcher analytics,
-- and richer collaborator applications.
CREATE SEQUENCE IF NOT EXISTS public.property_public_id_seq START 1001;

ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE public.developers SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_developers_name_ci ON public.developers(lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_developers_slug ON public.developers(slug) WHERE slug IS NOT NULL;
UPDATE public.developers SET is_featured=true WHERE name IN ('Vista Land','Filinvest','Sta. Lucia Land','Avida Land','Camella','DMCI Homes');

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS parking_spaces INTEGER CHECK (parking_spaces IS NULL OR parking_spaces >= 0);
UPDATE public.properties SET public_id = 'MM-DVO-' || lpad(nextval('public.property_public_id_seq')::text, 6, '0') WHERE public_id IS NULL;
ALTER TABLE public.properties ALTER COLUMN public_id SET DEFAULT ('MM-DVO-' || lpad(nextval('public.property_public_id_seq')::text, 6, '0'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_public_id ON public.properties(public_id);

CREATE TABLE IF NOT EXISTS public.matcher_events (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('result_view','listing_click','compare_click','save_click','contact_click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matcher_events_property ON public.matcher_events(property_id, event_type);
CREATE INDEX IF NOT EXISTS idx_matcher_events_created ON public.matcher_events(created_at DESC);

ALTER TABLE public.collaborator_applications ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE public.collaborator_applications ADD COLUMN IF NOT EXISTS service_area TEXT;
ALTER TABLE public.collaborator_applications ADD COLUMN IF NOT EXISTS consent_confirmed BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', 'buyer')
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;
  IF new.raw_user_meta_data->>'requested_role' IN ('seller', 'agent') THEN
    INSERT INTO public.collaborator_applications
      (user_id, requested_role, business_name, prc_license_number, message, profession, service_area, consent_confirmed)
    VALUES (new.id, new.raw_user_meta_data->>'requested_role', new.raw_user_meta_data->>'business_name',
      new.raw_user_meta_data->>'prc_license_number', new.raw_user_meta_data->>'application_message',
      new.raw_user_meta_data->>'profession', new.raw_user_meta_data->>'service_area',
      coalesce((new.raw_user_meta_data->>'consent_confirmed')::boolean, false))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;
