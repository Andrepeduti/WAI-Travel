/**
 * Sincroniza coleções (lista, pastas e lugares) entre o localStorage
 * (cache imediato usado pela UI) e o backend (fonte da verdade quando logado).
 *
 * Estratégia:
 * 1. Ao logar, hidrata o localStorage com os dados do backend (merge).
 * 2. Cada escrita em chaves de coleção dispara um push debounced para o backend.
 * 3. Sem usuário logado: no-op (continua só no localStorage).
 *
 * Mantém a API existente (`readJSON`/`writeJSON`) intacta — nenhuma tela
 * precisa ser refatorada.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  collectionsListKey,
  collectionsDataKey,
  readJSON,
  writeJSON,
  getCurrentUserIdSync,
} from '@/lib/userScopedStorage';

interface UserCollectionLike {
  id: number;
  title: string;
  itemCount?: number;
  isFavorites?: boolean;
  isPrivate?: boolean;
  images?: string[];
  participants?: string[];
}

interface PlaceLike {
  id: number | string;
  name: string;
  rating?: number;
  reviewCount?: string | number;
  address?: string;
  category?: string;
  image?: string;
  lat?: number;
  lng?: number;
  folderId?: number | string | null;
  [k: string]: unknown;
}

interface FolderLike {
  id: number | string;
  name: string;
  images?: string[];
  [k: string]: unknown;
}

interface CollectionPayload {
  places: PlaceLike[];
  folders: FolderLike[];
}

let hydrated = false;
let hydrating: Promise<void> | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Resets state (useful on logout). */
export function resetCollectionsSync() {
  hydrated = false;
  hydrating = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

/**
 * Pulls all collections + folders + places from backend and writes them
 * into localStorage. Called once after login.
 */
export async function hydrateCollectionsFromBackend(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;

  hydrating = (async () => {
    const userId = getCurrentUserIdSync();
    if (!userId) return;

    try {
      const [{ data: cols }, { data: folders }, { data: places }] = await Promise.all([
        supabase.from('collections').select('*').eq('user_id', userId),
        supabase.from('collection_folders').select('*').eq('user_id', userId),
        supabase.from('collection_places').select('*').eq('user_id', userId),
      ]);

      if (!cols) return;

      // Build the localStorage list shape
      const listKey = collectionsListKey();
      const dataKey = collectionsDataKey();
      if (!listKey || !dataKey) return;

      // Merge: keep local-only items that haven't been pushed yet
      const localList = readJSON<UserCollectionLike[]>(listKey, []);
      const localData = readJSON<Record<number, CollectionPayload>>(dataKey, {});

      // Map backend rows by legacy_id (the numeric id used in UI)
      const mappedList: UserCollectionLike[] = cols.map((c) => ({
        id: Number(c.legacy_id ?? Date.now()),
        title: c.title,
        itemCount: c.item_count,
        isFavorites: false,
        isPrivate: c.is_private,
        images: c.cover_images ?? [],
        participants: [],
      }));

      // Append local-only items not yet in backend
      const backendIds = new Set(mappedList.map((c) => c.id));
      for (const local of localList) {
        if (!backendIds.has(local.id)) mappedList.push(local);
      }

      // Build data map
      const mappedData: Record<number, CollectionPayload> = {};
      for (const c of cols) {
        const legacyId = Number(c.legacy_id ?? 0);
        if (!legacyId) continue;
        const colFolders = (folders ?? [])
          .filter((f) => f.collection_id === c.id)
          .map((f) => ({
            id: Number(f.legacy_id ?? Date.now()),
            name: f.name,
            images: f.cover_images ?? [],
          }));
        const colPlaces = (places ?? [])
          .filter((p) => p.collection_id === c.id)
          .map((p) => ({
            id: Number(p.legacy_id ?? Date.now()),
            name: p.name,
            rating: Number(p.rating ?? 0),
            reviewCount: p.review_count ?? '–',
            address: p.address ?? '',
            category: p.category ?? '',
            image: p.image ?? '',
            lat: Number(p.lat ?? 0),
            lng: Number(p.lng ?? 0),
            folderId: (() => {
              if (!p.folder_id) return null;
              const f = (folders ?? []).find((ff) => ff.id === p.folder_id);
              return f ? Number(f.legacy_id ?? 0) : null;
            })(),
            ...(p.metadata as Record<string, unknown>),
          }));
        mappedData[legacyId] = { places: colPlaces, folders: colFolders };
      }

      // Preserve any local-only collection data
      for (const [k, v] of Object.entries(localData)) {
        const id = Number(k);
        if (!(id in mappedData)) mappedData[id] = v;
      }

      writeJSON(listKey, mappedList);
      writeJSON(dataKey, mappedData);

      hydrated = true;
    } catch (err) {
      console.warn('[collectionsSync] hydrate failed', err);
    }
  })();

  return hydrating;
}

/**
 * Pushes the current localStorage state to the backend.
 * Debounced so that a burst of writes results in a single sync.
 */
export function scheduleCollectionsPush(): void {
  const userId = getCurrentUserIdSync();
  if (!userId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushCollectionsNow();
  }, 600);
}

