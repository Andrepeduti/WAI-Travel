---
name: Favorites system
description: Favoritos persistem na tabela Supabase `favorites` (RLS por user_id), com cache em localStorage para resposta otimista
type: feature
---

Favoritos agora ficam no **Lovable Cloud** (tabela `public.favorites`) e não mais só em localStorage.

**Arquitetura:**
- Tabela: `id uuid PK`, `user_id uuid`, `itinerary_id uuid` (gerado determinísticamente a partir do `legacy_id` enquanto o marketplace usa ids numéricos), `legacy_id bigint`, `snapshot jsonb`, `created_at`. UNIQUE(user_id, itinerary_id).
- RLS: cada usuário só vê/cria/deleta os próprios favoritos.
- API: `src/lib/favoritesApi.ts` (`listFavorites`, `addFavorite`, `removeFavorite`, `migrateLocalFavoritesIfNeeded`).
- Provider: `src/contexts/FavoritesContext.tsx` mantém cache em `localStorage` na chave `wai-travel-favorites:{userId}` apenas para resposta otimista — fonte da verdade é o servidor.
- Migração one-shot: ao logar, qualquer favorito antigo do localStorage é enviado pro backend e marcado com flag `wai-travel-favorites-migrated-v1:{userId}`.
- Toggle pelo ícone de coração nas telas `MarketplaceItineraryScreen` e `ItineraryDetailScreen`.

A aba "Favoritos" do `TripsScreen` continua consumindo `useFavorites().favorites`.
