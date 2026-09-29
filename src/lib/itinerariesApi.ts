import { supabase } from '@/integrations/supabase/client';
import { setCachedOwnerProfile, setCachedItineraryMembers, type ItineraryMember } from './itineraryMembersApi';
import { parseLocalDate } from './localDate';

/**
 * Evento global disparado após qualquer mutação confirmada em `itineraries`.
 * Toda instância de `useMyItineraries` escuta esse evento para refazer o fetch
 * e manter Trips/Home/Index em sincronia mesmo quando o canal Realtime falha
 * em entregar o postgres_changes (DELETE/UPDATE em background, etc.).
 */
export const ITINERARIES_CHANGED_EVENT = 'itineraries:changed';

function emitItinerariesChanged(type: 'create' | 'update' | 'delete', id?: string, patch?: UpdateItineraryInput) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(ITINERARIES_CHANGED_EVENT, { detail: { type, id, patch } }));
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
  isPersonal?: boolean;
  isPublic: boolean;
  priceCents?: number | null;
  description?: string;
  status?: 'draft' | 'published' | 'suspended';
  isFlexible?: boolean;
  durationDays?: number;
  travelMonth?: string;
  userId: string;
  isPaused?: boolean;
  extraPeople?: any[];
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  myRole?: 'owner' | 'editor' | 'viewer';
  tags?: string[];
  seasons?: string[];
  mainTag?: string;
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
  /** Roteiro pessoal que originou esta cópia (ex.: publicação na loja). */
  sourceItineraryId?: string | null;
  isPersonal?: boolean;
  isPublic?: boolean;
  priceCents?: number | null;
  description?: string;
  status?: 'draft' | 'published' | 'suspended';
  isFlexible?: boolean;
  durationDays?: number;
  travelMonth?: string;
  tags?: string[];
  mainTag?: string;
}

export interface UpdateItineraryInput {
  title?: string;
  destinations?: string[];
  startDate?: string | null;
  endDate?: string | null;
  images?: string[];
  participants?: string[];
  places?: number;
  isPersonal?: boolean;
  isPublic?: boolean;
  priceCents?: number | null;
  description?: string;
  status?: 'draft' | 'published' | 'suspended';
  isFlexible?: boolean;
  durationDays?: number;
  travelMonth?: string;
  isPaused?: boolean;
  extraPeople?: any[];
  deletedAt?: string | null;
  tags?: string[];
  mainTag?: string;
}

function rowToItinerary(row: any, myRole?: 'owner' | 'editor' | 'viewer'): UserItinerary {
  return {
    id: row.id,
    title: row.title ?? '',
    destinations: row.destinations ?? [],
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : '',
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : '',
    images: row.cover_image_url ? [row.cover_image_url] : [],
    participants: [],
    places: row.places_count ?? 0,
    sourceDatasetId: row.source_dataset_id ?? null,
    isPersonal: row.is_personal ?? true,
    isPublic: row.is_public ?? false,
    priceCents: row.price_cents ?? null,
    description: row.description,
    status: row.status ?? 'draft',
    isFlexible: row.is_flexible ?? false,
    durationDays: row.duration_days ?? undefined,
    travelMonth: row.travel_month ?? undefined,
    userId: row.user_id,
    isPaused: row.is_paused ?? false,
    extraPeople: [],
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : (row.created_at ? String(row.created_at) : undefined),
    myRole,
    tags: row.tags ?? [],
    seasons: row.seasons ?? [],
    mainTag: row.main_tag ?? undefined,
  };
}

function toIsoDate(value?: string | null): string | null {
  if (!value) return null;
  // Postgres DATE columns expect YYYY-MM-DD
  return value.slice(0, 10);
}

