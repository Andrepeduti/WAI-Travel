-- Reparo de dados: cópias da loja publicadas enquanto is_itinerary_public()
-- estava quebrada (coluna is_public removida) foram criadas SEM atividades e
-- transportes — a leitura do roteiro de origem falhava e o clone gravava vazio.
--
-- Copia o conteúdo atual do roteiro pessoal de origem para as cópias da loja
-- totalmente vazias (sem atividades E sem transportes). As demais não são tocadas.
-- Um único comando: todos os CTEs enxergam o mesmo snapshot, então o critério
-- "vazia" é avaliado uma vez para os dois INSERTs.
-- O trigger trg_sync_itinerary_places_count atualiza places_count.

WITH empty_store_copies AS (
  SELECT c.id, c.user_id, c.source_itinerary_id
    FROM public.itineraries c
   WHERE c.source_itinerary_id IS NOT NULL
     AND c.is_personal = false
     AND c.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.itinerary_activities x WHERE x.itinerary_id = c.id)
     AND NOT EXISTS (SELECT 1 FROM public.itinerary_transports x WHERE x.itinerary_id = c.id)
),
copied_transports AS (
  INSERT INTO public.itinerary_transports
    (itinerary_id, user_id, day, position, mode, duration, cost, distance, metadata)
  SELECT ec.id, ec.user_id, t.day, t.position, t.mode, t.duration, t.cost, t.distance, t.metadata
    FROM empty_store_copies ec
    JOIN public.itinerary_transports t ON t.itinerary_id = ec.source_itinerary_id
  RETURNING 1
)
INSERT INTO public.itinerary_activities
  (itinerary_id, user_id, day, position, type, label, place_id, note_text, metadata)
SELECT ec.id, ec.user_id, a.day, a.position, a.type, a.label, a.place_id, a.note_text, a.metadata
  FROM empty_store_copies ec
  JOIN public.itinerary_activities a ON a.itinerary_id = ec.source_itinerary_id;
