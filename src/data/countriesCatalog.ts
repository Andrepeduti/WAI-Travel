/**
 * Continent mapping by ISO-3 code, with Portuguese names.
 * Used to show country info (flag, name, continent) when a user clicks
 * on any country on the world map — including those not yet visited.
 */

export interface CountryInfo {
  code: string; // ISO-2
  iso3: string;
  name: string; // Portuguese name
  continent: string; // matches visitedCountries continents
  flag: string; // emoji flag
  aliases?: string[]; // Alternative names or common terms (e.g. "Holanda" for "Países Baixos")
}

/** Convert ISO-2 country code (e.g. "BR") to flag emoji 🇧🇷 */
export function iso2ToFlag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '🏳️';
  const codePoints = iso2
    .toUpperCase()
    .split('')
    .map(char => 0x1f1e6 + char.charCodeAt(0) - 'A'.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🏳️';
  }
}

/**
 * Continent in Portuguese, keyed by ISO-3 code.
 * Covers the most common countries displayed on the world map.
 * Unknown ISO-3 codes fall back to "Mundo".
 */
const CONTINENT_BY_ISO3: Record<string, string> = {
  // América do Sul
  ARG: 'América do Sul', BOL: 'América do Sul', BRA: 'América do Sul', CHL: 'América do Sul',
  COL: 'América do Sul', ECU: 'América do Sul', GUY: 'América do Sul', PRY: 'América do Sul',
  PER: 'América do Sul', SUR: 'América do Sul', URY: 'América do Sul', VEN: 'América do Sul',
  // América do Norte
  CAN: 'América do Norte', USA: 'América do Norte', MEX: 'América do Norte',
  // América Central / Caribe
  BLZ: 'América Central', CRI: 'América Central', SLV: 'América Central', GTM: 'América Central',
  HND: 'América Central', NIC: 'América Central', PAN: 'América Central', CUB: 'América Central',
  DOM: 'América Central', HTI: 'América Central', JAM: 'América Central', CUW: 'América Central',
  ABW: 'América Central', BHS: 'América Central', PRI: 'América Central', TTO: 'América Central',
  SXM: 'América Central', BRB: 'América Central',
  // Europa
  ALB: 'Europa', AND: 'Europa', AUT: 'Europa', BEL: 'Europa', BGR: 'Europa', BIH: 'Europa',
  BLR: 'Europa', CHE: 'Europa', CZE: 'Europa', DEU: 'Europa', DNK: 'Europa', ESP: 'Europa',
  EST: 'Europa', FIN: 'Europa', FRA: 'Europa', GBR: 'Europa', GRC: 'Europa', HRV: 'Europa',
  HUN: 'Europa', IRL: 'Europa', ISL: 'Europa', ITA: 'Europa', LTU: 'Europa', LUX: 'Europa',
  LVA: 'Europa', MDA: 'Europa', MKD: 'Europa', MLT: 'Europa', MNE: 'Europa', NLD: 'Europa',
  NOR: 'Europa', POL: 'Europa', PRT: 'Europa', ROU: 'Europa', SRB: 'Europa', SVK: 'Europa',
  SVN: 'Europa', SWE: 'Europa', UKR: 'Europa', RUS: 'Europa',
  // Ásia
  AFG: 'Ásia', ARE: 'Ásia', ARM: 'Ásia', AZE: 'Ásia', BGD: 'Ásia', BHR: 'Ásia', BRN: 'Ásia',
  BTN: 'Ásia', CHN: 'Ásia', CYP: 'Ásia', GEO: 'Ásia', IDN: 'Ásia', IND: 'Ásia', IRN: 'Ásia',
  IRQ: 'Ásia', ISR: 'Ásia', JOR: 'Ásia', JPN: 'Ásia', KAZ: 'Ásia', KGZ: 'Ásia', KHM: 'Ásia',
  KOR: 'Ásia', PRK: 'Ásia', KWT: 'Ásia', LAO: 'Ásia', LBN: 'Ásia', LKA: 'Ásia', MMR: 'Ásia',
  MNG: 'Ásia', MYS: 'Ásia', NPL: 'Ásia', OMN: 'Ásia', PAK: 'Ásia', PHL: 'Ásia', QAT: 'Ásia',
  SAU: 'Ásia', SGP: 'Ásia', SYR: 'Ásia', THA: 'Ásia', TJK: 'Ásia', TKM: 'Ásia', TUR: 'Ásia',
  TWN: 'Ásia', UZB: 'Ásia', VNM: 'Ásia', YEM: 'Ásia', PSE: 'Ásia',
  // África
  AGO: 'África', BEN: 'África', BFA: 'África', BWA: 'África', CAF: 'África', CIV: 'África',
  CMR: 'África', COD: 'África', COG: 'África', DZA: 'África', EGY: 'África', ERI: 'África',
  ETH: 'África', GAB: 'África', GHA: 'África', GIN: 'África', GMB: 'África', GNB: 'África',
  GNQ: 'África', KEN: 'África', LBR: 'África', LBY: 'África', LSO: 'África', MAR: 'África',
  MDG: 'África', MLI: 'África', MOZ: 'África', MRT: 'África', MWI: 'África', NAM: 'África',
  NER: 'África', NGA: 'África', RWA: 'África', SDN: 'África', SEN: 'África', SLE: 'África',
  SOM: 'África', SSD: 'África', SWZ: 'África', TCD: 'África', TGO: 'África', TUN: 'África',
  TZA: 'África', UGA: 'África', ZAF: 'África', ZMB: 'África', ZWE: 'África', BDI: 'África',
  // Oceania
  AUS: 'Oceania', NZL: 'Oceania', FJI: 'Oceania', PNG: 'Oceania', SLB: 'Oceania',
  VUT: 'Oceania', WSM: 'Oceania', TON: 'Oceania',
};