export async function listMyItineraries(providedUserId?: string): Promise<UserItinerary[]> {
  let userId = providedUserId;
  if (!userId) {
    const { data: sessionData } = await supabase.auth.getSession();
    userId = sessionData.session?.user?.id;
  }
  if (!userId) return [];
  const [ownedRes, memberRes] = await Promise.all([
    supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('itinerary_members').select('itinerary_id, role').eq('user_id', userId),
  ]);
  if (ownedRes.error) {
    console.error('[itinerariesApi] listMyItineraries owned failed', ownedRes.error);
  }
  const owned = (ownedRes.data ?? []).map(r => rowToItinerary(r, 'owner'));
  const sharedRoles = new Map((memberRes.data ?? []).map((r) => [r.itinerary_id, r.role]));
  const memberIds = Array.from(sharedRoles.keys());
  let shared: UserItinerary[] = [];
  if (memberIds.length > 0) {
    const { data: sharedRows, error: sErr } = await supabase
      .from('itineraries')
      .select('*')
      .in('id', memberIds)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (sErr) {
      console.error('[itinerariesApi] listMyItineraries shared failed', sErr);
    } else {
      shared = (sharedRows ?? []).map(r => rowToItinerary(r, sharedRoles.get(r.id) as 'editor' | 'viewer'));
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

  // Preço, tags, temporadas e descrição comerciais vivem em itinerary_store_listing.
  if (merged.length > 0) {
    const { data: listings, error: lErr } = await supabase
      .from('itinerary_store_listing')
      .select('itinerary_id, tags, seasons, price_cents, listed_description')
      .in('itinerary_id', merged.map(it => it.id));
    if (lErr) {
      console.error('[itinerariesApi] listMyItineraries listings failed', lErr);
    } else {
      const byId = new Map((listings ?? []).map((l: any) => [l.itinerary_id, l]));
      for (const it of merged) {
        const l: any = byId.get(it.id);
        if (!l) continue;
        it.tags = sanitizeListingTags(l.tags);
        it.seasons = l.seasons ?? [];
        it.priceCents = l.price_cents ?? null;
        if (l.listed_description) it.description = l.listed_description;
      }
    }
  }
  // Ordena por regras de data:
  // 1. Em andamento sempre em primeiro
  // 2. Data mais próxima em cima das de data mais distante
  // 3. Concluídos sempre por último
  return sortUserItinerariesByDate(merged);
}

export function sortUserItinerariesByDate(list: UserItinerary[]): UserItinerary[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...list].sort((a, b) => {
    const isFlexibleA = a.isFlexible || false;
    const isCancelledA = a.status === 'suspended' || false;
    const parsedStartA = parseLocalDate(a.startDate);
    const parsedEndA = parseLocalDate(a.endDate);
    const startA = parsedStartA ? new Date(parsedStartA) : (parsedEndA ? new Date(parsedEndA) : null);
    const endA = parsedEndA ? new Date(parsedEndA) : (parsedStartA ? new Date(parsedStartA) : null);
    if (startA) startA.setHours(0, 0, 0, 0);
    if (endA) endA.setHours(0, 0, 0, 0);

    const isPastA = !isCancelledA && !isFlexibleA && !!endA && endA < today;
    const isInProgressA = !isCancelledA && !isFlexibleA && !isPastA && !!startA && !!endA && today >= startA && today <= endA;

    const isFlexibleB = b.isFlexible || false;
    const isCancelledB = b.status === 'suspended' || false;
    const parsedStartB = parseLocalDate(b.startDate);
    const parsedEndB = parseLocalDate(b.endDate);
    const startB = parsedStartB ? new Date(parsedStartB) : (parsedEndB ? new Date(parsedEndB) : null);
    const endB = parsedEndB ? new Date(parsedEndB) : (parsedStartB ? new Date(parsedStartB) : null);
    if (startB) startB.setHours(0, 0, 0, 0);
    if (endB) endB.setHours(0, 0, 0, 0);

    const isPastB = !isCancelledB && !isFlexibleB && !!endB && endB < today;
    const isInProgressB = !isCancelledB && !isFlexibleB && !isPastB && !!startB && !!endB && today >= startB && today <= endB;

    // 1. Em andamento em primeiro
    if (isInProgressA && !isInProgressB) return -1;
    if (!isInProgressA && isInProgressB) return 1;

    // 2. Concluídos por último
    if (isPastA && !isPastB) return 1;
    if (!isPastA && isPastB) return -1;

    if (isPastA && isPastB) {
      const endMsA = endA ? endA.getTime() : 0;
      const endMsB = endB ? endB.getTime() : 0;
      if (endMsA !== endMsB) return endMsB - endMsA;
      return 0;
    }

    if (isInProgressA && isInProgressB) {
      const startMsA = startA ? startA.getTime() : 0;
      const startMsB = startB ? startB.getTime() : 0;
      if (startMsA !== startMsB) return startMsA - startMsB;
      return 0;
    }

    // 3. Futuros / Próximos: data mais próxima em cima
    const timeA = !isFlexibleA && startA ? startA.getTime() : Infinity;
    const timeB = !isFlexibleB && startB ? startB.getTime() : Infinity;
    if (timeA !== timeB) return timeA - timeB;

    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createdB - createdA;
  });
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

  // Se o roteiro está publicado ou tem dados na loja, precisamos pegar as tags, preço, etc. da loja
  const { data: storeData } = await supabase
    .from('itinerary_store_listing')
    .select('tags, price_cents, listed_description, seasons')
    .eq('itinerary_id', id)
    .maybeSingle();

  if (storeData) {
    data.tags = sanitizeListingTags(storeData.tags);
    data.price_cents = storeData.price_cents;
    data.seasons = storeData.seasons;
    // We only override description if it's missing or if we prefer listed_description
    if (storeData.listed_description) {
      data.description = storeData.listed_description;
    }
  }

  return rowToItinerary(data);
}

export async function createItinerary(input: CreateItineraryInput): Promise<UserItinerary | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    console.error('[itinerariesApi] createItinerary called without an auth session');
    return null;
  }
  const isPersonal = input.isPersonal !== undefined ? input.isPersonal : !input.isPublic;
  const insertData: any = {
    user_id: userId,
    title: input.title,
    destinations: input.destinations ?? [],
    start_date: input.isFlexible ? null : (input.startDate ? toIsoDate(input.startDate) : null),
    end_date: input.isFlexible ? null : (input.endDate ? toIsoDate(input.endDate) : null),
    cover_image_url: input.images && input.images.length > 0 ? input.images[0] : null,
    places_count: input.places ?? 0,
    is_personal: isPersonal,
    source_itinerary_id: input.sourceItineraryId ?? null,
    description: input.description ?? '',
    status: input.status ?? 'draft',
    is_flexible: input.isFlexible ?? false,
    duration_days: input.durationDays ?? null,
    travel_month: input.travelMonth ?? null
  };

  const { data, error } = await supabase
    .from('itineraries')
    .insert(insertData)
    .select('*')
    .single();
  if (error) {
    console.error('[itinerariesApi] createItinerary failed', error);
    return null;
  }
  const created = rowToItinerary(data);
  if (created) {
    try {
      const { initItineraryChecklist } = await import('./checklistApi');
      await initItineraryChecklist(created.id);
    } catch (err) {
      console.error('[itinerariesApi] Failed to init default checklist', err);
    }
    emitItinerariesChanged('create', created.id);
  }
  return created;
}


