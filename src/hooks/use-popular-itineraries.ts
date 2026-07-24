import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { listPublicItineraries } from '@/lib/itinerariesApi';
import { resolveCoverImage } from '@/lib/coverImageResolver';
import { RecommendedItinerary } from './use-recommended-itineraries';

export function usePopularItineraries(limit = 10) {
    const [itineraries, setItineraries] = useState<RecommendedItinerary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const [
                    publicItineraries,
                    salesRows,
                    reviewsRows,
                ] = await Promise.all([
                    listPublicItineraries(500),
                    supabase
                        .from('itinerary_sales')
                        .select('itinerary_id')
                        .then(({ data }) => data ?? []),
                    supabase
                        .from('itinerary_reviews')
                        .select('itinerary_id, rating')
                        .then(({ data }) => data ?? []),
                ]);

                if (cancelled) return;

                // Vendas por roteiro
                const salesByItinerary = new Map<string, number>();
                for (const row of salesRows as { itinerary_id: string }[]) {
                    salesByItinerary.set(row.itinerary_id, (salesByItinerary.get(row.itinerary_id) ?? 0) + 1);
                }

                // Avaliação média por roteiro
                const ratingSum = new Map<string, { sum: number; count: number }>();
                for (const row of reviewsRows as { itinerary_id: string; rating: number }[]) {
                    const cur = ratingSum.get(row.itinerary_id) ?? { sum: 0, count: 0 };
                    cur.sum += row.rating;
                    cur.count += 1;
                    ratingSum.set(row.itinerary_id, cur);
                }
                const avgRatingFor = (id: string): number => {
                    const r = ratingSum.get(id);
                    return r && r.count > 0 ? r.sum / r.count : 0;
                };

                const scored = publicItineraries.map(itin => {
                    const itinId = itin.id;
                    const avgRating = avgRatingFor(itinId);
                    const salesCount = salesByItinerary.get(itinId) ?? 0;
                    const updatedAt = itin.updatedAt ?? null;
                    const updatedMs = updatedAt ? new Date(updatedAt).getTime() : 0;

                    return { itin, salesCount, avgRating, updatedMs };
                });

                // Ordenação: vendas -> avaliação -> data
                scored.sort((a, b) => {
                    if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
                    if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
                    return b.updatedMs - a.updatedMs;
                });

                const waiLogo = '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png';
                
                const calcDays = (startDate: string, endDate: string): number => {
                    if (!startDate || !endDate) return 0;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
                    return Math.max(1, diff + 1);
                };

                const result: RecommendedItinerary[] = scored.slice(0, limit).map(({ itin, salesCount }) => {
                    const coverImage = (() => {
                        const raw = itin.images?.[0] ?? '';
                        if (!raw || raw.includes('placeholder')) return resolveCoverImage(itin.destinations).url;
                        return raw;
                    })();

                    const topTag = (itin.tags ?? []).find(t => t !== '_FLEXIBLE_DATES_') ?? '';

                    return {
                        itineraryId: itin.id,
                        sourceDatasetId: itin.sourceDatasetId ?? null,
                        title: itin.title,
                        image: coverImage,
                        rating: avgRatingFor(itin.id),
                        places: itin.places ?? 0,
                        days: calcDays(itin.startDate, itin.endDate),
                        author: itin.authorName || 'WAI',
                        authorImage: itin.authorAvatar || waiLogo,
                        price: itin.priceCents != null ? itin.priceCents / 100 : 0,
                        category: topTag,
                        score: 0,
                        salesCount,
                        destinations: itin.destinations ?? [],
                    };
                });

                if (!cancelled) {
                    setItineraries(result);
                }
            } catch (err) {
                console.error('[usePopularItineraries] failed:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [limit]);

    return { itineraries, loading };
}
