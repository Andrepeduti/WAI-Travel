CREATE TABLE IF NOT EXISTS public.profile_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_follows_not_self CHECK (follower_id <> following_id),
  CONSTRAINT profile_follows_unique UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.profile_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_blocks_not_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT profile_blocks_unique UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.profile_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  reason text NOT NULL DEFAULT 'Perfil denunciado',
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_reports_not_self CHECK (reporter_id <> reported_id),
  CONSTRAINT profile_reports_unique_open UNIQUE (reporter_id, reported_id, status)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_follows_follower ON public.profile_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_profile_follows_following ON public.profile_follows (following_id);
CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocker ON public.profile_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocked ON public.profile_blocks (blocked_id);
CREATE INDEX IF NOT EXISTS idx_profile_reports_reported ON public.profile_reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follows involving themselves"
ON public.profile_follows
FOR SELECT
TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can follow other profiles"
ON public.profile_follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);

CREATE POLICY "Users can unfollow profiles"
ON public.profile_follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

CREATE POLICY "Users can view their own blocks"
ON public.profile_blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block profiles"
ON public.profile_blocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

CREATE POLICY "Users can unblock profiles"
ON public.profile_blocks
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view reports they created"
ON public.profile_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Users can report profiles"
ON public.profile_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_id);

CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their notifications read"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_profile_follow_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
  follower_avatar text;
BEGIN
  UPDATE public.profiles
  SET following_count = following_count + 1
  WHERE user_id = NEW.follower_id;

  UPDATE public.profiles
  SET followers_count = followers_count + 1
  WHERE user_id = NEW.following_id;

  SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), 'Alguém'), avatar_url
  INTO follower_name, follower_avatar
  FROM public.profiles
  WHERE user_id = NEW.follower_id
  LIMIT 1;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, metadata)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    'Novo seguidor',
    follower_name || ' começou a seguir você.',
    jsonb_build_object('actorName', follower_name, 'actorAvatar', COALESCE(follower_avatar, ''))
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_profile_follow_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET following_count = GREATEST(following_count - 1, 0)
  WHERE user_id = OLD.follower_id;

  UPDATE public.profiles
  SET followers_count = GREATEST(followers_count - 1, 0)
  WHERE user_id = OLD.following_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_follow_created ON public.profile_follows;
CREATE TRIGGER on_profile_follow_created
AFTER INSERT ON public.profile_follows
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_follow_created();

DROP TRIGGER IF EXISTS on_profile_follow_deleted ON public.profile_follows;
CREATE TRIGGER on_profile_follow_deleted
AFTER DELETE ON public.profile_follows
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_follow_deleted();

CREATE OR REPLACE FUNCTION public.handle_profile_block_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profile_follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_block_created ON public.profile_blocks;
CREATE TRIGGER on_profile_block_created
AFTER INSERT ON public.profile_blocks
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_block_created();