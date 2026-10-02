/**
 * Comprehensive country & destination resolution utility.
 * Maps cities, islands, states, regions, and country names/aliases (in multiple languages/ISOs)
 * to standard Portuguese country names.
 */

import { ALL_COUNTRIES, type CountryInfo } from '@/data/countriesCatalog';

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common country name translations, aliases, ISO-2, ISO-3 codes to pt-BR Country Name
 */
export const COUNTRY_ALIASES: Record<string, string> = {
  // Espanha
  espanha: 'Espanha',
  spain: 'Espanha',
  espana: 'Espanha',
  es: 'Espanha',
  esp: 'Espanha',

  // França
  franca: 'França',
  frança: 'França',
  france: 'França',
  fr: 'França',
  fra: 'França',

  // Itália
  italia: 'Itália',
  itália: 'Itália',
  italy: 'Itália',
  it: 'Itália',
  ita: 'Itália',

  // Reino Unido
  'reino unido': 'Reino Unido',
  'united kingdom': 'Reino Unido',
  uk: 'Reino Unido',
  gb: 'Reino Unido',
  gbr: 'Reino Unido',
  'great britain': 'Reino Unido',
  'gra bretanha': 'Reino Unido',
  'grã-bretanha': 'Reino Unido',
  inglaterra: 'Reino Unido',
  england: 'Reino Unido',
  escocia: 'Reino Unido',
  escócia: 'Reino Unido',
  scotland: 'Reino Unido',
  'pais de gales': 'Reino Unido',
  'país de gales': 'Reino Unido',
  wales: 'Reino Unido',
  'irlanda do norte': 'Reino Unido',
  'northern ireland': 'Reino Unido',

  // Portugal
  portugal: 'Portugal',
  pt: 'Portugal',
  prt: 'Portugal',

  // Alemanha
  alemanha: 'Alemanha',
  germany: 'Alemanha',
  deutschland: 'Alemanha',
  de: 'Alemanha',
  deu: 'Alemanha',

  // Estados Unidos
  'estados unidos': 'Estados Unidos',
  'estados unidos da america': 'Estados Unidos',
  'united states': 'Estados Unidos',
  'united states of america': 'Estados Unidos',
  usa: 'Estados Unidos',
  us: 'Estados Unidos',
  eua: 'Estados Unidos',

  // Holanda / Países Baixos
  'paises baixos': 'Países Baixos',
  'países baixos': 'Países Baixos',
  netherlands: 'Países Baixos',
  holanda: 'Países Baixos',
  holland: 'Países Baixos',
  nl: 'Países Baixos',
  nld: 'Países Baixos',

  // Bélgica
  belgica: 'Bélgica',
  bélgica: 'Bélgica',
  belgium: 'Bélgica',
  be: 'Bélgica',
  bel: 'Bélgica',

  // Suíça
  suica: 'Suíça',
  suíça: 'Suíça',
  switzerland: 'Suíça',
  schweiz: 'Suíça',
  ch: 'Suíça',
  che: 'Suíça',

  // Áustria
  austria: 'Áustria',
  áustria: 'Áustria',
  at: 'Áustria',
  aut: 'Áustria',

  // República Tcheca
  'republica tcheca': 'República Tcheca',
  'república tcheca': 'República Tcheca',
  czechia: 'República Tcheca',
  'czech republic': 'República Tcheca',
  cz: 'República Tcheca',
  cze: 'República Tcheca',

  // Grécia
  grecia: 'Grécia',
  grécia: 'Grécia',
  greece: 'Grécia',
  gr: 'Grécia',
  grc: 'Grécia',

  // Irlanda
  irlanda: 'Irlanda',
  ireland: 'Irlanda',
  ie: 'Irlanda',
  irl: 'Irlanda',

  // Hungria
  hungria: 'Hungria',
  hungary: 'Hungria',
  hu: 'Hungria',
  hun: 'Hungria',

  // Polônia
  polonia: 'Polônia',
  polônia: 'Polônia',
  poland: 'Polônia',
  pl: 'Polônia',
  pol: 'Polônia',

  // Croácia
  croacia: 'Croácia',
  croácia: 'Croácia',
  croatia: 'Croácia',
  hr: 'Croácia',
  hrv: 'Croácia',

  // Turquia
  turquia: 'Turquia',
  turkey: 'Turquia',
  tr: 'Turquia',
  tur: 'Turquia',

  // Suécia
  suecia: 'Suécia',
  suécia: 'Suécia',
  sweden: 'Suécia',
  se: 'Suécia',
  swe: 'Suécia',

  // Noruega
  noruega: 'Noruega',
  norway: 'Noruega',
  no: 'Noruega',
  nor: 'Noruega',

  // Dinamarca
  dinamarca: 'Dinamarca',
  denmark: 'Dinamarca',
  dk: 'Dinamarca',
  dnk: 'Dinamarca',

  // Finlândia
  finlandia: 'Finlândia',
  finlândia: 'Finlândia',
  finland: 'Finlândia',
  fi: 'Finlândia',
  fin: 'Finlândia',

  // Islândia
  islandia: 'Islândia',
  islândia: 'Islândia',
  iceland: 'Islândia',
  is: 'Islândia',
  isl: 'Islândia',

  // Brasil
  brasil: 'Brasil',
  brazil: 'Brasil',
  br: 'Brasil',
  bra: 'Brasil',

  // Argentina
  argentina: 'Argentina',
  ar: 'Argentina',
  arg: 'Argentina',

  // Chile
  chile: 'Chile',
  cl: 'Chile',
  chl: 'Chile',

  // Peru
  peru: 'Peru',
  pe: 'Peru',
  per: 'Peru',

  // Colômbia
  colombia: 'Colômbia',
  colômbia: 'Colômbia',
  co: 'Colômbia',
  col: 'Colômbia',

  // Uruguai
  uruguai: 'Uruguai',
  uruguay: 'Uruguai',
  uy: 'Uruguai',
  ury: 'Uruguai',

  // México
  mexico: 'México',
  méxico: 'México',
  mx: 'México',
  mex: 'México',

  // Canadá
  canada: 'Canadá',
  canadá: 'Canadá',
  ca: 'Canadá',
  can: 'Canadá',

  // Japão
  japao: 'Japão',
  japão: 'Japão',
  japan: 'Japão',
  jp: 'Japão',
  jpn: 'Japão',

  // Tailândia
  tailandia: 'Tailândia',
  tailândia: 'Tailândia',
  thailand: 'Tailândia',
  th: 'Tailândia',
  tha: 'Tailândia',

  // Indonésia
  indonesia: 'Indonésia',
  indonésia: 'Indonésia',
  id: 'Indonésia',
  idn: 'Indonésia',

  // Emirados Árabes
  'emirados arabes': 'Emirados Árabes',
  'emirados árabes': 'Emirados Árabes',
  'emirados arabes unidos': 'Emirados Árabes',
  'emirados árabes unidos': 'Emirados Árabes',
  uae: 'Emirados Árabes',
  ae: 'Emirados Árabes',
  are: 'Emirados Árabes',

  // Austrália
  australia: 'Austrália',
  austrália: 'Austrália',
  au: 'Austrália',
  aus: 'Austrália',

  // Nova Zelândia
  'nova zelandia': 'Nova Zelândia',
  'nova zelândia': 'Nova Zelândia',
  'new zealand': 'Nova Zelândia',
  nz: 'Nova Zelândia',
  nzl: 'Nova Zelândia',

  // África do Sul
  'africa do sul': 'África do Sul',
  'áfrica do sul': 'África do Sul',
  'south africa': 'África do Sul',
  za: 'África do Sul',
  zaf: 'África do Sul',

  // Marrocos
  marrocos: 'Marrocos',
  morocco: 'Marrocos',
  ma: 'Marrocos',
  mar: 'Marrocos',

  // Egito
  egito: 'Egito',
  egypt: 'Egito',
  eg: 'Egito',
  egy: 'Egito',

  // Catar
  catar: 'Catar',
  qatar: 'Catar',
  qa: 'Catar',
  qat: 'Catar',

  // Arábia Saudita
  'arabia saudita': 'Arábia Saudita',
  'arábia saudita': 'Arábia Saudita',
  'saudi arabia': 'Arábia Saudita',
  sa: 'Arábia Saudita',
  sau: 'Arábia Saudita',

  // Singapura
  singapura: 'Singapura',
  singapore: 'Singapura',
  sg: 'Singapura',
  sgp: 'Singapura',

  // Coreia do Sul
  'coreia do sul': 'Coreia do Sul',
  'coreia': 'Coreia do Sul',
  'south korea': 'Coreia do Sul',
  kr: 'Coreia do Sul',
  kor: 'Coreia do Sul',

  // China
  china: 'China',
  cn: 'China',
  chn: 'China',
  'hong kong': 'Hong Kong',
  hk: 'Hong Kong',
  hkg: 'Hong Kong',
  macau: 'Macau',

  // Vietnã
  vietna: 'Vietnã',
  vietnã: 'Vietnã',
  vietnam: 'Vietnã',
  vn: 'Vietnã',
  vnm: 'Vietnã',

  // Filipinas
  filipinas: 'Filipinas',
  philippines: 'Filipinas',
  ph: 'Filipinas',
  phl: 'Filipinas',

  // Maldivas
  maldivas: 'Maldivas',
  maldives: 'Maldivas',
  mv: 'Maldivas',
  mdv: 'Maldivas',

  // Costa Rica
  'costa rica': 'Costa Rica',
  cr: 'Costa Rica',
  cri: 'Costa Rica',

  // Cuba
  cuba: 'Cuba',
  cu: 'Cuba',
  cub: 'Cuba',

  // República Dominicana
  'republica dominicana': 'República Dominicana',
  'república dominicana': 'República Dominicana',
  'dominican republic': 'República Dominicana',
  do: 'República Dominicana',
  dom: 'República Dominicana',
};

