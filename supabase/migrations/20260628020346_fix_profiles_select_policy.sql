-- Fix for profiles_public not being able to read usernames due to RLS restriction
-- Restores the blanket SELECT policy for authenticated users that was removed in a previous migration.
-- Column-level grants still restrict which columns they can read.

CREATE POLICY "Authenticated can view public profile columns"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
