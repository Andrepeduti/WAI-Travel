/**
 * Centralized Google Places API (New) utilities for the application.
 * Uses the modern places.googleapis.com/v1 endpoints which support CORS natively.
 */
import {
  canCallApi,
  incrementApiCounter,
  normalizeSearchKey,
  getCachedSearch,
  saveSearchResults,
  type PlaceRecord,
} from '@/lib/placesCache';

export interface GoogleAutocompleteSuggestion {
  placeId: string;
  name: string;      // e.g. "Eiffel Tower"
  location: string;  // e.g. "Paris, France"
  fullText: string;  // e.g. "Eiffel Tower, Paris, France"
  description?: string; // backwards compatibility e.g. "Paris, France"
}

export interface GooglePlaceDetails {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface GooglePlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  primaryType: string;
  photoUrl?: string;
  photoName?: string;
  city?: string;
  country?: string;
}

function getApiKey(): string {
  return import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
}

// Helper for session storage caching
function getSessionCache<T>(key: string): T | null {
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as T;
  } catch (e) {
    // ignore
  }
  return null;
}

function setSessionCache(key: string, data: any): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

// Local memory fallbacks just in case sessionStorage is unavailable
const autocompleteCache = new Map<string, GoogleAutocompleteSuggestion[]>();
const textSearchCache = new Map<string, GooglePlaceResult[]>();

/**
 * Autocomplete for cities, regions, or specific places.
 * @param query The search text
 * @param includedPrimaryTypes Filter by types, e.g. ['locality', 'administrative_area_level_3']
 */
export async function searchGooglePlacesAutocomplete(
  query: string,
  includedPrimaryTypes?: string[]
): Promise<GoogleAutocompleteSuggestion[]> {
  const apiKey = getApiKey();
  if (!apiKey || query.trim().length < 2) return [];

  const cacheKey = `gplaces_auto_${query.trim().toLowerCase()}_${includedPrimaryTypes?.join(',') || ''}`;
  
  // Try sessionStorage first
  const sessionData = getSessionCache<GoogleAutocompleteSuggestion[]>(cacheKey);
  if (sessionData) return sessionData;

  // Fallback to memory cache
  if (autocompleteCache.has(cacheKey)) {
    return autocompleteCache.get(cacheKey)!;
  }

  try {
    const body: any = {
      input: query,
      languageCode: 'pt-BR',
      regionCode: 'BR',
    };
    if (includedPrimaryTypes && includedPrimaryTypes.length > 0) {
      body.includedPrimaryTypes = includedPrimaryTypes;
    }

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error('Falha na API do Google Places');

    const data = await res.json();
    const suggestions = (data.suggestions || []).map((s: any) => {
      const placePrediction = s.placePrediction;
      const fullText = placePrediction?.text?.text || placePrediction?.structuredFormat?.mainText?.text || '';
      const name = placePrediction?.structuredFormat?.mainText?.text || fullText;
      const location = placePrediction?.structuredFormat?.secondaryText?.text || '';
      return {
        placeId: placePrediction?.place || placePrediction?.placeId || '',
        name,
        location,
        fullText,
        description: fullText || (location ? `${name}, ${location}` : name),
      };
    }).filter((s: any) => s.placeId);
    
    autocompleteCache.set(cacheKey, suggestions);
    setSessionCache(cacheKey, suggestions);
    return suggestions;
  } catch (error) {
    console.error('Google Autocomplete error:', error);
    return [];
  }
}

/**
 * Fetch coordinates and address from a Place ID.
 */
export async function getGooglePlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const apiKey = getApiKey();
  if (!apiKey || !placeId) return null;

  if (!(await canCallApi('google_places'))) {
    console.warn('Google Places API quota exceeded for today (getGooglePlaceDetails)');
    return null;
  }

  try {
    const cleanPlaceId = placeId.split('/').pop() || placeId;
    const res = await fetch(`https://places.googleapis.com/v1/places/${cleanPlaceId}?languageCode=pt-BR`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'location,formattedAddress',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.location) return null;

    incrementApiCounter('google_places', 1).catch(() => {});

    return {
      lat: data.location.latitude,
      lng: data.location.longitude,
      formattedAddress: data.formattedAddress || '',
    };
  } catch (error) {
    console.error('Google Place Details error:', error);
    return null;
  }
}

