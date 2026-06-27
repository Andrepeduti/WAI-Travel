import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import { useMyItineraries } from './use-my-itineraries';

export type UserInsightAction =
  | { type: 'open-itinerary'; itineraryId: string }
  | { type: 'open-trips' }
  | { type: 'open-explore' }
  | { type: 'open-edit-profile' }
  | { type: 'create-itinerary' };

export interface UserInsight {
  id: string;
  text: string;
  icon: string;
  action?: UserInsightAction;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function firstDestination(destinations: string[]): string {
  const d = destinations?.[0];
  if (!d) return '';
  // Pega a primeira parte antes da vírgula (ex: "Lisboa, Portugal" -> "Lisboa")
  return d.split(',')[0].trim();
}

/**
 * Gera insights personalizados na home a partir do perfil do usuário:
 * - viagens futuras (contagem regressiva)
 * - roteiros em andamento
 * - dicas baseadas em interesses
 * - ações pendentes no app (completar perfil, etc.)
 */
export function useUserInsights() {
  const { user, loading: userLoading } = useCurrentUser();
  const { itineraries, loading: itinerariesLoading } = useMyItineraries();

  const loading = userLoading || itinerariesLoading;

  const insights = useMemo<UserInsight[]>(() => {
    if (loading) return [];
    const list: UserInsight[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1) Próxima viagem agendada
    const upcoming = itineraries
      .filter(it => it.startDate && new Date(it.startDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    if (upcoming) {
      const days = daysUntil(upcoming.startDate);
      const dest = firstDestination(upcoming.destinations) || upcoming.title || 'sua próxima viagem';
      const action: UserInsightAction = { type: 'open-itinerary', itineraryId: String(upcoming.id) };
      if (days === 0) {
        list.push({ id: 'next-trip', text: `Sua viagem para ${dest} é hoje!`, icon: 'flight_takeoff', action });
      } else if (days === 1) {
        list.push({ id: 'next-trip', text: `Falta 1 dia para sua viagem para ${dest}!`, icon: 'flight_takeoff', action });
      } else if (days <= 60) {
        list.push({ id: 'next-trip', text: `Faltam ${days} dias para sua viagem para ${dest}!`, icon: 'flight_takeoff', action });
      }
    }

    // 2) Roteiros em andamento (sem data ou em planejamento)
    const inProgress = itineraries.filter(it => {
      if (!it.startDate) return true;
      return new Date(it.startDate) >= today;
    }).length;

    if (inProgress > 0) {
      list.push({
        id: 'in-progress',
        text: inProgress === 1
          ? 'Você tem 1 roteiro em andamento'
          : `Você tem ${inProgress} roteiros em andamento`,
        icon: 'public',
        action: { type: 'open-trips' },
      });
    }

    // 3) Dica baseada em interesse
    const interest = user.interests?.[0];
    if (interest) {
      list.push({
        id: 'interest-tip',
        text: `Walter encontrou dicas de ${interest.toLowerCase()} pra você.`,
        icon: 'tips_and_updates',
        action: { type: 'open-explore' },
      });
    }

    // 4) Ações pendentes no app
    if (!user.interests || user.interests.length === 0) {
      list.push({
        id: 'complete-interests',
        text: 'Adicione seus interesses para receber dicas',
        icon: 'interests',
        action: { type: 'open-edit-profile' },
      });
    }
    if (!user.avatar) {
      list.push({
        id: 'add-avatar',
        text: 'Adicione uma foto de perfil ao seu perfil',
        icon: 'account_circle',
        action: { type: 'open-edit-profile' },
      });
    }
    if (itineraries.length === 0) {
      list.push({
        id: 'create-first',
        text: 'Crie seu primeiro roteiro agora',
        icon: 'add_circle',
        action: { type: 'create-itinerary' },
      });
    }

    // Fallback: sempre garantir ao menos um insight de descoberta
    if (list.length === 0) {
      list.push({
        id: 'explore',
        text: 'Explore roteiros de outros viajantes',
        icon: 'explore',
        action: { type: 'open-explore' },
      });
    }

    return list.slice(0, 5);
  }, [loading, itineraries, user.interests, user.avatar]);

  return { insights, loading };
}
