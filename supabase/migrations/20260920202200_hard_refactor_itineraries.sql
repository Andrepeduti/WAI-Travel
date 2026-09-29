-- hard_refactor_itineraries.sql
-- Migration baseada no plano de implementação (data_model_analysis.md)

-- BLOCO A: Criação da itinerary_store_listing
CREATE TABLE public.itinerary_store_listing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE UNIQUE,
    seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listed_title text NOT NULL,
    listed_description text,
    tags text[] DEFAULT '{}'::text[],
    seasons text[] DEFAULT '{}'::text[],
    price_cents integer DEFAULT 0,
    is_flexible_dates boolean DEFAULT true,
    duration_days integer,
    travel_month text,
    available_start_date date,
    available_end_date date,
    avg_rating numeric(3,1) DEFAULT 0,
    review_count integer DEFAULT 0,
    sales_count integer DEFAULT 0,
    status text DEFAULT 'active',
    published_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS para itinerary_store_listing
ALTER TABLE public.itinerary_store_listing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active store listings"
  ON public.itinerary_store_listing FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can manage their own listings"
  ON public.itinerary_store_listing FOR ALL TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE TRIGGER trg_itinerary_store_listing_updated_at
  BEFORE UPDATE ON public.itinerary_store_listing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conceder permissões básicas para as roles da API do Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_store_listing TO authenticated;
GRANT SELECT ON public.itinerary_store_listing TO anon;
GRANT ALL ON public.itinerary_store_listing TO service_role;

-- BLOCO B: Limpeza da tabela itineraries
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Drop de colunas obsoletas e de marketplace
ALTER TABLE public.itineraries
  DROP COLUMN IF EXISTS is_public CASCADE,
  DROP COLUMN IF EXISTS price_cents CASCADE,
  DROP COLUMN IF EXISTS images CASCADE,
  DROP COLUMN IF EXISTS participants CASCADE,
  DROP COLUMN IF EXISTS tags CASCADE,
  DROP COLUMN IF EXISTS main_tag CASCADE,
  DROP COLUMN IF EXISTS is_paused CASCADE;

-- Limpar triggers obsoletos baseados nessas colunas
DROP TRIGGER IF EXISTS trg_itinerary_published_for_sale_ins ON public.itineraries;
DROP TRIGGER IF EXISTS trg_itinerary_published_for_sale_upd ON public.itineraries;
DROP FUNCTION IF EXISTS public.handle_itinerary_published_for_sale();
ALTER TABLE public.itineraries
  DROP COLUMN IF EXISTS extra_people CASCADE,
  DROP COLUMN IF EXISTS source_dataset_id CASCADE,
  DROP COLUMN IF EXISTS is_paused CASCADE;

-- BLOCO C: Limpeza de itinerary_activities
ALTER TABLE public.itinerary_activities
  ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS label text;

-- Remover colunas obsoletas (tudo que duplica places e dados de horário)
ALTER TABLE public.itinerary_activities
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS category_color,
  DROP COLUMN IF EXISTS image,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS lat,
  DROP COLUMN IF EXISTS lng,
  DROP COLUMN IF EXISTS open_hours,
  DROP COLUMN IF EXISTS custom_image,
  DROP COLUMN IF EXISTS observation,
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time,
  DROP COLUMN IF EXISTS updated_at;

-- BLOCO D: Limpeza de Tabelas Auxiliares
-- Remover phone e website de places
ALTER TABLE public.places
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS website;

-- Limpar snapshot de favorites
ALTER TABLE public.favorites
  DROP COLUMN IF EXISTS snapshot;

-- Apagar tabelas de coleções e cache
DROP TABLE IF EXISTS public.collection_places CASCADE;
DROP TABLE IF EXISTS public.collection_folders CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.cached_place_details CASCADE;

-- BLOCO E: Otimização de Performance
-- Índice para melhorar checagem de compra
CREATE INDEX IF NOT EXISTS idx_itinerary_sales_buyer_itinerary 
  ON public.itinerary_sales(buyer_id, itinerary_id);

-- O Trigger de contagem será implementado numa próxima fase caso a regra de negócio exija atualização live.
