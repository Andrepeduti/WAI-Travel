/**
 * Places API integration using OpenStreetMap Overpass API.
 * Fetches real POIs (restaurants, cafes, tourist spots, etc.) for any city.
 */

import type { CityPlace } from '@/data/cityRecommendations';
import { estimatedPriceFor } from '@/lib/paidAttractions';
import { fetchAiPlacesForCity } from '@/lib/aiPlaceRecommendations';
import { searchGooglePlacesAutocomplete, getGooglePlaceDetails } from '@/lib/googlePlacesApi';

// ─── OSM Tag → App Category mapping ─────────────────────────────────────────

const osmCategoryMap: Record<string, { category: string; categoryColor: string; image: string }> = {
  // Tourism
  museum:          { category: 'Museu',            categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=300' },
  attraction:      { category: 'Ponto Turístico',  categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300' },
  viewpoint:       { category: 'Mirante',           categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300' },
  gallery:         { category: 'Galeria',           categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=300' },
  zoo:             { category: 'Zoológico',         categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=300' },
  aquarium:        { category: 'Aquário',           categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300' },
  artwork:         { category: 'Arte',              categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300' },
  theme_park:      { category: 'Parque Temático',   categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300' },
  information:     { category: 'Informação',        categoryColor: '#6B7280', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300' },
  // Amenity
  restaurant:      { category: 'Restaurante',       categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300' },
  cafe:            { category: 'Cafeteria',          categoryColor: '#92400E', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300' },
  bar:             { category: 'Bar',                categoryColor: '#7C3AED', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=300' },
  pub:             { category: 'Pub',                categoryColor: '#7C3AED', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300' },
  fast_food:       { category: 'Fast Food',          categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=300' },
  ice_cream:       { category: 'Sorveteria',         categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300' },
  nightclub:       { category: 'Balada',             categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=300' },
  theatre:         { category: 'Teatro',             categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=300' },
  cinema:          { category: 'Cinema',             categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300' },
  library:         { category: 'Biblioteca',         categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300' },
  place_of_worship:{ category: 'Local de Culto',     categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=300' },
  marketplace:     { category: 'Mercado',            categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300' },
  // Historic
  monument:        { category: 'Monumento',          categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300' },
  castle:          { category: 'Castelo',            categoryColor: '#DC2626', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=300' },
  memorial:        { category: 'Memorial',           categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300' },
  ruins:           { category: 'Ruínas',             categoryColor: '#EF4444', image: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=300' },
  archaeological_site: { category: 'Sítio Arqueológico', categoryColor: '#EF4444', image: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=300' },
  church:          { category: 'Igreja',             categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=300' },
  fort:            { category: 'Fortaleza',          categoryColor: '#DC2626', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=300' },
  // Leisure
  park:            { category: 'Parque',             categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=300' },
  garden:          { category: 'Jardim',             categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=300' },
  nature_reserve:  { category: 'Reserva Natural',    categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300' },
  stadium:         { category: 'Estádio',            categoryColor: '#EF4444', image: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=300' },
  beach:           { category: 'Praia',              categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300' },
  // Shop
  mall:            { category: 'Shopping',           categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555992643-0ab5a39ab10a?w=300' },
  // Building types
  cathedral:       { category: 'Catedral',           categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=300' },
  mosque:          { category: 'Mesquita',           categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=300' },
  synagogue:       { category: 'Sinagoga',           categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=300' },
  temple:          { category: 'Templo',             categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=300' },
  // Neighbourhoods / streets / squares
  neighbourhood:   { category: 'Bairro',             categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300' },
  quarter:         { category: 'Bairro',             categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300' },
  suburb:          { category: 'Bairro',             categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300' },
  square:          { category: 'Praça',              categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=300' },
  pedestrian:      { category: 'Calçadão',           categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=300' },
};

const defaultCategory = { category: 'Local', categoryColor: '#6B7280', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300' };

function getOsmCategory(tags: Record<string, string>) {
  if (tags.tourism && osmCategoryMap[tags.tourism]) return osmCategoryMap[tags.tourism];
  if (tags.historic && osmCategoryMap[tags.historic]) return osmCategoryMap[tags.historic];
  if (tags.amenity && osmCategoryMap[tags.amenity]) return osmCategoryMap[tags.amenity];
  if (tags.leisure && osmCategoryMap[tags.leisure]) return osmCategoryMap[tags.leisure];
  if (tags.building && osmCategoryMap[tags.building]) return osmCategoryMap[tags.building];
  if (tags.shop && osmCategoryMap[tags.shop]) return osmCategoryMap[tags.shop];
  if (tags.place && osmCategoryMap[tags.place]) return osmCategoryMap[tags.place];
  if (tags.highway && osmCategoryMap[tags.highway]) return osmCategoryMap[tags.highway];
  // Special: place_of_worship with religion
  if (tags.amenity === 'place_of_worship') {
    if (tags.religion === 'christian') return osmCategoryMap['church'];
    if (tags.religion === 'muslim') return osmCategoryMap['mosque'];
    if (tags.religion === 'buddhist' || tags.religion === 'shinto') return osmCategoryMap['temple'];
    return osmCategoryMap['place_of_worship'];
  }
  return defaultCategory;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const cityCache = new Map<string, { places: CityPlace[]; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 min

// ─── Priority for sorting ────────────────────────────────────────────────────

const priorityOrder: Record<string, number> = {
  'Ponto Turístico': 1, 'Museu': 2, 'Monumento': 3, 'Castelo': 4,
  'Mirante': 5, 'Igreja': 6, 'Catedral': 6, 'Templo': 6, 'Fortaleza': 6,
  'Ruínas': 7, 'Sítio Arqueológico': 7, 'Parque': 8, 'Jardim': 8,
  'Experiência': 9, 'Praia': 10, 'Restaurante': 11, 'Cafeteria': 12,
  'Mercado': 13, 'Bar': 14, 'Pub': 14, 'Bairro': 15, 'Praça': 9, 'Calçadão': 10,
};

// ─── Wikidata + Wikipedia enrichment (zero-cost, no API key) ────────────────

type WikiPlace = CityPlace & { _wikidata?: string; _wikipedia?: string };

const wikiImageCache = new Map<string, { image?: string; description?: string }>();

/** Build a thumbnail URL from a Wikimedia Commons file name. */
function commonsThumb(fileName: string, width = 400): string {
  const clean = fileName.replace(/^File:/i, '').replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=${width}`;
}

/** Fetch images (P18) for up to 50 Wikidata IDs in a single call. */
async function fetchWikidataImages(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=claims&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, string> = {};
    for (const id of ids) {
      const claims = data?.entities?.[id]?.claims?.P18;
      const file = claims?.[0]?.mainsnak?.datavalue?.value;
      if (file) result[id] = commonsThumb(file, 400);
    }
    return result;
  } catch {
    return {};
  }
}

/** Fetch Wikipedia summary (extract + thumbnail) for a single article. */
async function fetchWikipediaSummary(wikipediaTag: string): Promise<{ image?: string; description?: string } | null> {
  // Tag format: "pt:Torre Eiffel" or "en:Eiffel_Tower"
  const [lang, ...rest] = wikipediaTag.split(':');
  const title = rest.join(':');
  if (!lang || !title) return null;
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const description = typeof data?.extract === 'string' ? data.extract : undefined;
    const image = data?.thumbnail?.source as string | undefined;
    return { image, description };
  } catch {
    return null;
  }
}

/** Enrich places that have wikidata/wikipedia tags with real photos + descriptions. */
async function enrichWithWiki(places: WikiPlace[]): Promise<void> {
  // Collect unique Wikidata IDs
  const wikidataIds = new Set<string>();
  for (const p of places) {
    if (p._wikidata && /^Q\d+$/.test(p._wikidata) && !wikiImageCache.has(p._wikidata)) {
      wikidataIds.add(p._wikidata);
    }
  }
  // Batch Wikidata image fetch (50 IDs per call)
  const idArray = Array.from(wikidataIds);
  const wikidataImages: Record<string, string> = {};
  for (let i = 0; i < idArray.length; i += 50) {
    const chunk = idArray.slice(i, i + 50);
    const imgs = await fetchWikidataImages(chunk);
    Object.assign(wikidataImages, imgs);
  }

  // Parallel Wikipedia summary fetches (limit concurrency)
  const summaryTasks = places
    .filter(p => p._wikipedia && !wikiImageCache.has(p._wikipedia))
    .map(async p => {
      const summary = await fetchWikipediaSummary(p._wikipedia!);
      if (summary) wikiImageCache.set(p._wikipedia!, summary);
    });
  // Run in batches of 8 to avoid overwhelming the API
  for (let i = 0; i < summaryTasks.length; i += 8) {
    await Promise.all(summaryTasks.slice(i, i + 8));
  }

  // Apply enrichment
  for (const p of places) {
    let realImage: string | undefined;
    let description: string | undefined;

    if (p._wikidata && wikidataImages[p._wikidata]) {
      realImage = wikidataImages[p._wikidata];
      wikiImageCache.set(p._wikidata, { image: realImage });
    } else if (p._wikidata && wikiImageCache.has(p._wikidata)) {
      realImage = wikiImageCache.get(p._wikidata)?.image;
    }

    if (p._wikipedia && wikiImageCache.has(p._wikipedia)) {
      const cached = wikiImageCache.get(p._wikipedia)!;
      if (cached.description) description = cached.description;
      if (!realImage && cached.image) realImage = cached.image;
    }

    if (realImage) p.image = realImage;
    if (description) {
      // Trim to ~180 chars for clean display in lists.
      p.description = description.length > 180
        ? description.substring(0, 177).replace(/\s+\S*$/, '') + '…'
        : description;
    }
  }
}

// ─── Overpass mirrors with retry ─────────────────────────────────────────────

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function fetchOverpass(query: string): Promise<{ elements?: OverpassElement[] } | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && Array.isArray(data.elements) && data.elements.length > 0) {
        return data;
      }
      // Empty response — try next mirror in case server is overloaded.
    } catch (e) {
      console.warn('Overpass mirror failed:', endpoint, e);
    }
  }
  return null;
}

// ─── Wikipedia GeoSearch fallback (CORS-friendly, no API key) ───────────────
// Used when Overpass is blocked by CORS or unavailable. Returns notable
// TOURIST-RELEVANT places from Wikipedia within a radius of the city's center.

interface WikiGeoPage {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
}

// Words in the Wikipedia article description / extract that mark the page as a
// tourist-friendly POI. Both PT and EN included because GeoSearch may return
// articles in either language.
const TOURIST_KEYWORDS = [
  // generic
  'turístic', 'turistic', 'tourist', 'touristique', 'attraction', 'atração', 'landmark',
  'patrimôn', 'patrimon', 'heritage', 'patrimoine', 'historic', 'históric', 'historique',
  // architecture / monuments
  'monumento', 'monument', 'memorial', 'estátua', 'statue', 'obelisk', 'obélisque',
  'fortaleza', 'forte ', 'fortress', 'fort ', 'castelo', 'castle', 'château', 'chateau',
  'palácio', 'palacio', 'palace', 'palais', 'mansion', 'mansão',
  'kasbah', 'casbah', 'ksar', 'ksour', 'medina', 'médina',
  'riad', 'ryad', 'dar ', 'bab ', 'porte ',
  // museums & culture
  'museu', 'museum', 'musée', 'musee',
  'galeria', 'gallery', 'galerie',
  'centro cultural', 'cultural center', 'centre culturel',
  'teatro', 'theatre', 'theater', 'théâtre', 'opera', 'ópera', 'opéra',
  'biblioteca', 'library', 'bibliothèque',
  // religious
  'igreja', 'church', 'église', 'eglise',
  'catedral', 'cathedral', 'cathédrale', 'basílica', 'basilica', 'basilique',
  'capela', 'chapel', 'chapelle', 'mosteiro', 'monastery', 'monastère', 'convento', 'convent',
  'mesquita', 'mosque', 'mosquée', 'minaret', 'minarete',
  'sinagoga', 'synagogue', 'templo', 'temple', 'santuár', 'sanctuary', 'sanctuaire',
  'madrasa', 'madrassa', 'medersa',
  'mausoléu', 'mausoleum', 'mausolée', 'túmulo', 'tomb', 'tombeau', 'tombs',
  'zaouia', 'zawiya', 'koubba', 'qubba',
  // nature / leisure
  'parque', 'park ', 'parc ', 'jardim', 'garden', 'jardin',
  'praça', 'plaza', 'square', 'place ', 'esplanade',
  'mirante', 'viewpoint', 'observation', 'lookout', 'belveder', 'belvédère',
  'praia', 'beach', 'plage', 'cachoeira', 'waterfall', 'cascade',
  'lago', 'lake ', 'lac ', 'oasis',
  'reserva', 'reserve', 'réserve', 'natural park', 'parc national',
  // entertainment / shopping
  'mercado', 'market', 'marché', 'marche ',
  'souk', 'souq', 'souks', 'bazaar', 'bazar',
  'shopping', 'mall ', 'centre commercial',
  'hammam', 'hamam',
  'aquário', 'aquarium', 'zoológico', 'zoo ', 'jardim zoológico',
  'parque temático', 'theme park', 'amusement', 'parc d\'attractions',
  // archaeology
  'ruínas', 'ruins', 'ruines',
  'sítio arqueológico', 'archaeological site', 'site archéologique',
  'necropolis', 'necrópole', 'nécropole',
  // areas
  'bairro', 'neighbourhood', 'neighborhood', 'quartier',
  'historic center', 'centro histórico', 'old town', 'vieille ville', 'ville historique',
];

// Phrases / words that strongly indicate the page is NOT a tourist attraction
// (government bodies, schools, hospitals, generic infrastructure...).
const NON_TOURIST_BLACKLIST = [
  'prefeitura', 'câmara municipal', 'camara municipal', 'city council',
  'assembleia legislativa', 'legislative assembly', 'tribunal',
  'court of', 'ministério', 'ministry of', 'secretaria',
  'embaixada', 'embassy', 'consulado', 'consulate',
  'hospital', 'clínica', 'clinic',
  'escola ', 'school ', 'colégio', 'college', 'universidade', 'university', 'université',
  'departamento', 'department of',
  'aeroporto', 'airport', 'aéroport',
  'estação ferroviária', 'railway station', 'gare ferroviaire',
  'rodoviária', 'bus station', 'metro station', 'estação de metrô', 'station de métro',
  'companhia', 'company', 'corporation',
  'cemitério', 'cemetery', 'cimetière',
  'lista de', 'list of', 'liste de',
];

function classifyTouristPlace(
  title: string,
  description: string | undefined,
  extract: string | undefined,
): { keep: boolean; category: string; categoryColor: string } | null {
  const haystack = `${title} ${description ?? ''} ${extract ?? ''}`.toLowerCase();

  // Reject explicit non-tourist articles
  if (NON_TOURIST_BLACKLIST.some(term => haystack.includes(term))) {
    return null;
  }

  // Map first matching keyword to a category
  const rules: Array<{ words: string[]; category: string; color: string }> = [
    { words: ['museu', 'museum', 'musée', 'musee', 'galeria', 'gallery', 'galerie'], category: 'Museu', color: '#6366F1' },
    { words: ['catedral', 'cathedral', 'cathédrale', 'basílica', 'basilica', 'basilique'], category: 'Catedral', color: '#8B5CF6' },
    { words: ['igreja', 'church', 'église', 'eglise', 'capela', 'chapel', 'chapelle'], category: 'Igreja', color: '#8B5CF6' },
    { words: ['mosteiro', 'monastery', 'monastère', 'convento', 'convent', 'santuár', 'sanctuary', 'sanctuaire'], category: 'Templo', color: '#F97316' },
    { words: ['mesquita', 'mosque', 'mosquée', 'minaret', 'minarete'], category: 'Mesquita', color: '#F97316' },
    { words: ['madrasa', 'madrassa', 'medersa'], category: 'Madrasa', color: '#F97316' },
    { words: ['zaouia', 'zawiya', 'koubba', 'qubba'], category: 'Santuário', color: '#F97316' },
    { words: ['sinagoga', 'synagogue'], category: 'Sinagoga', color: '#F97316' },
    { words: ['templo', 'temple'], category: 'Templo', color: '#F97316' },
    { words: ['mausoléu', 'mausoleum', 'mausolée', 'túmulo', 'tomb', 'tombeau', 'tombs'], category: 'Mausoléu', color: '#DC2626' },
    { words: ['kasbah', 'casbah', 'ksar', 'ksour'], category: 'Kasbah', color: '#DC2626' },
    { words: ['castelo', 'castle', 'château', 'chateau', 'fortaleza', 'fort ', 'fortress', 'forte '], category: 'Fortaleza', color: '#DC2626' },
    { words: ['palácio', 'palacio', 'palace', 'palais'], category: 'Palácio', color: '#DC2626' },
    { words: ['riad', 'ryad', 'dar '], category: 'Riad', color: '#EC4899' },
    { words: ['medina', 'médina'], category: 'Medina', color: '#F59E0B' },
    { words: ['souk', 'souq', 'souks', 'bazaar', 'bazar'], category: 'Souk', color: '#F59E0B' },
    { words: ['hammam', 'hamam'], category: 'Hammam', color: '#F97316' },
    { words: ['bab ', 'porte ', 'gate '], category: 'Portão', color: '#10B981' },
    { words: ['monumento', 'monument', 'memorial', 'obelisk', 'obélisque', 'estátua', 'statue'], category: 'Monumento', color: '#10B981' },
    { words: ['teatro', 'theatre', 'theater', 'théâtre', 'opera', 'ópera', 'opéra'], category: 'Teatro', color: '#8B5CF6' },
    { words: ['biblioteca', 'library', 'bibliothèque'], category: 'Biblioteca', color: '#6366F1' },
    { words: ['mirante', 'viewpoint', 'lookout', 'observation', 'belveder', 'belvédère'], category: 'Mirante', color: '#0EA5E9' },
    { words: ['praia', 'beach', 'plage'], category: 'Praia', color: '#0EA5E9' },
    { words: ['oasis'], category: 'Oásis', color: '#22C55E' },
    { words: ['cachoeira', 'waterfall', 'cascade', 'lago', 'lake ', 'lac '], category: 'Natureza', color: '#22C55E' },
    { words: ['parque temático', 'theme park', 'amusement', 'parc d\'attractions'], category: 'Parque Temático', color: '#EC4899' },
    { words: ['parque', 'park ', 'parc '], category: 'Parque', color: '#22C55E' },
    { words: ['jardim', 'garden', 'jardin'], category: 'Jardim', color: '#22C55E' },
    { words: ['praça', 'plaza', 'square', 'place ', 'esplanade'], category: 'Praça', color: '#10B981' },
    { words: ['mercado', 'market', 'marché', 'marche '], category: 'Mercado', color: '#F59E0B' },
    { words: ['shopping', 'mall ', 'centre commercial'], category: 'Shopping', color: '#F59E0B' },
    { words: ['aquário', 'aquarium'], category: 'Aquário', color: '#0EA5E9' },
    { words: ['zoológico', 'zoo ', 'jardim zoológico'], category: 'Zoológico', color: '#22C55E' },
    { words: ['ruínas', 'ruins', 'ruines', 'sítio arqueológico', 'archaeological site', 'site archéologique', 'necropolis', 'necrópole', 'nécropole'], category: 'Sítio Histórico', color: '#DC2626' },
    { words: ['centro histórico', 'historic center', 'old town', 'vieille ville', 'ville historique'], category: 'Centro Histórico', color: '#EC4899' },
    { words: ['bairro', 'neighbourhood', 'neighborhood', 'quartier'], category: 'Bairro', color: '#EC4899' },
    { words: ['centro cultural', 'cultural center', 'centre culturel'], category: 'Centro Cultural', color: '#6366F1' },
  ];

  for (const rule of rules) {
    if (rule.words.some(w => haystack.includes(w))) {
      return { keep: true, category: rule.category, categoryColor: rule.color };
    }
  }

  // Fallback: keep only if any generic tourist keyword appears
  if (TOURIST_KEYWORDS.some(term => haystack.includes(term))) {
    return { keep: true, category: 'Ponto Turístico', categoryColor: '#10B981' };
  }

  return null;
}

async function fetchWikipediaNearby(
  lat: number,
  lng: number,
  cityKey: string,
): Promise<CityPlace[]> {
  // Start with PT only for speed; fall back to EN if too few results.
  const seen = new Set<string>();
  const all: Array<WikiGeoPage & { _lang: string }> = [];

  async function geosearch(lang: string) {
    try {
      const url =
        `https://${lang}.wikipedia.org/w/api.php` +
        `?action=query&list=geosearch&gsradius=10000&gscoord=${lat}%7C${lng}` +
        `&gslimit=50&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const pages: WikiGeoPage[] = data?.query?.geosearch || [];
      for (const p of pages) {
        const key = p.title.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        all.push({ ...p, _lang: lang });
      }
    } catch {
      // ignore
    }
  }

  // Run PT and EN geosearch in parallel — both are fast (single request each).
  // Run multiple Wikipedia languages in parallel for global coverage (esp. Maghreb/francophone).
  await Promise.all([geosearch('pt'), geosearch('en'), geosearch('fr'), geosearch('es')]);

  if (all.length === 0) return [];

  // Sort by distance BEFORE enriching so we process the closest (most
  // relevant) POIs first. This lets us limit enrichment to ~25 candidates,
  // which dramatically reduces total fetch time.
  all.sort((a, b) => a.dist - b.dist);
  const candidates = all.slice(0, 25);

  // Use Wikipedia's batch query API to fetch extracts + descriptions +
  // thumbnails for many pages in a single request, grouped by language.
  const byLang = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const arr = byLang.get(c._lang) ?? [];
    arr.push(c);
    byLang.set(c._lang, arr);
  }

  type PageInfo = {
    pageid: number;
    title: string;
    extract?: string;
    description?: string;
    thumbnail?: { source: string };
    pageprops?: { disambiguation?: string };
  };
  const infoByKey = new Map<string, PageInfo>();

  await Promise.all(
    Array.from(byLang.entries()).map(async ([lang, pages]) => {
      const ids = pages.map(p => p.pageid).join('|');
      try {
        const url =
          `https://${lang}.wikipedia.org/w/api.php` +
          `?action=query&prop=extracts|pageimages|description|pageprops` +
          `&exintro=1&explaintext=1&exlimit=50&piprop=thumbnail&pithumbsize=400&pilimit=50` +
          `&pageids=${ids}&format=json&origin=*&redirects=1`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const pagesObj = data?.query?.pages || {};
        for (const k of Object.keys(pagesObj)) {
          const info: PageInfo = pagesObj[k];
          infoByKey.set(`${lang}:${info.pageid}`, info);
        }
      } catch {
        // ignore
      }
    }),
  );

  const enriched: CityPlace[] = [];
  for (const page of candidates) {
    const info = infoByKey.get(`${page._lang}:${page.pageid}`);
    if (!info) continue;
    if (info.pageprops?.disambiguation !== undefined) continue;

    const description = info.description;
    const extract = info.extract;
    const classification = classifyTouristPlace(page.title, description, extract);
    if (!classification) continue;

    // Only use a real article thumbnail. Generic image fallbacks made the
    // recommendation cards look polished but often showed the wrong place.
    if (!info.thumbnail?.source) continue;
    const image = info.thumbnail.source;

    const desc = extract && extract.length > 180
      ? extract.substring(0, 177).replace(/\s+\S*$/, '') + '…'
      : extract || description || '';

    enriched.push({
      id: page.pageid + 500000,
      name: page.title,
      city: cityKey,
      category: classification.category,
      categoryColor: classification.categoryColor,
      image,
      rating: 0,
      price: estimatedPriceFor(page.title, cityKey),
      openHours: '',
      description: desc,
      lat: page.lat,
      lng: page.lon,
    });
  }

  // Already sorted by distance via candidates order.
  return enriched;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchPlacesForCity(cityName: string): Promise<CityPlace[]> {
  const cacheKey = cityName.toLowerCase().trim().split(',')[0].trim();
  const cached = cityCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.places;
  }

  try {
    // Run Wikipedia (monuments/attractions) and AI curation
    // (restaurants/experiences/nightlife/events) in parallel.
    const aiPromise = fetchAiPlacesForCity(cityName).catch(() => [] as CityPlace[]);

    // Geocode city for Wikipedia geosearch using Google Places API
    const googlePredictions = await searchGooglePlacesAutocomplete(cityName, ['(cities)']);
    let cityLat, cityLng;
    if (googlePredictions.length > 0) {
      const details = await getGooglePlaceDetails(googlePredictions[0].placeId);
      if (details) {
        cityLat = details.lat;
        cityLng = details.lng;
      }
    }

    let wikiPlaces: CityPlace[] = [];
    if (cityLat !== undefined && cityLng !== undefined) {
      wikiPlaces = await fetchWikipediaNearby(cityLat, cityLng, cacheKey);
    }

    const aiPlaces = await aiPromise;

    // Interleave Wikipedia + AI so the carousel mixes restaurants/experiences
    // with attractions instead of showing only monuments first.
    const merged = mergePlaces(wikiPlaces, aiPlaces);
    const interleaved = interleaveByCategory(merged);

    if (interleaved.length > 0) {
      cityCache.set(cacheKey, { places: interleaved, timestamp: Date.now() });
    }
    return interleaved;
  } catch (error) {
    console.error('Error fetching places:', error);
    // Fallback: try AI alone (it may be cached locally even without geocoding).
    try {
      return await fetchAiPlacesForCity(cityName);
    } catch {
      return [];
    }
  }
}

/**
 * Interleave places across category buckets so the result feels diverse
 * (a restaurant, then an attraction, then an experience…) instead of all
 * monuments first followed by all restaurants.
 */
function interleaveByCategory(places: CityPlace[]): CityPlace[] {
  const buckets = new Map<string, CityPlace[]>();
  const groupKey = (p: CityPlace): string => {
    const c = (p.category || '').toLowerCase();
    if (c.includes('restaurante') || c.includes('cafeteria') || c.includes('mercado')) return 'food';
    if (c.includes('vida noturna') || c.includes('bar') || c.includes('pub') || c.includes('balada')) return 'night';
    if (c.includes('experiência') || c.includes('experiencia')) return 'experience';
    if (c.includes('evento')) return 'event';
    return 'attraction';
  };
  for (const p of places) {
    const k = groupKey(p);
    const arr = buckets.get(k) ?? [];
    arr.push(p);
    buckets.set(k, arr);
  }
  const order = ['attraction', 'food', 'experience', 'night', 'event'];
  const queues = order.map((k) => buckets.get(k) ?? []);
  const out: CityPlace[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) { out.push(next); added = true; }
    }
  }
  return out;
}

export function mergePlaces(staticPlaces: CityPlace[], apiPlaces: CityPlace[]): CityPlace[] {
  const staticNames = new Set(staticPlaces.map(p => p.name.toLowerCase().trim()));
  const merged = [...staticPlaces];

  for (const apiPlace of apiPlaces) {
    const name = apiPlace.name.toLowerCase().trim();
    // Skip if we already have a similar-name static place
    if (staticNames.has(name)) continue;
    // Also check partial match (e.g. "Museu do Louvre" vs "Louvre")
    let isDuplicate = false;
    for (const sn of staticNames) {
      if (sn.includes(name) || name.includes(sn)) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      merged.push(apiPlace);
      staticNames.add(name);
    }
  }

  return merged;
}

// ─── Google Places Text Search fallback ─────────────────────────────────────

import { searchGooglePlacesText } from './googlePlacesApi';

const googleCategoryMap: Record<string, { category: string; categoryColor: string; image: string }> = {
  tourist_attraction: { category: 'Ponto Turístico', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300' },
  museum:             { category: 'Museu',       categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300' },
  park:               { category: 'Parque',           categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=300' },
  restaurant:         { category: 'Restaurante',            categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300' },
  default:            { category: 'Local',           categoryColor: '#6B7280', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300' },
};

const googleSearchCache = new Map<string, CityPlace[]>();

/**
 * Search any named place using Google Places Text Search.
 * Used as a fallback when local data yields 0 matches.
 */
export async function searchGoogleFallback(query: string, city: string): Promise<CityPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const cacheKey = `${city.toLowerCase()}::${q.toLowerCase()}`;
  const cached = googleSearchCache.get(cacheKey);
  if (cached) return cached;

  try {
    const results = await searchGooglePlacesText(q, city);

    const places: CityPlace[] = results.map(r => {
      const type = r.primaryType || 'default';
      const meta = googleCategoryMap[type] || googleCategoryMap.default;

      return {
        // Generate a random stable-ish ID
        id: Math.floor(Math.random() * 1000000) + 900000,
        name: r.name,
        city: city.toLowerCase(),
        category: meta.category,
        categoryColor: meta.categoryColor,
        image: meta.image,
        rating: 0,
        price: estimatedPriceFor(r.name, city),
        openHours: '',
        lat: r.lat,
        lng: r.lng,
        address: r.address,
      };
    });

    googleSearchCache.set(cacheKey, places);
    return places;
  } catch (e) {
    console.warn('Google search fallback failed:', e);
    return [];
  }
}

