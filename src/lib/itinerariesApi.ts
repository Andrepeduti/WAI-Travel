import { supabase } from '@/integrations/supabase/client';

/**
 * Evento global disparado após qualquer mutação confirmada em `itineraries`.
 * Toda instância de `useMyItineraries` escuta esse evento para refazer o fetch
 * e manter Trips/Home/Index em sincronia mesmo quando o canal Realtime falha
 * em entregar o postgres_changes (DELETE/UPDATE em background, etc.).
 */
export const ITINERARIES_CHANGED_EVENT = 'itineraries:changed';

function emitItinerariesChanged(type: 'create' | 'update' | 'delete', id?: string) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(ITINERARIES_CHANGED_EVENT, { detail: { type, id } }));
  } catch {
    /* noop */
  }
}


/**
 * Roteiro do usuário (próprio). Substitui o tipo antigo do localStorage.
 * id agora é uuid (string) — antes era number gerado por Date.now().
 */
export interface UserItinerary {
  id: string;
  title: string;
  destinations: string[];
  startDate: string; // ISO string
  endDate: string;
  images: string[];
  participants: string[];
  places: number;
  sourceDatasetId?: number | null;
  isPublic: boolean;
  priceCents?: number | null;
  description?: string;
  tags?: string[];
  userId: string;
}

export interface CreateItineraryInput {
  title: string;
  destinations: string[];
  startDate?: string | null;
  endDate?: string | null;
  images?: string[];
  participants?: string[];
  places?: number;
  sourceDatasetId?: number | null;
  isPublic?: boolean;
  priceCents?: number | null;
  description?: string;
  tags?: string[];
}

export interface UpdateItineraryInput {
  title?: string;
  destinations?: string[];
  startDate?: string | null;
  endDate?: string | null;
  images?: string[];
  participants?: string[];
  places?: number;
  isPublic?: boolean;
  priceCents?: number | null;
  description?: string;
  tags?: string[];
}

function rowToItinerary(row: any): UserItinerary {
  return {
    id: row.id,
    title: row.title ?? '',
    destinations: row.destinations ?? [],
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : '',
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : '',
    images: row.images ?? [],
    participants: row.participants ?? [],
    places: row.places_count ?? 0,
    sourceDatasetId: row.source_dataset_id ?? null,
    isPublic: row.is_public ?? false,
    priceCents: row.price_cents ?? null,
    description: row.description ?? '',
    tags: row.tags ?? [],
    userId: row.user_id,
  };
}

function toIsoDate(value?: string | null): string | null {
  if (!value) return null;
  // Postgres DATE columns expect YYYY-MM-DD
  return value.slice(0, 10);
}

export async function listMyItineraries(): Promise<UserItinerary[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const [ownedRes, memberRes] = await Promise.all([
    supabase.from('itineraries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('itinerary_members').select('itinerary_id').eq('user_id', userId),
  ]);
  if (ownedRes.error) {
    console.error('[itinerariesApi] listMyItineraries owned failed', ownedRes.error);
  }
  const owned = (ownedRes.data ?? []).map(rowToItinerary);
  const memberIds = (memberRes.data ?? []).map((r) => r.itinerary_id);
  let shared: UserItinerary[] = [];
  if (memberIds.length > 0) {
    const { data: sharedRows, error: sErr } = await supabase
      .from('itineraries')
      .select('*')
      .in('id', memberIds)
      .order('created_at', { ascending: false });
    if (sErr) {
      console.error('[itinerariesApi] listMyItineraries shared failed', sErr);
    } else {
      shared = (sharedRows ?? []).map(rowToItinerary);
    }
  }
  // Dedupe (caso o user seja owner e member por algum motivo)
  const seen = new Set<string>();
  const merged: UserItinerary[] = [];
  for (const it of [...owned, ...shared]) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    merged.push(it);
  }
  return merged;
}

export async function getUserItineraryById(id: string): Promise<UserItinerary | null> {
  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[itinerariesApi] getUserItineraryById failed', error);
    return null;
  }
  if (!data) return null;
  return rowToItinerary(data);
}