/**
 * City, Island, Region & Destination to Country mapping (pt-BR)
 */
export const CITY_TO_COUNTRY: Record<string, string> = {
  // Espanha
  ibiza: 'Espanha',
  'eivissa': 'Espanha',
  'dalt vila': 'Espanha',
  menorca: 'Espanha',
  mallorca: 'Espanha',
  maiorca: 'Espanha',
  'palma de maiorca': 'Espanha',
  'palma de mallorca': 'Espanha',
  palma: 'Espanha',
  formentera: 'Espanha',
  tenerife: 'Espanha',
  'gran canaria': 'Espanha',
  lanzarote: 'Espanha',
  fuerteventura: 'Espanha',
  madri: 'Espanha',
  madrid: 'Espanha',
  barcelona: 'Espanha',
  sevilha: 'Espanha',
  sevilla: 'Espanha',
  valencia: 'Espanha',
  valência: 'Espanha',
  granada: 'Espanha',
  malaga: 'Espanha',
  málaga: 'Espanha',
  bilbao: 'Espanha',
  bilbau: 'Espanha',
  'san sebastian': 'Espanha',
  'san sebastián': 'Espanha',
  donostia: 'Espanha',
  toledo: 'Espanha',
  cordoba: 'Espanha',
  córdoba: 'Espanha',
  salamanca: 'Espanha',
  'santiago de compostela': 'Espanha',
  alicante: 'Espanha',
  zaragoza: 'Espanha',
  saragoça: 'Espanha',
  marbella: 'Espanha',
  ronda: 'Espanha',
  segovia: 'Espanha',
  segóvia: 'Espanha',
  cadiz: 'Espanha',
  cádiz: 'Espanha',
  girona: 'Espanha',
  gerona: 'Espanha',
  'costa brava': 'Espanha',
  'costa del sol': 'Espanha',
  baleares: 'Espanha',
  'ilhas baleares': 'Espanha',
  canarias: 'Espanha',
  'ilhas canarias': 'Espanha',
  'ilhas canárias': 'Espanha',

  // França
  paris: 'França',
  nice: 'França',
  lyon: 'França',
  marseille: 'França',
  marselha: 'França',
  bordeaux: 'França',
  strasbourg: 'França',
  estrasburgo: 'França',
  toulouse: 'França',
  cannes: 'França',
  monaco: 'Mônaco',
  mônaco: 'Mônaco',
  versailles: 'França',
  versalhes: 'França',
  avignon: 'França',
  'aix-en-provence': 'França',
  'aix en provence': 'França',
  lille: 'França',
  montpellier: 'França',
  rouen: 'França',
  chamonix: 'França',
  'saint tropez': 'França',
  'saint-tropez': 'França',
  normandia: 'França',
  provence: 'França',
  provença: 'França',
  alsacia: 'França',
  alsácia: 'França',
  'vale do loire': 'França',
  'cote d azur': 'França',
  'côte d azur': 'França',
  'costa azul': 'França',
  'riviera francesa': 'França',

  // Itália
  roma: 'Itália',
  rome: 'Itália',
  veneza: 'Itália',
  venice: 'Itália',
  florenca: 'Itália',
  florença: 'Itália',
  florence: 'Itália',
  firenze: 'Itália',
  milao: 'Itália',
  milão: 'Itália',
  milan: 'Itália',
  milano: 'Itália',
  napoles: 'Itália',
  nápoles: 'Itália',
  naples: 'Itália',
  napoli: 'Itália',
  pisa: 'Itália',
  verona: 'Itália',
  bologna: 'Itália',
  bolonha: 'Itália',
  turin: 'Itália',
  torino: 'Itália',
  turim: 'Itália',
  palermo: 'Itália',
  catania: 'Itália',
  catânia: 'Itália',
  genoa: 'Itália',
  genova: 'Itália',
  gênova: 'Itália',
  siena: 'Itália',
  'san gimignano': 'Itália',
  lucca: 'Itália',
  capri: 'Itália',
  positano: 'Itália',
  amalfi: 'Itália',
  'costa amalfitana': 'Itália',
  ravello: 'Itália',
  sorrento: 'Itália',
  como: 'Itália',
  'lago di como': 'Itália',
  'lake como': 'Itália',
  garda: 'Itália',
  'cinque terre': 'Itália',
  taormina: 'Itália',
  sicilia: 'Itália',
  sicília: 'Itália',
  sicily: 'Itália',
  sardinia: 'Itália',
  sardenha: 'Itália',
  toscana: 'Itália',
  tuscany: 'Itália',
  puglia: 'Itália',
  bari: 'Itália',
  lecce: 'Itália',
  matera: 'Itália',

  // Reino Unido
  londres: 'Reino Unido',
  london: 'Reino Unido',
  edimburgo: 'Reino Unido',
  edinburgh: 'Reino Unido',
  manchester: 'Reino Unido',
  liverpool: 'Reino Unido',
  oxford: 'Reino Unido',
  cambridge: 'Reino Unido',
  bath: 'Reino Unido',
  bristol: 'Reino Unido',
  birmingham: 'Reino Unido',
  glasgow: 'Reino Unido',
  belfast: 'Reino Unido',
  cardiff: 'Reino Unido',
  york: 'Reino Unido',
  stonehenge: 'Reino Unido',
  cotswolds: 'Reino Unido',

  // Portugal
  lisboa: 'Portugal',
  lisbon: 'Portugal',
  porto: 'Portugal',
  sintra: 'Portugal',
  cascais: 'Portugal',
  algarve: 'Portugal',
  faro: 'Portugal',
  albufeira: 'Portugal',
  lagos: 'Portugal',
  coimbra: 'Portugal',
  braga: 'Portugal',
  guimaraes: 'Portugal',
  guimarães: 'Portugal',
  evora: 'Portugal',
  évora: 'Portugal',
  funchal: 'Portugal',
  madeira: 'Portugal',
  'ilha da madeira': 'Portugal',
  acores: 'Portugal',
  açores: 'Portugal',
  azores: 'Portugal',
  'ponta delgada': 'Portugal',
  aveiro: 'Portugal',
  obidos: 'Portugal',
  óbidos: 'Portugal',
  nazare: 'Portugal',
  nazaré: 'Portugal',
  estoril: 'Portugal',
  sesimbra: 'Portugal',
  setubal: 'Portugal',
  setúbal: 'Portugal',

  // Alemanha
  berlim: 'Alemanha',
  berlin: 'Alemanha',
  munique: 'Alemanha',
  munich: 'Alemanha',
  münchen: 'Alemanha',
  frankfurt: 'Alemanha',
  hamburgo: 'Alemanha',
  hamburg: 'Alemanha',
  colonia: 'Alemanha',
  colônia: 'Alemanha',
  cologne: 'Alemanha',
  dresden: 'Alemanha',
  stuttgart: 'Alemanha',
  nuremberg: 'Alemanha',
  nürnberg: 'Alemanha',
  heidelberg: 'Alemanha',
  dusseldorf: 'Alemanha',
  düsseldorf: 'Alemanha',
  leipzig: 'Alemanha',
  baviera: 'Alemanha',

  // Países Baixos
  amsterdam: 'Países Baixos',
  amsterda: 'Países Baixos',
  amsterdã: 'Países Baixos',
  roterdam: 'Países Baixos',
  roterdã: 'Países Baixos',
  rotterdam: 'Países Baixos',
  haia: 'Países Baixos',
  'the hague': 'Países Baixos',
  'den haag': 'Países Baixos',
  utrecht: 'Países Baixos',
  maastricht: 'Países Baixos',
  eindhoven: 'Países Baixos',
  delft: 'Países Baixos',
  keukenhof: 'Países Baixos',
  'zaanse schans': 'Países Baixos',

  // Bélgica
  bruxelas: 'Bélgica',
  brussels: 'Bélgica',
  bruges: 'Bélgica',
  brugge: 'Bélgica',
  gante: 'Bélgica',
  ghent: 'Bélgica',
  antuerpia: 'Bélgica',
  antuérpia: 'Bélgica',
  antwerp: 'Bélgica',
  leuven: 'Bélgica',

  // Suíça
  zurique: 'Suíça',
  zurich: 'Suíça',
  genebra: 'Suíça',
  geneva: 'Suíça',
  lucerna: 'Suíça',
  lucerne: 'Suíça',
  berna: 'Suíça',
  bern: 'Suíça',
  interlaken: 'Suíça',
  zermatt: 'Suíça',
  basileia: 'Suíça',
  basel: 'Suíça',
  lausanne: 'Suíça',
  'st moritz': 'Suíça',
  'st. moritz': 'Suíça',
  grindelwald: 'Suíça',

  // Áustria
  viena: 'Áustria',
  vienna: 'Áustria',
  salzburgo: 'Áustria',
  salzburg: 'Áustria',
  innsbruck: 'Áustria',
  hallstatt: 'Áustria',
  graz: 'Áustria',
  linz: 'Áustria',

  // República Tcheca
  praga: 'República Tcheca',
  prague: 'República Tcheca',
  'cesky krumlov': 'República Tcheca',
  brno: 'República Tcheca',
  'karlovy vary': 'República Tcheca',

  // Grécia
  atenas: 'Grécia',
  athens: 'Grécia',
  santorini: 'Grécia',
  mykonos: 'Grécia',
  miconos: 'Grécia',
  míconos: 'Grécia',
  creta: 'Grécia',
  crete: 'Grécia',
  rodes: 'Grécia',
  rhodes: 'Grécia',
  corfu: 'Grécia',
  zakynthos: 'Grécia',
  zaquintos: 'Grécia',
  thessaloniki: 'Grécia',
  tessalonica: 'Grécia',
  tessalônica: 'Grécia',
  meteora: 'Grécia',
  milos: 'Grécia',
  naxos: 'Grécia',
  paros: 'Grécia',

  // Irlanda
  dublin: 'Irlanda',
  galway: 'Irlanda',
  cork: 'Irlanda',
  killarney: 'Irlanda',
  limerick: 'Irlanda',

  // Hungria
  budapeste: 'Hungria',
  budapest: 'Hungria',

  // Polônia
  varsovia: 'Polônia',
  varsóvia: 'Polônia',
  warsaw: 'Polônia',
  cracovia: 'Polônia',
  cracóvia: 'Polônia',
  krakow: 'Polônia',
  gdansk: 'Polônia',
  wroclaw: 'Polônia',

  // Croácia
  dubrovnik: 'Croácia',
  split: 'Croácia',
  zagreb: 'Croácia',
  hvar: 'Croácia',
  zadar: 'Croácia',
  plitvice: 'Croácia',
  rovinj: 'Croácia',
  pula: 'Croácia',

  // Turquia
  istambul: 'Turquia',
  istanbul: 'Turquia',
  capadocia: 'Turquia',
  capadócia: 'Turquia',
  cappadocia: 'Turquia',
  antalia: 'Turquia',
  antália: 'Turquia',
  antalya: 'Turquia',
  efeso: 'Turquia',
  éfeso: 'Turquia',
  ephesus: 'Turquia',
  bodrum: 'Turquia',
  pamukkale: 'Turquia',
  izmir: 'Turquia',
  ancara: 'Turquia',
  ankara: 'Turquia',

  // Suécia
  estocolmo: 'Suécia',
  stockholm: 'Suécia',
  gotemburgo: 'Suécia',
  gothenburg: 'Suécia',
  malmo: 'Suécia',
  malmö: 'Suécia',

  // Noruega
  oslo: 'Noruega',
  bergen: 'Noruega',
  tromso: 'Noruega',
  tromsø: 'Noruega',
  stavanger: 'Noruega',
  flam: 'Noruega',
  flåm: 'Noruega',
  lofoten: 'Noruega',

  // Dinamarca
  copenhague: 'Dinamarca',
  copenhagen: 'Dinamarca',
  aarhus: 'Dinamarca',

  // Finlândia
  helsinki: 'Finlândia',
  rovaniemi: 'Finlândia',
  laponia: 'Finlândia',
  lapônia: 'Finlândia',

  // Islândia
  reykjavik: 'Islândia',
  vik: 'Islândia',

  // Estados Unidos
  'nova york': 'Estados Unidos',
  'new york': 'Estados Unidos',
  nyc: 'Estados Unidos',
  orlando: 'Estados Unidos',
  miami: 'Estados Unidos',
  'los angeles': 'Estados Unidos',
  la: 'Estados Unidos',
  'san francisco': 'Estados Unidos',
  sf: 'Estados Unidos',
  'las vegas': 'Estados Unidos',
  chicago: 'Estados Unidos',
  washington: 'Estados Unidos',
  'washington dc': 'Estados Unidos',
  boston: 'Estados Unidos',
  'san diego': 'Estados Unidos',
  seattle: 'Estados Unidos',
  honolulu: 'Estados Unidos',
  hawaii: 'Estados Unidos',
  havai: 'Estados Unidos',
  havaí: 'Estados Unidos',
  austin: 'Estados Unidos',
  houston: 'Estados Unidos',
  dallas: 'Estados Unidos',
  'nova orleans': 'Estados Unidos',
  'new orleans': 'Estados Unidos',
  filadelfia: 'Estados Unidos',
  filadélfia: 'Estados Unidos',
  philadelphia: 'Estados Unidos',
  atlanta: 'Estados Unidos',
  denver: 'Estados Unidos',
  nashville: 'Estados Unidos',
  'san jose': 'Estados Unidos',
  'key west': 'Estados Unidos',
  maui: 'Estados Unidos',
  california: 'Estados Unidos',
  califórnia: 'Estados Unidos',
  florida: 'Estados Unidos',
  flórida: 'Estados Unidos',

  // Canadá
  toronto: 'Canadá',
  vancouver: 'Canadá',
  montreal: 'Canadá',
  quebec: 'Canadá',
  québec: 'Canadá',
  banff: 'Canadá',
  calgary: 'Canadá',
  ottawa: 'Canadá',
  victoria: 'Canadá',
  whistler: 'Canadá',

  // México
  cancun: 'México',
  cancún: 'México',
  tulum: 'México',
  'playa del carmen': 'México',
  'cidade do mexico': 'México',
  'cidade do méxico': 'México',
  'mexico city': 'México',
  oaxaca: 'México',
  guadalajara: 'México',
  'puerto vallarta': 'México',
  'los cabos': 'México',
  'cabo san lucas': 'México',
  'san miguel de allende': 'México',
  merida: 'México',
  mérida: 'México',

  // Brasil
  rio: 'Brasil',
  'rio de janeiro': 'Brasil',
  'sao paulo': 'Brasil',
  'são paulo': 'Brasil',
  salvador: 'Brasil',
  florianopolis: 'Brasil',
  florianópolis: 'Brasil',
  fortaleza: 'Brasil',
  recife: 'Brasil',
  curitiba: 'Brasil',
  'belo horizonte': 'Brasil',
  'foz do iguacu': 'Brasil',
  'foz do iguaçu': 'Brasil',
  'porto de galinhas': 'Brasil',
  gramado: 'Brasil',
  'fernando de noronha': 'Brasil',
  maceio: 'Brasil',
  maceió: 'Brasil',
  natal: 'Brasil',
  manaus: 'Brasil',
  brasilia: 'Brasil',
  brasília: 'Brasil',
  paraty: 'Brasil',
  jericoacoara: 'Brasil',
  bonito: 'Brasil',
  'lencois maranhenses': 'Brasil',
  'lençóis maranhenses': 'Brasil',
  'chapada diamantina': 'Brasil',
  'arraial do cabo': 'Brasil',
  buzios: 'Brasil',
  búzios: 'Brasil',
  campos: 'Brasil',
  'campos do jordao': 'Brasil',
  'campos do jordão': 'Brasil',

  // Argentina
  'buenos aires': 'Argentina',
  bariloche: 'Argentina',
  mendoza: 'Argentina',
  ushuaia: 'Argentina',
  'el calafate': 'Argentina',
  salta: 'Argentina',
  iguazu: 'Argentina',
  iguazú: 'Argentina',
  rosario: 'Argentina',
  rosário: 'Argentina',

  // Chile
  santiago: 'Chile',
  atacama: 'Chile',
  'san pedro de atacama': 'Chile',
  valparaiso: 'Chile',
  valparaíso: 'Chile',
  'vina del mar': 'Chile',
  'viña del mar': 'Chile',
  'puerto varas': 'Chile',
  'torres del paine': 'Chile',
  patagonia: 'Chile',
  patagônia: 'Chile',
  'ilha de pascoa': 'Chile',
  'ilha de páscoa': 'Chile',

  // Peru
  lima: 'Peru',
  cusco: 'Peru',
  cuzco: 'Peru',
  'machu picchu': 'Peru',
  machupicchu: 'Peru',
  arequipa: 'Peru',
  puno: 'Peru',
  'vale sagrado': 'Peru',

  // Colômbia
  bogota: 'Colômbia',
  bogotá: 'Colômbia',
  medellin: 'Colômbia',
  medellín: 'Colômbia',
  cartagena: 'Colômbia',
  'san andres': 'Colômbia',
  'san andrés': 'Colômbia',
  'santa marta': 'Colômbia',
  cali: 'Colômbia',

  // Uruguai
  montevideo: 'Uruguai',
  montevideu: 'Uruguai',
  montevidéu: 'Uruguai',
  'punta del este': 'Uruguai',
  'colonia del sacramento': 'Uruguai',

  // Japão
  toquio: 'Japão',
  tóquio: 'Japão',
  tokyo: 'Japão',
  kyoto: 'Japão',
  quioto: 'Japão',
  osaka: 'Japão',
  hiroshima: 'Japão',
  nara: 'Japão',
  yokohama: 'Japão',
  sapporo: 'Japão',
  fukuoka: 'Japão',
  hakone: 'Japão',
  nagoya: 'Japão',
  okinawa: 'Japão',

  // Tailândia
  bangkok: 'Tailândia',
  phuket: 'Tailândia',
  'chiang mai': 'Tailândia',
  krabi: 'Tailândia',
  'koh samui': 'Tailândia',
  'koh phi phi': 'Tailândia',
  pattaya: 'Tailândia',
  ayutthaya: 'Tailândia',

  // Indonésia
  bali: 'Indonésia',
  jakarta: 'Indonésia',
  jacarta: 'Indonésia',
  ubud: 'Indonésia',
  seminyak: 'Indonésia',
  lombok: 'Indonésia',
  gili: 'Indonésia',
  komodo: 'Indonésia',
  yogyakarta: 'Indonésia',

  // Emirados Árabes
  dubai: 'Emirados Árabes',
  'abu dhabi': 'Emirados Árabes',
  sharjah: 'Emirados Árabes',

  // Catar
  doha: 'Catar',

  // Austrália
  sydney: 'Austrália',
  melbourne: 'Austrália',
  brisbane: 'Austrália',
  perth: 'Austrália',
  'gold coast': 'Austrália',
  cairns: 'Austrália',
  adelaide: 'Austrália',

  // Nova Zelândia
  auckland: 'Nova Zelândia',
  queenstown: 'Nova Zelândia',
  christchurch: 'Nova Zelândia',
  rotorua: 'Nova Zelândia',
  wellington: 'Nova Zelândia',

  // África do Sul
  'cidade do cabo': 'África do Sul',
  'cape town': 'África do Sul',
  johannesburg: 'África do Sul',
  joanesburgo: 'África do Sul',
  kruger: 'África do Sul',
  durban: 'África do Sul',

  // Marrocos
  marrakech: 'Marrocos',
  casablanca: 'Marrocos',
  fez: 'Marrocos',
  chefchaouen: 'Marrocos',
  rabat: 'Marrocos',
  tangier: 'Marrocos',
  tanger: 'Marrocos',

  // Egito
  cairo: 'Egito',
  giza: 'Egito',
  gize: 'Egito',
  gizé: 'Egito',
  luxor: 'Egito',
  aswan: 'Egito',
  'sharm el sheikh': 'Egito',
  hurghada: 'Egito',
  alexandria: 'Egito',

  // Singapura
  singapura: 'Singapura',
  singapore: 'Singapura',

  // Coreia do Sul
  seul: 'Coreia do Sul',
  seoul: 'Coreia do Sul',
  busan: 'Coreia do Sul',
  jeju: 'Coreia do Sul',

  // China
  pequim: 'China',
  beijing: 'China',
  shanghai: 'China',
  xangai: 'China',
  'hong kong': 'Hong Kong',
  macau: 'Macau',
  xian: 'China',
  "xi'an": 'China',
  guangzhou: 'China',
  chengdu: 'China',

  // Vietnã
  hanoi: 'Vietnã',
  'ho chi minh': 'Vietnã',
  'da nang': 'Vietnã',
  'hoi an': 'Vietnã',

  // Outros
  'punta cana': 'República Dominicana',
  'santo domingo': 'República Dominicana',
  'san jose cr': 'Costa Rica',
  havana: 'Cuba',
  male: 'Maldivas',
  manila: 'Filipinas',
  boracay: 'Filipinas',
};

