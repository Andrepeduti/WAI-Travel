/**
 * Favoritos persistidos no Lovable Cloud.
 *
 * O snapshot é salvo no JSONB para que o card continue exibindo dados
 * mesmo se o roteiro original for removido/despublicado.
 *
 * Como hoje os datasets do marketplace são estáticos com ids numéricos,
 * mantemos `legacy_id` (bigint) para casar com esses ids. O campo
 * `itinerary_id` (uuid) é gerado determinísticamente a partir do legacy id
 * para satisfazer o `UNIQUE (user_id, itinerary_id)` — quando o marketplace
 * for migrado pra UUIDs reais, basta passar o uuid e ignorar `legacy_id`.
 */

import { supabase } from '@/integrations/supabase/client';

export interface FavoriteSnapshot {
  id: number;
  title: string;
  image: string;
  creator: string;
  creatorImage: string;
  days: number;
  places: number;
  price: number;
  rating?: number;
  reviews?: number;
}

export interface FavoriteRecord extends FavoriteSnapshot {
  addedAt: number;
}

/**
 * Gera um uuid determinístico a partir de um id numérico legado.
 * Não precisa ser criptograficamente forte — só precisa ser estável.
 */
function legacyIdToUuid(legacyId: number): string {
  const hex = Math.abs(legacyId).toString(16).padStart(12, '0').slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
}

export async function listFavorites(): Promise<FavoriteRecord[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[favoritesApi] listFavorites failed', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const snapshot = (row.snapshot ?? {}) as Partial<FavoriteSnapshot>;
    return {
      id: Number(row.legacy_id ?? snapshot.id ?? 0),
      title: snapshot.title ?? '',
      image: snapshot.image ?? '',
      creator: snapshot.creator ?? '',
      creatorImage: snapshot.creatorImage ?? '',
      days: snapshot.days ?? 0,
      places: snapshot.places ?? 0,
      price: snapshot.price ?? 0,
      rating: snapshot.rating,
      reviews: snapshot.reviews,
      addedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    } satisfies FavoriteRecord;
  });
}

export async function addFavorite(snapshot: FavoriteSnapshot): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const { error } = await supabase.from('favorites').upsert(
    [
      {
        user_id: userId,
        itinerary_id: legacyIdToUuid(snapshot.id),
        legacy_id: snapshot.id,
        snapshot: snapshot as unknown as never,
      },
    ],
    { onConflict: 'user_id,itinerary_id' },
  );
  if (error) console.error('[favoritesApi] addFavorite failed', error);
}

export async function removeFavorite(itineraryLegacyId: number): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('legacy_id', itineraryLegacyId);
  if (error) console.error('[favoritesApi] removeFavorite failed', error);
}

/**
 * Migração one-shot: lê os favoritos antigos do localStorage do usuário e
 * faz upload para o backend caso ainda não exista nada lá. Marca uma flag
 * para não rodar de novo. Idempotente.
 */
export async function migrateLocalFavoritesIfNeeded(userId: string): Promise<void> {
  const flagKey = `wai-travel-favorites-migrated-v1:${userId}`;
  if (localStorage.getItem(flagKey) === 'done') return;

  const legacyKey = `wai-travel-favorites:${userId}`;
  const raw = localStorage.getItem(legacyKey);
  if (!raw) {
    localStorage.setItem(flagKey, 'done');
    return;
  }

  let parsed: FavoriteRecord[] = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.setItem(flagKey, 'done');
    return;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    localStorage.setItem(flagKey, 'done');
    return;
  }

  // Sobe em paralelo (upsert evita duplicatas se rodar duas vezes).
  await Promise.all(
    parsed.map((fav) =>
      addFavorite({
        id: fav.id,
        title: fav.title,
        image: fav.image,
        creator: fav.creator,
        creatorImage: fav.creatorImage,
        days: fav.days,
        places: fav.places,
        price: fav.price,
        rating: fav.rating,
        reviews: fav.reviews,
      }),
    ),
  );

  localStorage.setItem(flagKey, 'done');
}
