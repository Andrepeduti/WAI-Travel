/**
 * Database and utilities for resolving coordinates of cities and destinations worldwide.
 * Includes accent-insensitive normalization, Brazilian capitals, major world tourist destinations,
 * and asynchronous fallback geocoding with caching.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

// Comprehensive dictionary of major destinations & cities (lowercase, accent-normalized)
const CITY_COORDINATES_MAP: Record<string, LatLng> = {
  // ── Brasil & América do Sul ──
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'salvador': { lat: -12.9777, lng: -38.5016 },
  'florianopolis': { lat: -27.5954, lng: -48.5480 },
  'curitiba': { lat: -25.4290, lng: -49.2671 },
  'foz do iguacu': { lat: -25.5163, lng: -54.5854 },
  'gramado': { lat: -29.3787, lng: -50.8738 },
  'canela': { lat: -29.3644, lng: -50.8123 },
  'fortaleza': { lat: -3.7319, lng: -38.5267 },
  'recife': { lat: -8.0476, lng: -34.8770 },
  'porto de galinhas': { lat: -8.5069, lng: -35.0042 },
  'natal': { lat: -5.7945, lng: -35.2110 },
  'belo horizonte': { lat: -19.9167, lng: -43.9345 },
  'brasilia': { lat: -15.7975, lng: -47.8919 },
  'manaus': { lat: -3.1190, lng: -60.0217 },
  'belem': { lat: -1.4558, lng: -48.4902 },
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
  'fernando de noronha': { lat: -3.8547, lng: -32.4237 },
  'lencois maranhenses': { lat: -2.4859, lng: -43.1284 },
  'barreirinhas': { lat: -2.7486, lng: -42.8258 },
  'bonito': { lat: -21.1215, lng: -56.4819 },
  'maceio': { lat: -9.6658, lng: -35.7351 },
  'maragogi': { lat: -9.0122, lng: -35.2225 },
  'joao pessoa': { lat: -7.1195, lng: -34.8450 },
  'pipa': { lat: -6.2300, lng: -35.0486 },
  'campos do jordao': { lat: -22.7394, lng: -45.5913 },
  'paraty': { lat: -23.2178, lng: -44.7131 },
  'buzios': { lat: -22.7539, lng: -41.8860 },
  'arraial do cabo': { lat: -22.9661, lng: -42.0278 },
  'angra dos reis': { lat: -23.0067, lng: -44.3181 },
  'ilhabela': { lat: -23.7781, lng: -45.3581 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },
  'bariloche': { lat: -41.1335, lng: -71.3103 },
  'mendoza': { lat: -32.8895, lng: -68.8458 },
  'ushuaia': { lat: -54.8019, lng: -68.3030 },
  'santiago': { lat: -33.4489, lng: -70.6693 },
  'san pedro de atacama': { lat: -22.9087, lng: -68.1997 },
  'lima': { lat: -12.0464, lng: -77.0428 },
  'cusco': { lat: -13.5319, lng: -71.9675 },
  'machu picchu': { lat: -13.1631, lng: -72.5450 },
  'bogota': { lat: 4.7110, lng: -74.0721 },
  'medellin': { lat: 6.2442, lng: -75.5812 },
  'cartagena': { lat: 10.3910, lng: -75.4794 },
  'montevideu': { lat: -34.9011, lng: -56.1645 },
  'punta del este': { lat: -34.9653, lng: -54.9458 },

  // ── Europa ──
  'paris': { lat: 48.8566, lng: 2.3522 },
  'londres': { lat: 51.5074, lng: -0.1278 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'roma': { lat: 41.9028, lng: 12.4964 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'milao': { lat: 45.4642, lng: 9.1900 },
  'milan': { lat: 45.4642, lng: 9.1900 },
  'florenca': { lat: 43.7696, lng: 11.2558 },
  'florence': { lat: 43.7696, lng: 11.2558 },
  'veneza': { lat: 45.4408, lng: 12.3155 },
  'venice': { lat: 45.4408, lng: 12.3155 },
  'napoles': { lat: 40.8518, lng: 14.2681 },
  'madri': { lat: 40.4168, lng: -3.7038 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'barcelona': { lat: 41.3874, lng: 2.1686 },
  'sevilha': { lat: 37.3891, lng: -5.9845 },
  'valencia': { lat: 39.4699, lng: -0.3763 },
  'lisboa': { lat: 38.7223, lng: -9.1393 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'porto': { lat: 41.1579, lng: -8.6291 },
  'faro': { lat: 37.0194, lng: -7.9304 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'amsterda': { lat: 52.3676, lng: 4.9041 },
  'bruxelas': { lat: 50.8503, lng: 4.3517 },
  'bruges': { lat: 51.2093, lng: 3.2247 },
  'berlim': { lat: 52.5200, lng: 13.4050 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'munique': { lat: 48.1351, lng: 11.5820 },
  'munich': { lat: 48.1351, lng: 11.5820 },
  'frankfurt': { lat: 50.1109, lng: 8.6821 },
  'viena': { lat: 48.2082, lng: 16.3738 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'salzburgo': { lat: 47.8095, lng: 13.0550 },
  'praga': { lat: 50.0755, lng: 14.4378 },
  'prague': { lat: 50.0755, lng: 14.4378 },
  'budapeste': { lat: 47.4979, lng: 19.0402 },
  'budapest': { lat: 47.4979, lng: 19.0402 },
  'atenas': { lat: 37.9838, lng: 23.7275 },
  'athens': { lat: 37.9838, lng: 23.7275 },
  'santorini': { lat: 36.3932, lng: 25.4615 },
  'mykonos': { lat: 37.4467, lng: 25.3289 },
  'dublin': { lat: 53.3498, lng: -6.2603 },
  'edimburgo': { lat: 55.9533, lng: -3.1883 },
  'zurique': { lat: 47.3769, lng: 8.5417 },
  'genebra': { lat: 46.2044, lng: 6.1432 },
  'lucerna': { lat: 47.0502, lng: 8.3093 },
  'copenhague': { lat: 55.6761, lng: 12.5683 },
  'estocolmo': { lat: 59.3293, lng: 18.0686 },
  'oslo': { lat: 59.9139, lng: 10.7522 },
  'helsinque': { lat: 60.1699, lng: 24.9384 },
  'varsovia': { lat: 52.2297, lng: 21.0122 },
  'cracovia': { lat: 50.0647, lng: 19.9450 },
  'dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'split': { lat: 43.5081, lng: 16.4402 },
  'istambul': { lat: 41.0082, lng: 28.9784 },
  'capadocia': { lat: 38.6431, lng: 34.8289 },

  // ── América do Norte & Caribe ──
  'nova york': { lat: 40.7128, lng: -74.0060 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'orlando': { lat: 28.5383, lng: -81.3792 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'sao francisco': { lat: 37.7749, lng: -122.4194 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'washington': { lat: 38.9072, lng: -77.0369 },
  'boston': { lat: 42.3601, lng: -71.0589 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'honolulu': { lat: 21.3069, lng: -157.8583 },
  'havai': { lat: 21.3069, lng: -157.8583 },
  'cancun': { lat: 21.1619, lng: -86.8515 },
  'cidade do mexico': { lat: 19.4326, lng: -99.1332 },
  'playa del carmen': { lat: 20.6296, lng: -87.0739 },
  'tulum': { lat: 20.2114, lng: -87.4654 },
  'punta cana': { lat: 18.5820, lng: -68.4055 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'banff': { lat: 51.1784, lng: -115.5708 },

  // ── Ásia, Oriente Médio & Oceania ──
  'toquio': { lat: 35.6762, lng: 139.6503 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'quioto': { lat: 35.0116, lng: 135.7681 },
  'kyoto': { lat: 35.0116, lng: 135.7681 },
  'osaka': { lat: 34.6937, lng: 135.5023 },
  'seul': { lat: 37.5665, lng: 126.9780 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'phuket': { lat: 7.8804, lng: 98.3923 },
  'chiang mai': { lat: 18.7883, lng: 98.9853 },
  'bali': { lat: -8.4095, lng: 115.1889 },
  'ubud': { lat: -8.5069, lng: 115.2625 },
  'singapura': { lat: 1.3521, lng: 103.8198 },
  'cingapura': { lat: 1.3521, lng: 103.8198 },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'hanoi': { lat: 21.0285, lng: 105.8542 },
  'ho chi minh': { lat: 10.8231, lng: 106.6297 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'pequim': { lat: 39.9042, lng: 116.4074 },
  'xangai': { lat: 31.2304, lng: 121.4737 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'abu dhabi': { lat: 24.4539, lng: 54.3773 },
  'doha': { lat: 25.2854, lng: 51.5310 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'cidade do cabo': { lat: -33.9249, lng: 18.4241 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'joanesburgo': { lat: -26.2041, lng: 28.0473 },
  'marrakech': { lat: 31.6295, lng: -7.9811 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'auckland': { lat: -36.8485, lng: 174.7633 },
  'queenstown': { lat: -45.0312, lng: 168.6626 },
};

/**
 * Normalizes city string by lowercasing, stripping accents, and taking the primary city component.
 */