/**
 * Portuguese names for the most common countries (keyed by ISO-3).
 * Falls back to the GeoJSON-provided name when missing.
 */
const PT_NAME_BY_ISO3: Record<string, string> = {
  ARG: 'Argentina', BOL: 'Bolívia', BRA: 'Brasil', CHL: 'Chile', COL: 'Colômbia',
  ECU: 'Equador', GUY: 'Guiana', PRY: 'Paraguai', PER: 'Peru', SUR: 'Suriname',
  URY: 'Uruguai', VEN: 'Venezuela',
  CAN: 'Canadá', USA: 'Estados Unidos', MEX: 'México',
  BLZ: 'Belize', CRI: 'Costa Rica', SLV: 'El Salvador', GTM: 'Guatemala',
  HND: 'Honduras', NIC: 'Nicarágua', PAN: 'Panamá', CUB: 'Cuba',
  DOM: 'República Dominicana', HTI: 'Haiti', JAM: 'Jamaica', CUW: 'Curaçao',
  ABW: 'Aruba', BHS: 'Bahamas', PRI: 'Porto Rico', TTO: 'Trinidad e Tobago',
  SXM: 'Sint Maarten', BRB: 'Barbados',
  AUT: 'Áustria', BEL: 'Bélgica', BGR: 'Bulgária', CHE: 'Suíça', CZE: 'Tchéquia',
  DEU: 'Alemanha', DNK: 'Dinamarca', ESP: 'Espanha', EST: 'Estônia', FIN: 'Finlândia',
  FRA: 'França', GBR: 'Reino Unido', GRC: 'Grécia', HRV: 'Croácia', HUN: 'Hungria',
  IRL: 'Irlanda', ISL: 'Islândia', ITA: 'Itália', LTU: 'Lituânia', LUX: 'Luxemburgo',
  LVA: 'Letônia', NLD: 'Países Baixos', NOR: 'Noruega', POL: 'Polônia', PRT: 'Portugal',
  ROU: 'Romênia', SRB: 'Sérvia', SVK: 'Eslováquia', SVN: 'Eslovênia', SWE: 'Suécia',
  UKR: 'Ucrânia', RUS: 'Rússia',
  ARE: 'Emirados Árabes Unidos', CHN: 'China', IDN: 'Indonésia', IND: 'Índia', IRN: 'Irã',
  ISR: 'Israel', JPN: 'Japão', KOR: 'Coreia do Sul', PRK: 'Coreia do Norte', MYS: 'Malásia',
  PHL: 'Filipinas', SAU: 'Arábia Saudita', SGP: 'Singapura', THA: 'Tailândia', TUR: 'Turquia',
  VNM: 'Vietnã', QAT: 'Catar',
  EGY: 'Egito', MAR: 'Marrocos', NGA: 'Nigéria', KEN: 'Quênia', ZAF: 'África do Sul',
  TUN: 'Tunísia', ETH: 'Etiópia', GHA: 'Gana', TZA: 'Tanzânia',
  AUS: 'Austrália', NZL: 'Nova Zelândia', FJI: 'Fiji',
};

