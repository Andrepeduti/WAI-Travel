
-- 1) profiles: drop blanket SELECT for authenticated
DROP POLICY IF EXISTS "Authenticated can view public profile columns" ON public.profiles;

-- 2) realtime.messages: scope by topic
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;

CREATE POLICY "Users read scoped realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() LIKE 'public:%'
  OR EXISTS (
    SELECT 1 FROM public.chat_conversation_members m
    WHERE m.user_id = auth.uid()
      AND realtime.topic() = ('conversation:' || m.conversation_id::text)
  )
  OR EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.user_id = auth.uid()
      AND realtime.topic() = ('itinerary:' || im.itinerary_id::text)
  )
  OR EXISTS (
    SELECT 1 FROM public.itineraries i
    WHERE i.user_id = auth.uid()
      AND realtime.topic() = ('itinerary:' || i.id::text)
  )
);

CREATE POLICY "Users send scoped realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM public.chat_conversation_members m
    WHERE m.user_id = auth.uid()
      AND realtime.topic() = ('conversation:' || m.conversation_id::text)
  )
  OR EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.user_id = auth.uid()
      AND realtime.topic() = ('itinerary:' || im.itinerary_id::text)
  )
  OR EXISTS (
    SELECT 1 FROM public.itineraries i
    WHERE i.user_id = auth.uid()
      AND realtime.topic() = ('itinerary:' || i.id::text)
  )
);

-- 3) get_or_create_direct_conversation: switch to SECURITY INVOKER and revoke broad EXECUTE
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  conv_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'invalid other user';
  END IF;

  SELECT c.id INTO conv_id
  FROM chat_conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM chat_conversation_members m1
      WHERE m1.conversation_id = c.id AND m1.user_id = me
    )
    AND EXISTS (
      SELECT 1 FROM chat_conversation_members m2
      WHERE m2.conversation_id = c.id AND m2.user_id = other_user_id
    )
    AND (
      SELECT count(*) FROM chat_conversation_members m3
      WHERE m3.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  INSERT INTO chat_conversations (is_group, name, created_by)
  VALUES (false, '', me)
  RETURNING id INTO conv_id;

  INSERT INTO chat_conversation_members (conversation_id, user_id)
  VALUES (conv_id, me), (conv_id, other_user_id);

  RETURN conv_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;
