-- itineraries.places_count só era gravado ao criar o roteiro (ou a cópia da loja),
-- então ficava 0/desatualizado. Passa a ser mantido por trigger:
-- quantidade de atividades do tipo 'activity' (notas não contam como local).

CREATE OR REPLACE FUNCTION public.sync_itinerary_places_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_itinerary uuid := COALESCE(NEW.itinerary_id, OLD.itinerary_id);
BEGIN
  UPDATE public.itineraries
     SET places_count = (
       SELECT count(*) FROM public.itinerary_activities
        WHERE itinerary_id = target_itinerary AND type = 'activity'
     )
   WHERE id = target_itinerary;

  -- Atividade movida para outro roteiro: atualiza também o de origem.
  IF TG_OP = 'UPDATE' AND OLD.itinerary_id IS DISTINCT FROM NEW.itinerary_id THEN
    UPDATE public.itineraries
       SET places_count = (
         SELECT count(*) FROM public.itinerary_activities
          WHERE itinerary_id = OLD.itinerary_id AND type = 'activity'
       )
     WHERE id = OLD.itinerary_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_itinerary_places_count ON public.itinerary_activities;
CREATE TRIGGER trg_sync_itinerary_places_count
  AFTER INSERT OR UPDATE OF itinerary_id, type OR DELETE ON public.itinerary_activities
  FOR EACH ROW EXECUTE FUNCTION public.sync_itinerary_places_count();

-- Backfill
UPDATE public.itineraries i
   SET places_count = COALESCE(a.total, 0)
  FROM (
    SELECT it.id, count(act.id) FILTER (WHERE act.type = 'activity') AS total
      FROM public.itineraries it
      LEFT JOIN public.itinerary_activities act ON act.itinerary_id = it.id
     GROUP BY it.id
  ) a
 WHERE a.id = i.id;
