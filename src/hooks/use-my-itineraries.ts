import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import {
  CreateItineraryInput,
  ITINERARIES_CHANGED_EVENT,
  UpdateItineraryInput,
  UserItinerary,
  deleteItinerary,
  listMyItineraries,
} from '@/lib/itinerariesApi';

const MY_ITINERARIES_KEY = 'my-itineraries';
const myItinerariesKey = (userId: string | null) => [MY_ITINERARIES_KEY, userId] as const;

// ---------------------------------------------------------------------------
// Linhas otimistas (roteiros criados localmente que ainda não voltaram do banco)
// ---------------------------------------------------------------------------

const optimisticItinerariesByUser = new Map<string, UserItinerary[]>();
const optimisticListeners = new Set<() => void>();

const notifyOptimisticItineraries = () => optimisticListeners.forEach(listener => listener());

function applyPatchToItinerary(it: UserItinerary, id: string, patch: UpdateItineraryInput): UserItinerary {
  if (it.id !== id) return it;
  return {
    ...it,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.destinations !== undefined ? { destinations: patch.destinations } : {}),
    ...(patch.startDate !== undefined && patch.startDate ? { startDate: patch.startDate } : {}),
    ...(patch.endDate !== undefined && patch.endDate ? { endDate: patch.endDate } : {}),
    ...(patch.images !== undefined ? { images: patch.images } : {}),
    ...(patch.participants !== undefined ? { participants: patch.participants } : {}),
    ...(patch.places !== undefined ? { places: patch.places } : {}),
  };
}

function patchCachedItineraries(id: string, patch: UpdateItineraryInput) {
  queryClient.setQueriesData<UserItinerary[]>({ queryKey: [MY_ITINERARIES_KEY] }, prev =>
    prev?.map(it => applyPatchToItinerary(it, id, patch)),
  );
  optimisticItinerariesByUser.forEach((rows, userId) => {
    optimisticItinerariesByUser.set(userId, rows.map(it => applyPatchToItinerary(it, id, patch)));
  });
  notifyOptimisticItineraries();
}

function removeFromCachedItineraries(id: string) {
  queryClient.setQueriesData<UserItinerary[]>({ queryKey: [MY_ITINERARIES_KEY] }, prev =>
    prev?.filter(it => it.id !== id),
  );
  optimisticItinerariesByUser.forEach((rows, userId) => {
    optimisticItinerariesByUser.set(userId, rows.filter(it => it.id !== id));
  });
  notifyOptimisticItineraries();
}

/** Aplica o patch no cache e avisa as telas, sem ir ao banco. */
export function applyOptimisticPatch(id: string, patch: UpdateItineraryInput) {
  patchCachedItineraries(id, patch);
}

export function buildOptimisticItinerary(input: CreateItineraryInput, userId: string, id: string): UserItinerary {
  const now = new Date().toISOString();
  return {
    id,
    title: input.title,
    destinations: input.destinations ?? [],
    startDate: input.isFlexible ? '' : (input.startDate ?? now),
    endDate: input.isFlexible ? '' : (input.endDate ?? input.startDate ?? now),
    images: input.images ?? [],
    participants: input.participants ?? [],
    places: input.places ?? 0,
    sourceDatasetId: input.sourceDatasetId ?? null,
    isPublic: input.isPublic ?? false,
    priceCents: input.priceCents ?? null,
    tags: input.tags ?? [],
    userId,
    status: input.status,
  };
}

export function addOptimisticItinerary(itinerary: UserItinerary) {
  const rows = optimisticItinerariesByUser.get(itinerary.userId) ?? [];
  optimisticItinerariesByUser.set(itinerary.userId, [itinerary, ...rows.filter(row => row.id !== itinerary.id)]);
  notifyOptimisticItineraries();
}

export function replaceOptimisticItinerary(tempId: string, created: UserItinerary) {
  const rows = optimisticItinerariesByUser.get(created.userId) ?? [];
  optimisticItinerariesByUser.set(created.userId, [created, ...rows.filter(row => row.id !== tempId && row.id !== created.id)]);
  notifyOptimisticItineraries();
}

export function removeOptimisticItinerary(tempId: string) {
  optimisticItinerariesByUser.forEach((rows, userId) => {
    optimisticItinerariesByUser.set(userId, rows.filter(row => row.id !== tempId));
  });
  notifyOptimisticItineraries();
}

/** Descarta as linhas otimistas que o banco já devolveu. */
function pruneOptimistic(userId: string, serverRows: UserItinerary[]) {
  const optimisticRows = optimisticItinerariesByUser.get(userId);
  if (!optimisticRows || optimisticRows.length === 0) return;
  const ids = new Set(serverRows.map(row => row.id));
  optimisticItinerariesByUser.set(userId, optimisticRows.filter(row => !ids.has(row.id)));
}

