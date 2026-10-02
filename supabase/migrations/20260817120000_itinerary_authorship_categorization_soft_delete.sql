-- Migration: 20260817120000_itinerary_authorship_categorization_soft_delete.sql
-- Adiciona colunas para categorização de tabs (pessoal vs venda) e soft delete.

-- 1. Cria a coluna is_personal (define se o roteiro foi criado como pessoal)
ALTER TABLE public.itineraries 
  ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT true;

-- 2. Cria a coluna deleted_at para o Soft Delete
ALTER TABLE public.itineraries 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Índices de performance para busca e listagens rápidas
CREATE INDEX IF NOT EXISTS idx_itineraries_deleted_at 
  ON public.itineraries (deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_itineraries_is_personal 
  ON public.itineraries (is_personal);

CREATE INDEX IF NOT EXISTS idx_itineraries_public_active 
  ON public.itineraries (is_public, deleted_at) 
  WHERE is_public = true AND deleted_at IS NULL;

-- 4. Atualiza roteiros legados que foram criados estritamente para venda
UPDATE public.itineraries 
SET is_personal = false 
WHERE is_public = true 
  AND (tags @> ARRAY['_FLEXIBLE_DATES_'] OR price_cents > 0)
  AND is_personal IS NULL;
