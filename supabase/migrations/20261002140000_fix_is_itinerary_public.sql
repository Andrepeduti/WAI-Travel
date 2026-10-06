-- A coluna itineraries.is_public foi removida (hard_refactor_itineraries), mas a
-- função is_itinerary_public() continuou referenciando-a — o Postgres não rastreia
-- dependências dentro do corpo de funções. Resultado: as policies de
-- itinerary_activities / itinerary_transports que a chamam falham com 42703.
--
-- Além disso, o DROP ... CASCADE removeu a policy "is_public = true" de
-- itineraries, então ninguém além do dono conseguia ler um roteiro à venda
-- (o join itinerary_store_listing -> itineraries vinha nulo).
--
-- "Público" agora = tem listing ativo na loja ou status 'published'
-- (mesma regra de can_view_itinerary).

CREATE OR REPLACE FUNCTION public.is_itinerary_public(_itinerary_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.itinerary_store_listing
     WHERE itinerary_id = _itinerary_id AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.itineraries
     WHERE id = _itinerary_id AND status = 'published' AND deleted_at IS NULL
  );
$$;

DROP POLICY IF EXISTS "Public itineraries are viewable by authenticated users" ON public.itineraries;
CREATE POLICY "Public itineraries are viewable by authenticated users"
  ON public.itineraries FOR SELECT TO authenticated
  USING (public.is_itinerary_public(id));
