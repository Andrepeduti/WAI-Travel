/**
 * useTopCreators
 *
 * Ranking de "Criadores em alta":
 *   1. Quem mais vendeu (soma de vendas dos roteiros à venda).
 *   2. Sem vendas, quem mais publicou roteiros à venda.
 *
 * Badge de conquista: "Guru da <continente>" para o continente em que o
 * criador tem 20+ vendas (mostra o de maior volume).
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { listPublicItineraries } from '@/lib/itinerariesApi';
import { resolveCountriesForDestinations } from '@/lib/countryResolver';
import type { CountryInfo } from '@/data/countriesCatalog';

export interface TopCreator {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  salesCount: number;
  publishedCount: number;
  /** Países distintos dos roteiros à venda do criador. */
  countries: CountryInfo[];
  /** Média das avaliações dos roteiros à venda (0 = sem avaliações). */
  rating: number;
  /** Ex.: "Guru da Europa" */
  badge: string | null;
}

const GURU_MIN_SALES = 20;

/** Agrupa as Américas num único badge ("Guru da América"). */
function guruRegion(continent: string): string | null {
  if (!continent || continent === 'Mundo') return null;
  return continent.startsWith('América') ? 'América' : continent;
}

interface SellerAccumulator {
  creator: Omit<TopCreator, 'bio' | 'countries' | 'rating' | 'badge'>;
  itineraryIds: string[];
  countries: Map<string, CountryInfo>;
  salesByRegion: Map<string, number>;
}

export function useTopCreators(limit = 10) {
  const [creators, setCreators] = useState<TopCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const listings = await listPublicItineraries(1000);
        if (cancelled) return;

        const bySeller = new Map<string, SellerAccumulator>();
        for (const it of listings) {
          if (!it.userId) continue;
          const acc = bySeller.get(it.userId) ?? {
            creator: {
              userId: it.userId,
              name: it.authorName,
              username: it.authorUsername,
              avatar: it.authorAvatar,
              salesCount: 0,
              publishedCount: 0,
            },
            itineraryIds: [],
            countries: new Map<string, CountryInfo>(),
            salesByRegion: new Map<string, number>(),
          };
          acc.creator.publishedCount += 1;
          acc.creator.salesCount += it.salesCount;
          acc.itineraryIds.push(it.id);

          const countries = resolveCountriesForDestinations(it.destinations);
          countries.forEach((c) => acc.countries.set(c.iso3, c));

          if (it.salesCount > 0) {
            // Cada venda conta uma vez por continente do roteiro (França + Inglaterra = 1x Europa).
            const regions = new Set(countries.map((c) => guruRegion(c.continent)).filter((r): r is string => !!r));
            regions.forEach((region) => {
              acc.salesByRegion.set(region, (acc.salesByRegion.get(region) ?? 0) + it.salesCount);
            });
          }
          bySeller.set(it.userId, acc);
        }

        const ranked = Array.from(bySeller.values())
          .sort((a, b) => b.creator.salesCount - a.creator.salesCount || b.creator.publishedCount - a.creator.publishedCount)
          .slice(0, limit);

        // Bio e avaliações só dos criadores que vão aparecer.
        const userIds = ranked.map((acc) => acc.creator.userId);
        const itineraryIds = ranked.flatMap((acc) => acc.itineraryIds);
        const [profilesRes, reviewsRes] = await Promise.all([
          userIds.length
            ? supabase.from('profiles_public').select('user_id, bio').in('user_id', userIds)
            : Promise.resolve({ data: [] as { user_id: string; bio: string | null }[] }),
          itineraryIds.length
            ? supabase.from('itinerary_reviews').select('itinerary_id, rating').in('itinerary_id', itineraryIds)
            : Promise.resolve({ data: [] as { itinerary_id: string; rating: number }[] }),
        ]);
        if (cancelled) return;

        const bioByUser = new Map((profilesRes.data ?? []).map((p) => [p.user_id as string, (p.bio as string | null) ?? '']));
        const ratingsByItinerary = new Map<string, number[]>();
        (reviewsRes.data ?? []).forEach((r) => {
          const list = ratingsByItinerary.get(r.itinerary_id as string) ?? [];
          list.push(Number(r.rating));
          ratingsByItinerary.set(r.itinerary_id as string, list);
        });

        const result: TopCreator[] = ranked.map(({ creator, itineraryIds: ids, countries, salesByRegion }) => {
          const [topRegion, regionSales] = Array.from(salesByRegion.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
          const ratings = ids.flatMap((id) => ratingsByItinerary.get(id) ?? []);
          return {
            ...creator,
            bio: bioByUser.get(creator.userId) ?? '',
            countries: Array.from(countries.values()),
            rating: ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0,
            badge: topRegion && regionSales >= GURU_MIN_SALES ? `Guru da ${topRegion}` : null,
          };
        });

        if (!cancelled) setCreators(result);
      } catch (err) {
        console.error('[useTopCreators] failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [limit]);

  return { creators, loading };
}
