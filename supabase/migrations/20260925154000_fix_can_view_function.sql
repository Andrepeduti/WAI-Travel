CREATE OR REPLACE FUNCTION public.can_view_itinerary(_itinerary_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.itineraries WHERE id = _itinerary_id AND (user_id = _user_id OR status = 'published')
  ) OR EXISTS (
    SELECT 1 FROM public.itinerary_members WHERE itinerary_id = _itinerary_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_itinerary_access(_itinerary_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.itineraries WHERE id = _itinerary_id AND user_id = _user_id) THEN 'owner'
    WHEN EXISTS (SELECT 1 FROM public.itinerary_members WHERE itinerary_id = _itinerary_id AND user_id = _user_id AND role = 'editor') THEN 'editor'
    WHEN EXISTS (SELECT 1 FROM public.itinerary_members WHERE itinerary_id = _itinerary_id AND user_id = _user_id AND role = 'viewer') THEN 'viewer'
    ELSE NULL
  END;
$$;
