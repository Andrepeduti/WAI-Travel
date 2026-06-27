
CREATE OR REPLACE FUNCTION public.handle_itinerary_invite_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitee_name text;
  invitee_avatar text;
  itin_title text;
  role_label text;
BEGIN
  IF NEW.status <> 'accepted'::invite_status THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.invitee_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), 'Alguém'), avatar_url
    INTO invitee_name, invitee_avatar
  FROM public.profiles WHERE user_id = NEW.invitee_user_id LIMIT 1;

  SELECT COALESCE(NULLIF(title, ''), 'um roteiro') INTO itin_title
  FROM public.itineraries WHERE id = NEW.itinerary_id LIMIT 1;

  IF NEW.role = 'editor'::itinerary_role THEN
    role_label := 'edição';
  ELSE
    role_label := 'visualização';
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, metadata)
  VALUES (
    NEW.inviter_id,
    NEW.invitee_user_id,
    'itinerary_invite_accepted',
    'Convite aceito',
    invitee_name || ' aceitou seu convite para "' || itin_title || '" (' || role_label || ').',
    jsonb_build_object(
      'inviteId', NEW.id,
      'itineraryId', NEW.itinerary_id,
      'itineraryTitle', itin_title,
      'role', NEW.role,
      'roleLabel', role_label,
      'actorName', invitee_name,
      'actorAvatar', COALESCE(invitee_avatar, '')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS itinerary_invite_accepted_notify ON public.itinerary_invites;
CREATE TRIGGER itinerary_invite_accepted_notify
AFTER UPDATE OF status ON public.itinerary_invites
FOR EACH ROW
EXECUTE FUNCTION public.handle_itinerary_invite_accepted();
