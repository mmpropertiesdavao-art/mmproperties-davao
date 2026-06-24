-- Run once after schema.sql in Supabase SQL Editor.
-- It keeps Supabase Auth identities and the app's public user profiles aligned.

ALTER TABLE public.users
  ALTER COLUMN id DROP DEFAULT;

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
    INSERT INTO public.collaborator_applications (
      user_id, requested_role, business_name, prc_license_number, message
    ) VALUES (
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

-- Backfill profiles for any Auth users created before this script.
INSERT INTO public.users (id, email, full_name, role)
SELECT id, email, raw_user_meta_data->>'full_name', 'buyer'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = excluded.email;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

ALTER TABLE public.collaborator_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applicants can read own application" ON public.collaborator_applications;
CREATE POLICY "Applicants can read own application" ON public.collaborator_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Promote approved collaborators manually; never accept a role from public signup metadata.
-- UPDATE public.users SET role = 'seller' WHERE email = 'approved-seller@example.com';
-- UPDATE public.users SET role = 'agent'  WHERE email = 'approved-agent@example.com';

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
CREATE POLICY "Public can view property images" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');
