import { supabase } from '@/integrations/supabase/client';
import { UserItinerary } from './itinerariesApi';

export interface MarketplaceItinerary extends UserItinerary {
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
}

export interface Review {
  id: string;
  userName: string;
  userImage: string;
  rating: number;
  date: string;
  comment: string;
}

/**
 * Busca os detalhes de um roteiro publicado no Marketplace, incluindo os dados do autor.
 */
export async function getMarketplaceItinerary(id: string): Promise<MarketplaceItinerary | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return null;

  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[marketplaceApi] getMarketplaceItinerary error', error);
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles_public')
    .select('name, username, avatar_url')
    .eq('user_id', data.user_id)
    .maybeSingle();

  return {
    id: data.id,
    title: data.title ?? '',
    destinations: data.destinations ?? [],
    startDate: data.start_date ? String(data.start_date).slice(0, 10) : '',
    endDate: data.end_date ? String(data.end_date).slice(0, 10) : '',
    images: data.images ?? [],
    participants: data.participants ?? [],
    places: data.places_count ?? 0,
    sourceDatasetId: data.source_dataset_id ?? null,
    isPublic: data.is_public ?? false,
    priceCents: data.price_cents ?? null,
    description: data.description ?? '',
    tags: data.tags ?? [],
    userId: data.user_id,
    authorName: profile?.name || profile?.username || 'Viajante',
    authorUsername: profile?.username || '',
    authorAvatar: profile?.avatar_url || '',
  };
}

/**
 * Busca as avaliações de um roteiro.
 */
export async function getItineraryReviews(itineraryId: string): Promise<Review[]> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itineraryId)) return [];

  const { data, error } = await supabase
    .from('itinerary_reviews')
    .select('id, rating, comment, created_at, user_id')
    .eq('itinerary_id', itineraryId)
    .order('created_at', { ascending: false });

  if (error) {
    // Se a tabela não existir ainda (42P01 ou PGRST205), retorna array vazio
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    console.error('[marketplaceApi] getItineraryReviews error', error);
    return [];
  }

  const userIds = Array.from(new Set((data ?? []).map((row: any) => row.user_id)));
  let profilesMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, name, username, avatar_url')
      .in('user_id', userIds);
    if (profiles) {
      profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
    }
  }

  return (data ?? []).map((row: any) => {
    const profile = profilesMap[row.user_id];
    return {
      id: row.id,
      userName: profile?.name || profile?.username || 'Viajante',
      userImage: profile?.avatar_url || '',
      rating: row.rating,
      date: new Date(row.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      comment: row.comment || '',
    };
  });
}

/**
 * Envia uma nova avaliação para um roteiro.
 */
export async function submitItineraryReview(itineraryId: string, rating: number, comment: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;

  const { error } = await supabase
    .from('itinerary_reviews')
    .upsert(
      {
        itinerary_id: itineraryId,
        user_id: userId,
        rating,
        comment,
      },
      { onConflict: 'itinerary_id,user_id' }
    );

  if (error) {
    console.error('[marketplaceApi] submitItineraryReview error', error);
    return false;
  }
  return true;
}
