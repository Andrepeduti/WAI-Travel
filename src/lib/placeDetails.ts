/**
 * Place Details Hybrid Service
 * -----------------------------
 * 1. Google Places API (New): Exact address, lat/lng, 4-5 high-res photos, 7-day opening hours.
 * 2. Gemini AI: Engaging short summary, profile tags, average expense (R$), essential tips.
 * 3. Supabase Cache: Persists in `cached_place_details` for instant subsequent loads.
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchGooglePlaceDetailsFull, GooglePlaceFullDetails } from './googlePlacesApi';
import {
  getPlaceByName,
  getFullPlaceByCoords,
  upsertPlace,
  incrementApiCounter,
  persistPlacePhotos,
  extractGooglePhotoName,
} from './placesCache';

export interface PlaceOpeningHours {
  todayHours?: string;
  openNow?: boolean;
  weekdayDescriptions: string[]; // e.g. ["Segunda-feira: 09:00 – 23:00", ...]
}

export interface PlaceFullDetails {
  name: string;
  city?: string;
  country?: string;
  category?: string;
  rating?: number;
  userRatingCount?: number;
  description: string;
  averageExpense: string; // e.g. "R$ 250,00"
  tags: string[];         // e.g. ["Encontrar amigos", "Romance", "Vida Noturna"]
  tips: string[];         // e.g. ["Compre ingressos online com antecedência...", ...]
  formattedAddress: string;
  lat: number;
  lng: number;
  photos: string[];       // 4 to 5 high quality photos
  openingHours: PlaceOpeningHours;
  website?: string;
  source: 'database' | 'hybrid' | 'cache' | 'fallback';
}

// In-memory cache for ultra-fast instant UI transitions
const memoryCache = new Map<string, PlaceFullDetails>();

function normalizeKey(name: string, city?: string): string {
  const cleanName = name.toLowerCase().trim();
  const cleanCity = city ? city.split(',')[0].toLowerCase().trim() : '';
  return `${cleanName}|${cleanCity}`;
}

export function getPhotoSignature(url?: string): string {
  if (!url) return '';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase().trim();
    const unsplashMatch = cleanUrl.match(/photo-[a-zA-Z0-9-]+/);
    if (unsplashMatch) return unsplashMatch[0];
    const placesMatch = cleanUrl.match(/places\/[^/]+\/photos\/[^/]+/);
    if (placesMatch) return placesMatch[0];
    return cleanUrl;
  } catch {
    return url.toLowerCase().trim();
  }
}

function formatPrice(p?: string): string {
  if (!p) return 'R$ 250,00';
  
  // Clean up cases where "R$ €5" was already cached or passed
  let cleaned = p;
  if (cleaned.match(/R\$\s*[€£\$]/)) {
    cleaned = cleaned.replace(/R\$\s*([€£\$])/g, '$1');
  }

  const lower = cleaned.toLowerCase();
  // Se já tiver símbolo de moeda ou for gratuito, retorna direto
  if (lower.includes('$') || lower.includes('€') || lower.includes('£') || lower.includes('gratuito') || lower.includes('free')) {
    return cleaned;
  }
  return `R$ ${cleaned}`;
}

// Fallback curated tips & description generator for resilience
function generateDefaultCreativeContent(name: string, category?: string) {
  const cat = (category || '').toLowerCase();
  
  let defaultExpense = 'R$ 180,00';
  let defaultTags = ['Ponto Turístico', 'História e Arte', 'Encontrar amigos'];
  let defaultTips = [
    'Recomendamos comprar ingressos ou fazer reservas com antecedência para evitar filas.',
    'O melhor horário para fotos e tranquilidade costuma ser no início da manhã ou no entardecer.',
    'Consulte a melhor rota de transporte público para chegar com facilidade.',
  ];
  let defaultDesc = `${name} é um dos destinos mais procurados e marcantes da região. Oferece uma experiência autêntica, atmosfera única e excelente oportunidade para conhecer a cultura local.`;

  if (cat.includes('restaurante') || cat.includes('culin') || cat.includes('gastronom')) {
    defaultExpense = 'R$ 150,00';
    defaultTags = ['Gastronomia', 'Encontrar amigos', 'Romance'];
    defaultTips = [
      'Faça reserva com antecedência, especialmente nos finais de semana e horários de pico.',
      'Experimente os pratos clássicos da casa recomendados pelo chef.',
      'Excelente ambiente para um jantar especial ou almoço descontraído.',
    ];
    defaultDesc = `Referência gastronômica com ambiente acolhedor e cardápio refinado, perfeito para saborear pratos autênticos e momentos inesquecíveis.`;
  } else if (cat.includes('bar') || cat.includes('balada') || cat.includes('vida noturna') || cat.includes('pub')) {
    defaultExpense = 'R$ 120,00';
    defaultTags = ['Vida Noturna', 'Encontrar amigos', 'Música ao Vivo'];
    defaultTips = [
      'Chegue cedo para garantir mesa ou boa localização no salão.',
      'Aproveite a carta especial de drinks autorais e coquetéis.',
      'Ambiente vibrante, ideal para curtir a noite.',
    ];
    defaultDesc = `Espaço descontraído e animado, conhecido pelos coquetéis bem elaborados, boa música e atmosfera vibrante.`;
  } else if (cat.includes('parque') || cat.includes('praia') || cat.includes('mirante')) {
    defaultExpense = 'Gratuito';
    defaultTags = ['Ao Ar Livre', 'Fotografia', 'Vistas Panorâmicas', 'Pôr do sol'];
    defaultTips = [
      'Leve protetor solar, água e calçado confortável para caminhadas.',
      'Momento mágico para apreciar a vista durante o nascer ou pôr do sol.',
      'Ótimo local para caminhadas, piqueniques e relaxar.',
    ];
    defaultDesc = `Local privilegiado ao ar livre, perfeito para apreciar a natureza, desfrutar de vistas panorâmicas espetaculares e tirar belas fotos.`;
  } else if (cat.includes('museu') || cat.includes('monumento') || cat.includes('igreja') || cat.includes('castelo')) {
    defaultExpense = 'R$ 110,00';
    defaultTags = ['História e Arte', 'Cultura', 'Arquitetura'];
    defaultTips = [
      'Reserve pelo menos 2 horas para uma visita tranquila e sem pressa.',
      'Guias de áudio estão disponíveis e enriquecem muito o passeio.',
      'Verifique dias de gratuidade ou horários com menor movimento.',
    ];
    defaultDesc = `Marco histórico e cultural de grande relevância arquitetônica, preservando acervos valiosos e oferecendo uma imersão profunda na história do destino.`;
  }

  return {
    description: defaultDesc,
    averageExpense: defaultExpense,
    tags: defaultTags,
    tips: defaultTips,
  };
}

let geminiRateLimitCooldownUntil = 0;

/**
 * Fetch Creative Enrichment using Gemini Edge Function
 */