/**
 * Resolve country from any given string (city, country name, code, address, destination text).
 */
export function resolveCountryFromText(text?: string | null): string | undefined {
  if (!text) return undefined;
  const raw = text.trim();
  if (!raw) return undefined;

  // If text contains comma (e.g. "Dalt Vila, Ibiza", "Ibiza, Espanha", "London, UK")
  if (raw.includes(',')) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    // Try right-to-left (most specific/country first)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const match = resolveCountryFromText(part);
      if (match) return match;
    }
  }

  const norm = normalizeText(raw);
  if (!norm) return undefined;

  // 1. Direct alias / country name match
  if (COUNTRY_ALIASES[norm]) {
    return COUNTRY_ALIASES[norm];
  }

  // 2. Direct city / destination match
  if (CITY_TO_COUNTRY[norm]) {
    return CITY_TO_COUNTRY[norm];
  }

  // 3. Match against ALL_COUNTRIES catalog
  const catalogMatch = ALL_COUNTRIES.find((c) => {
    if (normalizeText(c.name) === norm || normalizeText(c.code) === norm || normalizeText(c.iso3) === norm) {
      return true;
    }
    return (c.aliases || []).some((a) => normalizeText(a) === norm);
  });
  if (catalogMatch) {
    return catalogMatch.name;
  }

  return undefined;
}

