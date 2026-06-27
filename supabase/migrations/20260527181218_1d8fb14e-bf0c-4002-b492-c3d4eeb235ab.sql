
CREATE OR REPLACE FUNCTION public.handle_itinerary_published_for_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_name text;
  author_avatar text;
  was_for_sale boolean := false;
  is_for_sale boolean;
BEGIN
  is_for_sale := COALESCE(NEW.is_public, false) AND COALESCE(NEW.price_cents, 0) > 0;

  IF TG_OP = 'UPDATE' THEN
    was_for_sale := COALESCE(OLD.is_public, false) AND COALESCE(OLD.price_cents, 0) > 0;
  END IF;

  IF NOT is_for_sale OR was_for_sale THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), 'Alguém'), avatar_url
    INTO author_name, author_avatar
  FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, metadata)
  SELECT
    f.follower_id,
    NEW.user_id,
    'new_itinerary_for_sale',
    'Novo roteiro à venda',
    author_name || ' acabou de publicar um novo roteiro à venda: ' || COALESCE(NULLIF(NEW.title, ''), 'um roteiro'),
    jsonb_build_object(
      'itineraryId', NEW.id,
      'itineraryTitle', NEW.title,
      'priceCents', NEW.price_cents,
      'actorName', author_name,
      'actorAvatar', COALESCE(author_avatar, '')
    )
  FROM public.profile_follows f
  WHERE f.following_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_itinerary_published_for_sale_ins ON public.itineraries;
DROP TRIGGER IF EXISTS trg_itinerary_published_for_sale_upd ON public.itineraries;

CREATE TRIGGER trg_itinerary_published_for_sale_ins
AFTER INSERT ON public.itineraries
FOR EACH ROW
EXECUTE FUNCTION public.handle_itinerary_published_for_sale();

CREATE TRIGGER trg_itinerary_published_for_sale_upd
AFTER UPDATE OF is_public, price_cents ON public.itineraries
FOR EACH ROW
EXECUTE FUNCTION public.handle_itinerary_published_for_sale();
