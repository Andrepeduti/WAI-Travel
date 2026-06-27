import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  CreateItineraryInput,
  ITINERARIES_CHANGED_EVENT,
  UpdateItineraryInput,
  UserItinerary,
  createItinerary,
  deleteItinerary,
  listMyItineraries,
  updateItinerary,
} from '@/lib/itinerariesApi';


const optimisticItinerariesByUser = new Map<string, UserItinerary[]>();
const optimisticListeners = new Set<() => void>();

const notifyOptimisticItineraries = () => optimisticListeners.forEach(listener => listener());

const isPendingItinerary = (id: string) => id.startsWith('pending-itinerary-');

function mergeWithOptimistic(userId: string | null, rows: UserItinerary[]) {
  if (!userId) return rows;
  const optimisticRows = optimisticItinerariesByUser.get(userId) ?? [];
  if (optimisticRows.length === 0) return rows;
  const ids = new Set(rows.map(row => row.id));
  const pendingRows = optimisticRows.filter(row => !ids.has(row.id));
  optimisticItinerariesByUser.set(userId, pendingRows);
  return [...pendingRows, ...rows];
}

export function buildOptimisticItinerary(input: CreateItineraryInput, userId: string, id: string): UserItinerary {
  const now = new Date().toISOString();
  return {
    id,
    title: input.title,
    destinations: input.destinations ?? [],
    startDate: input.startDate ?? now,
    endDate: input.endDate ?? input.startDate ?? now,
    images: input.images ?? [],
    participants: input.participants ?? [],
    places: input.places ?? 0,
    sourceDatasetId: input.sourceDatasetId ?? null,
    isPublic: input.isPublic ?? false,
    priceCents: input.priceCents ?? null,
    description: input.description ?? '',
    tags: input.tags ?? [],
    mainTag: input.mainTag ?? '',
    userId,
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

export function useMyItineraries() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [itineraries, setItineraries] = useState<UserItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setItineraries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await listMyItineraries();
    setItineraries(mergeWithOptimistic(userId, data));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const syncOptimistic = () => {
      setItineraries(prev => mergeWithOptimistic(userId, prev.filter(row => !isPendingItinerary(row.id))));
    };
    optimisticListeners.add(syncOptimistic);
    return () => {
      optimisticListeners.delete(syncOptimistic);
    };
  }, [userId]);

  // Realtime sync between tabs / devices.
  // Inclui também itinerários compartilhados: o filtro `user_id=eq.<me>` em
  // `itineraries` só captura roteiros que EU sou dono. Para refletir mudanças
  // do dono num roteiro onde sou apenas membro, escutamos a tabela inteira
  // e refazemos o fetch — `listMyItineraries` já junta owned + shared.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`itineraries:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itineraries' },
        () => { refetch(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_members', filter: `user_id=eq.${userId}` },
        () => { refetch(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  // Sincronização entre instâncias do hook montadas em paralelo (Trips/Home/Index).
  // Disparado por createItinerary/updateItinerary/deleteItinerary após sucesso.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { refetch(); };
    window.addEventListener(ITINERARIES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(ITINERARIES_CHANGED_EVENT, handler);
  }, [refetch]);


  const create = useCallback(async (input: CreateItineraryInput) => {
    const created = await createItinerary(input);
    if (created) {
      replaceOptimisticItinerary(created.id, created);
    }
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: UpdateItineraryInput) => {
    await updateItinerary(id, patch);
    setItineraries(prev =>
      prev.map(it =>
        it.id === id
          ? {
              ...it,
              ...(patch.title !== undefined ? { title: patch.title } : {}),
              ...(patch.destinations !== undefined ? { destinations: patch.destinations } : {}),
              ...(patch.startDate !== undefined && patch.startDate ? { startDate: patch.startDate } : {}),
              ...(patch.endDate !== undefined && patch.endDate ? { endDate: patch.endDate } : {}),
              ...(patch.images !== undefined ? { images: patch.images } : {}),
              ...(patch.participants !== undefined ? { participants: patch.participants } : {}),
              ...(patch.places !== undefined ? { places: patch.places } : {}),
            }
          : it,
      ),
    );
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteItinerary(id);
    setItineraries(prev => prev.filter(it => it.id !== id));
  }, []);

  return { itineraries, loading, refetch, create, update, remove };
}
