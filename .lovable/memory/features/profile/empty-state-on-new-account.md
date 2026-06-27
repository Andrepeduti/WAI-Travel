---
name: User-scoped client storage
description: Coleções e favoritos no localStorage são escopados por user_id (`wai-travel-*:{userId}`); perfis novos abrem zerados e dados não vazam entre logins
type: feature
---

Coleções e favoritos persistem no `localStorage` mas com chaves escopadas por usuário autenticado, garantindo que cada conta tenha sua própria lista e que perfis novos abram com **empty state** em todas as abas.

**Helper centralizado:** `src/lib/userScopedStorage.ts`
- Mantém um cache do `user_id` atualizado via `supabase.auth.onAuthStateChange`.
- `collectionsListKey()` → `wai-travel-collections:{userId}` (lista de UserCollection).
- `collectionsDataKey()` → `wai-travel-collection-data:{userId}` (dados detalhados: places, folders, customTitle, sharedWith).
- `readJSON / writeJSON` operam apenas quando há usuário logado; sem sessão retornam vazio (no-op em escrita).

**Consumidores atualizados:**
- `src/components/screens/TripsScreen.tsx` — `getUserCollections / saveUserCollection / deleteUserCollection` usam o helper. `useEffect` recarrega lista quando `authUser?.id` muda.
- `src/components/travel/SaveToCollectionSheet.tsx` — usa o helper e **removeu defaults mockados** (Paris, Rio, Inverno Europeu, Tóquio & Kyoto).
- `src/components/screens/CollectionDetailScreen.tsx` — `loadCollectionData / saveCollectionData` e a sincronização da lista de coleções migrados para o helper.
- `src/components/travel/AddPlaceSheet.tsx` — `loadCollectionPlaces` migrado.

**Favoritos:** `src/contexts/FavoritesContext.tsx` lê `wai-travel-favorites:{userId}` via `useAuth()`. Recarrega quando o usuário muda; sem sessão a lista é `[]` e nada é gravado.

**Mocks removidos do TripsScreen:** os arrays estáticos `privateItineraries`, `publicItineraries` e `collections` continuam declarados (alguns usados como `typeof`), mas **não são mais injetados** nas listas renderizadas. Tudo agora vem exclusivamente do banco/localStorage do usuário ativo.
