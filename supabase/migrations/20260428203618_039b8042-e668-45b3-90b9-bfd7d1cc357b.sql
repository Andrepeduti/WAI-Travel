REVOKE EXECUTE ON FUNCTION public.is_itinerary_public(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_itinerary_public(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_itinerary_public(uuid) FROM authenticated;