export function normalizeCityName(raw: string): string {
  if (!raw) return '';
  const firstPart = raw.split(',')[0].trim();
  return firstPart
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Resolves coordinates for a destination name synchronously from our database.
 */
export function getCityCoordinates(destinationName: string): LatLng | null {
  const norm = normalizeCityName(destinationName);
  if (!norm) return null;

  if (CITY_COORDINATES_MAP[norm]) {
    return CITY_COORDINATES_MAP[norm];
  }

  // Partial match search
  for (const [key, coords] of Object.entries(CITY_COORDINATES_MAP)) {
    if (norm.includes(key) || key.includes(norm)) {
      return coords;
    }
  }

  return null;
}

/**
 * Asynchronously resolves coordinates for one or multiple destinations.
 * If not in database, can fetch from OpenStreetMap Nominatim with local caching.
 */
const geocodeCache = new Map<string, LatLng>();

export async function resolveDestinationCoordinates(destinationName: string): Promise<LatLng | null> {
  const local = getCityCoordinates(destinationName);
  if (local) return local;

  const key = normalizeCityName(destinationName);
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  try {
    const query = encodeURIComponent(destinationName);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: {
        'Accept-Language': 'pt-BR,en',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const result: LatLng = { lat, lng };
        geocodeCache.set(key, result);
        return result;
      }
    }
  } catch {
    // ignore network errors and fallback
  }

  return null;
}
