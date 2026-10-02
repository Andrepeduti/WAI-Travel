-- Migration: create_cached_place_details
-- Tabela para cache unificado de detalhes enriquecidos de lugares (Google Places + Gemini AI)

CREATE TABLE IF NOT EXISTS public.cached_place_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_key text NOT NULL UNIQUE, -- chave normalizada (ex: "torre eiffel|paris" ou place_id)
  name text NOT NULL,
  city text,
  country text,
  formatted_address text,
  lat double precision,
  lng double precision,
  opening_hours jsonb, -- { weekdayDescriptions: string[], openNow?: boolean, todayHours?: string }
  photos text[] DEFAULT '{}',
  description text,
  average_expense text,
  tags text[] DEFAULT '{}',
  tips text[] DEFAULT '{}',
  category text,
  rating numeric,
  user_rating_count integer,
  website text,
  raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_cached_place_details_key ON public.cached_place_details(place_key);
CREATE INDEX IF NOT EXISTS idx_cached_place_details_name ON public.cached_place_details(name);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_cached_place_details_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_cached_place_details_updated_at ON public.cached_place_details;
CREATE TRIGGER tr_cached_place_details_updated_at
  BEFORE UPDATE ON public.cached_place_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cached_place_details_updated_at();

-- Habilitar RLS
ALTER TABLE public.cached_place_details ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: público/autenticado pode ler e inserir/atualizar cache
CREATE POLICY "Cached place details are viewable by everyone"
  ON public.cached_place_details
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert cached place details"
  ON public.cached_place_details
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update cached place details"
  ON public.cached_place_details
  FOR UPDATE
  USING (true);

-- Permissões de tabela para as roles do Supabase
GRANT ALL ON TABLE public.cached_place_details TO anon, authenticated, service_role;
