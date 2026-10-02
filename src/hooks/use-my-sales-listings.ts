/**
 * useMySalesListings — "Seus roteiros à venda" da Home.
 *
 * Roteiros do usuário publicados e disponíveis para venda (listing ativo e
 * pago), ordenados por desempenho de vendas, até 5.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ITINERARIES_CHANGED_EVENT } from '@/lib/itinerariesApi';
import { PURCHASES_CHANGED_EVENT } from '@/lib/purchasesApi';
import { getAverageRatings } from '@/lib/marketplaceApi';
import { resolveCoverImage } from '@/lib/coverImageResolver';

const MAX_LISTINGS = 5;
const QUERY_KEY = 'my-sales-listings';

export interface MySalesListing {
  itineraryId: string;
  title: string;
  image: string;
  rating: number;
  salesCount: number;
  /** Faturamento bruto em centavos. */
  revenueCents: number;
}

export function useMySalesListings() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<MySalesListing[]> => {
      const [listingsRes, salesRes] = await Promise.all([
        supabase
          .from('itinerary_store_listing')
          .select('itinerary_id, listed_title, sales_count, itineraries(cover_image_url, destinations)')
          .eq('seller_id', userId!)
          .eq('status', 'active')
          .gt('price_cents', 0),
        supabase.from('itinerary_sales').select('itinerary_id, gross_cents').eq('seller_id', userId!),
      ]);
      if (listingsRes.error) throw listingsRes.error;
      if (salesRes.error) throw salesRes.error;

      const revenueByItinerary = new Map<string, number>();
      (salesRes.data ?? []).forEach((s) => {
        revenueByItinerary.set(s.itinerary_id as string, (revenueByItinerary.get(s.itinerary_id as string) ?? 0) + Number(s.gross_cents ?? 0));
      });

      const listings = (listingsRes.data ?? [])
        .map((row: any) => ({
          itineraryId: row.itinerary_id as string,
          title: (row.listed_title as string) || 'Roteiro',
          image: row.itineraries?.cover_image_url || resolveCoverImage(row.itineraries?.destinations ?? []).url,
          salesCount: Number(row.sales_count ?? 0),
          revenueCents: revenueByItinerary.get(row.itinerary_id) ?? 0,
        }))
        .sort((a, b) => b.salesCount - a.salesCount || b.revenueCents - a.revenueCents)
        .slice(0, MAX_LISTINGS);

      const ratings = await getAverageRatings(listings.map((l) => l.itineraryId));
      return listings.map((l) => ({ ...l, rating: ratings[l.itineraryId] ?? 0 }));
    },
  });

  // Novos roteiros publicados, pausados ou vendidos atualizam o módulo.
  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    window.addEventListener(ITINERARIES_CHANGED_EVENT, invalidate);
    window.addEventListener(PURCHASES_CHANGED_EVENT, invalidate);
    return () => {
      window.removeEventListener(ITINERARIES_CHANGED_EVENT, invalidate);
      window.removeEventListener(PURCHASES_CHANGED_EVENT, invalidate);
    };
  }, [queryClient]);

  return { listings: query.data ?? [], loading: query.isLoading };
}
