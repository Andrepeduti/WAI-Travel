/**
 * Places Cache — Centralized CRUD for the `places` table.
 * --------------------------------------------------------
 * Single source of truth for place data. All API consumers should
 * query this module BEFORE calling external APIs.
 *
 * Supports progressive enrichment:
 *   basic  → name, category, description, city, country (from AI)
 *   photos → + google_place_id, cover_photo_url (Autocomplete + Place Details)
 *   full   → + lat/lng, address, rating, hours, phone, website, all photos
 */

import { supabase } from '@/integrations/supabase/client';
import type { GooglePlaceResult } from '@/lib/googlePlacesApi';

// ── Types ────────────────────────────────────────────────────────────────────

export type EnrichmentLevel = 'basic' | 'photos' | 'full';

export interface PlaceRecord {
  id: string;
  google_place_id: string | null;
  name: string;
  short_description: string | null;
  country: string | null;
  city: string | null;
  category: string | null;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  price_level: number | null;
  website: string | null;
  phone: string | null;
  opening_hours: any | null;
  cover_photo_url: string | null;
  google_photo_name: string | null;
  photos: string[] | null;
  ai_tips: string[];
  ai_full_description: string | null;
  average_expense: string | null;
  price: string | null;
  enrichment_level: EnrichmentLevel;
  created_at: string;
  updated_at: string;
}

const ENRICHMENT_RANK: Record<EnrichmentLevel, number> = {
  basic: 0,
  photos: 1,
  full: 2,
};

// ── In-memory cache for ultra-fast UI ────────────────────────────────────────

const memoryCache = new Map<string, PlaceRecord>();

function cacheKey(name: string, city?: string | null): string {
  const n = name.toLowerCase().trim();
  const c = city ? city.split(',')[0].toLowerCase().trim() : '';
  return `${n}|${c}`;
}

// ── Read Operations ──────────────────────────────────────────────────────────

/**
 * Look up a place by its Google Place ID.
 */
export async function getPlaceByGoogleId(googlePlaceId: string): Promise<PlaceRecord | null> {
  if (!googlePlaceId) return null;

  // Check memory first
  for (const place of memoryCache.values()) {
    if (place.google_place_id === googlePlaceId) return place;
  }

  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('google_place_id', googlePlaceId)
      .maybeSingle();

    if (error || !data) return null;

    const record = data as unknown as PlaceRecord;
    memoryCache.set(cacheKey(record.name, record.city), record);
    return record;
  } catch {
    return null;
  }
}

/**
 * Look up a place by name and optional city.
 */
export async function getPlaceByName(name: string, city?: string): Promise<PlaceRecord | null> {
  const key = cacheKey(name, city);
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  try {
    let query = supabase
      .from('places')
      .select('*')
      .ilike('name', name.trim());

    if (city) {
      query = query.ilike('city', city.split(',')[0].trim());
    }

    // limit() instead of maybeSingle(): duplicates must not turn into a cache miss
    const { data, error } = await query.limit(5);
    if (error || !data || data.length === 0) return null;

    const rows = data as unknown as PlaceRecord[];
    const record = rows.reduce((best, r) =>
      ENRICHMENT_RANK[r.enrichment_level] > ENRICHMENT_RANK[best.enrichment_level] ? r : best
    );
    memoryCache.set(key, record);
    return record;
  } catch {
    return null;
  }
}

/**
 * Look up a fully enriched place near the given coordinates (~60m).
 * Fallback for when the name shown in the app differs from Google's name.
 */
export async function getFullPlaceByCoords(lat: number, lng: number): Promise<PlaceRecord | null> {
  if (!lat || !lng) return null;
  const delta = 0.0005;

  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('enrichment_level', 'full')
      .gte('latitude', lat - delta)
      .lte('latitude', lat + delta)
      .gte('longitude', lng - delta)
      .lte('longitude', lng + delta)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const record = data[0] as unknown as PlaceRecord;
    memoryCache.set(cacheKey(record.name, record.city), record);
    return record;
  } catch {
    return null;
  }
}

// ── Photo persistence (Google → Supabase Storage) ────────────────────────────

