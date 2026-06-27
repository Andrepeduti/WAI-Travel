
-- Conversations
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.chat_conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX chat_members_user_idx ON public.chat_conversation_members(user_id);
CREATE INDEX chat_members_conv_idx ON public.chat_conversation_members(conversation_id);

-- Messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'text',
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_conv_created_idx ON public.chat_messages(conversation_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is_chat_member
CREATE OR REPLACE FUNCTION public.is_chat_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

-- chat_conversations policies
CREATE POLICY "Members view conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (public.is_chat_member(id, auth.uid()));

CREATE POLICY "Authenticated can create conversation"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update conversation"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- chat_conversation_members policies
CREATE POLICY "Members view co-members"
  ON public.chat_conversation_members FOR SELECT TO authenticated
  USING (public.is_chat_member(conversation_id, auth.uid()));

CREATE POLICY "Authenticated can add members"
  ON public.chat_conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    -- self-join allowed; or creator of conversation can add others
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "User updates own membership"
  ON public.chat_conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can leave conversation"
  ON public.chat_conversation_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- chat_messages policies
CREATE POLICY "Members view messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_chat_member(conversation_id, auth.uid()));

CREATE POLICY "Members send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND public.is_chat_member(conversation_id, auth.uid())
  );

CREATE POLICY "Sender can delete own messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- updated_at trigger on conversations
CREATE TRIGGER chat_conversations_updated
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bump conversation updated_at when a new message is inserted
CREATE OR REPLACE FUNCTION public.bump_chat_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_bump_conv
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_chat_conversation_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
