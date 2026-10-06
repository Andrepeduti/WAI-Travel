/**
 * useTrendingDestinations
 *
 * Agrega os roteiros à venda por país para a seção "Destinos em alta":
 * quantidade de roteiros e uma foto de capa.
 * Um roteiro com vários países conta em cada um deles.
 * Ordena por vendas e, no empate, por quantidade de roteiros.
 */

import { useEffect, useState } from 'react';
import { listPublicItineraries } from '@/lib/itinerariesApi';
import { resolveCountriesForDestinations } from '@/lib/countryResolver';
import { resolveCoverImage } from '@/lib/coverImageResolver';

export interface TrendingDestination {
  country: string;
  continent: string;
  image: string;
  itineraryCount: number;
}

export function useTrendingDestinations(limit = 8) {
  const [destinations, setDestinations] = useState<TrendingDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const publicItineraries = await listPublicItineraries(1000);
        if (cancelled) return;

        const byCountry = new Map<string, {
          continent: string;
          itineraryCount: number;
          salesCount: number;
          image: string;
        }>();

        for (const it of publicItineraries) {
          // Roteiro com vários países entra na coleção de cada um deles.
          const countries = resolveCountriesForDestinations(it.destinations);
          const cover = it.images?.[0];
          // A capa só representa o país quando o roteiro é de um país só.
          const usableCover = countries.length === 1 && cover && !cover.includes('placeholder') ? cover : '';

          for (const country of countries) {
            const entry = byCountry.get(country.name) ?? {
              continent: country.continent,
              itineraryCount: 0,
              salesCount: 0,
              image: '',
            };
            entry.itineraryCount += 1;
            entry.salesCount += it.salesCount;
            if (!entry.image && usableCover) entry.image = usableCover;
            byCountry.set(country.name, entry);
          }
        }

        const result = Array.from(byCountry.entries())
          .sort(([, a], [, b]) => b.salesCount - a.salesCount || b.itineraryCount - a.itineraryCount)
          .slice(0, limit)
          .map(([country, data]) => ({
            country,
            continent: data.continent,
            image: data.image || resolveCoverImage([country]).url,
            itineraryCount: data.itineraryCount,
          }));

        if (!cancelled) setDestinations(result);
      } catch (err) {
        console.error('[useTrendingDestinations] failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [limit]);

  return { destinations, loading };
}
