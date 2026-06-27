/**
 * Resolve um ícone (Material Symbols name) para qualquer label de interesse,
 * mesmo quando o label não está no INTEREST_CATALOG.
 *
 * Estratégia em 3 camadas:
 *  1. Lookup exato (case-insensitive, sem acentos) no catálogo + aliases.
 *  2. Detecção por palavra-chave (substring) para cobrir variações.
 *  3. Fallback genérico ('tag') — garante que toda tag tenha ícone.
 */
import { INTEREST_CATALOG } from '@/components/travel/EditInterestsSheet';

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Aliases extras (label normalizado -> nome de ícone).
// Cobre interesses comuns que aparecem em perfis reais e não estão no catálogo.
const EXTRA_ALIASES: Record<string, string> = {
  // Bares / drinks
  bar: 'local_bar',
  bares: 'local_bar',
  boteco: 'local_bar',
  botecos: 'local_bar',
  pub: 'local_bar',
  pubs: 'local_bar',
  drinks: 'local_bar',
  cerveja: 'local_bar',
  cervejas: 'local_bar',
  cervejaria: 'local_bar',
  coqueteis: 'local_bar',

  // Vida noturna
  balada: 'nightlife',
  baladas: 'nightlife',
  club: 'nightlife',
  clubs: 'nightlife',
  clube: 'nightlife',
  'night life': 'nightlife',
  noturno: 'nightlife',
  festa: 'nightlife',
  festas: 'nightlife',

  // Caminhar
  andar: 'directions_walk',
  andando: 'directions_walk',
  caminhar: 'directions_walk',
  caminhada: 'directions_walk',
  caminhadas: 'directions_walk',
  walking: 'directions_walk',
  passear: 'directions_walk',
  passeios: 'directions_walk',
  passeio: 'directions_walk',

  // Bem-estar
  yoga: 'spa',
  meditacao: 'spa',
  pilates: 'spa',
  spa: 'spa',
  relaxar: 'spa',

  // Esportes
  corrida: 'directions_run',
  correr: 'directions_run',
  running: 'directions_run',
  bike: 'directions_bike',
  ciclismo: 'directions_bike',
  bicicleta: 'directions_bike',
  futebol: 'sports_soccer',
  tenis: 'sports_tennis',
  golfe: 'sports_golf',
  academia: 'fitness_center',
  fitness: 'fitness_center',

  // Comida
  pizza: 'local_pizza',
  sushi: 'restaurant',
  vegano: 'restaurant',
  vegetariano: 'restaurant',
  doces: 'icecream',
  sorvete: 'icecream',
  brunch: 'brunch_dining',
  jantar: 'dinner_dining',

  // Cidades / destinos -> globo
  paris: 'public',
  londres: 'public',
  london: 'public',
  toquio: 'public',
  tokyo: 'public',
  bali: 'public',
  roma: 'public',
  rome: 'public',
  'nova york': 'public',
  'new york': 'public',
  nyc: 'public',
  lisboa: 'public',
  porto: 'public',
  barcelona: 'public',
  madrid: 'public',
  amsterda: 'public',
  amsterdam: 'public',
  berlim: 'public',
  berlin: 'public',
  dubai: 'public',
  bangkok: 'public',
  patagonia: 'park',
  amazonia: 'park',

  // Outros
  pets: 'pets',
  cachorro: 'pets',
  animais: 'pets',
  livros: 'menu_book',
  leitura: 'menu_book',
  cinema: 'movie',
  filmes: 'movie',
  teatro: 'theater_comedy',
  shows: 'music_note',
  show: 'music_note',
  jogos: 'sports_esports',
  games: 'sports_esports',
  tecnologia: 'devices',
  tech: 'devices',
};

// Heurística por palavra-chave (substring no label normalizado).
// Avaliada em ordem — primeira ocorrência vence.
const KEYWORD_RULES: Array<{ match: string; icon: string }> = [
  { match: 'praia', icon: 'beach_access' },
  { match: 'beach', icon: 'beach_access' },
  { match: 'montanha', icon: 'landscape' },
  { match: 'mountain', icon: 'landscape' },
  { match: 'trilha', icon: 'hiking' },
  { match: 'hike', icon: 'hiking' },
  { match: 'aventur', icon: 'explore' },
  { match: 'fotograf', icon: 'photo_camera' },
  { match: 'photo', icon: 'photo_camera' },
  { match: 'museu', icon: 'museum' },
  { match: 'museum', icon: 'museum' },
  { match: 'historia', icon: 'history_edu' },
  { match: 'history', icon: 'history_edu' },
  { match: 'arte', icon: 'palette' },
  { match: 'art', icon: 'palette' },
  { match: 'musica', icon: 'music_note' },
  { match: 'music', icon: 'music_note' },
  { match: 'gastronom', icon: 'restaurant' },
  { match: 'comida', icon: 'restaurant' },
  { match: 'food', icon: 'restaurant' },
  { match: 'cafe', icon: 'local_cafe' },
  { match: 'coffee', icon: 'local_cafe' },
  { match: 'vinho', icon: 'local_bar' },
  { match: 'wine', icon: 'local_bar' },
  { match: 'bar', icon: 'local_bar' },
  { match: 'noturn', icon: 'nightlife' },
  { match: 'night', icon: 'nightlife' },
  { match: 'balada', icon: 'nightlife' },
  { match: 'caminh', icon: 'directions_walk' },
  { match: 'andar', icon: 'directions_walk' },
  { match: 'walk', icon: 'directions_walk' },
  { match: 'natur', icon: 'park' },
  { match: 'parque', icon: 'park' },
  { match: 'park', icon: 'park' },
  { match: 'surf', icon: 'surfing' },
  { match: 'mergulh', icon: 'scuba_diving' },
  { match: 'dive', icon: 'scuba_diving' },
  { match: 'esqui', icon: 'downhill_skiing' },
  { match: 'ski', icon: 'downhill_skiing' },
  { match: 'compras', icon: 'shopping_bag' },
  { match: 'shopping', icon: 'shopping_bag' },
  { match: 'arquitet', icon: 'apartment' },
  { match: 'religi', icon: 'church' },
  { match: 'igreja', icon: 'church' },
  { match: 'festival', icon: 'celebration' },
  { match: 'roadtrip', icon: 'directions_car' },
  { match: 'mochil', icon: 'backpack' },
  { match: 'luxo', icon: 'diamond' },
  { match: 'cultur', icon: 'auto_stories' },
  { match: 'europa', icon: 'public' },
  { match: 'asia', icon: 'public' },
  { match: 'america', icon: 'public' },
];

const FALLBACK_ICON = 'local_offer';

const catalogMap: Record<string, string> = INTEREST_CATALOG.reduce(
  (acc, c) => {
    acc[norm(c.label)] = c.icon;
    return acc;
  },
  {} as Record<string, string>
);

export function getInterestIcon(label: string): string {
  if (!label) return FALLBACK_ICON;
  const n = norm(label);
  if (catalogMap[n]) return catalogMap[n];
  if (EXTRA_ALIASES[n]) return EXTRA_ALIASES[n];
  for (const rule of KEYWORD_RULES) {
    if (n.includes(rule.match)) return rule.icon;
  }
  return FALLBACK_ICON;
}
