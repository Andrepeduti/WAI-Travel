/**
 * Persistência dos módulos voláteis da Home: primeira exibição dos cards,
 * feedback da viagem concluída e compras iniciadas ("Continue comprando").
 */
import { supabase } from '@/integrations/supabase/client';

export const HOME_MODULES_CHANGED_EVENT = 'home-modules:changed';

const emitHomeModulesChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HOME_MODULES_CHANGED_EVENT));
};

const isUuid = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ─── Primeira exibição ────────────────────────────────────────────────────────

export type ImpressionModule = 'completedTrip';

/** Mapa `${module}:${itemId}` → ISO da primeira exibição. */
export async function listImpressions(userId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('home_module_impressions')
    .select('module, item_id, first_shown_at')
    .eq('user_id', userId);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [`${r.module}:${r.item_id}`, r.first_shown_at as string]));
}

/** Registra a primeira exibição (não sobrescreve se já existir). */
export async function recordImpressions(module: ImpressionModule, itemIds: string[]): Promise<void> {
  const userId = await currentUserId();
  if (!userId || itemIds.length === 0) return;
  const { error } = await supabase
    .from('home_module_impressions')
    .upsert(
      itemIds.map((itemId) => ({ user_id: userId, module, item_id: itemId })),
      { onConflict: 'user_id,module,item_id', ignoreDuplicates: true },
    );
  if (error) console.error('[homeModulesApi] recordImpressions failed', error);
}

// ─── Feedback da viagem concluída ─────────────────────────────────────────────

export async function listFeedbackItineraryIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('trip_feedback')
    .select('itinerary_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.itinerary_id as string));
}

/** Envia o feedback; o card sai do módulo imediatamente (recalcula a Home). */
export async function submitTripFeedback(itineraryId: string, liked: boolean, comment?: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId || !isUuid(itineraryId)) return false;
  const { error } = await supabase
    .from('trip_feedback')
    .insert({ user_id: userId, itinerary_id: itineraryId, liked, comment: comment?.trim() || null });
  if (error) {
    console.error('[homeModulesApi] submitTripFeedback failed', error);
    return false;
  }
  emitHomeModulesChanged();
  return true;
}

// ─── Compra iniciada ("Continue comprando") ───────────────────────────────────

export interface PendingCheckout {
  itineraryId: string;
  updatedAt: string;
}

export async function listPendingCheckouts(userId: string): Promise<PendingCheckout[]> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select('itinerary_id, updated_at')
    .eq('user_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return (data ?? []).map((r) => ({ itineraryId: r.itinerary_id as string, updatedAt: r.updated_at as string }));
}

/** Início ou retomada do checkout: (re)abre a sessão e reinicia o prazo de 7 dias. */
export async function startCheckoutSession(itineraryId: unknown): Promise<void> {
  const userId = await currentUserId();
  if (!userId || !isUuid(itineraryId)) return;
  const { error } = await supabase
    .from('checkout_sessions')
    .upsert(
      { user_id: userId, itinerary_id: itineraryId, status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,itinerary_id' },
    );
  if (error) console.error('[homeModulesApi] startCheckoutSession failed', error);
  else emitHomeModulesChanged();
}

async function closeCheckoutSession(itineraryId: unknown, status: 'completed' | 'dismissed'): Promise<void> {
  const userId = await currentUserId();
  if (!userId || !isUuid(itineraryId)) return;
  const { error } = await supabase
    .from('checkout_sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('itinerary_id', itineraryId);
  if (error) console.error(`[homeModulesApi] checkout session -> ${status} failed`, error);
  else emitHomeModulesChanged();
}

/** Pagamento concluído: a compra sai de "Continue comprando". */
export const completeCheckoutSession = (itineraryId: unknown) => closeCheckoutSession(itineraryId, 'completed');

/** X do card: a pessoa dispensou a compra pendente. Voltar ao checkout reabre. */
export const dismissCheckoutSession = (itineraryId: unknown) => closeCheckoutSession(itineraryId, 'dismissed');
