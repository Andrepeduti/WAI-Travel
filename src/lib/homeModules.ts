/**
 * Regras dos módulos voláteis da Home.
 * Fonte: documento "Regras dos módulos voláteis da home" (WAI • MVP).
 *
 * - Até 2 módulos voláteis por vez, acima dos módulos fixos.
 * - Prioridade: 1 Viagem em andamento · 2 Viagem concluída · 3 Próxima viagem ·
 *   4 Continuar editando roteiro · 5 Continue comprando · 6 Vistos recentemente ·
 *   por último, o feedback de viagem concluída sem resposta após 72h.
 * - Remover duplicidades antes de selecionar (um roteiro fica só no módulo de
 *   maior prioridade) e ignorar módulos vazios.
 */

import type { PublicItinerarySearchRow, UserItinerary } from '@/lib/itinerariesApi';
import { parseLocalDate } from '@/lib/localDate';
import type { PendingCheckout } from '@/lib/homeModulesApi';
import type { RecentlyViewedEntry } from '@/lib/recentlyViewed';

export const MAX_VOLATILE_MODULES = 2;
export const MAX_CONTINUE_EDITING = 3;
export const MAX_RECENTLY_VIEWED = 6;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Prioridade 2 até 72h da primeira exibição; rebaixado até 7 dias. */
const FEEDBACK_PRIORITY_MS = 72 * HOUR_MS;
const FEEDBACK_MAX_MS = 7 * DAY_MS;
/** Viagens que terminaram há mais que isso não entram mais como "concluída". */
const COMPLETED_LOOKBACK_MS = 30 * DAY_MS;
/** "Continue comprando": sai após 7 dias sem retomar o checkout. */
const CHECKOUT_TTL_MS = 7 * DAY_MS;

export type HomeModule =
  | { kind: 'ongoingTrip'; itineraries: UserItinerary[] }
  | { kind: 'completedTrip'; itineraries: CompletedTrip[]; demoted: boolean }
  | { kind: 'nextTrip'; itineraries: UserItinerary[] }
  | { kind: 'continueEditing'; itineraries: UserItinerary[] }
  | { kind: 'continueShopping'; itineraries: PublicItinerarySearchRow[] }
  | { kind: 'recentlyViewed'; itineraries: PublicItinerarySearchRow[] };

export interface CompletedTrip {
  itinerary: UserItinerary;
  /** Ainda não foi exibido na Home — registrar a primeira exibição ao mostrar. */
  firstShown: boolean;
}

export interface HomeTripContext {
  userId: string | null;
  /** Roteiros com listing na loja (qualquer status) — "colocados à venda". */
  listedItineraryIds: ReadonlySet<string>;
  /** Roteiros que o usuário comprou (itinerary_sales.buyer_id). */
  purchasedItineraryIds: ReadonlySet<string>;
  /** Dias que têm pelo menos 1 atividade, por roteiro. */
  activityDaysByItinerary: ReadonlyMap<string, ReadonlySet<number>>;
  /** `completedTrip:<id>` → ISO da primeira exibição. */
  impressions: ReadonlyMap<string, string>;
  /** Roteiros com feedback já enviado. */
  feedbackItineraryIds: ReadonlySet<string>;
  pendingCheckouts: readonly PendingCheckout[];
  recentlyViewed: readonly RecentlyViewedEntry[];
  /** Roteiros à venda ativos (disponíveis), por id. */
  activeListings: ReadonlyMap<string, PublicItinerarySearchRow>;
}

interface DatedTrip {
  it: UserItinerary;
  start: Date;
  end: Date;
}

const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };

const isForSale = (it: UserItinerary, ctx: HomeTripContext) =>
  it.isPersonal === false || ctx.listedItineraryIds.has(it.id);

const isPurchased = (it: UserItinerary, ctx: HomeTripContext) =>
  it.sourceDatasetId != null || ctx.purchasedItineraryIds.has(it.id);

/** Viagens do usuário (pessoais ou compradas) — nunca roteiros à venda. */
const isTrip = (it: UserItinerary, ctx: HomeTripContext) =>
  !it.deletedAt && it.status !== 'suspended' && !isForSale(it, ctx);

/** Roteiro pessoal criado pelo próprio usuário (não comprado, não compartilhado, não à venda). */
const isOwnPersonal = (it: UserItinerary, ctx: HomeTripContext) =>
  isTrip(it, ctx) && it.userId === ctx.userId && !isPurchased(it, ctx);

function toDatedTrip(it: UserItinerary): DatedTrip | null {
  if (it.isFlexible) return null;
  const start = parseLocalDate(it.startDate);
  if (!start) return null;
  const end = parseLocalDate(it.endDate) ?? start;
  return { it, start: startOfDay(start), end: startOfDay(end) };
}

/** Quantidade de dias do roteiro (datas fixas ou duração flexível). */
function tripDayCount(it: UserItinerary): number {
  const dated = toDatedTrip(it);
  if (dated) return Math.round((dated.end.getTime() - dated.start.getTime()) / DAY_MS) + 1;
  return it.durationDays ?? 0;
}

/** Edição concluída = todos os dias do roteiro têm pelo menos 1 atividade. */
function isEditingComplete(it: UserItinerary, ctx: HomeTripContext): boolean {
  const days = tripDayCount(it);
  if (days <= 0) return false;
  const filled = ctx.activityDaysByItinerary.get(it.id);
  if (!filled) return false;
  for (let day = 1; day <= days; day++) {
    if (!filled.has(day)) return false;
  }
  return true;
}

