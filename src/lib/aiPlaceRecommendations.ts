/**
 * AI-curated place recommendations per city.
 * Calls the `ai-place-recommendations` edge function and caches results in
 * memory so we don't burn AI credits for repeated calls in the same session.
 */

import type { CityPlace } from '@/data/cityRecommendations';
import { FALLBACK_IMAGE } from '@/lib/imageFallback';
import { searchGooglePlacesText } from '@/lib/googlePlacesApi';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;



type AiCategoryKey = 'restaurants' | 'experiences' | 'attractions' | 'nightlife' | 'events';
const MIN_EXACT_IMAGE_SCORE = 3;

interface AiRecommendation {
  name: string;
  area?: string;
  description?: string;
  priceLevel?: '$' | '$$' | '$$$' | '$$$$';
  periodicityNote?: string;
  typicalHours?: string;
  suggestedTimeSlot?: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'night';
}

type AiResponse = Partial<Record<AiCategoryKey, AiRecommendation[]>>;

// Visual mapping aligned with src/lib/placesApi.ts categories.
const CATEGORY_META: Record<AiCategoryKey, { category: string; categoryColor: string; image: string }> = {
  restaurants: {
    category: 'Restaurante',
    categoryColor: '#F59E0B',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
  },
  experiences: {
    category: 'Experiência',
    categoryColor: '#0EA5E9',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600',
  },
  attractions: {
    category: 'Ponto Turístico',
    categoryColor: '#10B981',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
  },
  nightlife: {
    category: 'Vida Noturna',
    categoryColor: '#7C3AED',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600',
  },
  events: {
    category: 'Evento',
    categoryColor: '#EC4899',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
  },
};

const memCache = new Map<string, CityPlace[]>();
const pending = new Map<string, Promise<CityPlace[]>>();

function cityKey(cityName: string): string {
  return cityName.toLowerCase().trim().split(',')[0].trim();
}



let idCounter = 700000;
function nextId(): number { return ++idCounter; }

function toCityPlaces(payload: AiResponse, cityKeyStr: string): CityPlace[] {
  const out: CityPlace[] = [];
  (Object.keys(CATEGORY_META) as AiCategoryKey[]).forEach((bucket) => {
    const meta = CATEGORY_META[bucket];
    const items = Array.isArray(payload[bucket]) ? payload[bucket]! : [];
    for (const item of items) {
      const name = (item?.name ?? '').toString().trim();
      if (!name) continue;
      const descParts: string[] = [];
      if (item.description) descParts.push(item.description);
      if (bucket === 'events' && item.periodicityNote) descParts.push(`(${item.periodicityNote})`);
      const hours = (item.typicalHours || '').trim();
      const openHoursFormatted = hours
        ? (hours.toLowerCase() === '24h' ? '24h' : hours.replace('-', ' às '))
        : '';
      out.push({
        id: nextId(),
        name,
        city: cityKeyStr,
        category: meta.category,
        categoryColor: meta.categoryColor,
        image: meta.image,
        rating: 0,
        price: item.priceLevel ?? '',
        openHours: openHoursFormatted,
        // No lat/lng — the merge pipeline tolerates missing coordinates and
        // the planner simply won't show a pin on the map for AI-only items.
        lat: undefined as unknown as number,
        lng: undefined as unknown as number,
        description: descParts.join(' ').trim() || undefined,
        address: item.area || undefined,
        // Extra hints used by the auto-fill scheduler.
        ...( { suggestedTimeSlot: item.suggestedTimeSlot, bucket } as Record<string, unknown> ),
      } as CityPlace);
    }
  });
  return out;
}

// ── Real photo enrichment ──────────────────────────────────────────────────
// Use only sources that can be tied back to the place name. Generic photo
// fallbacks are intentionally avoided because they produce visually wrong cards.

async function enrichWithGooglePlaces(places: CityPlace[], city: string): Promise<CityPlace[]> {
  const out: CityPlace[] = new Array(places.length);
  const queue = places.map((p, i) => ({ p, i }));
  
  const startTime = Date.now();
  
  // Concurrency up to 10 to speed up API calls. 
  const workers = Array.from({ length: 10 }, async () => {
    while (queue.length) {
      // Abort enrichment if it's taking more than 12 seconds to prevent locking the UI
      if (Date.now() - startTime > 12000) {
        break;
      }
      const job = queue.shift();
      if (!job) break;
      
      const p = job.p;
      out[job.i] = { ...p };
      
      try {
        const results = await searchGooglePlacesText(p.name, city);
        if (results && results.length > 0) {
          const best = results[0];
          
          // Override with accurate Google Places data
          out[job.i].lat = best.lat;
          out[job.i].lng = best.lng;
          if (best.address) {
            out[job.i].address = best.address;
          }
          if (best.photoUrl) {
            out[job.i].image = best.photoUrl;
          }
        }
      } catch (e) {
        console.warn('Failed to enrich place with Google Places API:', p.name, e);
      }
    }
  });
  
  await Promise.all(workers);
  
  // Fill any remaining unenriched items that were skipped due to timeout
  for (const job of queue) {
    out[job.i] = { ...job.p };
  }
  
  return out;
}

/**
 * Fetch AI-curated places for a city. Cached in memory.
 * Returns [] on any failure so callers can fall back gracefully.
 */
export async function fetchAiPlacesForCity(cityName: string): Promise<CityPlace[]> {
  const key = cityKey(cityName);
  if (!key) return [];

  const cachedMem = memCache.get(key);
  if (cachedMem) return cachedMem;



  const inflight = pending.get(key);
  if (inflight) return inflight;

  const run = (async (): Promise<CityPlace[]> => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-place-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ city: cityName }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as AiResponse;
      const rawPlaces = toCityPlaces(data, key);
      const places = rawPlaces.length > 0 ? await enrichWithGooglePlaces(rawPlaces, key) : rawPlaces;
      if (places.length > 0) {
        memCache.set(key, places);
      }
      return places;
    } catch (e) {
      console.warn('[aiPlaceRecommendations] failed for', cityName, e);
      return [];
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, run);
  return run;
}
