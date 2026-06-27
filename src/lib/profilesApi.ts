import { supabase } from '@/integrations/supabase/client';
import type { FriendProfileData } from '@/components/screens/FriendProfileScreen';

/**
 * Mapeia uma row de `profiles` para o shape esperado pela
 * `FriendProfileScreen` (nossa fonte de verdade visual de perfil).
 *
 * `countries` fica vazio aqui — a tela já lida com isso e tem
 * uma seção própria que carrega de outras tabelas no futuro.
 */
function rowToFriendProfileData(row: {
  user_id: string;
  name: string | null;
  username: string | null;
  location: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  followers_count: number | null;
  following_count: number | null;
}): FriendProfileData {
  const usernameRaw = row.username || '';
  const username = usernameRaw ? `@${usernameRaw.replace(/^@/, '')}` : '@usuario';
  return {
    userId: row.user_id,
    name: row.name || row.username || 'Viajante',
    username,
    location: row.location || '',
    avatar: row.avatar_url || '',
    bio: row.bio || '',
    instagram: row.instagram || '',
    tiktok: row.tiktok || '',
    youtube: row.youtube || '',
    following: row.following_count ?? 0,
    followers: String(row.followers_count ?? 0),
    countries: [],
  };
}

const PROFILE_COLUMNS =
  'user_id, name, username, location, avatar_url, bio, instagram, tiktok, youtube, followers_count, following_count';

export async function getProfileByUsername(
  username: string,
): Promise<FriendProfileData | null> {
  const clean = username.replace(/^@/, '').toLowerCase();
  if (!clean) return null;
  const { data, error } = await supabase
    .from('profiles_public')
    .select(PROFILE_COLUMNS)
    .ilike('username', clean)
    .maybeSingle();
  if (error) {
    console.error('[profilesApi] getProfileByUsername error', error);
    return null;
  }
  return data ? rowToFriendProfileData(data) : null;
}

export async function getProfileByUserId(
  userId: string,
): Promise<FriendProfileData | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles_public')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[profilesApi] getProfileByUserId error', error);
    return null;
  }
  return data ? rowToFriendProfileData(data) : null;
}

/** Resolve owner profile do roteiro — útil para "abrir perfil do criador". */
export async function getProfileOfItineraryOwner(
  itineraryId: string,
): Promise<FriendProfileData | null> {
  const { data: itin } = await supabase
    .from('itineraries')
    .select('user_id')
    .eq('id', itineraryId)
    .maybeSingle();
  if (!itin?.user_id) return null;
  return getProfileByUserId(itin.user_id);
}

export interface PublicItineraryRow {
  id: string;
  title: string;
  destinations: string[];
  images: string[];
  start_date: string | null;
  end_date: string | null;
  places_count: number;
  price_cents: number | null;
  main_tag: string;
}

/** Busca os roteiros públicos publicados por um usuário. */
export async function getPublicItinerariesByUserId(
  userId: string,
): Promise<PublicItineraryRow[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('itineraries')
    .select('id, title, destinations, images, start_date, end_date, places_count, price_cents, main_tag')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[profilesApi] getPublicItinerariesByUserId error', error);
    return [];
  }
  return (data || []) as PublicItineraryRow[];
}