/**
 * Fetch full place details (with photo and category) from a Place ID.
 */
export async function getGooglePlaceFullDetails(placeId: string): Promise<GooglePlaceResult | null> {
  const apiKey = getApiKey();
  if (!apiKey || !placeId) return null;

  if (!(await canCallApi('google_places'))) {
    console.warn('Google Places API quota exceeded for today (getGooglePlaceFullDetails)');
    return null;
  }

  try {
    const cleanPlaceId = placeId.split('/').pop() || placeId;
    const res = await fetch(`https://places.googleapis.com/v1/places/${cleanPlaceId}?languageCode=pt-BR`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,location,formattedAddress,primaryType,photos,addressComponents',
      },
    });

    if (!res.ok) return null;
    const p = await res.json();
    
    let photoUrl: string | undefined;
    if (p.photos && p.photos.length > 0) {
      photoUrl = `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=600&maxWidthPx=600&key=${apiKey}`;
    }
    
    let city = '';
    if (Array.isArray(p.addressComponents)) {
      const locality = p.addressComponents.find((c: any) => c?.types?.includes('locality'));
      if (locality) {
        city = locality.longText || locality.text || '';
      } else {
        const admin2 = p.addressComponents.find((c: any) => c?.types?.includes('administrative_area_level_2'));
        if (admin2) {
          city = admin2.longText || admin2.text || '';
        }
      }
    }

    let country = '';
    if (Array.isArray(p.addressComponents)) {
      const countryComp = p.addressComponents.find((c: any) => c?.types?.includes('country'));
      if (countryComp) {
        country = countryComp.longText || countryComp.text || '';
      }
    }

    incrementApiCounter('google_places', 1).catch(() => {});

    return {
      id: p.id || cleanPlaceId,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      lat: p.location?.latitude || 0,
      lng: p.location?.longitude || 0,
      primaryType: formatGooglePlaceType(p.primaryType || ''),
      photoUrl,
      city,
      country,
    };
  } catch (error) {
    console.error('Google Full Place Details error:', error);
    return null;
  }
}

export interface TextSearchOptions {
  /** Save results in `places` + `place_search_cache` and serve repeated searches from the DB. */
  persist?: boolean;
  /** Limits the Google response (pageSize, 1-20). */
  maxResults?: number;
}

