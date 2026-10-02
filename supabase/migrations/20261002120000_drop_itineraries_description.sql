-- A descrição comercial vive apenas em itinerary_store_listing.listed_description.

-- 1) Preserva dados existentes: copia para a listing quando ela ainda está sem descrição.
UPDATE public.itinerary_store_listing l
SET listed_description = i.description
FROM public.itineraries i
WHERE l.itinerary_id = i.id
  AND COALESCE(l.listed_description, '') = ''
  AND COALESCE(i.description, '') <> '';

-- 2) Remove a coluna obsoleta.
ALTER TABLE public.itineraries
  DROP COLUMN IF EXISTS description;
