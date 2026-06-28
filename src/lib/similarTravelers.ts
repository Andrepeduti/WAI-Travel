/**
 * Busca viajantes com interesses em comum com o usuário atual.
 * - Sempre prioriza perfis com interesses compartilhados, ordenados por nº de matches.
 * - Se não houver dados reais suficientes, complementa com mocks (até atingir `minResults`).
 */
import { supabase } from '@/integrations/supabase/client';

export interface SimilarTraveler {
  userId: string;
  name: string;
  username: string;
  city: string;
  avatar: string;
  interests: string[];
  sharedInterests: string[];
  compatibility: number; // 0-100
  sharedTripsCount: number; // nº de destinos em comum entre roteiros
  isMock?: boolean;
}

type MockTraveler = Omit<SimilarTraveler, 'username' | 'compatibility' | 'sharedTripsCount'> & {
  username?: string;
  sharedTripsCount?: number;
};

const MOCK_TRAVELERS: MockTraveler[] = [];

const norm = (s: string) => s.trim().toLowerCase();

function computeShared(myInterests: string[], theirInterests: string[]): string[] {
  if (!myInterests.length || !theirInterests.length) return [];
  const mine = new Set(myInterests.map(norm));
  return theirInterests.filter((i) => mine.has(norm(i)));
}

function computeCompatibility(myInterests: string[], theirInterests: string[], shared: string[]): number {
  // Jaccard-like score (0-100) com leve viés p/ overlap absoluto
  if (!myInterests.length && !theirInterests.length) return 0;
  const union = new Set([...myInterests.map(norm), ...theirInterests.map(norm)]);
  if (union.size === 0) return 0;
  const jaccard = shared.length / union.size;
  // Bônus mínimo p/ não exibir 0% quando há ao menos 1 match
  if (shared.length > 0) {
    return Math.max(15, Math.min(100, Math.round(jaccard * 100)));
  }
  return 0;
}

function slugifyUsername(name: string, userId: string): string {
  const base = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
  const suffix = userId.replace(/-/g, '').slice(0, 4);
  return base ? `${base}${suffix}` : `viajante${suffix}`;
}

function extractDestinationKeys(destinations: any): string[] {
  if (!destinations) return [];
  const arr = Array.isArray(destinations) ? destinations : [destinations];
  const keys: string[] = [];
  for (const d of arr) {
    if (!d) continue;
    if (typeof d === 'string') {
      keys.push(norm(d));
    } else if (typeof d === 'object') {
      const v = d.country || d.city || d.name || d.label || '';
      if (v) keys.push(norm(String(v)));
    }
  }
  return keys.filter(Boolean);
}

export async function fetchSimilarTravelers(minResults = 6): Promise<SimilarTraveler[]> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const myId = authUser?.id;

  let myInterests: string[] = [];
  if (myId) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('interests')
      .eq('user_id', myId)
      .maybeSingle();
    myInterests = Array.isArray(myProfile?.interests) ? (myProfile!.interests as string[]) : [];
  }

  // Carrega destinos dos roteiros do usuário atual
  let myDestKeys = new Set<string>();
  if (myId) {
    const { data: myItins } = await supabase
      .from('itineraries')
      .select('destinations')
      .eq('user_id', myId);
    (myItins || []).forEach((it: any) => {
      extractDestinationKeys(it.destinations).forEach((k) => myDestKeys.add(k));
    });
  }

  // Busca perfis (limit alto para conseguir filtrar e ranquear)
  let q = supabase
    .from('profiles_public')
    .select('user_id, name, username, location, avatar_url, interests')
    .limit(50);
  if (myId) q = q.neq('user_id', myId);
  const { data, error } = await q;

  const profiles = (!error && data ? data : []).filter((r: any) => (r.name || r.username));
  const otherIds = profiles.map((r: any) => r.user_id).filter(Boolean);

  // Carrega destinos dos roteiros desses perfis em uma única query
  const tripsByUser = new Map<string, Set<string>>();
  if (otherIds.length > 0) {
    const { data: theirItins } = await supabase
      .from('itineraries')
      .select('user_id, destinations')
      .in('user_id', otherIds);
    (theirItins || []).forEach((it: any) => {
      const set = tripsByUser.get(it.user_id) || new Set<string>();
      extractDestinationKeys(it.destinations).forEach((k) => set.add(k));
      tripsByUser.set(it.user_id, set);
    });
  }

  const real: SimilarTraveler[] = profiles.map((r: any) => {
    const interests: string[] = Array.isArray(r.interests) ? r.interests : [];
    const shared = computeShared(myInterests, interests);
    const name = r.name || r.username || 'Viajante';
    const theirDests = tripsByUser.get(r.user_id) || new Set<string>();
    let sharedTripsCount = 0;
    myDestKeys.forEach((k) => { if (theirDests.has(k)) sharedTripsCount += 1; });
    return {
      userId: r.user_id,
      name,
      username: r.username || slugifyUsername(name, r.user_id || ''),
      city: r.location || '',
      avatar: r.avatar_url || '',
      interests,
      sharedInterests: shared,
      compatibility: computeCompatibility(myInterests, interests, shared),
      sharedTripsCount,
    };
  });

  // Se o usuário tem interesses cadastrados, prioriza quem tem matches
  let ordered: SimilarTraveler[];
  if (myInterests.length > 0) {
    const withShared = real.filter((t) => t.sharedInterests.length > 0);
    withShared.sort((a, b) => b.sharedInterests.length - a.sharedInterests.length);
    const withoutShared = real.filter((t) => t.sharedInterests.length === 0);
    ordered = [...withShared, ...withoutShared];
  } else {
    ordered = real;
  }

  // Se não houver perfis reais suficientes, a lista retornada simplesmente será menor.

  return ordered;
}
