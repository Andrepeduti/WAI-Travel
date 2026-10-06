import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyItineraries } from '@/hooks/use-my-itineraries';

export const USER_GOALS_QUERY_KEY = 'user-goals';

/** Objetivos escolhidos no onboarding (profiles.goals): organize | discover | sell. */
export function useUserGoals() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data } = useQuery({
    queryKey: [USER_GOALS_QUERY_KEY, userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('goals')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return Array.isArray(data?.goals) ? (data!.goals as string[]) : [];
    },
  });

  return data ?? [];
}

/**
 * Vendedor = escolheu "sell" no onboarding, ou já tem roteiro à venda
 * (para não tirar o acesso de quem já vendia antes do objetivo existir).
 */
export function useIsSeller() {
  const { user } = useAuth();
  const goals = useUserGoals();
  const { itineraries } = useMyItineraries();
  return (
    goals.includes('sell') ||
    itineraries.some((it) => it.userId === user?.id && !it.deletedAt && (it.isPublic || it.isPersonal === false))
  );
}
