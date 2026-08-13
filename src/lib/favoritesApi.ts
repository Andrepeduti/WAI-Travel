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

