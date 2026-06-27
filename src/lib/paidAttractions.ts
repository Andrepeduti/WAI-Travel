/**
 * Catálogo curado de atrações turísticas globalmente reconhecidas que cobram
 * ingresso. Usado para pré-popular o campo `price` de atividades adicionadas
 * ao roteiro (via "Preencher com IA", busca, recomendações ou seleção manual)
 * e refletir automaticamente o valor estimado no Orçamento.
 *
 * Valores em BRL — média de ingresso adulto, conversão aproximada referência
 * 2025 (EUR ~6,2 / USD ~5,5). Atualize manualmente conforme necessário.
 *
 * Atrações gratuitas (praças, mirantes públicos, parques abertos, igrejas
 * sem ingresso) NÃO devem entrar aqui — preferimos não chutar valor.
 */

export interface PaidAttraction {
  priceBRL: number;
  /** Aliases adicionais (lowercase, sem acento) que devem casar com a entrada */
  aliases?: string[];
}

// Chaves devem estar normalizadas (lowercase, sem acento, sem pontuação extra).
const CATALOG: Record<string, PaidAttraction> = {
  // ── Europa ─────────────────────────────────────────────────────────────
  'coliseu': { priceBRL: 130, aliases: ['colosseum', 'colosseo', 'anfiteatro flavio', 'coliseu romano'] },
  'forum romano': { priceBRL: 130, aliases: ['foro romano', 'roman forum'] },
  'palatino': { priceBRL: 130, aliases: ['palatine hill', 'monte palatino'] },
  'museus vaticanos': { priceBRL: 220, aliases: ['vatican museums', 'musei vaticani', 'capela sistina', 'sistine chapel'] },
  'basilica de sao pedro': { priceBRL: 70, aliases: ['st peters basilica', 'basilica di san pietro', 'cupula sao pedro'] },
  'galleria borghese': { priceBRL: 180, aliases: ['galeria borghese'] },
  'torre eiffel': { priceBRL: 220, aliases: ['eiffel tower', 'tour eiffel'] },
  'museu do louvre': { priceBRL: 140, aliases: ['louvre', 'musee du louvre', 'museu louvre'] },
  'museu dorsay': { priceBRL: 110, aliases: ['musee dorsay', 'orsay'] },
  'arco do triunfo': { priceBRL: 90, aliases: ['arc de triomphe'] },
  'palacio de versalhes': { priceBRL: 200, aliases: ['palace of versailles', 'chateau de versailles', 'versalhes'] },
  'catacumbas de paris': { priceBRL: 200, aliases: ['catacombs of paris', 'catacombes de paris'] },
  'centre pompidou': { priceBRL: 110, aliases: ['centro pompidou'] },
  'sagrada familia': { priceBRL: 220, aliases: ['sagrada família', 'basilica sagrada familia'] },
  'park guell': { priceBRL: 110, aliases: ['parque guell', 'parc guell'] },
  'casa batllo': { priceBRL: 250, aliases: ['casa batlló'] },
  'la pedrera': { priceBRL: 180, aliases: ['casa mila', 'casa milà'] },
  'alhambra': { priceBRL: 130, aliases: ['palacio alhambra', 'la alhambra'] },
  'mesquita catedral de cordoba': { priceBRL: 90, aliases: ['mezquita de cordoba', 'mesquita de cordoba'] },
  'museu do prado': { priceBRL: 100, aliases: ['museo del prado', 'prado'] },
  'palacio real de madrid': { priceBRL: 90, aliases: ['palacio real', 'royal palace madrid'] },
  'duomo de milao': { priceBRL: 130, aliases: ['duomo di milano', 'milan cathedral', 'catedral de milao'] },
  'ultima ceia': { priceBRL: 100, aliases: ['cenacolo vinciano', 'last supper'] },
  'galleria degli uffizi': { priceBRL: 160, aliases: ['uffizi', 'galeria uffizi'] },
  'galleria dellaccademia': { priceBRL: 130, aliases: ['accademia florenca', 'academia florenca'] },
  'palacio dos doges': { priceBRL: 200, aliases: ['palazzo ducale', 'doges palace'] },
  'basilica de sao marcos': { priceBRL: 50, aliases: ['st marks basilica', 'basilica di san marco'] },
  'big ben': { priceBRL: 0 }, // só por fora — exclui
  'london eye': { priceBRL: 240, aliases: ['olho de londres'] },
  'tower of london': { priceBRL: 250, aliases: ['torre de londres'] },
  'westminster abbey': { priceBRL: 200, aliases: ['abadia de westminster'] },
  'british museum': { priceBRL: 0 }, // gratuito
  'tate modern': { priceBRL: 0 },
  'st pauls cathedral': { priceBRL: 170, aliases: ['catedral de sao paulo londres'] },
  'warner bros studio tour london': { priceBRL: 380, aliases: ['harry potter studio'] },
  'castelo de edimburgo': { priceBRL: 130, aliases: ['edinburgh castle'] },
  'castelo de praga': { priceBRL: 110, aliases: ['prague castle', 'pražský hrad'] },
  'museu van gogh': { priceBRL: 160, aliases: ['van gogh museum'] },
  'rijksmuseum': { priceBRL: 150, aliases: ['museu rijks'] },
  'casa de anne frank': { priceBRL: 110, aliases: ['anne frank house'] },
  'neuschwanstein': { priceBRL: 130, aliases: ['castelo de neuschwanstein', 'schloss neuschwanstein'] },
  'reichstag': { priceBRL: 0 }, // gratuito com reserva
  'museu pergamon': { priceBRL: 100, aliases: ['pergamonmuseum'] },
  'acropole de atenas': { priceBRL: 130, aliases: ['acropolis', 'acrópole', 'partenon', 'parthenon'] },
  'partenon': { priceBRL: 130, aliases: ['parthenon'] },
  'castelo de sao jorge': { priceBRL: 100, aliases: ['castelo são jorge', 'sao jorge castle'] },
  'torre de belem': { priceBRL: 50, aliases: ['torre de belém'] },
  'mosteiro dos jeronimos': { priceBRL: 80, aliases: ['mosteiro dos jerónimos', 'jeronimos monastery'] },
  'oceanario de lisboa': { priceBRL: 150, aliases: ['oceanário de lisboa'] },
  'palacio da pena': { priceBRL: 130, aliases: ['palácio da pena', 'pena palace'] },
  'quinta da regaleira': { priceBRL: 90, aliases: [] },

  // ── África / MENA ──────────────────────────────────────────────────────
  'piramides de giza': { priceBRL: 100, aliases: ['pyramids of giza', 'pirâmides de gizé', 'giza pyramids'] },
  'esfinge': { priceBRL: 100, aliases: ['sphinx', 'great sphinx'] },
  'museu egipcio': { priceBRL: 150, aliases: ['egyptian museum', 'museu egípcio'] },
  'jardim majorelle': { priceBRL: 90, aliases: ['jardin majorelle', 'majorelle garden'] },
  'museu yves saint laurent marraquexe': { priceBRL: 90, aliases: ['musee yves saint laurent marrakech'] },
  'palacio bahia': { priceBRL: 50, aliases: ['palácio bahia', 'palais bahia', 'bahia palace'] },
  'tumulos saadianos': { priceBRL: 40, aliases: ['saadian tombs', 'tombeaux saadiens'] },
  'madrasa ben youssef': { priceBRL: 40, aliases: ['medersa ben youssef', 'ali ben youssef madrasa'] },
  'jardim secreto': { priceBRL: 50, aliases: ['le jardin secret', 'secret garden marrakech'] },
  'volubilis': { priceBRL: 50, aliases: ['ruinas de volubilis', 'site archeologique volubilis'] },
  'hassan ii mosque': { priceBRL: 90, aliases: ['mesquita hassan ii', 'mosquee hassan ii'] },

  // ── Américas ───────────────────────────────────────────────────────────
  'estatua da liberdade': { priceBRL: 140, aliases: ['statue of liberty'] },
  'empire state': { priceBRL: 250, aliases: ['empire state building'] },
  'top of the rock': { priceBRL: 230, aliases: [] },
  'one world observatory': { priceBRL: 240, aliases: [] },
  'memorial 11 de setembro': { priceBRL: 180, aliases: ['9/11 memorial museum', 'national september 11 memorial museum'] },
  'museu metropolitano de arte': { priceBRL: 170, aliases: ['the met', 'metropolitan museum of art'] },
  'moma': { priceBRL: 170, aliases: ['museum of modern art'] },
  'edge': { priceBRL: 230, aliases: ['edge nyc', 'edge observation deck'] },
  'summit one vanderbilt': { priceBRL: 260, aliases: ['summit nyc'] },
  'space needle': { priceBRL: 200, aliases: [] },
  'universal studios orlando': { priceBRL: 700, aliases: ['universal orlando'] },
  'magic kingdom': { priceBRL: 900, aliases: ['walt disney world magic kingdom'] },
  'epcot': { priceBRL: 900, aliases: [] },
  'disneyland paris': { priceBRL: 450, aliases: [] },
  'cristo redentor': { priceBRL: 130, aliases: ['christ the redeemer'] },
  'pao de acucar': { priceBRL: 160, aliases: ['pão de açúcar', 'sugarloaf'] },
  'cataratas do iguacu': { priceBRL: 110, aliases: ['cataratas do iguaçu', 'iguazu falls'] },
  'machu picchu': { priceBRL: 250, aliases: [] },

  // ── Ásia / Oceania ─────────────────────────────────────────────────────
  'tokyo skytree': { priceBRL: 130, aliases: ['skytree'] },
  'tokyo tower': { priceBRL: 70, aliases: [] },
  'teamlab planets': { priceBRL: 150, aliases: ['teamlab'] },
  'teamlab borderless': { priceBRL: 200, aliases: [] },
  'shibuya sky': { priceBRL: 100, aliases: [] },
  'castelo de osaka': { priceBRL: 30, aliases: ['osaka castle'] },
  'universal studios japan': { priceBRL: 350, aliases: [] },
  'tokyo disneyland': { priceBRL: 320, aliases: [] },
  'kinkaku ji': { priceBRL: 20, aliases: ['kinkakuji', 'pavilhao dourado', 'golden pavilion'] },
  'fushimi inari taisha': { priceBRL: 0 }, // gratuito
  'cidade proibida': { priceBRL: 50, aliases: ['forbidden city'] },
  'grande muralha mutianyu': { priceBRL: 70, aliases: ['mutianyu great wall'] },
  'taj mahal': { priceBRL: 100, aliases: [] },
  'angkor wat': { priceBRL: 200, aliases: [] },
  'gardens by the bay': { priceBRL: 130, aliases: ['jardins da baia singapura'] },
  'marina bay sands skypark': { priceBRL: 140, aliases: ['skypark observation deck'] },
  'universal studios singapore': { priceBRL: 300, aliases: [] },
  'burj khalifa': { priceBRL: 280, aliases: ['at the top burj khalifa'] },
  'sydney opera house tour': { priceBRL: 200, aliases: ['opera house tour'] },
};