// ---------------------------------------------------------------------------
// Sincronização única (Realtime + evento local), compartilhada por todas as
// instâncias do hook. Só existe enquanto houver ao menos uma instância montada.
// ---------------------------------------------------------------------------

let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

/** Agrupa rajadas de eventos (evento local + Realtime + vários saves) em um único refetch. */
function scheduleInvalidate() {
  if (invalidateTimer) return;
  invalidateTimer = setTimeout(() => {
    invalidateTimer = null;
    queryClient.invalidateQueries({ queryKey: [MY_ITINERARIES_KEY] });
  }, 300);
}

const sharedIdsKey = (userId: string, rows: UserItinerary[] | undefined) =>
  (rows ?? [])
    .filter(it => it.userId !== userId && !it.id.startsWith('pending-'))
    .map(it => it.id)
    .sort()
    .join(',');

let syncRefs = 0;
let syncUserId: string | null = null;
let syncChannel: RealtimeChannel | null = null;
let syncSharedKey = '';
let stopCacheWatch: (() => void) | null = null;

function openSyncChannel(userId: string, sharedKey: string) {
  if (syncChannel) supabase.removeChannel(syncChannel);
  syncSharedKey = sharedKey;
  const channel = supabase
    .channel(`itineraries:${userId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'itineraries', filter: `user_id=eq.${userId}` },
      scheduleInvalidate,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'itinerary_members', filter: `user_id=eq.${userId}` },
      scheduleInvalidate,
    );

  if (sharedKey.length > 0) {
    // Escuta mudanças nos roteiros compartilhados sem ouvir o banco de dados inteiro
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'itineraries', filter: `id=in.(${sharedKey})` },
      scheduleInvalidate,
    );
  }

  syncChannel = channel.subscribe();
}

// Disparado por create/update/deleteItinerary após sucesso e por applyOptimisticPatch.
// Mantém as telas em sincronia mesmo quando o Realtime falha em entregar o evento.
function handleItinerariesChanged(e: Event) {
  const detail = (e as CustomEvent).detail;
  if (detail?.type === 'delete' && detail?.id) {
    removeFromCachedItineraries(detail.id);
  }
  if (detail?.type === 'update' && detail?.id && detail?.patch) {
    patchCachedItineraries(detail.id, detail.patch as UpdateItineraryInput);
  }
  if (!detail?.noRefetch) scheduleInvalidate();
}

function acquireSync(userId: string) {
  if (syncUserId && syncUserId !== userId) stopSync();
  syncRefs += 1;
  if (syncRefs > 1) return;

  syncUserId = userId;
  openSyncChannel(userId, sharedIdsKey(userId, queryClient.getQueryData<UserItinerary[]>(myItinerariesKey(userId))));

  // Reabre o canal só quando o conjunto de roteiros compartilhados muda.
  stopCacheWatch = queryClient.getQueryCache().subscribe(event => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== MY_ITINERARIES_KEY || event.query.queryKey[1] !== userId) return;
    const nextKey = sharedIdsKey(userId, event.query.state.data as UserItinerary[] | undefined);
    if (nextKey !== syncSharedKey) openSyncChannel(userId, nextKey);
  });

  if (typeof window !== 'undefined') {
    window.addEventListener(ITINERARIES_CHANGED_EVENT, handleItinerariesChanged);
  }
}

function stopSync() {
  if (typeof window !== 'undefined') {
    window.removeEventListener(ITINERARIES_CHANGED_EVENT, handleItinerariesChanged);
  }
  stopCacheWatch?.();
  stopCacheWatch = null;
  if (syncChannel) supabase.removeChannel(syncChannel);
  syncChannel = null;
  syncSharedKey = '';
  syncUserId = null;
  syncRefs = 0;
}

function releaseSync() {
  if (syncRefs === 0) return;
  syncRefs -= 1;
  if (syncRefs === 0) stopSync();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMyItineraries() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [optimisticVersion, bumpOptimistic] = useReducer((v: number) => v + 1, 0);

  const { data, isLoading } = useQuery({
    queryKey: myItinerariesKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const rows = await listMyItineraries(userId!);
      pruneOptimistic(userId!, rows);
      return rows;
    },
  });

  useEffect(() => {
    optimisticListeners.add(bumpOptimistic);
    return () => {
      optimisticListeners.delete(bumpOptimistic);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    acquireSync(userId);
    return releaseSync;
  }, [userId]);

  const itineraries = useMemo(() => {
    const rows = data ?? [];
    if (!userId) return rows;
    const optimisticRows = optimisticItinerariesByUser.get(userId) ?? [];
    if (optimisticRows.length === 0) return rows;
    const ids = new Set(rows.map(row => row.id));
    return [...optimisticRows.filter(row => !ids.has(row.id)), ...rows];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, userId, optimisticVersion]);

  const remove = useCallback(async (id: string) => {
    await deleteItinerary(id);
    removeFromCachedItineraries(id);
  }, []);

  return { itineraries, loading: isLoading, remove };
}
