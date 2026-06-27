
-- Restrict base profiles table to owner-only reads (protects email/phone/birthdate/onboarding_completed)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Owner can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Public, non-sensitive projection of profiles, exposed to anon + authenticated.
-- Excludes: email, phone, birthdate, onboarding_completed.
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT
  user_id,
  name,
  username,
  location,
  avatar_url,
  bio,
  website,
  instagram,
  tiktok,
  youtube,
  interests,
  followers_count,
  following_count,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