const GOOGLE_PHOTO_NAME_RE = /places\.googleapis\.com\/v1\/(places\/[^/]+\/photos\/[^/]+)\/media/;

/** Extracts the Google photo resource name from a Places media URL. */
export function extractGooglePhotoName(url?: string | null): string | null {
  return url?.match(GOOGLE_PHOTO_NAME_RE)?.[1] ?? null;
}

// Ids already attempted this session (success or failure) — avoids retry loops on every open
const photoSaveInFlight = new Set<string>();

/**
 * Downloads Google photos server-side (edge function `save-place-photos`),
 * stores them in the `place-photos` bucket and REPLACES the Google URLs in
 * `places.photos` / `cover_photo_url` with permanent Storage URLs.
 */
export async function persistPlacePhotos(googlePlaceId: string, photoNames: string[]): Promise<string[] | null> {
  if (!googlePlaceId || photoNames.length === 0) return null;
  const attemptKey = `${googlePlaceId}:${photoNames.length}`;
  if (photoSaveInFlight.has(attemptKey)) return null;
  photoSaveInFlight.add(attemptKey);

  try {
    const { data, error } = await supabase.functions.invoke('save-place-photos', {
      body: { googlePlaceId, photoNames },
    });
    const urls: string[] = Array.isArray(data?.urls) ? data.urls : [];
    if (error || urls.length === 0) {
      console.warn('[placesCache] persistPlacePhotos failed:', error);
      return null;
    }

    const { error: updateError } = await supabase
      .from('places')
      .update({ photos: urls, cover_photo_url: urls[0] })
      .eq('google_place_id', googlePlaceId);
    if (updateError) {
      console.warn('[placesCache] persistPlacePhotos update error:', updateError);
      return null;
    }

    for (const [k, v] of memoryCache.entries()) {
      if (v.google_place_id === googlePlaceId) memoryCache.set(k, { ...v, photos: urls, cover_photo_url: urls[0] });
    }
    return urls;
  } catch (err) {
    console.warn('[placesCache] persistPlacePhotos error:', err);
    return null;
  }
}

/**
 * Get all cached places for a city.
 */
export async function getPlacesByCity(city: string): Promise<PlaceRecord[]> {
  const cityKey = city.split(',')[0].toLowerCase().trim();
  if (!cityKey) return [];

  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .ilike('city', cityKey);

    if (error || !data) return [];

    const records = data as unknown as PlaceRecord[];
    for (const r of records) {
      memoryCache.set(cacheKey(r.name, r.city), r);
    }
    return records;
  } catch {
    return [];
  }
}

// ── Write Operations ─────────────────────────────────────────────────────────

/**
 * Insert or update a place. Merges with existing data — never overwrites
 * non-null fields with null values (progressive enrichment).
 */
export async function upsertPlace(place: Partial<PlaceRecord> & { name: string }): Promise<PlaceRecord | null> {
  try {
    // Check if place exists
    const existing = place.google_place_id
      ? await getPlaceByGoogleId(place.google_place_id)
      : await getPlaceByName(place.name, place.city ?? undefined);

    if (existing) {
      // Merge: keep existing non-null values, add new ones
      const merged: Record<string, any> = {};
      const fields = [
        'google_place_id', 'name', 'short_description', 'country', 'city',
        'category', 'tags', 'latitude', 'longitude', 'formatted_address',
        'rating', 'user_ratings_total', 'price_level',
        'opening_hours', 'cover_photo_url', 'photos', 'ai_tips',
        'ai_full_description', 'average_expense', 'price',
      ];

      for (const field of fields) {
        const newVal = (place as any)[field];
        const oldVal = (existing as any)[field];
        // Prefer new non-null value, but keep old if new is null/undefined
        if (newVal !== undefined && newVal !== null) {
          // For arrays, merge if both exist
          if (Array.isArray(newVal) && Array.isArray(oldVal) && oldVal.length > 0) {
            const mergedArr = [...new Set([...oldVal, ...newVal])];
            merged[field] = mergedArr;
          } else {
            merged[field] = newVal;
          }
        }
      }

      // Only upgrade enrichment level, never downgrade
      const newLevel = place.enrichment_level || existing.enrichment_level;
      if (ENRICHMENT_RANK[newLevel] >= ENRICHMENT_RANK[existing.enrichment_level]) {
        merged.enrichment_level = newLevel;
      }

      const { data, error } = await supabase
        .from('places')
        .update(merged)
        .eq('id', existing.id)
        .select()
        .single();

      if (error || !data) return existing;

      const record = data as unknown as PlaceRecord;
      memoryCache.set(cacheKey(record.name, record.city), record);
      return record;
    }

    // Insert new place
    const insertData: Record<string, any> = {
      name: place.name,
      enrichment_level: place.enrichment_level || 'basic',
    };

    const optionalFields = [
      'google_place_id', 'short_description', 'country', 'city',
      'category', 'tags', 'latitude', 'longitude', 'formatted_address',
      'rating', 'user_ratings_total', 'price_level',
      'opening_hours', 'cover_photo_url', 'photos', 'ai_tips',
      'ai_full_description', 'average_expense', 'price',
    ];

    for (const field of optionalFields) {
      const val = (place as any)[field];
      if (val !== undefined && val !== null) {
        insertData[field] = val;
      }
    }

    const { data, error } = await supabase
      .from('places')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) return null;

    const record = data as unknown as PlaceRecord;
    memoryCache.set(cacheKey(record.name, record.city), record);
    return record;
  } catch (err) {
    console.warn('[placesCache] upsertPlace error:', err);
    return null;
  }
}

