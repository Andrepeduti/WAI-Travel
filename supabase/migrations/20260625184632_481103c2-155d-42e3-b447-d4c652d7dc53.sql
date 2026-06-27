
-- Move RLS helper SECURITY DEFINER functions out of the public (API-exposed) schema
-- so signed-in users cannot invoke them as RPCs. Existing RLS policies keep working
-- because PostgreSQL stores function references by OID; ALTER FUNCTION SET SCHEMA
-- preserves the OID.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.can_view_itinerary(uuid, uuid)      SET SCHEMA private;
ALTER FUNCTION public.can_edit_itinerary(uuid, uuid)      SET SCHEMA private;
ALTER FUNCTION public.get_user_itinerary_role(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_itinerary_owner(uuid, uuid)      SET SCHEMA private;
ALTER FUNCTION public.is_itinerary_public(uuid)           SET SCHEMA private;
ALTER FUNCTION public.is_chat_member(uuid, uuid)          SET SCHEMA private;

-- These are SECURITY DEFINER and need EXECUTE for callers (RLS evaluation runs
-- as the calling role). Granting in the private schema does not expose them via
-- PostgREST because PostgREST only exposes the public schema.
REVOKE ALL ON FUNCTION private.can_view_itinerary(uuid, uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_edit_itinerary(uuid, uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_user_itinerary_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_itinerary_owner(uuid, uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_itinerary_public(uuid)           FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_chat_member(uuid, uuid)          FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.can_view_itinerary(uuid, uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_edit_itinerary(uuid, uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_itinerary_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_itinerary_owner(uuid, uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_itinerary_public(uuid)           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_chat_member(uuid, uuid)          TO authenticated, service_role;

-- get_or_create_direct_conversation must remain callable via PostgREST RPC, so it
-- stays in public. Tighten by ensuring only authenticated can execute it.
REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated, service_role;
