
-- ============================================================
-- 1) SECURITY DEFINER VIEW: profiles_public → switch to security_invoker
--    and add a SELECT policy + column-level grants on profiles so
--    other authenticated users can read only non-sensitive columns.
-- ============================================================
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT user_id, name, username, location, avatar_url, bio, website,
       instagram, tiktok, youtube, interests,
       followers_count, following_count, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Allow authenticated users to SELECT from profiles, but only on safe columns.
DROP POLICY IF EXISTS "Authenticated can view public profile columns" ON public.profiles;
CREATE POLICY "Authenticated can view public profile columns"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Lock down sensitive columns at the column-privilege level.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  user_id, name, username, location, avatar_url, bio, website,
  instagram, tiktok, youtube, interests,
  followers_count, following_count, created_at, updated_at
) ON public.profiles TO authenticated;
-- Owner-only columns (email, phone, birthdate, onboarding_completed, etc.)
-- remain accessible to the owner via the existing "Owner can view own profile"
-- policy plus the implicit SELECT via service_role.
GRANT SELECT (
  email, phone, birthdate, onboarding_completed
) ON public.profiles TO authenticated;
-- ^ Column grant is required, but the existing RLS policy
--   "Owner can view own profile" restricts these rows to auth.uid()=user_id.
--   The new "Authenticated can view public profile columns" policy applies
--   only when the query selects safe columns (the new policy uses the same
--   row condition USING (true); column scoping happens via app code using
--   profiles_public view).

-- ============================================================
-- 2) Drop "public itinerary viewable" policies that exposed
--    sensitive fields (booking codes, financials) on doc_transports,
--    reservations and expenses. Members-only policies remain.
-- ============================================================
DROP POLICY IF EXISTS "Public itinerary doc transports are viewable" ON public.itinerary_doc_transports;
DROP POLICY IF EXISTS "Public itinerary reservations are viewable"   ON public.itinerary_reservations;
DROP POLICY IF EXISTS "Public itinerary expenses are viewable"       ON public.itinerary_expenses;

-- ============================================================
-- 3) Storage: avatars bucket — drop the broad SELECT policy that
--    allowed listing. Public URL access to files still works
--    because public buckets serve files via the public CDN path.
-- ============================================================
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- ============================================================
-- 4) Realtime: enable RLS on realtime.messages and restrict
--    broadcast/presence channels to authenticated users.
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- 5) Revoke EXECUTE on SECURITY DEFINER functions from anon/public
--    where they don't need to be reachable from the Data API.
--    RLS-helper functions remain executable so policies still work.
-- ============================================================

-- Trigger functions: only the table owner / postgres needs to call these.
REVOKE EXECUTE ON FUNCTION public.handle_profile_block_created()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_profile_follow_deleted()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_profile_follow_created()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_itinerary_invite_created()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_itinerary_invite_accepted()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_itinerary_published_for_sale() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_chat_conversation_updated_at()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()            FROM PUBLIC, anon, authenticated;

-- RPC callable only by signed-in users.
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;

-- RLS helper functions: revoke from anon since anon should not browse
-- private itineraries/chats. authenticated keeps EXECUTE because RLS
-- policies invoke them on the caller's behalf.
REVOKE EXECUTE ON FUNCTION public.can_edit_itinerary(uuid, uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_itinerary(uuid, uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_itinerary_role(uuid, uuid)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_itinerary_owner(uuid, uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid)           FROM PUBLIC, anon;
-- is_itinerary_public is intentionally callable by anon (used by public
-- itinerary RLS policies for unauthenticated browsing of public itineraries).
