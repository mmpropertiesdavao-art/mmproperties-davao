-- Incremental migration for an existing MM Properties database.
-- Run once in Supabase SQL Editor. New installations can run auth_setup.sql instead.

CREATE TABLE IF NOT EXISTS public.collaborator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('seller', 'agent')),
  business_name TEXT,
  prc_license_number TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
    INSERT INTO public.collaborator_applications (user_id, requested_role, business_name, prc_license_number, message)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'requested_role',
      new.raw_user_meta_data->>'business_name',
      new.raw_user_meta_data->>'prc_license_number',
      new.raw_user_meta_data->>'application_message'
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.collaborator_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applicants can read own application" ON public.collaborator_applications;
CREATE POLICY "Applicants can read own application" ON public.collaborator_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
