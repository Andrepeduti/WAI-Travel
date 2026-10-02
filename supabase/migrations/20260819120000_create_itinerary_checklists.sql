-- Migration: create_itinerary_checklists
-- Cria as tabelas para suportar o Checklist de Roteiros (Categorias e Itens - 1:N)

-- 1. Tabela de Categorias do Checklist
CREATE TABLE IF NOT EXISTS public.itinerary_checklist_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'category',
  icon_bg text NOT NULL DEFAULT 'hsl(210 100% 52% / 0.12)',
  icon_color text NOT NULL DEFAULT 'text-blue-500',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Tabela de Itens do Checklist (Relacionamento 1:N com Categorias)
CREATE TABLE IF NOT EXISTS public.itinerary_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.itinerary_checklist_categories(id) ON DELETE CASCADE,
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  checked boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_checklist_categories_itinerary ON public.itinerary_checklist_categories(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_checklist_categories_user ON public.itinerary_checklist_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_category ON public.itinerary_checklist_items(category_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_itinerary ON public.itinerary_checklist_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_user ON public.itinerary_checklist_items(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.itinerary_checklist_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_checklist_items ENABLE ROW LEVEL SECURITY;

-- ─── Políticas RLS: itinerary_checklist_categories ───────────────────────────

CREATE POLICY "Users can view checklist categories of their itineraries"
ON public.itinerary_checklist_categories
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_categories.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert checklist categories into their itineraries"
ON public.itinerary_checklist_categories
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_categories.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update checklist categories of their itineraries"
ON public.itinerary_checklist_categories
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_categories.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete checklist categories of their itineraries"
ON public.itinerary_checklist_categories
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_categories.itinerary_id
    AND im.user_id = auth.uid()
  )
);

-- ─── Políticas RLS: itinerary_checklist_items ────────────────────────────────

CREATE POLICY "Users can view checklist items of their itineraries"
ON public.itinerary_checklist_items
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_items.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert checklist items into their itineraries"
ON public.itinerary_checklist_items
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_items.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update checklist items of their itineraries"
ON public.itinerary_checklist_items
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_items.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete checklist items of their itineraries"
ON public.itinerary_checklist_items
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_checklist_items.itinerary_id
    AND im.user_id = auth.uid()
  )
);

-- Concessões de permissão
GRANT ALL ON public.itinerary_checklist_categories TO authenticated;
GRANT ALL ON public.itinerary_checklist_items TO authenticated;
