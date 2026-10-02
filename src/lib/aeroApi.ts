/**
 * AeroAPI (FlightAware) Integration Service
 * 
 * Permite buscar dados de voos em tempo real com base no número do voo (ident: IATA/ICAO),
 * retornando aeroportos de origem/destino, horários de partida/chegada, portão de embarque,
 * terminal, status do voo e companhia aérea.
 * 
 * Documentação da API: https://www.flightaware.com/commercial/aeroapi/
 */

export interface FlightInfo {
  ident: string;
  codigoVoo: string;
  ciaAerea: string;
  origem: string;
  origemCodigo: string;
  origemNome: string;
  destino: string;
  destinoCodigo: string;
  destinoNome: string;
  partidaDate?: Date;
  partidaHora?: string;
  partidaMinuto?: string;
  chegadaDate?: Date;
  chegadaHora?: string;
  chegadaMinuto?: string;
  terminalOrigem?: string;
  portaoOrigem?: string;
  terminalDestino?: string;
  portaoDestino?: string;
  baggageClaim?: string;
  statusVoo?: string;
  aeronave?: string;
}

export interface FlightSearchResult {
  success: boolean;
  flight?: FlightInfo;
  error?: string;
}

function getApiKey(): string {
  return import.meta.env.VITE_AEROAPI_KEY || import.meta.env.VITE_FLIGHTAWARE_API_KEY || '';
}

/**
 * Mapeamento de prefixos IATA comuns para ICAO (usado no rastreamento FlightAware)
 */
const IATA_TO_ICAO_PREFIX: Record<string, string> = {
  G3: 'GLO', // Gol
  AD: 'AZU', // Azul
  LA: 'TAM', // LATAM
  JJ: 'TAM', // LATAM
  AA: 'AAL', // American Airlines
  UA: 'UAL', // United Airlines
  DL: 'DAL', // Delta Air Lines
  TP: 'TAP', // TAP Air Portugal
  AF: 'AFR', // Air France
  BA: 'BAW', // British Airways
  LH: 'DLH', // Lufthansa
  CM: 'CMP', // Copa Airlines
  EK: 'UAE', // Emirates
  QR: 'QTR', // Qatar Airways
  KL: 'KLM', // KLM
  IB: 'IBE', // Iberia
  AV: 'AVA', // Avianca
  AR: 'ARG', // Aerolíneas Argentinas
};

const AIRLINE_NAMES: Record<string, string> = {
  GLO: 'Gol Linhas Aéreas',
  G3: 'Gol Linhas Aéreas',
  AZU: 'Azul Linhas Aéreas',
  AD: 'Azul Linhas Aéreas',
  TAM: 'LATAM Airlines',
  LAN: 'LATAM Airlines',
  LA: 'LATAM Airlines',
  JJ: 'LATAM Airlines',
  AAL: 'American Airlines',
  AA: 'American Airlines',
  UAL: 'United Airlines',
  UA: 'United Airlines',
  DAL: 'Delta Air Lines',
  DL: 'Delta Air Lines',
  TAP: 'TAP Air Portugal',
  TP: 'TAP Air Portugal',
  AFR: 'Air France',
  AF: 'Air France',
  BAW: 'British Airways',
  BA: 'British Airways',
  DLH: 'Lufthansa',
  LH: 'Lufthansa',
  CMP: 'Copa Airlines',
  CM: 'Copa Airlines',
  UAE: 'Emirates',
  EK: 'Emirates',
  QTR: 'Qatar Airways',
  QR: 'Qatar Airways',
  KLM: 'KLM',
  KL: 'KLM',
  IBE: 'Iberia',
  IB: 'Iberia',
};

/**
 * Normaliza e limpa o código do voo digitado pelo usuário (ex: "LA 3001" -> "LA3001", "g3-1500" -> "G31500")
 */
export function cleanFlightNumber(rawInput: string): string {
  return rawInput.trim().toUpperCase().replace(/[\s\-_]/g, '');
}

/**
 * Converte código IATA para ICAO se disponível (ex: "G31500" -> "GLO1500")
 */
