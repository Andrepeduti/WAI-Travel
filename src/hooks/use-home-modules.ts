import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { ITINERARIES_CHANGED_EVENT, listPublicItineraries } from '@/lib/itinerariesApi';
import { PURCHASES_CHANGED_EVENT } from '@/lib/purchasesApi';
import {
  HOME_MODULES_CHANGED_EVENT,
  listFeedbackItineraryIds,
  listImpressions,
  listPendingCheckouts,
} from '@/lib/homeModulesApi';
import { getRecentlyViewed, RECENTLY_VIEWED_CHANGED_EVENT, type RecentlyViewedEntry } from '@/lib/recentlyViewed';
import { resolveHomeModules, type HomeModule } from '@/lib/homeModules';

const QUERY_KEY = 'home-trip-flags';
const EMPTY_SET: ReadonlySet<string> = new Set();
const EMPTY_MAP = new Map();

/**
 * Reúne tudo que os módulos voláteis da Home precisam e aplica as regras
 * (`resolveHomeModules`): roteiros do usuário, listings/compras, dias com
 * atividade, primeiras exibições, feedbacks, checkouts pendentes, vistos
 * recentemente e roteiros à venda ativos.
 */
export function useHomeModules(): { modules: HomeModule[]; loading: boolean } {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { itineraries, loading: itinerariesLoading } = useMyItineraries();

  const ownIds = useMemo(
    () => itineraries.filter((it) => it.userId === userId).map((it) => it.id).sort(),
    [itineraries, userId],
  );

  const { data: flags, isLoading: flagsLoading } = useQuery({
    queryKey: [QUERY_KEY, userId, ownIds.join(',')],
    enabled: !!userId,
    queryFn: async () => {
      const [listings, purchases, activities, impressions, feedback, checkouts] = await Promise.all([
        supabase.from('itinerary_store_listing').select('itinerary_id').eq('seller_id', userId!),
        supabase.from('itinerary_sales').select('itinerary_id').eq('buyer_id', userId!),
        ownIds.length
          ? supabase.from('itinerary_activities').select('itinerary_id, day').eq('type', 'activity').in('itinerary_id', ownIds)
          : Promise.resolve({ data: [] as { itinerary_id: string; day: number }[], error: null }),
        listImpressions(userId!),
        listFeedbackItineraryIds(userId!),
        listPendingCheckouts(userId!),
      ]);
      if (listings.error) throw listings.error;
      if (purchases.error) throw purchases.error;
      if (activities.error) throw activities.error;

      const activityDays = new Map<string, Set<number>>();
      (activities.data ?? []).forEach((row) => {
        const days = activityDays.get(row.itinerary_id as string) ?? new Set<number>();
        days.add(Number(row.day));
        activityDays.set(row.itinerary_id as string, days);
      });

      return {
        listed: new Set((listings.data ?? []).map((r) => r.itinerary_id as string)),
        purchased: new Set((purchases.data ?? []).map((r) => r.itinerary_id as string)),
        activityDays,
        impressions,
        feedback,
        checkouts,
      };
    },
  });

  // Mesma chave da tela de destinos: compartilha o cache dos roteiros à venda.
  const { data: publicItineraries } = useQuery({
    queryKey: ['public-itineraries'],
    queryFn: () => listPublicItineraries(),
  });
  const activeListings = useMemo(
    () => new Map((publicItineraries ?? []).map((it) => [it.id, it])),
    [publicItineraries],
  );

  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedEntry[]>(() =>
    userId ? getRecentlyViewed(userId) : [],
  );

  useEffect(() => {
    const refreshViewed = () => setRecentlyViewed(userId ? getRecentlyViewed(userId) : []);
    refreshViewed();
    window.addEventListener(RECENTLY_VIEWED_CHANGED_EVENT, refreshViewed);
    return () => window.removeEventListener(RECENTLY_VIEWED_CHANGED_EVENT, refreshViewed);
  }, [userId]);

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    const events = [ITINERARIES_CHANGED_EVENT, PURCHASES_CHANGED_EVENT, HOME_MODULES_CHANGED_EVENT];
    events.forEach((e) => window.addEventListener(e, invalidate));
    return () => events.forEach((e) => window.removeEventListener(e, invalidate));
  }, [queryClient]);

  const modules = useMemo(
    () => resolveHomeModules(itineraries, {
      userId,
      listedItineraryIds: flags?.listed ?? EMPTY_SET,
      purchasedItineraryIds: flags?.purchased ?? EMPTY_SET,
      activityDaysByItinerary: flags?.activityDays ?? EMPTY_MAP,
      impressions: flags?.impressions ?? EMPTY_MAP,
      feedbackItineraryIds: flags?.feedback ?? EMPTY_SET,
      pendingCheckouts: flags?.checkouts ?? [],
      recentlyViewed,
      activeListings,
    }),
    [itineraries, userId, flags, recentlyViewed, activeListings],
  );

  // Sem os flags (carregando ou com erro) não dá para saber o que está à venda/completo:
  // não exibe módulos, para nunca mostrar um roteiro no módulo errado.
  const loading = itinerariesLoading || (!!userId && (flagsLoading || !flags));

  return { modules, loading };
}
