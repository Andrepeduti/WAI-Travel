---
name: User itinerary persistence
description: Roteiros próprios do usuário persistem na tabela Supabase `itineraries` (id uuid string), com RLS por user_id e sync via realtime
type: feature
---

Roteiros criados pelo usuário (aba "Privados" em TripsScreen) são persistidos na **tabela `itineraries`** do Lovable Cloud (não mais em localStorage).

**Arquitetura:**
- Tabela: `public.itineraries` com colunas `id uuid PK`, `user_id`, `title`, `destinations text[]`, `start_date`, `end_date`, `images text[]`, `participants text[]`, `places_count`, `source_dataset_id` (referência opcional ao dataset estático do marketplace, para roteiros comprados), `created_at`, `updated_at`.
- RLS: cada usuário só lê/cria/edita/exclui os próprios roteiros (`auth.uid() = user_id`).
- API: `src/lib/itinerariesApi.ts` (`listMyItineraries`, `createItinerary`, `updateItinerary`, `deleteItinerary`).
- Hook: `src/hooks/use-my-itineraries.ts` (`useMyItineraries()` retorna `{ itineraries, loading, refetch, create, update, remove }`, com sync via `postgres_changes` realtime).

**Mudança de tipo:** `UserItinerary.id` agora é `string` (uuid) em vez de `number`. Mocks estáticos em `TripsScreen.privateItineraries` continuam usando `number`; cards unificam o id como `string | number`.

**Roteiros comprados:** ao sair do `MarketplaceItineraryScreen`, o roteiro é gravado como registro próprio com `source_dataset_id` apontando pro dataset original. Reabrir pela aba "Privados" reconstrói o `ItineraryDataset` via `getItineraryById(sourceDatasetId)` aplicando o offset de datas.

**Ainda em localStorage (próximas fases):** atividades/timeline do planner, coleções (`wai-travel-collections`), favoritos, países visitados.