export async function updateItinerary(id: string, patch: UpdateItineraryInput): Promise<void> {
  const updates: any = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.destinations !== undefined) updates.destinations = patch.destinations;
  
  if (patch.isFlexible) {
    updates.start_date = null;
    updates.end_date = null;
  } else {
    if (patch.startDate !== undefined) updates.start_date = toIsoDate(patch.startDate);
    if (patch.endDate !== undefined) updates.end_date = toIsoDate(patch.endDate);
  }

  if (patch.images !== undefined) updates.cover_image_url = patch.images && patch.images.length > 0 ? patch.images[0] : null;
  if (patch.places !== undefined) updates.places_count = patch.places;
  if (patch.isPersonal !== undefined) updates.is_personal = patch.isPersonal;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.isFlexible !== undefined) updates.is_flexible = patch.isFlexible;
  if (patch.durationDays !== undefined) updates.duration_days = patch.durationDays;
  if (patch.travelMonth !== undefined) updates.travel_month = patch.travelMonth;
  if (patch.deletedAt !== undefined) updates.deleted_at = patch.deletedAt;
  if (patch.isPaused !== undefined) updates.is_paused = patch.isPaused;
  
  if (Object.keys(updates).length === 0) return;
  (updates as any).updated_at = new Date().toISOString();
  const { error } = await supabase.from('itineraries').update(updates as never).eq('id', id);
  if (error) {
    console.error('[itinerariesApi] updateItinerary failed', error);
    return;
  }
  emitItinerariesChanged('update', id, patch);
}

/**
 * Remove marcadores internos que não são tags reais (datas flexíveis já vivem em
 * `is_flexible_dates`; mês de viagem em `travel_month`).
 */
export function sanitizeListingTags(tags?: string[] | null): string[] {
  return (tags ?? []).filter(t => t !== '_FLEXIBLE_DATES_' && !t.startsWith('_TRAVEL_MONTH_'));
}

/** Atualiza campos comerciais do listing (preço, descrição, tags, título) sem recriá-lo. */
export async function updateStoreListing(itineraryId: string, patch: {
  listedTitle?: string;
  listedDescription?: string;
  tags?: string[];
  seasons?: string[];
  priceCents?: number | null;
}): Promise<void> {
  const updates: any = { updated_at: new Date().toISOString() };
  if (patch.listedTitle !== undefined) updates.listed_title = patch.listedTitle;
  if (patch.listedDescription !== undefined) updates.listed_description = patch.listedDescription;
  if (patch.tags !== undefined) updates.tags = sanitizeListingTags(patch.tags);
  if (patch.seasons !== undefined) updates.seasons = patch.seasons;
  if (patch.priceCents !== undefined) updates.price_cents = patch.priceCents ?? 0;

  const { error } = await supabase.from('itinerary_store_listing').update(updates).eq('itinerary_id', itineraryId);
  if (error) {
    console.error('[itinerariesApi] updateStoreListing failed', error);
    return;
  }
  emitItinerariesChanged('update', itineraryId);
}

