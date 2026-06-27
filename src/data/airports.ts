export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

// Lista de principais aeroportos (Brasil + internacionais relevantes para viagens)
export const airports: Airport[] = [
  // Brasil
  { iata: 'GRU', name: 'Guarulhos', city: 'São Paulo', country: 'Brasil' },
  { iata: 'CGH', name: 'Congonhas', city: 'São Paulo', country: 'Brasil' },
  { iata: 'VCP', name: 'Viracopos', city: 'Campinas', country: 'Brasil' },
  { iata: 'GIG', name: 'Galeão', city: 'Rio de Janeiro', country: 'Brasil' },
  { iata: 'SDU', name: 'Santos Dumont', city: 'Rio de Janeiro', country: 'Brasil' },
  { iata: 'BSB', name: 'Juscelino Kubitschek', city: 'Brasília', country: 'Brasil' },
  { iata: 'CNF', name: 'Confins', city: 'Belo Horizonte', country: 'Brasil' },
  { iata: 'POA', name: 'Salgado Filho', city: 'Porto Alegre', country: 'Brasil' },
  { iata: 'CWB', name: 'Afonso Pena', city: 'Curitiba', country: 'Brasil' },
  { iata: 'FLN', name: 'Hercílio Luz', city: 'Florianópolis', country: 'Brasil' },
  { iata: 'SSA', name: 'Deputado Luís Eduardo Magalhães', city: 'Salvador', country: 'Brasil' },
  { iata: 'REC', name: 'Guararapes', city: 'Recife', country: 'Brasil' },
  { iata: 'FOR', name: 'Pinto Martins', city: 'Fortaleza', country: 'Brasil' },
  { iata: 'NAT', name: 'Aluízio Alves', city: 'Natal', country: 'Brasil' },
  { iata: 'MCZ', name: 'Zumbi dos Palmares', city: 'Maceió', country: 'Brasil' },
  { iata: 'AJU', name: 'Santa Maria', city: 'Aracaju', country: 'Brasil' },
  { iata: 'BEL', name: 'Val de Cans', city: 'Belém', country: 'Brasil' },
  { iata: 'MAO', name: 'Eduardo Gomes', city: 'Manaus', country: 'Brasil' },
  { iata: 'VIX', name: 'Eurico de Aguiar Salles', city: 'Vitória', country: 'Brasil' },
  { iata: 'GYN', name: 'Santa Genoveva', city: 'Goiânia', country: 'Brasil' },
  { iata: 'CGB', name: 'Marechal Rondon', city: 'Cuiabá', country: 'Brasil' },
  { iata: 'CGR', name: 'Campo Grande', city: 'Campo Grande', country: 'Brasil' },
  { iata: 'IGU', name: 'Cataratas', city: 'Foz do Iguaçu', country: 'Brasil' },
  { iata: 'NVT', name: 'Ministro Victor Konder', city: 'Navegantes', country: 'Brasil' },
  { iata: 'JPA', name: 'Castro Pinto', city: 'João Pessoa', country: 'Brasil' },
  { iata: 'THE', name: 'Senador Petrônio Portella', city: 'Teresina', country: 'Brasil' },
  { iata: 'SLZ', name: 'Marechal Cunha Machado', city: 'São Luís', country: 'Brasil' },
  { iata: 'PMW', name: 'Palmas', city: 'Palmas', country: 'Brasil' },
  { iata: 'RBR', name: 'Plácido de Castro', city: 'Rio Branco', country: 'Brasil' },
  { iata: 'PVH', name: 'Jorge Teixeira', city: 'Porto Velho', country: 'Brasil' },

  // América do Sul
  { iata: 'EZE', name: 'Ministro Pistarini', city: 'Buenos Aires', country: 'Argentina' },
  { iata: 'AEP', name: 'Jorge Newbery', city: 'Buenos Aires', country: 'Argentina' },
  { iata: 'SCL', name: 'Arturo Merino Benítez', city: 'Santiago', country: 'Chile' },
  { iata: 'LIM', name: 'Jorge Chávez', city: 'Lima', country: 'Peru' },
  { iata: 'BOG', name: 'El Dorado', city: 'Bogotá', country: 'Colômbia' },
  { iata: 'UIO', name: 'Mariscal Sucre', city: 'Quito', country: 'Equador' },
  { iata: 'MVD', name: 'Carrasco', city: 'Montevidéu', country: 'Uruguai' },
  { iata: 'ASU', name: 'Silvio Pettirossi', city: 'Assunção', country: 'Paraguai' },
  { iata: 'CCS', name: 'Simón Bolívar', city: 'Caracas', country: 'Venezuela' },

  // América do Norte
  { iata: 'JFK', name: 'John F. Kennedy', city: 'Nova York', country: 'EUA' },
  { iata: 'EWR', name: 'Newark Liberty', city: 'Nova York', country: 'EUA' },
  { iata: 'LGA', name: 'LaGuardia', city: 'Nova York', country: 'EUA' },
  { iata: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'EUA' },
  { iata: 'MIA', name: 'Miami', city: 'Miami', country: 'EUA' },
  { iata: 'MCO', name: 'Orlando', city: 'Orlando', country: 'EUA' },
  { iata: 'ORD', name: 'O\'Hare', city: 'Chicago', country: 'EUA' },
  { iata: 'ATL', name: 'Hartsfield-Jackson', city: 'Atlanta', country: 'EUA' },
  { iata: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'EUA' },
  { iata: 'SFO', name: 'San Francisco', city: 'San Francisco', country: 'EUA' },
  { iata: 'LAS', name: 'Harry Reid', city: 'Las Vegas', country: 'EUA' },
  { iata: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'EUA' },
  { iata: 'BOS', name: 'Logan', city: 'Boston', country: 'EUA' },
  { iata: 'IAD', name: 'Dulles', city: 'Washington', country: 'EUA' },
  { iata: 'IAH', name: 'George Bush', city: 'Houston', country: 'EUA' },
  { iata: 'PHX', name: 'Sky Harbor', city: 'Phoenix', country: 'EUA' },
  { iata: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'Canadá' },
  { iata: 'YVR', name: 'Vancouver', city: 'Vancouver', country: 'Canadá' },
  { iata: 'YUL', name: 'Montréal-Trudeau', city: 'Montreal', country: 'Canadá' },
  { iata: 'MEX', name: 'Benito Juárez', city: 'Cidade do México', country: 'México' },
  { iata: 'CUN', name: 'Cancún', city: 'Cancún', country: 'México' },

  // Europa
  { iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'França' },
  { iata: 'ORY', name: 'Orly', city: 'Paris', country: 'França' },
  { iata: 'NCE', name: 'Côte d\'Azur', city: 'Nice', country: 'França' },
  { iata: 'LHR', name: 'Heathrow', city: 'Londres', country: 'Reino Unido' },
  { iata: 'LGW', name: 'Gatwick', city: 'Londres', country: 'Reino Unido' },
  { iata: 'STN', name: 'Stansted', city: 'Londres', country: 'Reino Unido' },
  { iata: 'MAD', name: 'Barajas', city: 'Madri', country: 'Espanha' },
  { iata: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Espanha' },
  { iata: 'AGP', name: 'Málaga', city: 'Málaga', country: 'Espanha' },
  { iata: 'PMI', name: 'Palma de Mallorca', city: 'Palma', country: 'Espanha' },
  { iata: 'LIS', name: 'Humberto Delgado', city: 'Lisboa', country: 'Portugal' },
  { iata: 'OPO', name: 'Francisco Sá Carneiro', city: 'Porto', country: 'Portugal' },
  { iata: 'FCO', name: 'Fiumicino', city: 'Roma', country: 'Itália' },
  { iata: 'MXP', name: 'Malpensa', city: 'Milão', country: 'Itália' },
  { iata: 'VCE', name: 'Marco Polo', city: 'Veneza', country: 'Itália' },
  { iata: 'NAP', name: 'Nápoles', city: 'Nápoles', country: 'Itália' },
  { iata: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Alemanha' },
  { iata: 'MUC', name: 'Munique', city: 'Munique', country: 'Alemanha' },
  { iata: 'BER', name: 'Brandenburg', city: 'Berlim', country: 'Alemanha' },
  { iata: 'AMS', name: 'Schiphol', city: 'Amsterdã', country: 'Holanda' },
  { iata: 'BRU', name: 'Bruxelas', city: 'Bruxelas', country: 'Bélgica' },
  { iata: 'ZRH', name: 'Zurique', city: 'Zurique', country: 'Suíça' },
  { iata: 'GVA', name: 'Genebra', city: 'Genebra', country: 'Suíça' },
  { iata: 'VIE', name: 'Viena', city: 'Viena', country: 'Áustria' },
  { iata: 'CPH', name: 'Copenhague', city: 'Copenhague', country: 'Dinamarca' },
  { iata: 'ARN', name: 'Estocolmo-Arlanda', city: 'Estocolmo', country: 'Suécia' },
  { iata: 'OSL', name: 'Oslo', city: 'Oslo', country: 'Noruega' },
  { iata: 'HEL', name: 'Helsinque-Vantaa', city: 'Helsinque', country: 'Finlândia' },
  { iata: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Irlanda' },
  { iata: 'IST', name: 'Istambul', city: 'Istambul', country: 'Turquia' },
  { iata: 'ATH', name: 'Eleftherios Venizelos', city: 'Atenas', country: 'Grécia' },
  { iata: 'PRG', name: 'Václav Havel', city: 'Praga', country: 'República Tcheca' },
  { iata: 'WAW', name: 'Chopin', city: 'Varsóvia', country: 'Polônia' },
  { iata: 'BUD', name: 'Ferenc Liszt', city: 'Budapeste', country: 'Hungria' },

  // Ásia / Oceania / África / Oriente Médio
  { iata: 'DXB', name: 'Dubai', city: 'Dubai', country: 'Emirados Árabes' },
  { iata: 'DOH', name: 'Hamad', city: 'Doha', country: 'Catar' },
  { iata: 'AUH', name: 'Abu Dhabi', city: 'Abu Dhabi', country: 'Emirados Árabes' },
  { iata: 'TLV', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel' },
  { iata: 'HND', name: 'Haneda', city: 'Tóquio', country: 'Japão' },
  { iata: 'NRT', name: 'Narita', city: 'Tóquio', country: 'Japão' },
  { iata: 'KIX', name: 'Kansai', city: 'Osaka', country: 'Japão' },
  { iata: 'ICN', name: 'Incheon', city: 'Seul', country: 'Coreia do Sul' },
  { iata: 'PEK', name: 'Pequim Capital', city: 'Pequim', country: 'China' },
  { iata: 'PVG', name: 'Pudong', city: 'Xangai', country: 'China' },
  { iata: 'HKG', name: 'Hong Kong', city: 'Hong Kong', country: 'China' },
  { iata: 'SIN', name: 'Changi', city: 'Singapura', country: 'Singapura' },
  { iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangcoc', country: 'Tailândia' },
  { iata: 'KUL', name: 'Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malásia' },
  { iata: 'DEL', name: 'Indira Gandhi', city: 'Nova Délhi', country: 'Índia' },
  { iata: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai', country: 'Índia' },
  { iata: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Austrália' },
  { iata: 'MEL', name: 'Melbourne', city: 'Melbourne', country: 'Austrália' },
  { iata: 'AKL', name: 'Auckland', city: 'Auckland', country: 'Nova Zelândia' },
  { iata: 'JNB', name: 'O. R. Tambo', city: 'Joanesburgo', country: 'África do Sul' },
  { iata: 'CPT', name: 'Cidade do Cabo', city: 'Cidade do Cabo', country: 'África do Sul' },
  { iata: 'CAI', name: 'Cairo', city: 'Cairo', country: 'Egito' },
  { iata: 'CMN', name: 'Mohammed V', city: 'Casablanca', country: 'Marrocos' },
];

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return airports.slice(0, limit);
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = normalize(q);
  return airports
    .filter(
      (a) =>
        a.iata.toLowerCase().includes(q) ||
        normalize(a.city).includes(nq) ||
        normalize(a.name).includes(nq) ||
        normalize(a.country).includes(nq)
    )
    .slice(0, limit);
}

export function formatAirport(a: Airport): string {
  return `${a.iata} - ${a.city}`;
}
