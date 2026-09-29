-- Vínculo de origem entre um roteiro da loja (cópia) e o roteiro pessoal que o originou.
-- ON DELETE SET NULL: apagar o pessoal não apaga nem quebra a cópia publicada.
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS source_itinerary_id UUID NULL
  REFERENCES public.itineraries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_itineraries_source_itinerary_id
  ON public.itineraries (source_itinerary_id);