/**
 * Viagens concluídas separadas em: prioridade 2 (ativas) e feedback rebaixado.
 * Concluída = a partir do dia seguinte ao término.
 * Só roteiros COMPRADOS (decisão de produto — sobrepõe o doc, que previa 24h
 * para viagens pessoais): o módulo existe para coletar o feedback.
 */
function resolveCompletedTrips(datedTrips: DatedTrip[], ctx: HomeTripContext, now: Date, today: Date) {
  const active: { trip: CompletedTrip; end: Date }[] = [];
  const demoted: { trip: CompletedTrip; end: Date }[] = [];

  for (const { it, end } of datedTrips) {
    if (!isPurchased(it, ctx)) continue;                 // viagem pessoal não aparece
    if (end >= today) continue;
    if (today.getTime() - end.getTime() > COMPLETED_LOOKBACK_MS) continue;
    if (ctx.feedbackItineraryIds.has(it.id)) continue;   // feedback enviado: sai na hora

    const shownAt = ctx.impressions.get(`completedTrip:${it.id}`);
    const age = shownAt ? now.getTime() - new Date(shownAt).getTime() : 0;
    if (age >= FEEDBACK_MAX_MS) continue;                // 7 dias: sai mesmo sem resposta

    const entry = { trip: { itinerary: it, firstShown: !shownAt }, end };
    if (age < FEEDBACK_PRIORITY_MS) active.push(entry); else demoted.push(entry);
  }

  // Término mais recente primeiro.
  const byRecentEnd = (a: { end: Date }, b: { end: Date }) => b.end.getTime() - a.end.getTime();
  return {
    active: active.sort(byRecentEnd).map((e) => e.trip),
    demoted: demoted.sort(byRecentEnd).map((e) => e.trip),
  };
}

/**
 * Calcula os módulos voláteis a exibir, já selecionados (máx. 2) e na ordem.
 */
export function resolveHomeModules(
  itineraries: UserItinerary[],
  ctx: HomeTripContext,
  now: Date = new Date(),
): HomeModule[] {
  const today = startOfDay(now);
  const datedTrips = itineraries
    .filter((it) => isTrip(it, ctx))
    .map(toDatedTrip)
    .filter((t): t is DatedTrip => t !== null);

  // 1. Viagem em andamento: hoje entre início e término (inclusive). Término mais próximo primeiro.
  const ongoing = datedTrips
    .filter((t) => t.start <= today && today <= t.end)
    .sort((a, b) => a.end.getTime() - b.end.getTime())
    .map((t) => t.it);

  // 2. Viagem concluída (e o feedback rebaixado, que vai para o fim da fila).
  const completed = resolveCompletedTrips(datedTrips, ctx, now, today);

  // 3. Próxima viagem: início futuro. Início mais próximo primeiro.
  const next = datedTrips
    .filter((t) => t.start > today)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((t) => t.it);

  // 4. Continuar editando: pessoais do próprio usuário com algum dia sem atividade,
  //    que ainda não terminaram. Última edição primeiro.
  const editing = itineraries
    .filter((it) => isOwnPersonal(it, ctx) && !isEditingComplete(it, ctx))
    .filter((it) => {
      const dated = toDatedTrip(it);
      return !dated || dated.end >= today;
    })
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  // 5. Continue comprando: checkout pendente, retomado há menos de 7 dias, roteiro disponível.
  const shopping = [...ctx.pendingCheckouts]
    .filter((c) => now.getTime() - new Date(c.updatedAt).getTime() < CHECKOUT_TTL_MS)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((c) => ctx.activeListings.get(c.itineraryId))
    .filter((it): it is PublicItinerarySearchRow => !!it);

  // 6. Vistos recentemente: últimos 30 dias, disponíveis, mais recente primeiro.
  const viewed = ctx.recentlyViewed
    .map((v) => ctx.activeListings.get(v.itineraryId))
    .filter((it): it is PublicItinerarySearchRow => !!it && it.userId !== ctx.userId);

  // Prioridade + remoção de duplicidades: cada roteiro fica só no módulo de maior prioridade.
  const used = new Set<string>();
  const unique = <T>(items: T[], idOf: (item: T) => string, limit = Infinity): T[] => {
    const result = items.filter((item) => !used.has(idOf(item))).slice(0, limit);
    result.forEach((item) => used.add(idOf(item)));
    return result;
  };
  const tripId = (t: CompletedTrip) => t.itinerary.id;
  const rowId = (it: { id: string }) => it.id;

  const candidates: HomeModule[] = [
    { kind: 'ongoingTrip', itineraries: unique(ongoing, rowId) },
    { kind: 'completedTrip', itineraries: unique(completed.active, tripId), demoted: false },
    { kind: 'nextTrip', itineraries: unique(next, rowId) },
    { kind: 'continueEditing', itineraries: unique(editing, rowId, MAX_CONTINUE_EDITING) },
    { kind: 'continueShopping', itineraries: unique(shopping, rowId) },
    { kind: 'recentlyViewed', itineraries: unique(viewed, rowId, MAX_RECENTLY_VIEWED) },
    { kind: 'completedTrip', itineraries: unique(completed.demoted, tripId), demoted: true },
  ];

  return candidates
    .filter((module) => module.itineraries.length > 0)
    .slice(0, MAX_VOLATILE_MODULES);
}
