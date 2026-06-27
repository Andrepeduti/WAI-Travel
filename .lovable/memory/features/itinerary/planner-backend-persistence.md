---
name: Planner backend persistence
description: Atividades e transportes do planner persistem no Lovable Cloud (tabelas `itinerary_activities` e `itinerary_transports`) com cache local stale-while-revalidate
type: feature
---

Conteúdo do roteiro (atividades, notas inline e blocos de transporte entre atividades) agora vive no **Lovable Cloud**, não mais só em localStorage.

**Tabelas:**
- `itinerary_activities`: `itinerary_id uuid`, `user_id uuid`, `day int`, `position int`, `type text` ('activity'|'note'), `name`, `category`, `category_color`, `image`, `open_hours`, `price`, `start_time`, `end_time`, `rating numeric`, `lat`, `lng`, `note_text`, `observation`, `metadata jsonb` (guarda `legacyId` numérico para conciliar com o estado em memória).
- `itinerary_transports`: `itinerary_id`, `user_id`, `day`, `position`, `mode` ('walk'|'bus'|'metro'|'car'), `duration`, `cost`, `distance`, `metadata`.
- Função `public.is_itinerary_public(uuid)` (security definer, EXECUTE revogado de PUBLIC/anon/authenticated) usada em policies para liberar SELECT em activities/transports de roteiros à venda (`is_public=true`). Dono sempre tem CRUD.

**API:** `src/lib/plannerApi.ts`
- `loadPlannerData(itineraryId)` → busca activities + transports em paralelo.
- `savePlannerData(itineraryId, data)` → bulk replace (delete-then-insert) de tudo do roteiro.
- `cloneItineraryContent(sourceId, targetId)` → usado por `publishItineraryAsCopy` para gerar uma cópia 100% server-side ao publicar como à venda (resolve o bug de edições espelhadas entre versão privada e pública).

**PlannerItineraryScreen:**
- Mantém `localStorage` (`wai-travel-planner-activities`, `wai-travel-planner-transports`) como cache de leitura imediata.
- `useEffect` no mount chama `loadPlannerData` e sobrescreve o estado se houver dados remotos (stale-while-revalidate; só sobrescreve se o backend não estiver vazio, evitando zerar o local antes do primeiro save).
- `useEffect` debounced (600ms) chama `savePlannerData` a cada mudança de `dayActivities`/`dayTransports`.
- Sync só roda quando `itineraryId` é um uuid (roteiros próprios persistidos); roteiros mock/legacy continuam só locais.

**plannerActivitiesStore.ts:** mantém helpers síncronos lendo do localStorage (compatibilidade) e adiciona `loadPlannerActivitiesAsync` / `loadPlannerTransportsAsync` que consultam o backend.