export async function fetchGeminiDetails(
  name: string,
  city?: string,
  country?: string,
  category?: string
): Promise<{
  shortDescription?: string;
  averageExpense?: string;
  tags?: string[];
  tips?: string[];
} | null> {
  if (Date.now() < geminiRateLimitCooldownUntil) {
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('place-details', {
      body: { name, city, country, category },
    });

    if (error) {
      if (error?.status === 429 || String(error?.message).includes('429')) {
        console.warn('[placeDetails] Gemini rate limit (429) detectado. Pausando requisições por 30s e usando fallback curado.');
        geminiRateLimitCooldownUntil = Date.now() + 30000;
      } else {
        console.warn('[placeDetails] Gemini edge function invoke error/fallback:', error);
      }
      return null;
    }

    if (!data) return null;

    return {
      shortDescription: data.shortDescription || data.description,
      averageExpense: data.averageExpense,
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      tips: Array.isArray(data.tips) ? data.tips : undefined,
    };
  } catch (err: any) {
    if (err?.status === 429 || String(err?.message).includes('429')) {
      geminiRateLimitCooldownUntil = Date.now() + 30000;
    }
    console.warn('[placeDetails] Error calling Gemini:', err);
    return null;
  }
}

/**
 * Main Service: Get or Enrich Place Details
 */