async function pushCollectionsNow(): Promise<void> {
  const userId = getCurrentUserIdSync();
  if (!userId) return;
  const listKey = collectionsListKey();
  const dataKey = collectionsDataKey();
  if (!listKey || !dataKey) return;

  const list = readJSON<UserCollectionLike[]>(listKey, []);
  const data = readJSON<Record<number, CollectionPayload>>(dataKey, {});

  try {
    // Fetch existing backend rows to know what to update vs insert vs delete
    const { data: existingCols } = await supabase
      .from('collections')
      .select('id, legacy_id')
      .eq('user_id', userId);

    const existingByLegacy = new Map<number, string>();
    for (const c of existingCols ?? []) {
      if (c.legacy_id != null) existingByLegacy.set(Number(c.legacy_id), c.id);
    }

    const localLegacyIds = new Set(list.map((c) => c.id));

    // 1. Delete backend collections that no longer exist locally
    const toDelete = (existingCols ?? [])
      .filter((c) => c.legacy_id != null && !localLegacyIds.has(Number(c.legacy_id)))
      .map((c) => c.id);
    if (toDelete.length) {
      await supabase.from('collections').delete().in('id', toDelete);
    }

    // 2. Upsert collections + cascade pastas/lugares
    for (const col of list) {
      const payload = data[col.id] ?? { places: [], folders: [] };
      let backendId = existingByLegacy.get(col.id);

      const colRow = {
        user_id: userId,
        legacy_id: col.id,
        title: col.title ?? '',
        is_private: col.isPrivate ?? true,
        cover_images: col.images ?? [],
        item_count: payload.places.length,
      };

      if (backendId) {
        await supabase.from('collections').update(colRow).eq('id', backendId);
      } else {
        const { data: inserted } = await supabase
          .from('collections')
          .insert(colRow)
          .select('id')
          .single();
        if (!inserted) continue;
        backendId = inserted.id;
      }

      // Wipe and reinsert folders + places (simplest correct approach)
      await supabase.from('collection_places').delete().eq('collection_id', backendId);
      await supabase.from('collection_folders').delete().eq('collection_id', backendId);

      const folderIdMap = new Map<number, string>();
      if (payload.folders.length) {
        const folderRows = payload.folders.map((f, idx) => ({
          collection_id: backendId!,
          user_id: userId,
          legacy_id: Number(f.id),
          name: f.name ?? '',
          cover_images: f.images ?? [],
          position: idx,
        }));
        const { data: insertedFolders } = await supabase
          .from('collection_folders')
          .insert(folderRows)
          .select('id, legacy_id');
        for (const f of insertedFolders ?? []) {
          if (f.legacy_id != null) folderIdMap.set(Number(f.legacy_id), f.id);
        }
      }

      if (payload.places.length) {
        const placeRows = payload.places.map((p, idx) => {
          const { id, name, rating, reviewCount, address, category, image, lat, lng, folderId, ...rest } = p;
          return {
            collection_id: backendId!,
            user_id: userId,
            folder_id: folderId != null ? folderIdMap.get(Number(folderId)) ?? null : null,
            legacy_id: Number(id),
            name: name ?? '',
            rating: Number(rating ?? 0),
            review_count: String(reviewCount ?? '–'),
            address: address ?? '',
            category: category ?? '',
            image: image ?? '',
            lat: Number(lat ?? 0),
            lng: Number(lng ?? 0),
            metadata: rest as Record<string, unknown> as never,
            position: idx,
          };
        });
        await supabase.from('collection_places').insert(placeRows);
      }
    }
  } catch (err) {
    console.warn('[collectionsSync] push failed', err);
  }
}

// Auto-hydrate when the user logs in, reset when they log out
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    resetCollectionsSync();
  } else if (session?.user?.id) {
    // Defer slightly so cachedUserId in userScopedStorage is updated first
    setTimeout(() => {
      void hydrateCollectionsFromBackend();
    }, 50);
  }
});
