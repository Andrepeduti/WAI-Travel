/**
 * Centralized Google Places API (New) utilities for the application.
 * Uses the modern places.googleapis.com/v1 endpoints which support CORS natively.
 */

export interface GoogleAutocompleteSuggestion {
  placeId: string;
  name: string;      // e.g. "Eiffel Tower"
  location: string;  // e.g. "Paris, France"
  fullText: string;  // e.g. "Eiffel Tower, Paris, France"
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
}

function getApiKey(): string {
  return import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
}

// Local cache to prevent duplicate requests for the same query
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

  const cacheKey = `${query.trim().toLowerCase()}_${includedPrimaryTypes?.join(',') || ''}`;
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
      return {
        placeId: placePrediction.place,
        name: placePrediction.structuredFormat?.mainText?.text || placePrediction.text.text,
        location: placePrediction.structuredFormat?.secondaryText?.text || '',
        fullText: placePrediction.text.text,
      };
    }).filter((s: any) => s.placeId);
    
    autocompleteCache.set(cacheKey, suggestions);
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
 * Text Search for POIs (Points of Interest).
 */
export async function searchGooglePlacesText(query: string, city?: string): Promise<GooglePlaceResult[]> {
  const apiKey = getApiKey();
  if (!apiKey || query.trim().length < 2) return [];

  const cacheKey = `${query.trim().toLowerCase()}_${city?.toLowerCase() || ''}`;
  if (textSearchCache.has(cacheKey)) {
    return textSearchCache.get(cacheKey)!;
  }

  try {
    const fullQuery = city ? `${query}, ${city}` : query;
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.primaryType,places.photos',
      },
      body: JSON.stringify({
        textQuery: fullQuery,
        languageCode: 'pt-BR',
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    
    const results = (data.places || []).map((p: any) => {
      let photoUrl: string | undefined;
      if (p.photos && p.photos.length > 0) {
        photoUrl = `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=600&maxWidthPx=600&key=${apiKey}`;
      }
      return {
        id: p.id,
        name: p.displayName?.text || '',
        address: p.formattedAddress || '',
        lat: p.location?.latitude || 0,
        lng: p.location?.longitude || 0,
        primaryType: p.primaryType || '',
        photoUrl,
      };
    });
    
    textSearchCache.set(cacheKey, results);
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
      
      for (const component of addressComponents) {
        if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
          if (!city) city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name;
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
