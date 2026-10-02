-- Cache de buscas (Text Search) + nome da foto do Google nos lugares.

-- Nome do recurso da foto (ex.: places/ChIJ.../photos/AUc...). Não contém a API key;
-- a URL é montada no front enquanto a foto ainda não está no Storage.
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS google_photo_name text;

CREATE TABLE IF NOT EXISTS public.place_search_cache (
  query_key        text PRIMARY KEY,          -- tokens normalizados e ordenados (query + cidade)
  google_place_ids text[] NOT NULL,           -- ids na ordem devolvida pelo Google
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.place_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Search cache is viewable by everyone"
  ON public.place_search_cache FOR SELECT USING (true);

CREATE POLICY "Anyone can insert search cache"
  ON public.place_search_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update search cache"
  ON public.place_search_cache FOR UPDATE USING (true);

GRANT ALL ON TABLE public.place_search_cache TO anon, authenticated, service_role;
