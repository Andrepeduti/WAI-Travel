/**
 * AI-curated place recommendations per city.
 * Calls the `ai-place-recommendations` edge function and caches results in
 * localStorage so we don't burn AI credits every time the user opens a trip.
 */

import type { CityPlace } from '@/data/cityRecommendations';
import { FALLBACK_IMAGE } from '@/lib/imageFallback';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const CACHE_PREFIX = 'wai_ai_recs_v6::';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

function readLocal(key: string): CityPlace[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; places: CityPlace[] };
    if (!parsed?.ts || !Array.isArray(parsed.places)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.places;
  } catch {
    return null;
  }
}

function writeLocal(key: string, places: CityPlace[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), places }));
  } catch {
    // localStorage may be full / disabled — silently ignore.
  }
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

const imageCache = new Map<string, string>();

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function meaningfulTokens(value: string): string[] {
  const stop = new Set(['the', 'de', 'da', 'do', 'dos', 'das', 'du', 'des', 'del', 'la', 'le', 'les', 'el', 'a', 'o', 'of', 'and', 'restaurant', 'restaurante', 'bar', 'cafe', 'café']);
  return normalizeText(value).split(' ').filter((t) => t.length >= 3 && !stop.has(t));
}

function matchScore(candidate: string, name: string, city: string): number {
  const hay = normalizeText(candidate);
  const exactName = hay.includes(normalizeText(name)) ? 2 : 0;
  const placeTokens = meaningfulTokens(name);
  const cityTokens = meaningfulTokens(city);
  const matchedPlace = placeTokens.filter((t) => hay.includes(t)).length;
  const matchedCity = cityTokens.some((t) => hay.includes(t)) ? 1 : 0;
  return exactName + matchedPlace * 2 + matchedCity;
}

function commonsThumb(fileName: string, width = 900): string {
  const clean = fileName.replace(/^File:/i, '').replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=${width}`;
}

async function wikidataImageFor(name: string, city: string): Promise<string | null> {
  const langs = ['pt', 'en', 'es', 'fr'];
  for (const lang of langs) {
    try {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*`
        + `&language=${lang}&limit=5&search=${encodeURIComponent(`${name} ${city}`)}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) continue;
      const searchJson = await searchRes.json() as any;
      const best = ((searchJson?.search ?? []) as any[])
        .map((entity) => ({
          entity,
          score: matchScore(`${entity?.label ?? ''} ${entity?.description ?? ''}`, name, city),
        }))
        .filter(({ score, entity }) => score >= MIN_EXACT_IMAGE_SCORE && /^Q\d+$/.test(entity?.id ?? ''))
        .sort((a, b) => b.score - a.score)[0]?.entity;
      if (!best?.id) continue;

      const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*`
        + `&ids=${best.id}&props=claims`;
      const entityRes = await fetch(entityUrl);
      if (!entityRes.ok) continue;
      const entityJson = await entityRes.json() as any;
      const file = entityJson?.entities?.[best.id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (typeof file === 'string' && file.trim()) return commonsThumb(file);
    } catch {
      // try next language
    }
  }
  return null;
}