export async function createItinerary(input: CreateItineraryInput): Promise<UserItinerary | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    console.error('[itinerariesApi] createItinerary called without an auth session');
    return null;
  }
  const { data, error } = await supabase
    .from('itineraries')
    .insert({
      user_id: userId,
      title: input.title,
      destinations: input.destinations ?? [],
      start_date: toIsoDate(input.startDate),
      end_date: toIsoDate(input.endDate),
      images: input.images ?? [],
      participants: input.participants ?? [],
      places_count: input.places ?? 0,
      source_dataset_id: input.sourceDatasetId ?? null,
      is_public: input.isPublic ?? false,
      price_cents: input.priceCents ?? null,
      description: input.description ?? '',
      tags: input.tags ?? []
    })
    .select('*')
    .single();
  if (error) {
    console.error('[itinerariesApi] createItinerary failed', error);
    return null;
  }
  const created = rowToItinerary(data);
  if (created) emitItinerariesChanged('create', created.id);
  return created;
}


export async function updateItinerary(id: string, patch: UpdateItineraryInput): Promise<void> {
  const updates: {
    title?: string;
    destinations?: string[];
    start_date?: string | null;
    end_date?: string | null;
    images?: string[];
    participants?: string[];
    places_count?: number;
    is_public?: boolean;
    price_cents?: number | null;
    description?: string;
    tags?: string[];
  } = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.destinations !== undefined) updates.destinations = patch.destinations;
  if (patch.startDate !== undefined) updates.start_date = toIsoDate(patch.startDate);
  if (patch.endDate !== undefined) updates.end_date = toIsoDate(patch.endDate);
  if (patch.images !== undefined) updates.images = patch.images;
  if (patch.participants !== undefined) updates.participants = patch.participants;
  if (patch.places !== undefined) updates.places_count = patch.places;
  if (patch.isPublic !== undefined) updates.is_public = patch.isPublic;
  if (patch.priceCents !== undefined) updates.price_cents = patch.priceCents;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.tags !== undefined) updates.tags = patch.tags;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('itineraries').update(updates as never).eq('id', id);
  if (error) {
    console.error('[itinerariesApi] updateItinerary failed', error);
    return;
  }
  emitItinerariesChanged('update', id);
}


/**
 * Para uma lista de itinerary IDs, retorna um mapa { itineraryId -> avatares[] }
 * combinando o avatar do dono + dos membros aceitos. Útil para exibir nos cards
 * da aba "Meus roteiros" sem precisar carregar cada roteiro individualmente.
 */
export async function fetchItineraryMemberAvatars(
  itineraryIds: string[],
): Promise<Record<string, string[]>> {
  if (itineraryIds.length === 0) return {};
  const result: Record<string, string[]> = {};
  // 1) Donos dos roteiros
  const { data: itins } = await supabase
    .from('itineraries')
    .select('id, user_id')
    .in('id', itineraryIds);
  // 2) Membros aceitos
  const { data: members } = await supabase
    .from('itinerary_members')
    .select('itinerary_id, user_id')
    .in('itinerary_id', itineraryIds);
  const ownerByItin = new Map<string, string>();
  (itins ?? []).forEach((i: any) => ownerByItin.set(i.id, i.user_id));
  const userIdsByItin = new Map<string, string[]>();
  itineraryIds.forEach((id) => {
    const arr: string[] = [];
    const owner = ownerByItin.get(id);
    if (owner) arr.push(owner);
    userIdsByItin.set(id, arr);
  });
  (members ?? []).forEach((m: any) => {
    const arr = userIdsByItin.get(m.itinerary_id) ?? [];
    if (!arr.includes(m.user_id)) arr.push(m.user_id);
    userIdsByItin.set(m.itinerary_id, arr);
  });
  // 3) Carrega avatares uma única vez
  const allUserIds = Array.from(new Set(Array.from(userIdsByItin.values()).flat()));
  let avatarMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, avatar_url')
      .in('user_id', allUserIds);
    (profiles ?? []).forEach((p: any) => {
      if (p.avatar_url) avatarMap.set(p.user_id, p.avatar_url);
    });
  }
  userIdsByItin.forEach((userIds, itinId) => {
    result[itinId] = userIds.map((u) => avatarMap.get(u)).filter(Boolean) as string[];
  });
  return result;
}

export async function deleteItinerary(id: string): Promise<void> {
  const { error } = await supabase.from('itineraries').delete().eq('id', id);
  if (error) {
    console.error('[itinerariesApi] deleteItinerary failed', error);
    return;
  }
  emitItinerariesChanged('delete', id);
}

/**
 * Remove o usuário atual da lista de participantes de um roteiro compartilhado.
 * Ao contrário de `deleteItinerary`, NÃO apaga o roteiro para os demais.
 * Use quando o usuário é apenas membro (não dono) e quer sair.
 */
