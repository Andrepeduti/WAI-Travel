-- Migration: create_cities_table
-- Tabela para gerenciar destinos de viagem separadamente de atrações/lugares.

-- 1. Criar a tabela cities
CREATE TABLE IF NOT EXISTS public.cities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL UNIQUE,
  country             text,
  cover_photo_url     text,
  google_place_id     text UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_cities_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_cities_updated_at ON public.cities;
CREATE TRIGGER tr_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cities_updated_at();

-- Habilitar RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Cities are viewable by everyone"
  ON public.cities FOR SELECT USING (true);

CREATE POLICY "Anyone can insert cities"
  ON public.cities FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update cities"
  ON public.cities FOR UPDATE USING (true);

-- Permissões
GRANT ALL ON TABLE public.cities TO anon, authenticated, service_role;

-- 2. Limpeza de dados indevidos da tabela places
-- Como usamos a tabela places para cachear fotos de cidades até agora,
-- vamos limpar as linhas da tabela places que não possuem categoria ou 
-- que parecem ser cidades (só possuem cover_photo_url e name).
-- Isso é seguro pois os lugares reais inseridos possuem category, ou latitude/longitude, etc.
DELETE FROM public.places 
WHERE category IS NULL 
  AND latitude IS NULL 
  AND (google_place_id IS NULL OR google_place_id = '');
