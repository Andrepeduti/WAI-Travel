-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Users can view follows involving themselves" ON public.profile_follows;

-- Create the new policy that allows any authenticated user to view profile_follows
CREATE POLICY "Users can view follows"
ON public.profile_follows
FOR SELECT
TO authenticated
USING (true);
