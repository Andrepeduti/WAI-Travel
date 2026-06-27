import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
  migrateLocalFavoritesIfNeeded,
  type FavoriteRecord,
} from '@/lib/favoritesApi';

export interface FavoriteItinerary {
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
  addedAt: number;
}

interface FavoritesContextType {
  favorites: FavoriteItinerary[];
  addFavorite: (item: Omit<FavoriteItinerary, 'addedAt'>) => void;
  removeFavorite: (itineraryId: number) => void;
  toggleFavorite: (item: Omit<FavoriteItinerary, 'addedAt'>) => void;
  isFavorite: (itineraryId: number) => boolean;
  count: number;
}

/**
 * Favoritos agora persistem no backend (tabela `favorites`). Mantemos um
 * cache em `localStorage` por usuário (`wai-travel-favorites:{userId}`)
 * apenas para resposta instantânea ao abrir o app — a fonte da verdade é
 * sempre o servidor, que sobrescreve o cache assim que responde.
 */
const cacheKeyFor = (userId: string | null) =>
  userId ? `wai-travel-favorites:${userId}` : null;

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

function readCache(key: string | null): FavoriteItinerary[] {
  if (!key) return [];
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeCache(key: string | null, favorites: FavoriteItinerary[]) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(favorites));
  } catch {
    /* storage cheio: ignora */
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const cacheKey = cacheKeyFor(userId);

  const [favorites, setFavorites] = useState<FavoriteItinerary[]>(() => readCache(cacheKey));
  const lastSyncedUserId = useRef<string | null>(null);

  // Refetch + migração one-shot sempre que o usuário muda.
  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      return;
    }

    // Cache local imediato pra evitar flash de empty.
    setFavorites(readCache(cacheKey));

    let cancelled = false;
    (async () => {
      try {
        await migrateLocalFavoritesIfNeeded(userId);
        const remote = await listFavorites();
        if (cancelled) return;
        setFavorites(remote);
        writeCache(cacheKey, remote);
        lastSyncedUserId.current = userId;
      } catch (err) {
        console.error('[FavoritesContext] sync failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, cacheKey]);

  // Cache local sempre que a lista muda (resposta otimista).
  useEffect(() => {
    if (lastSyncedUserId.current === userId) {
      writeCache(cacheKey, favorites);
    }
  }, [favorites, cacheKey, userId]);

  const addFavorite = useCallback(
    (item: Omit<FavoriteItinerary, 'addedAt'>) => {
      setFavorites((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [{ ...item, addedAt: Date.now() }, ...prev];
      });
      // Fire-and-forget — erros logados pela API.
      void apiAddFavorite(item);
    },
    [],
  );

  const removeFavorite = useCallback((itineraryId: number) => {
    setFavorites((prev) => prev.filter((i) => i.id !== itineraryId));
    void apiRemoveFavorite(itineraryId);
  }, []);

  const isFavorite = useCallback(
    (itineraryId: number) => favorites.some((i) => i.id === itineraryId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteItinerary, 'addedAt'>) => {
      setFavorites((prev) => {
        if (prev.some((i) => i.id === item.id)) {
          void apiRemoveFavorite(item.id);
          return prev.filter((i) => i.id !== item.id);
        }
        void apiAddFavorite(item);
        return [{ ...item, addedAt: Date.now() }, ...prev];
      });
    },
    [],
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        isFavorite,
        count: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
