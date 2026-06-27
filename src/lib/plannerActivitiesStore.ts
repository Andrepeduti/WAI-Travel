/**
 * Read-only helpers para acessar atividades e transportes de um roteiro.
 *
 * As funções síncronas (`loadPlannerActivities`, `loadPlannerTransports`)
 * continuam lendo do `localStorage` para manter compatibilidade com
 * componentes legados (ex.: o marketplace público que renderiza dados do
 * roteiro do usuário sem await). Já o `loadPlannerActivitiesAsync` busca
 * do backend (Lovable Cloud), que é a fonte da verdade desde o P0.
 */

import { loadPlannerData, type PlannerActivity, type PlannerTransport } from './plannerApi';

const ACTIVITIES_STORAGE_KEY = 'wai-travel-planner-activities';
const TRANSPORTS_STORAGE_KEY = 'wai-travel-planner-transports';

export type PersistedActivity = PlannerActivity;
export type PersistedTransport = PlannerTransport;

function readVersionedEntry<T>(storageKey: string, id: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const all = JSON.parse(raw);
    const entry = all[id];
    if (entry == null) return null;
    if (typeof entry === 'object' && '__v' in entry && 'data' in entry) {
      return (entry as { data: T }).data;
    }
    return entry as T;
  } catch {
    return null;
  }
}

export function loadPlannerActivities(itineraryId: string | number): Record<number, PersistedActivity[]> {
  return readVersionedEntry<Record<number, PersistedActivity[]>>(
    ACTIVITIES_STORAGE_KEY,
    String(itineraryId),
  ) ?? {};
}

export function loadPlannerTransports(itineraryId: string | number): Record<number, PersistedTransport[]> {
  return readVersionedEntry<Record<number, PersistedTransport[]>>(
    TRANSPORTS_STORAGE_KEY,
    String(itineraryId),
  ) ?? {};
}

/**
 * Versão async que busca do backend. Use sempre que possível — o
 * localStorage só reflete o último roteiro aberto pelo usuário atual,
 * enquanto o backend é compartilhado entre dispositivos.
 */
export async function loadPlannerActivitiesAsync(
  itineraryId: string,
): Promise<Record<number, PersistedActivity[]>> {
  const data = await loadPlannerData(itineraryId);
  return data?.activities ?? loadPlannerActivities(itineraryId);
}

export async function loadPlannerTransportsAsync(
  itineraryId: string,
): Promise<Record<number, PersistedTransport[]>> {
  const data = await loadPlannerData(itineraryId);
  return data?.transports ?? loadPlannerTransports(itineraryId);
}