export async function upsertStoreListing(itineraryId: string, data: {
  sellerId: string;
  listedTitle: string;
  listedDescription?: string;
  tags?: string[];
  seasons?: string[];
  priceCents?: number | null;
  status?: string;
  isFlexibleDates?: boolean;
  durationDays?: number;
  travelMonth?: string;
}) {
  const { error } = await supabase.from('itinerary_store_listing').upsert({
    itinerary_id: itineraryId,
    seller_id: data.sellerId,
    listed_title: data.listedTitle,
    listed_description: data.listedDescription ?? null,
    tags: sanitizeListingTags(data.tags),
    seasons: data.seasons ?? [],
    price_cents: data.priceCents ?? 0,
    status: data.status ?? 'active',
    is_flexible_dates: data.isFlexibleDates ?? true,
    duration_days: data.durationDays ?? null,
    travel_month: data.travelMonth ?? null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'itinerary_id' });
  
  if (error) {
    console.error('[itinerariesApi] upsertStoreListing failed', error);
  }
}

/**
 * Atualiza o timestamp `updated_at` de um roteiro no Supabase para a hora atual

 * e dispara o evento global `ITINERARIES_CHANGED_EVENT` para colocar o roteiro no topo da listagem.
 */
export async function touchItinerary(id: string | number | undefined | null): Promise<void> {
  if (!id) return;
  const idStr = String(id);
  const now = new Date().toISOString();
  
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr)) {
    const { error } = await supabase
      .from('itineraries')
      .update({ updated_at: now } as never)
      .eq('id', idStr);
    if (error) {
      console.error('[itinerariesApi] touchItinerary failed', error);
    }
  }

  emitItinerariesChanged('update', idStr);
}


export interface ItineraryCardParticipant {
  userId: string;
  avatar: string;
  name?: string;
  isOwner: boolean;
}

/**
 * Para uma lista de itinerary IDs, retorna um mapa { itineraryId -> ItineraryCardParticipant[] }
 * combinando o avatar e perfil do dono (marcado com isOwner: true) + dos membros aceitos.
 * Útil para exibir nos cards da aba "Meus roteiros" com o avatar stack.
 */
