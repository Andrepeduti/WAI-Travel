/**
 * Tag exibida sobre a capa dos cards de roteiro à venda.
 *  - "Destaque": roteiro impulsionado (boosted_until no futuro). Tem prioridade.
 *  - "Novo roteiro": publicado há menos de 15 dias.
 */

export type ItineraryBadge = 'destaque' | 'novo';

const NEW_ITINERARY_WINDOW_DAYS = 15;
const MS_PER_DAY = 86_400_000;

export function getItineraryBadge(
  { publishedAt, boostedUntil }: { publishedAt?: string | null; boostedUntil?: string | null },
  now: Date = new Date(),
): ItineraryBadge | null {
  if (boostedUntil && new Date(boostedUntil).getTime() > now.getTime()) return 'destaque';
  if (publishedAt) {
    const ageDays = (now.getTime() - new Date(publishedAt).getTime()) / MS_PER_DAY;
    if (ageDays >= 0 && ageDays < NEW_ITINERARY_WINDOW_DAYS) return 'novo';
  }
  return null;
}