/**
 * Batch upsert multiple places (used by AI recommendations).
 */
export async function upsertPlaces(places: Array<Partial<PlaceRecord> & { name: string }>): Promise<PlaceRecord[]> {
  const results: PlaceRecord[] = [];
  for (const place of places) {
    const result = await upsertPlace(place);
    if (result) results.push(result);
  }
  return results;
}

// ── Photo Storage ────────────────────────────────────────────────────────────

/**
 * Download a photo from a URL and upload to Supabase Storage.
 * Returns the public URL of the stored photo.
 */
export async function uploadPhotoToStorage(
  photoUrl: string,
  placeId: string,
  index: number = 0
): Promise<string | null> {
  try {
    // Download the photo
    const response = await fetch(photoUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const filePath = `${placeId}/${index}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('place-photos')
      .upload(filePath, blob, {
        upsert: true,
        contentType: blob.type,
      });

    if (uploadError) {
      console.warn('[placesCache] Photo upload error:', uploadError);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('place-photos')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[placesCache] uploadPhotoToStorage error:', err);
    return null;
  }
}

/**
 * Persists the cover photo of a place saved by a search (only knows the photo name).
 * Called when the user picks the place, so unselected results never cost a photo download.
 */
export async function persistPlaceCoverById(googlePlaceId: string): Promise<void> {
  if (!googlePlaceId) return;
  try {
    const { data } = await supabase
      .from('places')
      .select('google_photo_name, cover_photo_url')
      .eq('google_place_id', googlePlaceId)
      .maybeSingle();
    if (!data) return;
    const alreadyStored = data.cover_photo_url && !extractGooglePhotoName(data.cover_photo_url);
    if (alreadyStored || !data.google_photo_name) return;
    await persistPlacePhotos(googlePlaceId, [data.google_photo_name]);
  } catch (err) {
    console.warn('[placesCache] persistPlaceCoverById error:', err);
  }
}

// ── Search cache (Text Search → places) ──────────────────────────────────────

const SEARCH_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SEARCH_STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'di', 'del', 'la', 'le', 'el', 'the', 'of', 'em', 'in', 'e', 'and']);

/**
 * Order- and accent-insensitive key: "Coliseu, Itália" and "italia coliseu" collide on purpose.
 * The city is just more tokens, so callers that already append it don't change the key.
 */
export function normalizeSearchKey(query: string, city?: string): string {
  const tokens = `${query} ${city ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !SEARCH_STOPWORDS.has(t));
  return [...new Set(tokens)].sort().join(' ');
}

/**
 * Returns the places of a previously saved search, or null on miss/expiry/incomplete data.
 */
export async function getCachedSearch(queryKey: string): Promise<PlaceRecord[] | null> {
  if (!queryKey) return null;
  try {
    const { data: entry } = await supabase
      .from('place_search_cache')
      .select('google_place_ids, created_at')
      .eq('query_key', queryKey)
      .maybeSingle();
    if (!entry || !entry.google_place_ids?.length) return null;
    if (Date.now() - new Date(entry.created_at).getTime() > SEARCH_CACHE_TTL_MS) return null;

    const { data: rows, error } = await supabase
      .from('places')
      .select('*')
      .in('google_place_id', entry.google_place_ids);
    if (error || !rows) return null;

    const byId = new Map((rows as unknown as PlaceRecord[]).map((r) => [r.google_place_id, r]));
    const ordered = entry.google_place_ids.map((id: string) => byId.get(id));
    // Any missing/incomplete place → miss, so we never show a partial result list
    if (ordered.some((r) => !r || !r.latitude || !r.longitude)) return null;
    return ordered as PlaceRecord[];
  } catch {
    return null;
  }
}

/**
 * Saves search results as `photos`-level places (existing rows are left untouched,
 * so a search never overwrites richer data) and records the query → ids mapping.
 */
export async function saveSearchResults(queryKey: string, results: GooglePlaceResult[]): Promise<void> {
  const valid = results.filter((r) => r.id && r.lat && r.lng);
  if (!queryKey || valid.length === 0) return;

  try {
    const rows = valid.map((r) => ({
      google_place_id: r.id,
      name: r.name,
      city: r.city || null,
      country: r.country || null,
      category: r.primaryType || null,
      latitude: r.lat,
      longitude: r.lng,
      formatted_address: r.address || null,
      google_photo_name: r.photoName || null,
      enrichment_level: 'photos' as const,
    }));

    const { error } = await supabase
      .from('places')
      .upsert(rows, { onConflict: 'google_place_id', ignoreDuplicates: true });
    if (error) {
      console.warn('[placesCache] saveSearchResults places error:', error);
      return;
    }

    await supabase.from('place_search_cache').upsert({
      query_key: queryKey,
      google_place_ids: valid.map((r) => r.id),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[placesCache] saveSearchResults error:', err);
  }
}

// ── Enrichment Helpers ───────────────────────────────────────────────────────

/**
 * Check if a place needs further enrichment to satisfy a required level.
 */
export function needsEnrichment(place: PlaceRecord | null, requiredLevel: EnrichmentLevel): boolean {
  if (!place) return true;
  return ENRICHMENT_RANK[place.enrichment_level] < ENRICHMENT_RANK[requiredLevel];
}

// ── Kill Switch / API Usage Counter ──────────────────────────────────────────

let dailyCountCache: { date: string; count: number; limit: number } | null = null;

/**
 * Check if we're still within the daily API call limit.
 */
export async function canCallApi(apiName: string = 'google_places'): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  // Use cached count if same day
  if (dailyCountCache && dailyCountCache.date === today) {
    return dailyCountCache.count < dailyCountCache.limit;
  }

  try {
    const { data, error } = await supabase
      .from('api_usage_counter')
      .select('call_count, daily_limit')
      .eq('api_name', apiName)
      .eq('call_date', today)
      .maybeSingle();

    if (error || !data) {
      // No record for today — we're under the limit
      dailyCountCache = { date: today, count: 0, limit: 500 };
      return true;
    }

    dailyCountCache = {
      date: today,
      count: data.call_count,
      limit: data.daily_limit,
    };

    return data.call_count < data.daily_limit;
  } catch {
    return true; // Fail open — don't block the app if we can't check
  }
}

/**
 * Increment the daily API call counter.
 */
export async function incrementApiCounter(
  apiName: string = 'google_places',
  count: number = 1
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Update local cache immediately
  if (dailyCountCache && dailyCountCache.date === today) {
    dailyCountCache.count += count;
  }

  try {
    // Try to upsert the counter
    const { data: existing } = await supabase
      .from('api_usage_counter')
      .select('id, call_count')
      .eq('api_name', apiName)
      .eq('call_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('api_usage_counter')
        .update({ call_count: existing.call_count + count })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('api_usage_counter')
        .insert({ api_name: apiName, call_date: today, call_count: count });
    }
  } catch {
    // Non-critical — don't break the app flow
  }
}
