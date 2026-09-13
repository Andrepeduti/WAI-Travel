/**
 * Cities Cache — Centralized CRUD for the `cities` table.
 * --------------------------------------------------------
 * Manages destinations/cities and their cover photos separately from attractions.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CityRecord {
  id: string;
  name: string;
  country: string | null;
  cover_photo_url: string | null;
  google_place_id: string | null;
  created_at: string;
  updated_at: string;
}

// In-memory cache for ultra-fast UI
const memoryCache = new Map<string, CityRecord>();

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Look up a city by its name.
 */
export async function getCityByName(name: string): Promise<CityRecord | null> {
  const key = normalizeName(name);
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error || !data) return null;

    const record = data as unknown as CityRecord;
    memoryCache.set(normalizeName(record.name), record);
    return record;
  } catch {
    return null;
  }
}

/**
 * Upsert a city into the database.
 */
export async function upsertCity(updates: Partial<CityRecord> & { name: string }): Promise<void> {
  if (!updates.name) return;

  const key = normalizeName(updates.name);

  try {
    // 1. Check if exists
    const existing = await getCityByName(updates.name);

    if (existing) {
      // Don't update if data is same
      if (
        (updates.cover_photo_url === undefined || updates.cover_photo_url === existing.cover_photo_url) &&
        (updates.google_place_id === undefined || updates.google_place_id === existing.google_place_id)
      ) {
        return;
      }

      // Update
      const { data, error } = await supabase
        .from('cities')
        .update({
          cover_photo_url: updates.cover_photo_url ?? existing.cover_photo_url,
          google_place_id: updates.google_place_id ?? existing.google_place_id,
          country: updates.country ?? existing.country,
        })
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        memoryCache.set(key, data as unknown as CityRecord);
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('cities')
        .insert({
          name: updates.name,
          cover_photo_url: updates.cover_photo_url,
          google_place_id: updates.google_place_id,
          country: updates.country,
        })
        .select('*')
        .maybeSingle();

      if (!error && data) {
        memoryCache.set(key, data as unknown as CityRecord);
      }
    }
  } catch (error) {
    console.error('[citiesCache] Error upserting city:', error);
  }
}
