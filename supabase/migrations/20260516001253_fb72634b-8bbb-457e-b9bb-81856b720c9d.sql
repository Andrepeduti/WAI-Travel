CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Procura conversa 1:1 existente entre os dois
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

  -- Cria nova conversa + membros
  INSERT INTO chat_conversations (is_group, name, created_by)
  VALUES (false, '', me)
  RETURNING id INTO conv_id;

  INSERT INTO chat_conversation_members (conversation_id, user_id)
  VALUES (conv_id, me), (conv_id, other_user_id);

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;