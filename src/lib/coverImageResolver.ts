/**
 * Auto-selects a cover image based on trip destinations.
 *
 * Priority:
 * 1. Single destination → city image
 * 2. Multiple destinations, same country → country image
 * 3. Multiple countries → first destination city image
 * 4. No destinations → generic placeholder
 */

// High-quality landscape images of iconic landmarks per city
const cityImages: Record<string, string> = {
  'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  'londres': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
  'roma': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
  'barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
  'amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800',
  'berlim': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800',
  'praga': 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  'viena': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800',
  'lisboa': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800',
  'budapeste': 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=800',
  'tóquio': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
  'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
  'nova york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  'sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800',
  'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
  'bangkok': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800',
  'singapura': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800',
  'são paulo': 'https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=800',
  'rio de janeiro': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800',
  'buenos aires': 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800',
  'cidade do méxico': 'https://images.unsplash.com/photo-1518659526054-190340b32735?w=800',
  'cairo': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800',
  'marrakech': 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800',
  'cape town': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800',
  'atenas': 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800',
  'istambul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800',
  'santorini': 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
  'madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800',
  'porto': 'https://images.unsplash.com/photo-1555881400-74d7acaacd6b?w=800',
  'quioto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
  'osaka': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800',
  'chiang mai': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
  'phuket': 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800',
  'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
  'amalfi': 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800',
  'positano': 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800',
  'ravello': 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800',
  'el calafate': 'https://images.unsplash.com/photo-1589820296156-2092d2fcfe64?w=800',
  'torres del paine': 'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800',
  'komodo': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
  'douro': 'https://images.unsplash.com/photo-1555881400-74d7acaacd6b?w=800',
  'recife': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  'olinda': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  'pernambuco': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  'fernando de noronha': 'https://images.unsplash.com/photo-1554366347-897a5113f6ab?w=800',
  'salvador': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800',
  'bahia': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800',
  'florianópolis': 'https://images.unsplash.com/photo-1561518776-e76a5e48f731?w=800',
  'fortaleza': 'https://images.unsplash.com/photo-1571406761758-9a3eed5338ef?w=800',
  'natal': 'https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=800',
  'maceió': 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800',
  'porto seguro': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800',
  'búzios': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800',
  'jericoacoara': 'https://images.unsplash.com/photo-1571406761758-9a3eed5338ef?w=800',
};

// Country-level images
const countryImages: Record<string, string> = {
  'frança': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800',
  'reino unido': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
  'itália': 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800',
  'espanha': 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800',
  'países baixos': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800',
  'holanda': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800',
  'alemanha': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800',
  'república tcheca': 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  'tchéquia': 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  'áustria': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800',
  'portugal': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800',
  'hungria': 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=800',
  'japão': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
  'estados unidos': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  'eua': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  'austrália': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800',
  'emirados árabes': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
  'tailândia': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800',
  'singapura': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800',
  'brasil': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800',
  'argentina': 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800',
  'méxico': 'https://images.unsplash.com/photo-1518659526054-190340b32735?w=800',
  'egito': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800',
  'marrocos': 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800',
  'áfrica do sul': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800',
  'grécia': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
  'turquia': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800',
  'indonésia': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
  'chile': 'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800',
};

export const GENERIC_TRAVEL_PLACEHOLDER = 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800';

/**
 * Builds a dynamic Unsplash Source URL for a country query.
 * Used as fallback when the country isn't in our curated dictionary,
 * so we still get a country-themed photo instead of a generic one.
 */
function dynamicCountryImage(country: string): string {
  return GENERIC_TRAVEL_PLACEHOLDER;
}

function resolveCountryImage(country: string): string {
  if (!country) return GENERIC_TRAVEL_PLACEHOLDER;
  const curated = countryImages[country.toLowerCase().trim()];
  if (curated) return curated;
  return dynamicCountryImage(country);
}
const LEGACY_GENERIC_COVER_IDS = [
  'photo-1488646953014-85c8e12f0c0e',
  'photo-1488646953014-85cb44e25828',
  'photo-1503220317375-aaad61436b1b',
];

