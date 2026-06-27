
CREATE OR REPLACE FUNCTION public.handle_itinerary_invite_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_name text;
  inviter_avatar text;
  itin_title text;
  role_label text;
  action_label text;
BEGIN
  IF NEW.invitee_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), 'Alguém'), avatar_url
    INTO inviter_name, inviter_avatar
  FROM public.profiles WHERE user_id = NEW.inviter_id LIMIT 1;

  SELECT COALESCE(NULLIF(title, ''), 'um roteiro') INTO itin_title
  FROM public.itineraries WHERE id = NEW.itinerary_id LIMIT 1;

  IF NEW.role = 'editor'::itinerary_role THEN
    role_label := 'edição';
    action_label := 'Aceite para acessar e editar.';
  ELSE
    role_label := 'visualização';
    action_label := 'Aceite para acessar o roteiro.';
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, metadata)
  VALUES (
    NEW.invitee_user_id,
    NEW.inviter_id,
    'itinerary_invite',
    'Convite para roteiro',
    inviter_name || ' compartilhou "' || itin_title || '" com você (' || role_label || '). ' || action_label,
    jsonb_build_object(
      'inviteId', NEW.id,
      'itineraryId', NEW.itinerary_id,
      'itineraryTitle', itin_title,
      'role', NEW.role,
      'roleLabel', role_label,
      'actionLabel', action_label,
      'actorName', inviter_name,
      'actorAvatar', COALESCE(inviter_avatar, '')
    )
  );

  RETURN NEW;
END;
$$;