function buildPhotoUrl(photoName: string, apiKey: string, size = 600): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${size}&maxWidthPx=${size}&key=${apiKey}`;
}

function placeRecordToResult(r: PlaceRecord, apiKey: string): GooglePlaceResult {
  return {
    id: r.google_place_id || '',
    name: r.name,
    address: r.formatted_address || '',
    lat: r.latitude || 0,
    lng: r.longitude || 0,
    primaryType: r.category || '',
    // Storage URL when already persisted, otherwise rebuilt from the Google photo name
    photoUrl: r.cover_photo_url || (r.google_photo_name ? buildPhotoUrl(r.google_photo_name, apiKey) : undefined),
    photoName: r.google_photo_name || undefined,
    city: r.city || '',
    country: r.country || '',
  };
}

/**
 * Text Search for POIs (Points of Interest).
 */
export async function searchGooglePlacesText(
  query: string,
  city?: string,
  options: TextSearchOptions = {}
): Promise<GooglePlaceResult[]> {
  const apiKey = getApiKey();
  if (!apiKey || query.trim().length < 2) return [];

  const cacheKey = `gplaces_text_${query.trim().toLowerCase()}_${city?.toLowerCase() || ''}`;
  
  const sessionData = getSessionCache<GooglePlaceResult[]>(cacheKey);
  if (sessionData) return sessionData;

  if (textSearchCache.has(cacheKey)) {
    return textSearchCache.get(cacheKey)!;
  }

  const searchKey = options.persist ? normalizeSearchKey(query, city) : '';
  if (searchKey) {
    const saved = await getCachedSearch(searchKey);
    if (saved) {
      const fromDb = saved.map((r) => placeRecordToResult(r, apiKey));
      textSearchCache.set(cacheKey, fromDb);
      setSessionCache(cacheKey, fromDb);
      return fromDb;
    }
  }

  if (!(await canCallApi('google_places'))) {
    console.warn('Google Places API quota exceeded for today (searchGooglePlacesText)');
    return [];
  }

  try {
    const fullQuery = city ? `${query}, ${city}` : query;
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.primaryType,places.photos,places.addressComponents',
      },
      body: JSON.stringify({
        textQuery: fullQuery,
        languageCode: 'pt-BR',
        ...(options.maxResults ? { pageSize: options.maxResults } : {}),
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    
    const results: GooglePlaceResult[] = (data.places || []).map((p: any) => {
      let photoUrl: string | undefined;
      let photoName: string | undefined;
      if (p.photos && p.photos.length > 0) {
        photoName = p.photos[0].name;
        photoUrl = buildPhotoUrl(p.photos[0].name, apiKey);
      }
      
      let city = '';
      if (Array.isArray(p.addressComponents)) {
        const locality = p.addressComponents.find((c: any) => c?.types?.includes('locality'));
        if (locality) {
          city = locality.longText || locality.text || '';
        } else {
        const admin2 = p.addressComponents.find((c: any) => c?.types?.includes('administrative_area_level_2'));
          if (admin2) {
            city = admin2.longText || admin2.text || '';
          }
        }
      }
      
      let country = '';
      if (Array.isArray(p.addressComponents)) {
        const countryComp = p.addressComponents.find((c: any) => c?.types?.includes('country'));
        if (countryComp) {
          country = countryComp.longText || countryComp.text || '';
        }
      }
      
      return {
        id: p.id,
        name: p.displayName?.text || '',
        address: p.formattedAddress || '',
        lat: p.location?.latitude || 0,
        lng: p.location?.longitude || 0,
        primaryType: formatGooglePlaceType(p.primaryType || ''),
        photoUrl,
        photoName,
        city,
        country,
      };
    });
    
    textSearchCache.set(cacheKey, results);
    setSessionCache(cacheKey, results);
    incrementApiCounter('google_places', 1).catch(() => {});
    if (searchKey) void saveSearchResults(searchKey, results);
    return results;
  } catch (error) {
    console.error('Google Text Search error:', error);
    return [];
  }
}

/**
 * Reverse Geocode: Get city/state from lat/lon using Google Maps Geocoding API.
 */
export async function reverseGeocodeGoogle(lat: number, lng: number): Promise<{ city: string; state: string } | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=pt-BR`);
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.results && data.results.length > 0) {
      let city = '';
      let state = '';
      const addressComponents = data.results[0].address_components;
      
      if (Array.isArray(addressComponents)) {
        for (const component of addressComponents) {
          if (component?.types?.includes('locality') || component?.types?.includes('administrative_area_level_2')) {
            if (!city) city = component.long_name;
          }
          if (component?.types?.includes('administrative_area_level_1')) {
            state = component.short_name;
          }
        }
      }
      return { city, state };
    }
    return null;
  } catch (error) {
    console.error('Google Reverse Geocoding error:', error);
    return null;
  }
}

export interface GooglePlaceFullDetails {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  website?: string;
  photos: string[];
  photoNames: string[];
  weekdayDescriptions: string[];
  openNow?: boolean;
  editorialSummary?: string;
}

const fullDetailsCache = new Map<string, GooglePlaceFullDetails | null>();

/**
 * Full Text Search / Detail for Place with Photos & 7-day Opening Hours
 */
