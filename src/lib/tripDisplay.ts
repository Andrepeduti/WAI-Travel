/**
 * Helpers de exibição de viagens nos cards da Home (datas, capa, dia atual).
 */
import { parseLocalDate } from '@/lib/localDate';
import { resolveTripThumbnailImages } from '@/lib/coverImageResolver';
import type { UserItinerary } from '@/lib/itinerariesApi';

const MONTH_ABBR_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAY_MS = 86_400_000;

export const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
export const formatDays = (days: number) => `${days} ${days === 1 ? 'dia' : 'dias'}`;
/** "19 Ago" */
export const formatDayMonth = (date: Date) => `${date.getDate()} ${MONTH_ABBR_PT[date.getMonth()]}`;

/** Início/fim em datas locais (sem hora). null para datas flexíveis ou sem data. */
export function getTripRange(it: UserItinerary): { start: Date; end: Date } | null {
  if (it.isFlexible) return null;
  const start = parseLocalDate(it.startDate);
  if (!start) return null;
  const end = parseLocalDate(it.endDate) ?? start;
  return { start: startOfDay(start), end: startOfDay(end) };
}

export const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

/** Quantidade de dias da viagem (datas fixas ou duração flexível). */
export function tripLength(it: UserItinerary): number {
  const range = getTripRange(it);
  return range ? daysBetween(range.start, range.end) + 1 : it.durationDays ?? 0;
}

/** "19 Ago - 29 Ago" */
export function formatTripRange(it: UserItinerary): string {
  const range = getTripRange(it);
  return range ? `${formatDayMonth(range.start)} - ${formatDayMonth(range.end)}` : '';
}

/** Dia atual da viagem (1-based) para uma viagem em andamento. */
export function currentTripDay(it: UserItinerary, now = new Date()): number {
  const range = getTripRange(it);
  return range ? daysBetween(range.start, now) + 1 : 1;
}

/** Capa do roteiro (imagem salva ou foto do destino). */
export function tripCover(it: UserItinerary): string | undefined {
  return resolveTripThumbnailImages(
    it.destinations,
    it.images?.find((image) => image && !image.startsWith('blob:')),
  )[0];
}
