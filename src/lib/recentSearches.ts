/** Termos buscados recentemente, guardados só na sessão (some ao fechar a aba). */
const RECENT_SEARCHES_KEY = 'wai-recent-searches';
const MAX_RECENT_SEARCHES = 8;

const sameTerm = (a: string, b: string) =>
  a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;

export function getRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function save(terms: string[]): string[] {
  try {
    sessionStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch { /* sessionStorage indisponível: histórico só não persiste */ }
  return terms;
}

/** Move o termo para o topo (sem duplicar) e devolve a lista atualizada. */
export function addRecentSearch(term: string): string[] {
  const clean = term.trim();
  if (!clean) return getRecentSearches();
  const others = getRecentSearches().filter((t) => !sameTerm(t, clean));
  return save([clean, ...others].slice(0, MAX_RECENT_SEARCHES));
}

export function removeRecentSearch(term: string): string[] {
  return save(getRecentSearches().filter((t) => !sameTerm(t, term)));
}

export function clearRecentSearches(): string[] {
  return save([]);
}