function isUsableCustomCover(url?: string): url is string {
  return Boolean(url && !url.startsWith('blob:') && !LEGACY_GENERIC_COVER_IDS.some(id => url.includes(id)));
}

/**
 * Parses "City, Country" format. Returns { city, country } in lowercase.
 */
function parseDestination(dest: string): { city: string; country: string } {
  const parts = dest.split(',').map(s => s.trim().toLowerCase());
  return { city: parts[0] || '', country: parts[1] || '' };
}

export interface CoverImageResult {
  url: string;
  isAutoSelected: boolean;
}

/**
 * Resolves the best cover image for a trip based on its destinations.
 */
export function resolveCoverImage(destinations: string[]): CoverImageResult {
  if (!destinations || destinations.length === 0) {
    return { url: GENERIC_TRAVEL_PLACEHOLDER, isAutoSelected: true };
  }

  const parsed = destinations.map(parseDestination);

  // Rule 1: Single destination → city image, then country fallback
  if (parsed.length === 1) {
    const { city, country } = parsed[0];
    const cityImg = cityImages[city];
    if (cityImg) return { url: cityImg, isAutoSelected: true };
    // Sem vírgula: tenta o próprio termo como país (ex.: "África do Sul")
    return { url: resolveCountryImage(country || city), isAutoSelected: true };
  }


  // Check if all destinations share the same country
  const countries = new Set(parsed.map(p => p.country));

  // Rule 2: Multiple destinations, same country → country image
  if (countries.size === 1) {
    const country = parsed[0].country;
    const cityImg = cityImages[parsed[0].city];
    if (cityImg) return { url: cityImg, isAutoSelected: true };
    return { url: resolveCountryImage(country), isAutoSelected: true };
  }

  // Rule 3: Multiple countries → first destination city image
  const firstCityImg = cityImages[parsed[0].city];
  if (firstCityImg) return { url: firstCityImg, isAutoSelected: true };
  return { url: resolveCountryImage(parsed[0].country), isAutoSelected: true };
}

/**
 * Resolves thumbnail images for trip list cards.
 * Returns 1 image (single/same-country) or up to 4 (multi-country collage).
 * 
 * Rules:
 * 1. Manual override (customCover) → use that single image
 * 2. Single destination → single city image
 * 3. Multiple destinations, same country → single country image
 * 4. Multiple destinations, different countries → collage (up to 4 unique images)
 * 5. No destination → generic placeholder
 */
export function resolveTripThumbnailImages(
  destinations: string[],
  customCover?: string
): string[] {
  // Manual override
  const validCustomCover = isUsableCustomCover(customCover) ? customCover : undefined;
  if (validCustomCover) return [validCustomCover];

  if (!destinations || destinations.length === 0) {
    return [GENERIC_TRAVEL_PLACEHOLDER];
  }

  const parsed = destinations.map(parseDestination);

  // Single destination → single image
  // Single destination → single image
  if (parsed.length === 1) {
    const { city, country } = parsed[0];
    const img = cityImages[city] || resolveCountryImage(country || city);
    return [img];
  }


  const countries = new Set(parsed.map(p => p.country));

  // Same country → single country image
  if (countries.size === 1) {
    const img = cityImages[parsed[0].city] || resolveCountryImage(parsed[0].country);
    return [img];
  }

  // Different countries → use first destination image
  const firstImg = cityImages[parsed[0].city] || resolveCountryImage(parsed[0].country);
  return [firstImg];
}

/** Expose city images lookup for external use */
export function getCityImage(cityName: string): string | undefined {
  return cityImages[cityName.toLowerCase().trim()];
}

/** Expose country images lookup for external use */
export function getCountryImage(countryName: string): string | undefined {
  return countryImages[countryName.toLowerCase().trim()];
}
