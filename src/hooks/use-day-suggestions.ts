import { useEffect, useMemo, useState } from 'react';
import {
  getPlacesForDestinations,
  getDestinationForDay,
  toSuggestions,
  type CityPlace,
} from '@/data/cityRecommendations';
import { fetchPlacesForCity, mergePlaces } from '@/lib/placesApi';
import type { ItinerarySuggestion } from '@/data/itineraries';

const apiCache = new Map<string, CityPlace[]>();
const pendingFetches = new Map<string, Promise<CityPlace[]>>();

type DaySuggestionsState = {
  suggestionsByDay: Record<number, ItinerarySuggestion[]>;
  isLoadingByDay: Record<number, boolean>;
  hasFetchedByDay: Record<number, boolean>;
};

function getCityKey(destination: string): string {
  return destination.split(',')[0].trim().toLowerCase();
}

/**
 * Retorna sugestões de lugares por dia, baseadas no destino real daquele dia.
 * Evita depender do "selectedDay" global enquanto o Planner renderiza vários dias.
 */
export function useDaySuggestions(
  destinations: string[],
  totalDays: number,
  fallbackSuggestions: ItinerarySuggestion[] = [],
): DaySuggestionsState {
  const dayDestinations = useMemo(() => {
    return Array.from({ length: Math.max(totalDays, 1) }, (_, index) => {
      const day = index + 1;
      const destination = destinations?.length ? getDestinationForDay(destinations, day, totalDays) : '';
      return { day, destination, cityKey: getCityKey(destination) };
    });
  }, [destinations, totalDays]);

  const [apiPlacesByCity, setApiPlacesByCity] = useState<Record<string, CityPlace[]>>(() => {
    const initial: Record<string, CityPlace[]> = {};
    dayDestinations.forEach(({ cityKey }) => {
      const cached = apiCache.get(cityKey);
      if (cityKey && cached) initial[cityKey] = cached;
    });
    return initial;
  });
  const [loadingByCity, setLoadingByCity] = useState<Record<string, boolean>>({});
  const [fetchedByCity, setFetchedByCity] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    dayDestinations.forEach(({ cityKey }) => {
      if (cityKey) initial[cityKey] = apiCache.has(cityKey);
    });
    return initial;
  });

  useEffect(() => {
    let cancelled = false;
    const uniqueDestinations = Array.from(
      new Map(
        dayDestinations
          .filter(({ cityKey }) => Boolean(cityKey))
          .map(({ cityKey, destination }) => [cityKey, destination]),
      ).entries(),
    );

    uniqueDestinations.forEach(([cityKey, destination]) => {
      const cached = apiCache.get(cityKey);
      if (cached) {
        setApiPlacesByCity(prev => ({ ...prev, [cityKey]: cached }));
        setLoadingByCity(prev => ({ ...prev, [cityKey]: false }));
        setFetchedByCity(prev => ({ ...prev, [cityKey]: true }));
        return;
      }

      setLoadingByCity(prev => ({ ...prev, [cityKey]: true }));
      setFetchedByCity(prev => ({ ...prev, [cityKey]: false }));

      const fetchPromise = pendingFetches.get(cityKey) ?? fetchPlacesForCity(destination);
      pendingFetches.set(cityKey, fetchPromise);

      fetchPromise
        .then((places) => {
          if (cancelled) return;
          if (places.length > 0) apiCache.set(cityKey, places);
          setApiPlacesByCity(prev => ({ ...prev, [cityKey]: places }));
        })
        .catch(() => {
          if (!cancelled) setApiPlacesByCity(prev => ({ ...prev, [cityKey]: [] }));
        })
        .finally(() => {
          pendingFetches.delete(cityKey);
          if (!cancelled) {
            setLoadingByCity(prev => ({ ...prev, [cityKey]: false }));
            setFetchedByCity(prev => ({ ...prev, [cityKey]: true }));
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [dayDestinations]);

  return useMemo(() => {
    const suggestionsByDay: Record<number, ItinerarySuggestion[]> = {};
    const isLoadingByDay: Record<number, boolean> = {};
    const hasFetchedByDay: Record<number, boolean> = {};

    dayDestinations.forEach(({ day, destination, cityKey }) => {
      const localPlaces = destination ? getPlacesForDestinations([destination]) : [];
      const apiPlaces = cityKey ? apiPlacesByCity[cityKey] ?? [] : [];
      const merged = mergePlaces(localPlaces, apiPlaces);

      suggestionsByDay[day] = merged.length > 0 ? toSuggestions(merged) : fallbackSuggestions;
      isLoadingByDay[day] = cityKey ? Boolean(loadingByCity[cityKey]) : false;
      hasFetchedByDay[day] = cityKey ? Boolean(fetchedByCity[cityKey]) : true;
    });

    return { suggestionsByDay, isLoadingByDay, hasFetchedByDay };
  }, [apiPlacesByCity, dayDestinations, fallbackSuggestions, fetchedByCity, loadingByCity]);
}