export async function fetchGooglePlaceDetailsFull(
  name: string,
  city?: string,
  hintCoords?: { lat?: number; lng?: number }
): Promise<GooglePlaceFullDetails | null> {
  const apiKey = getApiKey();
  if (!apiKey || !name?.trim()) return null;

  const cacheKey = `gplaces_full_${name.trim().toLowerCase()}_${city?.toLowerCase() || ''}`;
  
  const sessionData = getSessionCache<GooglePlaceFullDetails | null>(cacheKey);
  if (sessionData !== null) return sessionData; // Can be empty object if null was cached

  if (fullDetailsCache.has(cacheKey)) {
    return fullDetailsCache.get(cacheKey) ?? null;
  }

  if (!(await canCallApi('google_places'))) {
    console.warn('Google Places API quota exceeded for today (fetchGooglePlaceDetailsFull)');
    return null;
  }

  try {
    const fullQuery = city ? `${name}, ${city}` : name;
    const body: any = {
      textQuery: fullQuery,
      languageCode: 'pt-BR',
    };

    if (hintCoords?.lat && hintCoords?.lng) {
      body.locationBias = {
        circle: {
          center: { latitude: hintCoords.lat, longitude: hintCoords.lng },
          radius: 5000.0,
        },
      };
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.location,places.formattedAddress,places.primaryType,places.photos,places.regularOpeningHours,places.currentOpeningHours,places.rating,places.userRatingCount,places.websiteUri,places.editorialSummary',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn('Google Places Full Search response not ok:', res.status);
      return null;
    }

    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) {
      fullDetailsCache.set(cacheKey, null);
      return null;
    }

    const photos: string[] = Array.isArray(place.photos)
      ? place.photos.slice(0, 6).map((photo: any) =>
          `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1200&maxWidthPx=1200&key=${apiKey}`
        )
      : [];

    const photoNames: string[] = Array.isArray(place.photos)
      ? place.photos.slice(0, 6).map((photo: any) => photo.name).filter(Boolean)
      : [];

    const weekdayDescriptions: string[] =
      place.regularOpeningHours?.weekdayDescriptions ||
      place.currentOpeningHours?.weekdayDescriptions ||
      [];

    const result: GooglePlaceFullDetails = {
      id: place.id || '',
      name: place.displayName?.text || name,
      formattedAddress: place.formattedAddress || '',
      lat: place.location?.latitude || hintCoords?.lat || 0,
      lng: place.location?.longitude || hintCoords?.lng || 0,
      primaryType: place.primaryType || '',
      rating: typeof place.rating === 'number' ? place.rating : undefined,
      userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
      website: place.websiteUri || undefined,
      photos,
      photoNames,
      weekdayDescriptions,
      openNow: place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow,
      editorialSummary: place.editorialSummary?.text,
    };

    fullDetailsCache.set(cacheKey, result);
    setSessionCache(cacheKey, result);
    incrementApiCounter('google_places', 1).catch(() => {});
    return result;
  } catch (error) {
    console.error('Google Places Full Details error:', error);
    return null;
  }
}

/**
 * Formata os tipos padrão do Google Places (snake_case) para nomes mais bonitos em Português.
 */
function formatGooglePlaceType(type: string): string {
  if (!type) return 'Local';
  
  const translations: Record<string, string> = {
    'tourist_attraction': 'Ponto Turístico',
    'historical_landmark': 'Ponto Histórico',
    'park': 'Parque',
    'restaurant': 'Restaurante',
    'cafe': 'Cafeteria',
    'museum': 'Museu',
    'shopping_mall': 'Shopping',
    'church': 'Igreja',
    'bar': 'Bar',
    'night_club': 'Casa Noturna',
    'amusement_park': 'Parque de Diversões',
    'art_gallery': 'Galeria de Arte',
    'bakery': 'Padaria',
    'store': 'Loja',
    'clothing_store': 'Loja de Roupas',
    'airport': 'Aeroporto',
    'train_station': 'Estação de Trem',
    'subway_station': 'Estação de Metrô',
    'bus_station': 'Estação de Ônibus',
    'beach': 'Praia',
    'stadium': 'Estádio',
    'aquarium': 'Aquário',
    'zoo': 'Zoológico',
    'spa': 'Spa',
    'gym': 'Academia',
    'lodging': 'Hospedagem',
    'hotel': 'Hotel',
    'sports_school': 'Escola de Esportes',
    'place_of_worship': 'Templo Religioso',
    'natural_feature': 'Atração Natural',
    'town_square': 'Praça Pública',
    'national_park': 'Parque Nacional'
  };

  if (translations[type]) return translations[type];

  // Fallback: remove underscores and capitalize
  const words = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(' ');
}
