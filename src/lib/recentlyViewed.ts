/**
 * "Vistos recentemente": roteiros à venda cuja página de detalhe a pessoa abriu.
 * Guardado no navegador por usuário. A chave usa o prefixo `wai-travel-`, que o
 * logout (AuthContext.signOut) já limpa.
 *
 * Cada roteiro expira 30 dias após a última visualização; uma nova visualização
 * reinicia o prazo e move o roteiro para o topo (sem repetir).
 */

export const RECENTLY_VIEWED_TTL_MS = 30 * 86_400_000;
export const RECENTLY_VIEWED_CHANGED_EVENT = 'recently-viewed:changed';
const MAX_STORED = 30;

export interface RecentlyViewedEntry {
  itineraryId: string;
  viewedAt: number;
}

const storageKey = (userId: string) => `wai-travel-recently-viewed:${userId}`;

export function getRecentlyViewed(userId: string, now = Date.now()): RecentlyViewedEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const list: RecentlyViewedEntry[] = raw ? JSON.parse(raw) : [];
    return list
      .filter((e) => now - e.viewedAt < RECENTLY_VIEWED_TTL_MS)
      .sort((a, b) => b.viewedAt - a.viewedAt);
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(userId: string, itineraryId: string): void {
  try {
    const now = Date.now();
    const next = [
      { itineraryId, viewedAt: now },
      ...getRecentlyViewed(userId, now).filter((e) => e.itineraryId !== itineraryId),
    ].slice(0, MAX_STORED);
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
    window.dispatchEvent(new Event(RECENTLY_VIEWED_CHANGED_EVENT));
  } catch {
    /* storage cheio/indisponível: ignora */
  }
}
