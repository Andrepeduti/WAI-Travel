
-- 1) Co-members can see participant list
DROP POLICY IF EXISTS "Members visible to participants" ON public.itinerary_members;
CREATE POLICY "Members visible to participants"
  ON public.itinerary_members
  FOR SELECT
  TO authenticated
  USING (
    private.is_itinerary_owner(itinerary_id, auth.uid())
    OR user_id = auth.uid()
    OR private.can_view_itinerary(itinerary_id, auth.uid())
  );

-- 2) Explicit SELECT policy for avatars bucket
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');
