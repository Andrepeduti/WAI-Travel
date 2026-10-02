-- Migration: create_places_table
-- Tabela centralizada de lugares com enriquecimento progressivo.
-- Substitui a tabela cached_place_details como fonte única de verdade.

-- 1. Criar a nova tabela places
CREATE TABLE IF NOT EXISTS public.places (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id     text UNIQUE,

  -- Básico (da IA ou Autocomplete)
  name                text NOT NULL,
  short_description   text,
  country             text,
  city                text,
  category            text,
  tags                text[] DEFAULT '{}',

  -- Localização (Place Details)
  latitude            double precision,
  longitude           double precision,
  formatted_address   text,

  -- Detalhes (Place Details Full)
  rating              numeric(3,1),
  user_ratings_total  integer,
  price_level         integer,
  website             text,
  phone               text,
  opening_hours       jsonb,

  -- Fotos
  cover_photo_url     text,       -- URL no Supabase Storage (permanente)
  photos              jsonb,      -- array de URLs extras no Storage

  -- Conteúdo IA
  ai_tips             text[] DEFAULT '{}',
  ai_full_description text,

  -- Custo / meta da IA
  average_expense     text,
  price               text,

  -- Controle
  enrichment_level    text NOT NULL DEFAULT 'basic'
                      CHECK (enrichment_level IN ('basic', 'photos', 'full')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_places_google_id ON public.places(google_place_id);
CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);
CREATE INDEX IF NOT EXISTS idx_places_name ON public.places(name);
CREATE INDEX IF NOT EXISTS idx_places_name_city ON public.places(name, city);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_places_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_places_updated_at ON public.places;
CREATE TRIGGER tr_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.update_places_updated_at();

-- Habilitar RLS
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: público/autenticado pode ler e inserir/atualizar
CREATE POLICY "Places are viewable by everyone"
  ON public.places FOR SELECT USING (true);

CREATE POLICY "Anyone can insert places"
  ON public.places FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update places"
  ON public.places FOR UPDATE USING (true);

-- Permissões de tabela
GRANT ALL ON TABLE public.places TO anon, authenticated, service_role;


-- 2. Migrar dados existentes de cached_place_details para places
INSERT INTO public.places (
  name, city, country, formatted_address, latitude, longitude,
  opening_hours, cover_photo_url, photos,
  short_description, average_expense, tags, ai_tips,
  category, rating, user_ratings_total, website,
  enrichment_level, created_at, updated_at
)
SELECT
  cpd.name,
  cpd.city,
  cpd.country,
  cpd.formatted_address,
  cpd.lat,
  cpd.lng,
  cpd.opening_hours,
  CASE WHEN cpd.photos IS NOT NULL AND array_length(cpd.photos, 1) > 0
       THEN cpd.photos[1]
       ELSE NULL END,
  to_jsonb(cpd.photos),
  cpd.description,
  cpd.average_expense,
  cpd.tags,
  cpd.tips,
  cpd.category,
  cpd.rating,
  cpd.user_rating_count,
  cpd.website,
  'full',
  cpd.created_at,
  cpd.updated_at
FROM public.cached_place_details cpd
WHERE NOT EXISTS (
  SELECT 1 FROM public.places p WHERE lower(p.name) = lower(cpd.name) AND lower(coalesce(p.city,'')) = lower(coalesce(cpd.city,''))
);


-- 3. Criar tabela de controle de uso da API (kill switch)
CREATE TABLE IF NOT EXISTS public.api_usage_counter (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name        text NOT NULL,                    -- ex: 'google_places'
  call_date       date NOT NULL DEFAULT CURRENT_DATE,
  call_count      integer NOT NULL DEFAULT 0,
  daily_limit     integer NOT NULL DEFAULT 500,     -- limite diário configurável
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(api_name, call_date)
);

ALTER TABLE public.api_usage_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "API usage counter is viewable by everyone"
  ON public.api_usage_counter FOR SELECT USING (true);

CREATE POLICY "Anyone can insert api usage counter"
  ON public.api_usage_counter FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update api usage counter"
  ON public.api_usage_counter FOR UPDATE USING (true);

GRANT ALL ON TABLE public.api_usage_counter TO anon, authenticated, service_role;


-- 4. Criar bucket para fotos de lugares (se não existir)
-- Nota: buckets precisam ser criados via Supabase Dashboard ou client SDK.
-- Esta é apenas uma referência. O bucket 'place-photos' deve ser criado manualmente
-- no Dashboard > Storage com acesso público para leitura.