/** ISO-3 → ISO-2 mapping (used to derive flag emoji via Unicode regional indicators) */
const ISO3_TO_ISO2: Record<string, string> = {
  ARG: 'AR', BOL: 'BO', BRA: 'BR', CHL: 'CL', COL: 'CO', ECU: 'EC', GUY: 'GY', PRY: 'PY',
  PER: 'PE', SUR: 'SR', URY: 'UY', VEN: 'VE',
  CAN: 'CA', USA: 'US', MEX: 'MX',
  BLZ: 'BZ', CRI: 'CR', SLV: 'SV', GTM: 'GT', HND: 'HN', NIC: 'NI', PAN: 'PA', CUB: 'CU',
  DOM: 'DO', HTI: 'HT', JAM: 'JM', CUW: 'CW', ABW: 'AW', BHS: 'BS', PRI: 'PR',
  TTO: 'TT', SXM: 'SX', BRB: 'BB',
  ALB: 'AL', AND: 'AD', AUT: 'AT', BEL: 'BE', BGR: 'BG', BIH: 'BA', BLR: 'BY', CHE: 'CH',
  CZE: 'CZ', DEU: 'DE', DNK: 'DK', ESP: 'ES', EST: 'EE', FIN: 'FI', FRA: 'FR', GBR: 'GB',
  GRC: 'GR', HRV: 'HR', HUN: 'HU', IRL: 'IE', ISL: 'IS', ITA: 'IT', LTU: 'LT', LUX: 'LU',
  LVA: 'LV', MDA: 'MD', MKD: 'MK', MLT: 'MT', MNE: 'ME', NLD: 'NL', NOR: 'NO', POL: 'PL',
  PRT: 'PT', ROU: 'RO', SRB: 'RS', SVK: 'SK', SVN: 'SI', SWE: 'SE', UKR: 'UA', RUS: 'RU',
  AFG: 'AF', ARE: 'AE', ARM: 'AM', AZE: 'AZ', BGD: 'BD', BHR: 'BH', BRN: 'BN', BTN: 'BT',
  CHN: 'CN', CYP: 'CY', GEO: 'GE', IDN: 'ID', IND: 'IN', IRN: 'IR', IRQ: 'IQ', ISR: 'IL',
  JOR: 'JO', JPN: 'JP', KAZ: 'KZ', KGZ: 'KG', KHM: 'KH', KOR: 'KR', PRK: 'KP', KWT: 'KW',
  LAO: 'LA', LBN: 'LB', LKA: 'LK', MMR: 'MM', MNG: 'MN', MYS: 'MY', NPL: 'NP', OMN: 'OM',
  PAK: 'PK', PHL: 'PH', QAT: 'QA', SAU: 'SA', SGP: 'SG', SYR: 'SY', THA: 'TH', TJK: 'TJ',
  TKM: 'TM', TUR: 'TR', TWN: 'TW', UZB: 'UZ', VNM: 'VN', YEM: 'YE', PSE: 'PS',
  AGO: 'AO', BEN: 'BJ', BFA: 'BF', BWA: 'BW', CAF: 'CF', CIV: 'CI', CMR: 'CM', COD: 'CD',
  COG: 'CG', DZA: 'DZ', EGY: 'EG', ERI: 'ER', ETH: 'ET', GAB: 'GA', GHA: 'GH', GIN: 'GN',
  GMB: 'GM', GNB: 'GW', GNQ: 'GQ', KEN: 'KE', LBR: 'LR', LBY: 'LY', LSO: 'LS', MAR: 'MA',
  MDG: 'MG', MLI: 'ML', MOZ: 'MZ', MRT: 'MR', MWI: 'MW', NAM: 'NA', NER: 'NE', NGA: 'NG',
  RWA: 'RW', SDN: 'SD', SEN: 'SN', SLE: 'SL', SOM: 'SO', SSD: 'SS', SWZ: 'SZ', TCD: 'TD',
  TGO: 'TG', TUN: 'TN', TZA: 'TZ', UGA: 'UG', ZAF: 'ZA', ZMB: 'ZM', ZWE: 'ZW', BDI: 'BI',
  AUS: 'AU', NZL: 'NZ', FJI: 'FJ', PNG: 'PG', SLB: 'SB', VUT: 'VU', WSM: 'WS', TON: 'TO',
};