export async function fetchItineraryMemberAvatars(
  itineraryIds: string[],
): Promise<Record<string, ItineraryCardParticipant[]>> {
  const validIds = itineraryIds.filter(id => !id.startsWith('pending-itinerary-'));
  if (validIds.length === 0) return {};
  
  const result: Record<string, ItineraryCardParticipant[]> = {};
  // 1) Donos dos roteiros
  const { data: itins } = await supabase
    .from('itineraries')
    .select('id, user_id')
    .in('id', validIds);
  // 2) Membros aceitos
  const { data: members } = await supabase
    .from('itinerary_members')
    .select('itinerary_id, user_id')
    .in('itinerary_id', validIds);

  const ownerByItin = new Map<string, string>();
  (itins ?? []).forEach((i: any) => ownerByItin.set(i.id, i.user_id));

  const userIdsByItin = new Map<string, { ownerId?: string; memberIds: string[] }>();
  itineraryIds.forEach((id) => {
    const owner = ownerByItin.get(id);
    userIdsByItin.set(id, { ownerId: owner, memberIds: [] });
  });

  (members ?? []).forEach((m: any) => {
    const entry = userIdsByItin.get(m.itinerary_id);
    if (entry) {
      if (m.user_id !== entry.ownerId && !entry.memberIds.includes(m.user_id)) {
        entry.memberIds.push(m.user_id);
      }
    }
  });

  // 3) Carrega avatares e nomes uma única vez
  const allUserIds = Array.from(
    new Set(
      Array.from(userIdsByItin.values()).flatMap((e) => [e.ownerId, ...e.memberIds].filter(Boolean) as string[])
    )
  );

  const profileMap = new Map<string, { name?: string; avatar: string }>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, name, username, avatar_url')
      .in('user_id', allUserIds);

    (profiles ?? []).forEach((p: any) => {
      const name = p.name || p.username || '';
      const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}`;
      profileMap.set(p.user_id, {
        name: p.name || p.username,
        avatar: p.avatar_url || fallbackAvatar,
      });
    });
  }

  userIdsByItin.forEach((entry, itinId) => {
    const list: ItineraryCardParticipant[] = [];
    const memberItems: ItineraryMember[] = [];

    if (entry.ownerId) {
      const prof = profileMap.get(entry.ownerId);
      list.push({
        userId: entry.ownerId,
        avatar: prof?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Dono`,
        name: prof?.name,
        isOwner: true,
      });
      setCachedOwnerProfile(itinId, {
        userId: entry.ownerId,
        name: prof?.name || 'Dono',
        avatar: prof?.avatar,
      });
    }

    entry.memberIds.forEach((mId) => {
      const prof = profileMap.get(mId);
      list.push({
        userId: mId,
        avatar: prof?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Membro`,
        name: prof?.name,
        isOwner: false,
      });
      memberItems.push({
        id: `cached-${mId}`,
        itineraryId: itinId,
        userId: mId,
        role: 'editor',
        name: prof?.name || 'Membro',
        avatar: prof?.avatar,
        acceptedAt: new Date().toISOString(),
      });
    });

    setCachedItineraryMembers(itinId, memberItems);
    result[itinId] = list;
  });

  return result;
}

export async function deleteItinerary(id: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('itineraries')
    .update({
      deleted_at: now,
      updated_at: now,
    } as never)
    .eq('id', id);

  if (error) {
    console.error('[itinerariesApi] deleteItinerary (soft delete) failed', error);
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
  /** ISO timestamp da última atualização do roteiro */
  updatedAt: string | null;
}


export async function listPublicItineraries(limit = 200): Promise<PublicItinerarySearchRow[]> {
  const { data, error } = await supabase
    .from('itinerary_store_listing')
    .select('*, itineraries(*)')
    .eq('status', 'active')
    .order('published_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('[itinerariesApi] listPublicItineraries failed', error);
    return [];
  }
  
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Carrega perfis dos autores numa única query
  const userIds = Array.from(new Set(rows.map((r: any) => r.seller_id))).filter(Boolean);
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
    const base = row.itineraries ? rowToItinerary(row.itineraries) : {} as UserItinerary;
    const profile = profileById.get(row.seller_id);
    return {
      ...base,
      id: row.itinerary_id,
      title: row.listed_title,
      description: row.listed_description,
      priceCents: row.price_cents,
      tags: row.tags,
      isFlexible: row.is_flexible_dates,
      durationDays: row.duration_days,
      travelMonth: row.travel_month,
      authorName: profile?.name || profile?.username || 'Viajante',
      authorUsername: profile?.username || '',
      authorAvatar: profile?.avatar_url || '',
      updatedAt: row.updated_at ? String(row.updated_at) : null,
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
  publishData: { priceCents: number | null; description: string; },
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
    status: 'published'
  });
  if (!created) return null;

  // Clone server-side das atividades/transportes (fonte da verdade).
  try {
    const { cloneItineraryContent } = await import('./plannerApi');
    await cloneItineraryContent(source.id, created.id);
  } catch (err) {
    console.error('[itinerariesApi] cloneItineraryContent failed', err);
  }



  return created;
}

/**
 * Duplica um roteiro.
 * @param source O roteiro original
 * @param asPublic Se true, duplica para a aba de loja (isPublic=false mas focado em venda). Se false, duplica como viagem pessoal (isPersonal=true).
 */
export async function duplicateItinerary(
  source: UserItinerary,
  asPublic: boolean
): Promise<UserItinerary | null> {
  const created = await createItinerary({
    title: source.title + ' (Cópia)',
    destinations: source.destinations,
    startDate: source.startDate,
    endDate: source.endDate,
    images: source.images,
    participants: source.participants,
    places: source.places,
    sourceDatasetId: source.sourceDatasetId ?? null,
    isPersonal: !asPublic,
    isPublic: false, // Mesmo para loja, começa como rascunho privado até o usuário publicar
    priceCents: asPublic ? (source.priceCents ?? null) : null,
    description: source.description,
    status: 'draft',
    isFlexible: source.isFlexible,
    durationDays: source.durationDays,
    travelMonth: source.travelMonth,
    tags: source.tags,
    mainTag: source.mainTag,
  });
  
  if (!created) return null;

  try {
    const { cloneItineraryContent } = await import('./plannerApi');
    await cloneItineraryContent(source.id, created.id);
  } catch (err) {
    console.error('[itinerariesApi] cloneItineraryContent failed during duplicate', err);
  }

  return created;
}