/**
 * Todos os países (com continente, sem repetição) de um roteiro a partir dos
 * destinos — que normalmente são só o nome da cidade ("Paris", "Londres").
 * Um roteiro França + Inglaterra pertence às duas coleções.
 */
export function resolveCountriesForDestinations(destinations?: string[] | null): CountryInfo[] {
  const countries = new Map<string, CountryInfo>();
  for (const destination of destinations ?? []) {
    const countryName = resolveCountryFromText(destination);
    if (!countryName) continue;
    const norm = normalizeText(countryName);
    const match = ALL_COUNTRIES.find((c) =>
      normalizeText(c.name) === norm || (c.aliases || []).some((a) => normalizeText(a) === norm),
    );
    if (match) countries.set(match.iso3, match);
  }
  return Array.from(countries.values());
}

export interface ActivityLocationTarget {
  country?: string;
  city?: string;
  observation?: string;
  name?: string;
  address?: string;
}

/**
 * Resolves the display country for an activity using its own metadata or the trip destinations.
 */
export function resolveActivityCountry(
  activity: ActivityLocationTarget,
  destinations?: string[]
): string | undefined {
  // 1. Explicit country property
  if (activity.country && activity.country.trim()) {
    const fromCountry = resolveCountryFromText(activity.country);
    if (fromCountry) return fromCountry;
    return activity.country.trim();
  }

  // 2. From city property
  if (activity.city && activity.city.trim()) {
    const fromCity = resolveCountryFromText(activity.city);
    if (fromCity) return fromCity;
  }

  // 3. From address property
  if (activity.address && activity.address.trim()) {
    const fromAddress = resolveCountryFromText(activity.address);
    if (fromAddress) return fromAddress;
  }

  // 4. From itinerary destinations
  if (destinations && destinations.length > 0) {
    for (const dest of destinations) {
      const fromDest = resolveCountryFromText(dest);
      if (fromDest) return fromDest;
    }
  }

  return undefined;
}

/**
 * Returns a human-friendly location label for the activity subtitle (e.g. "Espanha", "Reino Unido", "Ibiza").
 * Guarantees a clean location is returned if any destination/city context exists.
 */
export function resolveActivityLocationLabel(
  activity: ActivityLocationTarget,
  destinations?: string[]
): string | undefined {
  const country = resolveActivityCountry(activity, destinations);
  if (country) return country;

  // Fallback to city or first destination
  if (activity.city && activity.city.trim()) {
    const parts = activity.city.split(',').map((s) => s.trim());
    return parts[0];
  }

  if (destinations && destinations.length > 0) {
    const first = destinations[0]?.split(',')?.[0]?.trim();
    if (first) return first;
  }

  return undefined;
}
