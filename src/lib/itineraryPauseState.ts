// Persistência local simples do status "pausado" de roteiros publicados.
// Backend ainda não tem coluna dedicada — usamos localStorage para refletir
// o estado em todas as telas (dashboard + lista "À venda").

const KEY = 'itinerary_paused_state_v1';

function readMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, boolean>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('itinerary-pause-changed'));
  } catch {
    /* ignore */
  }
}

export function isItineraryPaused(id: string | undefined | null): boolean {
  if (!id) return false;
  return !!readMap()[id];
}

export function setItineraryPaused(id: string, paused: boolean) {
  const map = readMap();
  if (paused) map[id] = true;
  else delete map[id];
  writeMap(map);
}
