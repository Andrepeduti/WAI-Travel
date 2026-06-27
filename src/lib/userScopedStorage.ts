/**
 * Coleções no localStorage escopadas por usuário.
 *
 * Cada conta autenticada tem suas próprias chaves
 * (`wai-travel-collections:{userId}` para a lista de coleções e
 * `wai-travel-collection-data:{userId}` para os dados detalhados —
 * locais, pastas, título). Sem usuário logado, leitura/escrita são no-ops
 * e retornam vazio. Isso garante que perfis novos comecem zerados e que
 * dados não vazem entre logins na mesma máquina.
 */
import { supabase } from '@/integrations/supabase/client';

let cachedUserId: string | null = null;
let initPromise: Promise<void> | null = null;

function ensureCachedUserId(): Promise<void> {
  if (cachedUserId !== null) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = supabase.auth.getSession().then(({ data }) => {
    cachedUserId = data.session?.user?.id ?? null;
  });
  return initPromise;
}

// Mantém o cache em sincronia com mudanças de sessão.
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null;
});

export function getCurrentUserIdSync(): string | null {
  return cachedUserId;
}

export async function getCurrentUserIdAsync(): Promise<string | null> {
  await ensureCachedUserId();
  return cachedUserId;
}

export function collectionsListKey(userId: string | null = cachedUserId): string | null {
  return userId ? `wai-travel-collections:${userId}` : null;
}

export function collectionsDataKey(userId: string | null = cachedUserId): string | null {
  return userId ? `wai-travel-collection-data:${userId}` : null;
}

export function readJSON<T>(key: string | null, fallback: T): T {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string | null, value: T): void {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
  // Espelha escritas de coleções no backend (carrega lazy para evitar ciclo).
  if (key.startsWith('wai-travel-collections:') || key.startsWith('wai-travel-collection-data:')) {
    import('@/lib/collectionsSync')
      .then((m) => m.scheduleCollectionsPush())
      .catch(() => {});
  }
}
