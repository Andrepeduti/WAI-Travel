-- =========================================================
-- 1. ENUM para papéis de membros
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.itinerary_role AS ENUM ('editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. Tabela de membros de roteiros
-- =========================================================
CREATE TABLE IF NOT EXISTS public.itinerary_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.itinerary_role NOT NULL DEFAULT 'viewer',
  invited_by uuid,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (itinerary_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_members_itinerary ON public.itinerary_members(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_members_user ON public.itinerary_members(user_id);

ALTER TABLE public.itinerary_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_itinerary_members_updated_at
  BEFORE UPDATE ON public.itinerary_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. Tabela de convites
-- =========================================================
CREATE TABLE IF NOT EXISTS public.itinerary_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_user_id uuid,            -- convite direto
  invite_token text UNIQUE,         -- convite por link
  role public.itinerary_role NOT NULL DEFAULT 'viewer',
  status public.invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_invites_itinerary ON public.itinerary_invites(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_invites_invitee ON public.itinerary_invites(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_invites_token ON public.itinerary_invites(invite_token);

ALTER TABLE public.itinerary_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_itinerary_invites_updated_at
  BEFORE UPDATE ON public.itinerary_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. Funções security definer (evita recursão em RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_user_itinerary_role(_itinerary_id uuid, _user_id uuid)
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

CREATE OR REPLACE FUNCTION public.can_view_itinerary(_itinerary_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.itineraries WHERE id = _itinerary_id AND (user_id = _user_id OR is_public = true)
  ) OR EXISTS (
    SELECT 1 FROM public.itinerary_members WHERE itinerary_id = _itinerary_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_itinerary(_itinerary_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.itineraries WHERE id = _itinerary_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.itinerary_members WHERE itinerary_id = _itinerary_id AND user_id = _user_id AND role = 'editor'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_itinerary_owner(_itinerary_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.itineraries WHERE id = _itinerary_id AND user_id = _user_id);
$$;

-- =========================================================
-- 5. RLS de itinerary_members
-- =========================================================
DROP POLICY IF EXISTS "Members visible to participants" ON public.itinerary_members;
CREATE POLICY "Members visible to participants" ON public.itinerary_members
  FOR SELECT TO authenticated
  USING (
    public.is_itinerary_owner(itinerary_id, auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner manages members" ON public.itinerary_members;
CREATE POLICY "Owner manages members" ON public.itinerary_members
  FOR ALL TO authenticated
  USING (public.is_itinerary_owner(itinerary_id, auth.uid()))
  WITH CHECK (public.is_itinerary_owner(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Members can leave" ON public.itinerary_members;
CREATE POLICY "Members can leave" ON public.itinerary_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Permite que o sistema crie membership ao aceitar convite (insert via convite aceito)
DROP POLICY IF EXISTS "Self insert via accepted invite" ON public.itinerary_members;
CREATE POLICY "Self insert via accepted invite" ON public.itinerary_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.itinerary_invites i
      WHERE i.itinerary_id = itinerary_members.itinerary_id
        AND i.invitee_user_id = auth.uid()
        AND i.status = 'pending'
        AND i.role = itinerary_members.role
    )
  );

-- =========================================================
-- 6. RLS de itinerary_invites
-- =========================================================
DROP POLICY IF EXISTS "Invites visible to inviter and invitee" ON public.itinerary_invites;
CREATE POLICY "Invites visible to inviter and invitee" ON public.itinerary_invites
  FOR SELECT TO authenticated
  USING (
    inviter_id = auth.uid()
    OR invitee_user_id = auth.uid()
    OR public.is_itinerary_owner(itinerary_id, auth.uid())
  );

DROP POLICY IF EXISTS "Owner creates invites" ON public.itinerary_invites;
CREATE POLICY "Owner creates invites" ON public.itinerary_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND public.is_itinerary_owner(itinerary_id, auth.uid())
  );

DROP POLICY IF EXISTS "Owner or invitee updates invite" ON public.itinerary_invites;
CREATE POLICY "Owner or invitee updates invite" ON public.itinerary_invites
  FOR UPDATE TO authenticated
  USING (
    public.is_itinerary_owner(itinerary_id, auth.uid())
    OR invitee_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_itinerary_owner(itinerary_id, auth.uid())
    OR invitee_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner deletes invites" ON public.itinerary_invites;
CREATE POLICY "Owner deletes invites" ON public.itinerary_invites
  FOR DELETE TO authenticated
  USING (public.is_itinerary_owner(itinerary_id, auth.uid()));

-- =========================================================
-- 7. Atualiza RLS de itineraries para membros verem
-- =========================================================
DROP POLICY IF EXISTS "Members can view itineraries" ON public.itineraries;
CREATE POLICY "Members can view itineraries" ON public.itineraries
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.itinerary_members m WHERE m.itinerary_id = itineraries.id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Editors can update itineraries" ON public.itineraries;
CREATE POLICY "Editors can update itineraries" ON public.itineraries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.itinerary_members m WHERE m.itinerary_id = itineraries.id AND m.user_id = auth.uid() AND m.role = 'editor')
  );

-- =========================================================
-- 8. Atualiza RLS das sub-tabelas (activities, transports, reservations, doc_transports)
-- =========================================================

-- itinerary_activities
DROP POLICY IF EXISTS "Members can view activities" ON public.itinerary_activities;
CREATE POLICY "Members can view activities" ON public.itinerary_activities
  FOR SELECT TO authenticated
  USING (public.can_view_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can insert activities" ON public.itinerary_activities;
CREATE POLICY "Editors can insert activities" ON public.itinerary_activities
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can update activities" ON public.itinerary_activities;
CREATE POLICY "Editors can update activities" ON public.itinerary_activities
  FOR UPDATE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can delete activities" ON public.itinerary_activities;
CREATE POLICY "Editors can delete activities" ON public.itinerary_activities
  FOR DELETE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

-- itinerary_transports
DROP POLICY IF EXISTS "Members can view transports" ON public.itinerary_transports;
CREATE POLICY "Members can view transports" ON public.itinerary_transports
  FOR SELECT TO authenticated
  USING (public.can_view_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can insert transports" ON public.itinerary_transports;
CREATE POLICY "Editors can insert transports" ON public.itinerary_transports
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can update transports" ON public.itinerary_transports;
CREATE POLICY "Editors can update transports" ON public.itinerary_transports
  FOR UPDATE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can delete transports" ON public.itinerary_transports;
CREATE POLICY "Editors can delete transports" ON public.itinerary_transports
  FOR DELETE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

-- itinerary_reservations
DROP POLICY IF EXISTS "Members can view reservations" ON public.itinerary_reservations;
CREATE POLICY "Members can view reservations" ON public.itinerary_reservations
  FOR SELECT TO authenticated
  USING (public.can_view_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can insert reservations" ON public.itinerary_reservations;
CREATE POLICY "Editors can insert reservations" ON public.itinerary_reservations
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can update reservations" ON public.itinerary_reservations;
CREATE POLICY "Editors can update reservations" ON public.itinerary_reservations
  FOR UPDATE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can delete reservations" ON public.itinerary_reservations;
CREATE POLICY "Editors can delete reservations" ON public.itinerary_reservations
  FOR DELETE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

-- itinerary_doc_transports
DROP POLICY IF EXISTS "Members can view doc transports" ON public.itinerary_doc_transports;
CREATE POLICY "Members can view doc transports" ON public.itinerary_doc_transports
  FOR SELECT TO authenticated
  USING (public.can_view_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can insert doc transports" ON public.itinerary_doc_transports;
CREATE POLICY "Editors can insert doc transports" ON public.itinerary_doc_transports
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can update doc transports" ON public.itinerary_doc_transports;
CREATE POLICY "Editors can update doc transports" ON public.itinerary_doc_transports
  FOR UPDATE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can delete doc transports" ON public.itinerary_doc_transports;
CREATE POLICY "Editors can delete doc transports" ON public.itinerary_doc_transports
  FOR DELETE TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

-- =========================================================
-- 9. Trigger: notificação quando novo convite é criado
-- =========================================================
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
BEGIN
  IF NEW.invitee_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), 'Alguém'), avatar_url
    INTO inviter_name, inviter_avatar
  FROM public.profiles WHERE user_id = NEW.inviter_id LIMIT 1;

  SELECT COALESCE(NULLIF(title, ''), 'um roteiro') INTO itin_title
  FROM public.itineraries WHERE id = NEW.itinerary_id LIMIT 1;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, metadata)
  VALUES (
    NEW.invitee_user_id,
    NEW.inviter_id,
    'itinerary_invite',
    'Convite para roteiro',
    inviter_name || ' convidou você para "' || itin_title || '".',
    jsonb_build_object(
      'inviteId', NEW.id,
      'itineraryId', NEW.itinerary_id,
      'role', NEW.role,
      'actorName', inviter_name,
      'actorAvatar', COALESCE(inviter_avatar, '')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_itinerary_invite_created ON public.itinerary_invites;
CREATE TRIGGER trg_itinerary_invite_created
  AFTER INSERT ON public.itinerary_invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_itinerary_invite_created();