async function wikipediaImageFor(name: string, city: string): Promise<string | null> {
  const langs = ['pt', 'en', 'es', 'fr'];
  for (const lang of langs) {
    try {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*`
        + `&list=search&srlimit=5&srsearch=${encodeURIComponent(`intitle:"${name}" ${city}`)}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) continue;
      const searchJson = await searchRes.json() as any;
      const candidates = (searchJson?.query?.search ?? []) as any[];
      const best = candidates
        .map((page) => ({ page, score: matchScore(`${page.title} ${page.snippet ?? ''}`, name, city) }))
        .filter(({ score }) => score >= MIN_EXACT_IMAGE_SCORE)
        .sort((a, b) => b.score - a.score)[0]?.page;
      if (!best?.pageid) continue;

      const imageUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*`
        + `&prop=pageimages&pageids=${best.pageid}&piprop=thumbnail&pithumbsize=900`;
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) continue;
      const imageJson = await imageRes.json() as any;
      const page = imageJson?.query?.pages?.[best.pageid];
      const thumb = page?.thumbnail?.source as string | undefined;
      if (thumb) return thumb;
    } catch {
      // try next language
    }
  }
  return null;
}

async function commonsImageFor(name: string, city: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`"${name}" ${city}`.trim());
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*`
      + `&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${q}`
      + `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json() as any;
    const pages = Object.values(j?.query?.pages ?? {}) as any[];
    const ranked = pages
      .map((page) => {
        const meta = page?.imageinfo?.[0]?.extmetadata ?? {};
        const candidateText = [
          page?.title,
          meta?.ObjectName?.value,
          meta?.ImageDescription?.value,
          meta?.Categories?.value,
        ].filter(Boolean).join(' ');
        return { page, score: matchScore(candidateText, name, city) };
      })
      .filter(({ score, page }) => score >= MIN_EXACT_IMAGE_SCORE && (page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.page?.imageinfo?.[0]?.thumburl || ranked[0]?.page?.imageinfo?.[0]?.url || null;
  } catch {
    return null;
  }
}

async function openverseImageFor(name: string, city: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`"${name}" ${city}`.trim());
    const url = `https://api.openverse.org/v1/images/?q=${q}&page_size=8&license_type=all&mature=false`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json() as any;
    const ranked = ((j?.results ?? []) as any[])
      .map((item) => ({
        item,
        score: matchScore([item?.title, item?.tags?.map((t: any) => t?.name).join(' '), item?.creator].filter(Boolean).join(' '), name, city),
      }))
      .filter(({ score, item }) => score >= MIN_EXACT_IMAGE_SCORE && (item?.thumbnail || item?.url))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.item?.thumbnail || ranked[0]?.item?.url || null;
  } catch {
    return null;
  }
}

async function googleImageFor(name: string, city: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/google-image-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ query: `${name} ${city}`.trim() }),
    });
    if (!res.ok) return null;
    const j = await res.json() as any;
    return typeof j?.image === 'string' && j.image ? j.image : null;
  } catch {
    return null;
  }
}

async function resolveImageFor(name: string, city: string, fallback: string): Promise<string> {
  const key = `${name.toLowerCase()}|${city.toLowerCase()}`;
  const cached = imageCache.get(key);
  if (cached) return cached;
  const wikidata = await wikidataImageFor(name, city);
  const wiki = wikidata ? null : await wikipediaImageFor(name, city);
  const commons = wikidata || wiki ? null : await commonsImageFor(name, city);
  const openverse = wikidata || wiki || commons ? null : await openverseImageFor(name, city);
  const google = wikidata || wiki || commons || openverse ? null : await googleImageFor(name, city);
  const url = wikidata || wiki || commons || openverse || google || FALLBACK_IMAGE || fallback;
  imageCache.set(key, url);
  return url;
}

async function enrichWithRealImages(places: CityPlace[], city: string): Promise<CityPlace[]> {
  // Limit concurrency to avoid hammering Wikipedia.
  const out: CityPlace[] = new Array(places.length);
  const queue = places.map((p, i) => ({ p, i }));
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      const img = await resolveImageFor(job.p.name, city, job.p.image);
      out[job.i] = { ...job.p, image: img };
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Fetch AI-curated places for a city. Cached in localStorage for 7 days.
 * Returns [] on any failure so callers can fall back gracefully.
 */
export async function fetchAiPlacesForCity(cityName: string): Promise<CityPlace[]> {
  const key = cityKey(cityName);
  if (!key) return [];

  const cachedMem = memCache.get(key);
  if (cachedMem) return cachedMem;

  const cachedLocal = readLocal(key);
  if (cachedLocal) {
    memCache.set(key, cachedLocal);
    return cachedLocal;
  }

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
      const places = rawPlaces.length > 0 ? await enrichWithRealImages(rawPlaces, key) : rawPlaces;
      if (places.length > 0) {
        memCache.set(key, places);
        writeLocal(key, places);
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
