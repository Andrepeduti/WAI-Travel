/**
 * Place details lookup
 * ---------------------
 * Hybrid strategy:
 *   1. Today: Wikipedia (description) + Google Places (location, coords, category)
 *   2. Future: Google Places (description + real Google rating + reviews)
 *
 * To switch to Google Places later, add a GOOGLE_PLACES_API_KEY edge function
 * and implement `fetchFromGooglePlaces(name, hint)` returning the same shape.
 * The UI consumes a single normalized `PlaceDetails` interface so the swap is
 * transparent.
 */

import { searchGooglePlacesText } from './googlePlacesApi';

export interface PlaceDetails {
  name: string;
  description?: string;
  location?: string; // human readable address / area
  lat?: number;
  lng?: number;
  rating?: number;          // 0–5
  ratingSource?: 'google' | 'osm' | 'mock';
  category?: string;
  imageUrl?: string;
  website?: string;
  source: 'wikipedia' | 'osm' | 'google' | 'mock';
}

const WIKIPEDIA_LANGS = ['pt', 'en'];

async function fetchWikipediaSummary(title: string, lang: string): Promise<{ description: string; thumbnail?: string } | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.type === 'disambiguation' || !data?.extract) return null;
    return {
      description: data.extract,
      thumbnail: data.thumbnail?.source,
    };
  } catch {
    return null;
  }
}

async function searchWikipedia(query: string, lang: string): Promise<string | null> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.query?.search?.[0];
    return first?.title ?? null;
  } catch {
    return null;
  }
}

/**
 * Main entry: fetch details for a place by name (and optional location hint).
 * Returns a normalized PlaceDetails or null if nothing useful found.
 */
export async function fetchPlaceDetails(
  name: string,
  hint?: { location?: string; lat?: number; lng?: number }
): Promise<PlaceDetails | null> {
  if (!name?.trim()) return null;

  // 1. Wikipedia summary (try multiple languages)
  let wiki: { description: string; thumbnail?: string } | null = null;
  for (const lang of WIKIPEDIA_LANGS) {
    wiki = await fetchWikipediaSummary(name, lang);
    if (wiki) break;
    // try search fallback
    const found = await searchWikipedia(name, lang);
    if (found) {
      wiki = await fetchWikipediaSummary(found, lang);
      if (wiki) break;
    }
  }

  // 2. Google Places for coords + location
  const query = hint?.location ? `${name}, ${hint.location}` : name;
  const googleResults = await searchGooglePlacesText(query);
  const googlePlace = googleResults.length > 0 ? googleResults[0] : null;

  if (!wiki && !googlePlace) return null;

  return {
    name,
    description: wiki?.description,
    location: googlePlace?.address,
    lat: googlePlace?.lat ?? hint?.lat,
    lng: googlePlace?.lng ?? hint?.lng,
    category: googlePlace?.primaryType,
    imageUrl: wiki?.thumbnail,
    source: wiki ? 'wikipedia' : 'google',
  };
}