/**
 * Some Natural Earth GeoJSON features have ISO codes set to "-99" (broken).
 * Map their English `name` back to the canonical ISO-3.
 */
const NAME_TO_ISO3: Record<string, string> = {
  France: 'FRA',
  Norway: 'NOR',
  Kosovo: 'XKX',
  Somaliland: 'SOM',
  'Northern Cyprus': 'CYP',
};

const NAME_TO_ISO2_FALLBACK: Record<string, string> = {
  XKX: 'XK',
};

/**
 * Build country info from GeoJSON properties.
 * `iso3` is the canonical key. `fallbackName` is the GeoJSON-provided name (English).
 * `iso2Hint` lets callers pass an ISO-2 code if known (some GeoJSONs include it).
 */
export function getCountryInfo(
  iso3: string,
  fallbackName: string,
  iso2Hint?: string,
): CountryInfo {
  // Recover ISO-3 when the GeoJSON has the broken "-99" sentinel.
  const isInvalidIso3 = !iso3 || iso3 === '-99' || iso3.length !== 3;
  const isInvalidIso2 = !iso2Hint || iso2Hint === '-99' || iso2Hint.length !== 2;
  const resolvedIso3 = isInvalidIso3
    ? (NAME_TO_ISO3[fallbackName] || iso3 || '')
    : iso3;
  const iso2Raw = isInvalidIso2 ? '' : iso2Hint || '';
  const iso2 = (
    iso2Raw ||
    ISO3_TO_ISO2[resolvedIso3] ||
    NAME_TO_ISO2_FALLBACK[resolvedIso3] ||
    ''
  ).toUpperCase();
  return {
    code: iso2 || resolvedIso3,
    iso3: resolvedIso3,
    name: PT_NAME_BY_ISO3[resolvedIso3] || fallbackName,
    continent: CONTINENT_BY_ISO3[resolvedIso3] || 'Mundo',
    flag: iso2 ? iso2ToFlag(iso2) : '🏳️',
  };
}

/**
 * Common aliases used by users when searching for countries.
 */
const ALIASES_BY_ISO3: Record<string, string[]> = {
  NLD: ['Holanda', 'Netherlands'],
  GBR: ['Inglaterra', 'Escócia', 'País de Gales', 'Irlanda do Norte', 'Grã-Bretanha', 'UK', 'United Kingdom'],
  USA: ['EUA', 'Estados Unidos da América', 'US'],
  ARE: ['Dubai', 'Abu Dhabi', 'UAE'],
  DEU: ['Germany'],
  ESP: ['Spain'],
  FRA: ['France'],
  ITA: ['Italy'],
  KOR: ['Coreia'],
  PRK: ['Coreia'],
  ZAF: ['Africa do Sul'],
};

/**
 * Full catalog of countries with a known Portuguese name.
 * Sorted alphabetically by name. Used by the "Add visited countries" search sheet.
 */
const regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

export const ALL_COUNTRIES: CountryInfo[] = Object.keys(CONTINENT_BY_ISO3)
  .map(iso3 => {
    const iso2 = (ISO3_TO_ISO2[iso3] || NAME_TO_ISO2_FALLBACK[iso3] || '').toUpperCase();
    
    let name = PT_NAME_BY_ISO3[iso3];
    if (!name && iso2) {
      try {
        name = regionNames.of(iso2) || iso3;
      } catch {
        name = iso3;
      }
    }

    return {
      code: iso2 || iso3,
      iso3,
      name: name || iso3,
      continent: CONTINENT_BY_ISO3[iso3] || 'Mundo',
      flag: iso2 ? iso2ToFlag(iso2) : '🏳️',
      aliases: ALIASES_BY_ISO3[iso3] || [],
    } as CountryInfo;
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
