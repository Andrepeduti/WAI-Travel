-- Coleções do usuário
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  legacy_id bigint,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  cover_images text[] NOT NULL DEFAULT '{}',
  is_private boolean NOT NULL DEFAULT true,
  item_count integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_user ON public.collections(user_id);
CREATE INDEX idx_collections_user_legacy ON public.collections(user_id, legacy_id);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON public.collections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pastas dentro das coleções
CREATE TABLE public.collection_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  legacy_id bigint,
  name text NOT NULL DEFAULT '',
  cover_images text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_collection ON public.collection_folders(collection_id);
CREATE INDEX idx_folders_user ON public.collection_folders(user_id);

ALTER TABLE public.collection_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders"
  ON public.collection_folders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON public.collection_folders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.collection_folders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.collection_folders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON public.collection_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lugares salvos dentro de coleções (e opcionalmente dentro de pastas)
CREATE TABLE public.collection_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.collection_folders(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  legacy_id bigint,
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 0,
  review_count text NOT NULL DEFAULT '–',
  lat double precision NOT NULL DEFAULT 0,
  lng double precision NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_places_collection ON public.collection_places(collection_id);
CREATE INDEX idx_places_folder ON public.collection_places(folder_id);
CREATE INDEX idx_places_user ON public.collection_places(user_id);

ALTER TABLE public.collection_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own places"
  ON public.collection_places FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own places"
  ON public.collection_places FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own places"
  ON public.collection_places FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own places"
  ON public.collection_places FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_places_updated_at
  BEFORE UPDATE ON public.collection_places
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();