function convertIataToIcao(ident: string): string | null {
  const match = ident.match(/^([A-Z0-9]{2})(\d+)$/);
  if (match) {
    const [, prefix, num] = match;
    const icaoPrefix = IATA_TO_ICAO_PREFIX[prefix];
    if (icaoPrefix) return `${icaoPrefix}${num}`;
  }
  return null;
}

/**
 * Traduz o status do voo da AeroAPI para português amigável
 */
function translateStatus(status?: string): string {
  if (!status) return 'Programado';
  const s = status.toLowerCase();
  if (s.includes('scheduled') || s.includes('programado')) return 'Programado';
  if (s.includes('en route') || s.includes('in air') || s.includes('en_route')) return 'Em voo';
  if (s.includes('landed') || s.includes('arrived')) return 'Aterrissado';
  if (s.includes('cancelled') || s.includes('cancelado')) return 'Cancelado';
  if (s.includes('delayed') || s.includes('atrasado')) return 'Atrasado';
  if (s.includes('boarding') || s.includes('embarque')) return 'Embarque';
  return status;
}

async function queryAeroApi(ident: string, apiKey: string): Promise<any> {
  const clean = encodeURIComponent(ident);
  const headers = {
    'Accept': 'application/json; charset=UTF-8',
    'x-apikey': apiKey,
  };

  // 1. Tenta via proxy local do Vite (/api/aeroapi) para evitar CORS no browser
  try {
    const proxyUrl = `/api/aeroapi/flights/${clean}`;
    const res = await fetch(proxyUrl, { method: 'GET', headers });
    if (res.status === 404) return null;
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Se falhar (ex: fora do ambiente Vite), tenta chamada direta
  }

  // 2. Fallback direto
  const directUrl = `https://aeroapi.flightaware.com/aeroapi/flights/${clean}`;
  const response = await fetch(directUrl, { method: 'GET', headers });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Código HTTP ${response.status}`);
  }
  return await response.json();
}

/**
 * Busca dados reais do voo na AeroAPI (FlightAware).
 * Caso o voo não seja encontrado ou a API não esteja configurada,
 * retorna erro amigável sem inventar dados falsos.
 */
export async function searchFlightByNumber(flightNumber: string): Promise<FlightSearchResult> {
  const cleanIdent = cleanFlightNumber(flightNumber);
  
  if (!cleanIdent || cleanIdent.length < 2) {
    return {
      success: false,
      error: 'Informe um número de voo válido (ex: LA3001, AA904, G31500).',
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: 'Chave da AeroAPI (VITE_AEROAPI_KEY) não configurada no arquivo .env. Por favor, adicione sua chave ou preencha os dados manualmente.',
    };
  }

  try {
    let data = await queryAeroApi(cleanIdent, apiKey);
    let flightsList = data?.flights || [];

    // Se não encontrou pelo código digitado e existe conversão IATA -> ICAO (ex: G31500 -> GLO1500), tenta o ICAO
    if (flightsList.length === 0) {
      const icaoIdent = convertIataToIcao(cleanIdent);
      if (icaoIdent && icaoIdent !== cleanIdent) {
        data = await queryAeroApi(icaoIdent, apiKey);
        flightsList = data?.flights || [];
      }
    }

    if (!Array.isArray(flightsList) || flightsList.length === 0) {
      return {
        success: false,
        error: `Voo ${cleanIdent} não foi encontrado na AeroAPI. Verifique se o número está correto ou preencha manualmente.`,
      };
    }

    // Prioriza o voo mais próximo de agora ou futuro
    const now = new Date().getTime();
    const sorted = [...flightsList].sort((a: any, b: any) => {
      const timeA = new Date(a.scheduled_out || a.estimated_out || a.actual_out || 0).getTime();
      const timeB = new Date(b.scheduled_out || b.estimated_out || b.actual_out || 0).getTime();
      return timeA - timeB;
    });

    const upcoming = sorted.filter((f: any) => {
      const t = new Date(f.scheduled_out || f.estimated_out || f.actual_out || 0).getTime();
      return t >= now - 6 * 60 * 60 * 1000;
    });

    const flight = upcoming[0] || sorted[sorted.length - 1] || flightsList[0];

    // Origem
    const originIata = flight.origin?.code_iata || flight.origin?.code || '';
    const originCity = flight.origin?.city || flight.origin?.name || '';
    const origemNome = flight.origin?.name || originCity;
    const formattedOrigem = originIata && originCity 
      ? `${originIata} - Aeroporto de ${originCity}`
      : origemNome || originIata || 'Origem';

    // Destino
    const destIata = flight.destination?.code_iata || flight.destination?.code || '';
    const destCity = flight.destination?.city || flight.destination?.name || '';
    const destinoNome = flight.destination?.name || destCity;
    const formattedDestino = destIata && destCity 
      ? `${destIata} - Aeroporto de ${destCity}`
      : destinoNome || destIata || 'Destino';

    // Companhia aérea
    const opRaw = flight.operator || flight.operator_iata || flight.ident_iata?.slice(0, 2) || flight.ident?.slice(0, 3) || '';
    const resolvedName = AIRLINE_NAMES[opRaw] || AIRLINE_NAMES[opRaw.slice(0, 2)] || flight.operator || '';
    const ciaAerea = resolvedName || cleanIdent;
    const codigoVoo = (flight.codeshares_iata && flight.codeshares_iata.find((c: string) => c.replace(/\D/g, '') === cleanIdent.replace(/\D/g, ''))) 
      || flight.ident_iata 
      || flight.ident 
      || cleanIdent;

    // Datas e Horários
    const departureIso = flight.scheduled_out || flight.estimated_out || flight.actual_out;
    const arrivalIso = flight.scheduled_in || flight.estimated_in || flight.actual_in;

    let partidaDate: Date | undefined;
    let partidaHora: string | undefined;
    let partidaMinuto: string | undefined;

    if (departureIso) {
      const d = new Date(departureIso);
      if (!Number.isNaN(d.getTime())) {
        partidaDate = d;
        partidaHora = String(d.getHours()).padStart(2, '0');
        partidaMinuto = String(d.getMinutes()).padStart(2, '0');
      }
    }

    let chegadaDate: Date | undefined;
    let chegadaHora: string | undefined;
    let chegadaMinuto: string | undefined;

    if (arrivalIso) {
      const d = new Date(arrivalIso);
      if (!Number.isNaN(d.getTime())) {
        chegadaDate = d;
        chegadaHora = String(d.getHours()).padStart(2, '0');
        chegadaMinuto = String(d.getMinutes()).padStart(2, '0');
      }
    }

    // Informações de embarque / portão / terminal
    const terminalOrigem = flight.terminal_origin || undefined;
    const portaoOrigem = flight.gate_origin || undefined;
    const terminalDestino = flight.terminal_destination || undefined;
    const portaoDestino = flight.gate_destination || undefined;
    const baggageClaim = flight.baggage_claim || undefined;
    const statusVoo = translateStatus(flight.status);
    const aeronave = flight.aircraft_type || undefined;

    return {
      success: true,
      flight: {
        ident: flight.ident || cleanIdent,
        codigoVoo,
        ciaAerea,
        origem: formattedOrigem,
        origemCodigo: originIata,
        origemNome,
        destino: formattedDestino,
        destinoCodigo: destIata,
        destinoNome,
        partidaDate,
        partidaHora,
        partidaMinuto,
        chegadaDate,
        chegadaHora,
        chegadaMinuto,
        terminalOrigem,
        portaoOrigem,
        terminalDestino,
        portaoDestino,
        baggageClaim,
        statusVoo,
        aeronave,
      },
    };
  } catch (error: any) {
    console.error('[AeroAPI] Falha ao consultar voo:', error);
    return {
      success: false,
      error: 'Não foi possível consultar a AeroAPI no momento. Verifique sua conexão ou preencha os campos manualmente.',
    };
  }
}