export async function getPlaceFullDetails(params: {
  name: string;
  city?: string;
  country?: string;
  category?: string;
  lat?: number;
  lng?: number;
  image?: string;
  rating?: number;
  price?: string;
}): Promise<PlaceFullDetails> {
  const { name, city, country, category, lat, lng, image, rating, price } = params;
  const key = normalizeKey(name, city);

  // 1. Check in-memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  // 2. Check centralized `places` table
  try {
    let cachedPlace = await getPlaceByName(name, city);

    // Name shown in the app may differ from Google's name: fall back to coordinates
    if ((!cachedPlace || cachedPlace.enrichment_level !== 'full') && lat && lng) {
      cachedPlace = (await getFullPlaceByCoords(lat, lng)) ?? cachedPlace;
    }

    if (cachedPlace && cachedPlace.enrichment_level === 'full') {
      const parsedHours: PlaceOpeningHours = cachedPlace.opening_hours || {
        weekdayDescriptions: [],
        openNow: undefined,
      };

      const cachedPhotos = Array.isArray(cachedPlace.photos) && cachedPlace.photos.length > 0
        ? cachedPlace.photos
        : (cachedPlace.cover_photo_url ? [cachedPlace.cover_photo_url] : (image ? [image] : []));

      const result: PlaceFullDetails = {
        name: cachedPlace.name || name,
        city: cachedPlace.city || city,
        country: cachedPlace.country || country,
        category: cachedPlace.category || category,
        rating: cachedPlace.rating != null ? Number(cachedPlace.rating) : rating,
        userRatingCount: cachedPlace.user_ratings_total || undefined,
        description: cachedPlace.short_description || cachedPlace.ai_full_description || '',
        averageExpense: formatPrice(cachedPlace.average_expense || price),
        tags: Array.isArray(cachedPlace.tags) && cachedPlace.tags.length > 0 ? cachedPlace.tags : ['Ponto Turístico', 'Encontrar amigos'],
        tips: Array.isArray(cachedPlace.ai_tips) && cachedPlace.ai_tips.length > 0 ? cachedPlace.ai_tips : [],
        formattedAddress: cachedPlace.formatted_address || '',
        lat: cachedPlace.latitude ?? lat ?? 0,
        lng: cachedPlace.longitude ?? lng ?? 0,
        photos: cachedPhotos,
        openingHours: parsedHours,
        website: cachedPlace.website || undefined,
        source: 'database',
      };

      memoryCache.set(key, result);

      // Lazy migration: legacy rows still hold Google photo URLs (billed on every view)
      if (cachedPlace.google_place_id) {
        const legacyNames = cachedPhotos
          .map(extractGooglePhotoName)
          .filter((n): n is string => !!n);
        if (legacyNames.length > 0) {
          void persistPlacePhotos(cachedPlace.google_place_id, legacyNames);
        }
      }

      return result;
    }
  } catch (err) {
    console.warn('[placeDetails] Error querying places cache:', err);
  }

  // 3. Orquestra em Paralelo: Google Places API (New) + Gemini AI
  const [googlePlace, geminiData] = await Promise.all([
    fetchGooglePlaceDetailsFull(name, city, { lat, lng }),
    fetchGeminiDetails(name, city, country, category),
  ]);

  const fallbackCreative = generateDefaultCreativeContent(name, category || googlePlace?.primaryType);

  const finalDescription = geminiData?.shortDescription || googlePlace?.editorialSummary || fallbackCreative.description;
  const finalAverageExpense = geminiData?.averageExpense || (price ? formatPrice(price) : fallbackCreative.averageExpense);
  const finalTags = (geminiData?.tags && geminiData.tags.length > 0) ? geminiData.tags : fallbackCreative.tags;
  const finalTips = (geminiData?.tips && geminiData.tips.length > 0) ? geminiData.tips : fallbackCreative.tips;

  // Build photo array: prioritize Google Places high-res photos (distinct), fallback to image
  let finalPhotos: string[] = [];
  const rawCandidatePhotos = [
    ...(googlePlace?.photos || []),
    ...(image ? [image] : []),
  ];
  const seenPhotoSigs = new Set<string>();
  for (const p of rawCandidatePhotos) {
    if (!p || !p.trim()) continue;
    const sig = getPhotoSignature(p);
    if (sig && !seenPhotoSigs.has(sig)) {
      seenPhotoSigs.add(sig);
      finalPhotos.push(p);
    }
  }

  const finalAddress = googlePlace?.formattedAddress || [name, city, country].filter(Boolean).join(', ');
  const finalLat = googlePlace?.lat || lat || 0;
  const finalLng = googlePlace?.lng || lng || 0;
  const finalRating = googlePlace?.rating ?? rating;
  const finalUserRatingCount = googlePlace?.userRatingCount;

  // Format opening hours
  const weekdayDescriptions = googlePlace?.weekdayDescriptions || [
    'Segunda-feira: 09:00 – 18:00',
    'Terça-feira: 09:00 – 18:00',
    'Quarta-feira: 09:00 – 18:00',
    'Quinta-feira: 09:00 – 18:00',
    'Sexta-feira: 09:00 – 18:00',
    'Sábado: 10:00 – 19:00',
    'Domingo: 10:00 – 18:00',
  ];

  // Extract today's hours from weekdayDescriptions based on current day of week
  const dayIndex = new Date().getDay(); // 0 = Domingo, 1 = Segunda, ...
  // Google Places weekdayDescriptions usually starts with Monday (0) or Sunday (6).
  // E.g. "Segunda-feira: 09:00 – 18:00"
  let todayHours = '09:00 – 18:00';
  if (weekdayDescriptions.length > 0) {
    const daysNamesPt = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const currentDayName = daysNamesPt[dayIndex];
    const match = weekdayDescriptions.find((d) => d.toLowerCase().includes(currentDayName));
    if (match) {
      const parts = match.split(':');
      if (parts.length > 1) {
        todayHours = parts.slice(1).join(':').trim();
      } else {
        todayHours = match;
      }
    } else {
      todayHours = weekdayDescriptions[0];
    }
  }

  const result: PlaceFullDetails = {
    name: googlePlace?.name || name,
    city,
    country,
    category: category || googlePlace?.primaryType,
    rating: finalRating,
    userRatingCount: finalUserRatingCount,
    description: finalDescription,
    averageExpense: finalAverageExpense,
    tags: finalTags,
    tips: finalTips,
    formattedAddress: finalAddress,
    lat: finalLat,
    lng: finalLng,
    photos: finalPhotos,
    openingHours: {
      todayHours,
      openNow: googlePlace?.openNow,
      weekdayDescriptions,
    },
    website: googlePlace?.website,
    source: googlePlace ? 'hybrid' : 'fallback',
  };

  memoryCache.set(key, result);

  // 4. Salva na tabela centralizada `places` de forma assíncrona.
  // Sem resposta do Google não persistimos: o fallback tem horários inventados
  // e marcá-lo como 'full' impediria novas tentativas.
  if (!googlePlace) return result;

  void (async () => {
    try {
      incrementApiCounter('google_places', 1).catch(() => {});
      await upsertPlace({
        name: result.name,
        city: result.city || undefined,
        country: result.country || undefined,
        formatted_address: result.formattedAddress,
        latitude: result.lat,
        longitude: result.lng,
        opening_hours: result.openingHours,
        photos: result.photos,
        cover_photo_url: result.photos?.[0] || undefined,
        short_description: result.description,
        average_expense: result.averageExpense,
        tags: result.tags,
        ai_tips: result.tips,
        category: result.category || undefined,
        rating: result.rating || undefined,
        user_ratings_total: result.userRatingCount || undefined,
        website: result.website || undefined,
        google_place_id: googlePlace.id || undefined,
        enrichment_level: 'full',
      });

      // Troca as URLs do Google por fotos permanentes no Storage
      if (googlePlace.id && googlePlace.photoNames.length > 0) {
        await persistPlacePhotos(googlePlace.id, googlePlace.photoNames);
      }
    } catch (e) {
      console.warn('[placeDetails] Failed to persist to places table:', e);
    }
  })();

  return result;
}