const ACCENT_RE = /[\u0300-\u036f]/g;

export function normalizeAttractionKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(ACCENT_RE, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Index com aliases incluídos para lookup O(1).
const INDEX: Map<string, PaidAttraction> = (() => {
  const map = new Map<string, PaidAttraction>();
  for (const [key, attr] of Object.entries(CATALOG)) {
    map.set(normalizeAttractionKey(key), attr);
    for (const alias of attr.aliases ?? []) {
      map.set(normalizeAttractionKey(alias), attr);
    }
  }
  return map;
})();

/**
 * Procura uma atração paga conhecida pelo nome. Retorna `null` se não houver
 * correspondência (deixe o preço vazio nesses casos — não inventamos valor).
 *
 * Faz match exato e por inclusão parcial (ex.: "Coliseu de Roma" casa com "coliseu").
 */
export function lookupPaidAttraction(name: string, _city?: string): PaidAttraction | null {
  if (!name) return null;
  const key = normalizeAttractionKey(name);
  if (!key) return null;

  // 1. Match exato
  const direct = INDEX.get(key);
  if (direct && direct.priceBRL > 0) return direct;

  // 2. Match por inclusão: "museu do louvre paris" inclui "museu do louvre"
  for (const [indexKey, attr] of INDEX) {
    if (attr.priceBRL <= 0) continue;
    if (key.includes(indexKey) || indexKey.includes(key)) {
      // exige token significativo (>= 5 chars) para reduzir falsos positivos
      if (indexKey.length >= 5) return attr;
    }
  }
  return null;
}

/**
 * Formata preço estimado em BRL para exibição no card de atividade.
 * Ex.: 130 → "R$ 130 (estimado)".
 */
export function formatEstimatedPrice(priceBRL: number): string {
  if (!priceBRL || priceBRL <= 0) return '';
  const value = priceBRL >= 1000
    ? priceBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
    : String(Math.round(priceBRL));
  return `R$ ${value} (estimado)`;
}

/** Conveniência: já devolve a string formatada ou '' */
export function estimatedPriceFor(name: string, city?: string): string {
  const hit = lookupPaidAttraction(name, city);
  return hit ? formatEstimatedPrice(hit.priceBRL) : '';
}
