UPDATE public.profiles
SET onboarding_completed = false
WHERE onboarding_completed = true
  AND (
    username IS NULL OR username = ''
    OR name IS NULL OR name = ''
  );