export async function leaveItinerary(itineraryId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    console.error('[itinerariesApi] leaveItinerary called without an auth session');
    return;
  }
  const { error } = await supabase
    .from('itinerary_members')
    .delete()
    .eq('itinerary_id', itineraryId)
    .eq('user_id', userId);
  if (error) {
    console.error('[itinerariesApi] leaveItinerary failed', error);
    return;
  }
  emitItinerariesChanged('delete', itineraryId);
}


/**
 * Lista TODOS os roteiros publicados (is_public = true) de qualquer usuário,
 * para alimentar a busca/explorar do marketplace. Inclui dados básicos do
 * autor (nome, username, avatar) via join com profiles.
 */
export interface PublicItinerarySearchRow extends UserItinerary {
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
}

export async function listPublicItineraries(limit = 200): Promise<PublicItinerarySearchRow[]> {
  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[itinerariesApi] listPublicItineraries failed', error);
    return [];
  }
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Carrega perfis dos autores numa única query
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id))).filter(Boolean);
  let profileById = new Map<string, { name: string; username: string | null; avatar_url: string }>();
  if (userIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('profiles_public')
      .select('user_id, name, username, avatar_url')
      .in('user_id', userIds as string[]);
    if (pErr) {
      console.error('[itinerariesApi] listPublicItineraries profiles failed', pErr);
    }
    (profiles ?? []).forEach((p: any) => {
      profileById.set(p.user_id, {
        name: p.name ?? '',
        username: p.username ?? null,
        avatar_url: p.avatar_url ?? '',
      });
    });
  }

  return rows.map((row: any) => {
    const base = rowToItinerary(row);
    const profile = profileById.get(row.user_id);
    return {
      ...base,
      authorName: profile?.name || profile?.username || 'Viajante',
      authorUsername: profile?.username || '',
      authorAvatar: profile?.avatar_url || '',
    };
  });
}

/**
 * Publica uma cópia independente do roteiro: cria um novo registro com
 * `is_public=true` espelhando os dados do original. As atividades e
 * transportes do roteiro original são clonadas no servidor (via
 * `cloneItineraryContent`), garantindo total independência entre as
 * versões — edições futuras de qualquer lado não se refletem na outra.
 *
 * O `snapshot` opcional é mantido como fallback de compatibilidade para
 * componentes que ainda não migraram pro `plannerApi`. Se os dados já
 * estiverem no backend, o clone server-side prevalece.
 */
export async function publishItineraryAsCopy(
  source: UserItinerary,
  publishData: { priceCents: number | null; description: string; tags: string[]; },
  snapshot?: {
    activities?: Record<number, unknown[]>;
    transports?: Record<number, unknown[]>;
    dataVersion?: number;
  },
): Promise<UserItinerary | null> {
  const created = await createItinerary({
    title: source.title,
    destinations: source.destinations,
    startDate: source.startDate,
    endDate: source.endDate,
    images: source.images,
    participants: source.participants,
    places: source.places,
    sourceDatasetId: source.sourceDatasetId ?? null,
    isPublic: true,
    priceCents: publishData.priceCents,
    description: publishData.description,
    tags: publishData.tags
  });
  if (!created) return null;

  // Clone server-side das atividades/transportes (fonte da verdade).
  try {
    const { cloneItineraryContent } = await import('./plannerApi');
    await cloneItineraryContent(source.id, created.id);
  } catch (err) {
    console.error('[itinerariesApi] cloneItineraryContent failed', err);
  }

  // Fallback legado: cópia local em localStorage para componentes que
  // ainda leem dali (ex.: marketplace público dos próprios roteiros).
  const storageCopies = [
    { key: 'wai-travel-planner-activities', data: snapshot?.activities },
    { key: 'wai-travel-planner-transports', data: snapshot?.transports },
  ];
  for (const { key: storageKey, data } of storageCopies) {
    try {
      const raw = localStorage.getItem(storageKey);
      const all = raw ? JSON.parse(raw) : {};
      const sourceEntry = data !== undefined
        ? { __v: snapshot?.dataVersion ?? 0, data }
        : all[source.id];
      if (sourceEntry == null) continue;
      all[created.id] = JSON.parse(JSON.stringify(sourceEntry));
      localStorage.setItem(storageKey, JSON.stringify(all));
    } catch (err) {
      console.error('[itinerariesApi] publishItineraryAsCopy local clone failed', storageKey, err);
    }
  }

  return created;
}
