-- =========================================================
-- Helper: checa se um itinerário é público (security definer)
-- Evita recursão e permite uso em policies de outras tabelas
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_itinerary_public(_itinerary_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.itineraries
    WHERE id = _itinerary_id AND is_public = true
  );
$$;

-- =========================================================
-- itinerary_activities
-- =========================================================
CREATE TABLE public.itinerary_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  user_id uuid NOT NULL,
  day integer NOT NULL,
  position integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'activity',
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  category_color text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  open_hours text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  start_time text NOT NULL DEFAULT '',
  end_time text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 0,
  lat double precision,
  lng double precision,
  note_text text,
  observation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_activities_lookup
  ON public.itinerary_activities (itinerary_id, day, position);
CREATE INDEX idx_itinerary_activities_user
  ON public.itinerary_activities (user_id);

ALTER TABLE public.itinerary_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities"
  ON public.itinerary_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public itinerary activities are viewable"
  ON public.itinerary_activities FOR SELECT TO authenticated
  USING (public.is_itinerary_public(itinerary_id));

CREATE POLICY "Users can insert their own activities"
  ON public.itinerary_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
  ON public.itinerary_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
  ON public.itinerary_activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_itinerary_activities_updated_at
  BEFORE UPDATE ON public.itinerary_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- itinerary_transports
-- =========================================================
CREATE TABLE public.itinerary_transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  user_id uuid NOT NULL,
  day integer NOT NULL,
  position integer NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'walk',
  duration text,
  cost text,
  distance text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_transports_lookup
  ON public.itinerary_transports (itinerary_id, day, position);
CREATE INDEX idx_itinerary_transports_user
  ON public.itinerary_transports (user_id);

ALTER TABLE public.itinerary_transports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transports"
  ON public.itinerary_transports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public itinerary transports are viewable"
  ON public.itinerary_transports FOR SELECT TO authenticated
  USING (public.is_itinerary_public(itinerary_id));

CREATE POLICY "Users can insert their own transports"
  ON public.itinerary_transports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transports"
  ON public.itinerary_transports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transports"
  ON public.itinerary_transports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_itinerary_transports_updated_at
  BEFORE UPDATE ON public.itinerary_transports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- favorites
-- =========================================================
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  itinerary_id uuid NOT NULL,
  legacy_id bigint,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, itinerary_id)
);

CREATE INDEX idx_favorites_user ON public.favorites (user_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON public.favorites FOR DELETE TO authenticated
  USING (auth.uid() = user_id);