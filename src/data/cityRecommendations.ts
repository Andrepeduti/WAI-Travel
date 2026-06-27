/**
 * City-based recommendations & places database.
 * Used by AddPlaceSheet (search) and PlannerItineraryScreen (recommendations).
 * Each city has 8-12 curated places across categories.
 */

import type { ItinerarySuggestion } from './itineraries';

export interface CityPlace {
  id: number;
  name: string;
  city: string;
  category: string;
  categoryColor: string;
  image: string;
  rating: number;
  price: string;
  openHours: string;
  duration?: number; // minutes
  lat: number;
  lng: number;
  description?: string;
  /** Optional full address (street, postal code, city) for search results */
  address?: string;
}

// ─── City Places Database ────────────────────────────────────────────────────

const cityPlacesData: CityPlace[] = [
  // ── Paris ──────────────────────────────────────────────────────────────────
  { id: 1001, name: 'Museu do Louvre', city: 'paris', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300', rating: 4.8, price: '€17', openHours: '09:00 às 18:00', duration: 180, lat: 48.8606, lng: 2.3376 },
  { id: 1002, name: 'Torre Eiffel', city: 'paris', category: 'Ponto Turístico', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=300', rating: 4.9, price: '€26', openHours: '09:00 às 00:45', duration: 120, lat: 48.8584, lng: 2.2945 },
  { id: 1003, name: 'Sacré-Cœur', city: 'paris', category: 'Igreja', categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=300', rating: 4.7, price: 'Grátis', openHours: '06:00 às 22:30', duration: 60, lat: 48.8867, lng: 2.3431 },
  { id: 1004, name: 'Museu d\'Orsay', city: 'paris', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=300', rating: 4.7, price: '€16', openHours: '09:30 às 18:00', duration: 150, lat: 48.8600, lng: 2.3266 },
  { id: 1005, name: 'Café de Flore', city: 'paris', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=300', rating: 4.5, price: '€€', openHours: '07:00 às 01:00', duration: 60, lat: 48.8541, lng: 2.3326 },
  { id: 1006, name: 'Arco do Triunfo', city: 'paris', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=300', rating: 4.7, price: '€13', openHours: '10:00 às 23:00', duration: 60, lat: 48.8738, lng: 2.2950 },
  { id: 1007, name: 'Jardim de Luxemburgo', city: 'paris', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1555776099-dd2e0eeae0c4?w=300', rating: 4.6, price: 'Grátis', openHours: '07:30 às 21:30', duration: 90, lat: 48.8462, lng: 2.3372 },
  { id: 1008, name: 'Le Marais', city: 'paris', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1560625269-c2a18db51023?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 120, lat: 48.8566, lng: 2.3622 },
  { id: 1009, name: 'Montmartre', city: 'paris', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1551634979-2b11f8c946fe?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 120, lat: 48.8867, lng: 2.3408 },
  { id: 1010, name: 'Cruzeiro no Sena', city: 'paris', category: 'Experiência', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=300', rating: 4.4, price: '€15', openHours: '10:00 às 22:30', duration: 75, lat: 48.8611, lng: 2.2945 },

  // ── Amsterdam ──────────────────────────────────────────────────────────────
  { id: 1101, name: 'Rijksmuseum', city: 'amsterdam', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=300', rating: 4.9, price: '€22,50', openHours: '09:00 às 17:00', duration: 150, lat: 52.3600, lng: 4.8852 },
  { id: 1102, name: 'Museu Van Gogh', city: 'amsterdam', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=300', rating: 4.8, price: '€20', openHours: '09:00 às 18:00', duration: 120, lat: 52.3584, lng: 4.8811 },
  { id: 1103, name: 'Casa de Anne Frank', city: 'amsterdam', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=300', rating: 4.8, price: '€16', openHours: '09:00 às 22:00', duration: 90, lat: 52.3752, lng: 4.8840 },
  { id: 1104, name: 'Vondelpark', city: 'amsterdam', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300', rating: 4.7, price: 'Grátis', openHours: '24h', duration: 60, lat: 52.3579, lng: 4.8686 },
  { id: 1105, name: 'Bloemenmarkt', city: 'amsterdam', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=300', rating: 4.5, price: 'Grátis', openHours: '09:00 às 17:30', duration: 45, lat: 52.3661, lng: 4.8913 },
  { id: 1106, name: 'A\'DAM Lookout', city: 'amsterdam', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1512470876337-d72d5c37f8f3?w=300', rating: 4.6, price: '€14,50', openHours: '10:00 às 22:00', duration: 45, lat: 52.3843, lng: 4.9024 },
  { id: 1107, name: 'Heineken Experience', city: 'amsterdam', category: 'Experiência', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1605433246452-959f2bd10e38?w=300', rating: 4.4, price: '€21', openHours: '10:30 às 19:30', duration: 90, lat: 52.3578, lng: 4.8919 },
  { id: 1108, name: 'Jordaan', city: 'amsterdam', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 120, lat: 52.3738, lng: 4.8793 },
  { id: 1109, name: 'Café de Klos', city: 'amsterdam', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300', rating: 4.6, price: '€€', openHours: '11:00 às 23:00', duration: 60, lat: 52.3669, lng: 4.8826 },
  { id: 1110, name: 'Cruzeiro nos Canais', city: 'amsterdam', category: 'Experiência', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1504019347908-b45f9b0b8f64?w=300', rating: 4.5, price: '€16', openHours: '10:00 às 22:00', duration: 75, lat: 52.3702, lng: 4.8952 },

  // ── Lisboa ─────────────────────────────────────────────────────────────────
  { id: 1201, name: 'Torre de Belém', city: 'lisboa', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1548707309-dcebeab426c8?w=300', rating: 4.6, price: '€8', openHours: '10:00 às 18:30', duration: 60, lat: 38.6916, lng: -9.2160 },
  { id: 1202, name: 'Mosteiro dos Jerónimos', city: 'lisboa', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1572276596428-69facb3e0e10?w=300', rating: 4.8, price: '€10', openHours: '10:00 às 17:30', duration: 90, lat: 38.6979, lng: -9.2068 },
  { id: 1203, name: 'Pastéis de Belém', city: 'lisboa', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1579697096985-41fe1430e5df?w=300', rating: 4.7, price: '€', openHours: '08:00 às 23:00', duration: 30, lat: 38.6975, lng: -9.2034 },
  { id: 1204, name: 'Alfama', city: 'lisboa', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1558369981-f9ca78462e61?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 120, lat: 38.7114, lng: -9.1300 },
  { id: 1205, name: 'Elétrico 28', city: 'lisboa', category: 'Experiência', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1573053986147-34b1f8e801b2?w=300', rating: 4.5, price: '€3', openHours: '06:00 às 23:00', duration: 45, lat: 38.7139, lng: -9.1395 },
  { id: 1206, name: 'Castelo de São Jorge', city: 'lisboa', category: 'Castelo', categoryColor: '#DC2626', image: 'https://images.unsplash.com/photo-1580323956656-26bbb7206961?w=300', rating: 4.7, price: '€10', openHours: '09:00 às 21:00', duration: 90, lat: 38.7139, lng: -9.1335 },
  { id: 1207, name: 'Time Out Market', city: 'lisboa', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=300', rating: 4.4, price: '€€', openHours: '10:00 às 00:00', duration: 60, lat: 38.7068, lng: -9.1457 },
  { id: 1208, name: 'Miradouro da Graça', city: 'lisboa', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 30, lat: 38.7168, lng: -9.1314 },
  { id: 1209, name: 'Oceanário de Lisboa', city: 'lisboa', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300', rating: 4.7, price: '€25', openHours: '10:00 às 20:00', duration: 120, lat: 38.7636, lng: -9.0938 },
  { id: 1210, name: 'LX Factory', city: 'lisboa', category: 'Experiência', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd6b?w=300', rating: 4.3, price: 'Grátis', openHours: '06:00 às 02:00', duration: 90, lat: 38.7035, lng: -9.1780 },

  // ── Madrid ─────────────────────────────────────────────────────────────────
  { id: 1301, name: 'Museo del Prado', city: 'madrid', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=300', rating: 4.8, price: '€15', openHours: '10:00 às 20:00', duration: 180, lat: 40.4138, lng: -3.6921 },
  { id: 1302, name: 'Parque del Retiro', city: 'madrid', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1558370781-d6196949e317?w=300', rating: 4.7, price: 'Grátis', openHours: '06:00 às 00:00', duration: 90, lat: 40.4153, lng: -3.6845 },
  { id: 1303, name: 'Mercado de San Miguel', city: 'madrid', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=300', rating: 4.4, price: '€€', openHours: '10:00 às 00:00', duration: 60, lat: 40.4155, lng: -3.7090 },
  { id: 1304, name: 'Palácio Real', city: 'madrid', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=300', rating: 4.7, price: '€12', openHours: '10:00 às 18:00', duration: 90, lat: 40.4180, lng: -3.7143 },
  { id: 1305, name: 'Plaza Mayor', city: 'madrid', category: 'Praça', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1578037571214-25e07f3e3528?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 30, lat: 40.4155, lng: -3.7074 },
  { id: 1306, name: 'Reina Sofía', city: 'madrid', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=300', rating: 4.6, price: '€12', openHours: '10:00 às 21:00', duration: 120, lat: 40.4087, lng: -3.6943 },
  { id: 1307, name: 'Sobrino de Botín', city: 'madrid', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300', rating: 4.5, price: '€€€', openHours: '13:00 às 00:00', duration: 90, lat: 40.4141, lng: -3.7083 },
  { id: 1308, name: 'Templo de Debod', city: 'madrid', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1570698473886-9da573cb0a9a?w=300', rating: 4.4, price: 'Grátis', openHours: '10:00 às 20:00', duration: 45, lat: 40.4242, lng: -3.7178 },

  // ── Barcelona ──────────────────────────────────────────────────────────────
  { id: 1401, name: 'Sagrada Família', city: 'barcelona', category: 'Igreja', categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=300', rating: 4.9, price: '€26', openHours: '09:00 às 20:00', duration: 120, lat: 41.4036, lng: 2.1744 },
  { id: 1402, name: 'Park Güell', city: 'barcelona', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1511527661048-7fe73d85b9a4?w=300', rating: 4.7, price: '€10', openHours: '09:30 às 19:30', duration: 90, lat: 41.4145, lng: 2.1527 },
  { id: 1403, name: 'La Boqueria', city: 'barcelona', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1553452118-621e1f860f43?w=300', rating: 4.5, price: '€', openHours: '08:00 às 20:30', duration: 60, lat: 41.3816, lng: 2.1719 },
  { id: 1404, name: 'Casa Batlló', city: 'barcelona', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=300', rating: 4.7, price: '€35', openHours: '09:00 às 21:00', duration: 90, lat: 41.3916, lng: 2.1650 },
  { id: 1405, name: 'La Barceloneta', city: 'barcelona', category: 'Praia', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=300', rating: 4.4, price: 'Grátis', openHours: '24h', duration: 120, lat: 41.3784, lng: 2.1924 },
  { id: 1406, name: 'Bairro Gótico', city: 'barcelona', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 120, lat: 41.3833, lng: 2.1761 },
  { id: 1407, name: 'Montjuïc', city: 'barcelona', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1579282240050-352db0a14c21?w=300', rating: 4.5, price: 'Grátis', openHours: '07:00 às 21:00', duration: 90, lat: 41.3642, lng: 2.1587 },
  { id: 1408, name: 'El Nacional', city: 'barcelona', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=300', rating: 4.5, price: '€€', openHours: '12:00 às 01:00', duration: 90, lat: 41.3926, lng: 2.1688 },

  // ── Roma ────────────────────────────────────────────────────────────────────
  { id: 1501, name: 'Coliseu', city: 'roma', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300', rating: 4.9, price: '€16', openHours: '08:30 às 19:00', duration: 120, lat: 41.8902, lng: 12.4922 },
  { id: 1502, name: 'Vaticano', city: 'roma', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=300', rating: 4.8, price: '€17', openHours: '09:00 às 18:00', duration: 180, lat: 41.9029, lng: 12.4534 },
  { id: 1503, name: 'Fontana di Trevi', city: 'roma', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=300', rating: 4.7, price: 'Grátis', openHours: '24h', duration: 30, lat: 41.9009, lng: 12.4833 },
  { id: 1504, name: 'Panteão', city: 'roma', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=300', rating: 4.8, price: '€5', openHours: '09:00 às 19:00', duration: 45, lat: 41.8986, lng: 12.4769 },
  { id: 1505, name: 'Trastevere', city: 'roma', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 120, lat: 41.8893, lng: 12.4695 },
  { id: 1506, name: 'Fórum Romano', city: 'roma', category: 'Ruínas', categoryColor: '#EF4444', image: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=300', rating: 4.7, price: '€16', openHours: '09:00 às 19:00', duration: 90, lat: 41.8925, lng: 12.4853 },
  { id: 1507, name: 'Piazza Navona', city: 'roma', category: 'Praça', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 30, lat: 41.8992, lng: 12.4731 },
  { id: 1508, name: 'Da Enzo al 29', city: 'roma', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=300', rating: 4.6, price: '€€', openHours: '12:30 às 15:00', duration: 60, lat: 41.8867, lng: 12.4746 },
  { id: 1509, name: 'Villa Borghese', city: 'roma', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=300', rating: 4.5, price: 'Grátis', openHours: '07:00 às 21:00', duration: 90, lat: 41.9142, lng: 12.4851 },

  // ── Tóquio ─────────────────────────────────────────────────────────────────
  { id: 1601, name: 'Templo Senso-ji', city: 'tóquio', category: 'Templo', categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=300', rating: 4.7, price: 'Grátis', openHours: '06:00 às 17:00', duration: 60, lat: 35.7148, lng: 139.7967 },
  { id: 1602, name: 'Shibuya Crossing', city: 'tóquio', category: 'Ponto Turístico', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 30, lat: 35.6595, lng: 139.7004 },
  { id: 1603, name: 'Tsukiji Outer Market', city: 'tóquio', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=300', rating: 4.5, price: '€', openHours: '05:00 às 14:00', duration: 90, lat: 35.6654, lng: 139.7707 },
  { id: 1604, name: 'Meiji Jingu', city: 'tóquio', category: 'Templo', categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=300', rating: 4.8, price: 'Grátis', openHours: '05:00 às 18:00', duration: 60, lat: 35.6764, lng: 139.6993 },
  { id: 1605, name: 'Akihabara', city: 'tóquio', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=300', rating: 4.4, price: 'Grátis', openHours: '24h', duration: 120, lat: 35.7023, lng: 139.7745 },
  { id: 1606, name: 'Tokyo Skytree', city: 'tóquio', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=300', rating: 4.6, price: '¥2100', openHours: '10:00 às 21:00', duration: 60, lat: 35.7101, lng: 139.8107 },
  { id: 1607, name: 'Ichiran Ramen', city: 'tóquio', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=300', rating: 4.5, price: '€', openHours: '24h', duration: 30, lat: 35.6620, lng: 139.7011 },
  { id: 1608, name: 'Shinjuku Gyoen', city: 'tóquio', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=300', rating: 4.7, price: '¥500', openHours: '09:00 às 16:00', duration: 90, lat: 35.6852, lng: 139.7100 },
  { id: 1609, name: 'TeamLab Borderless', city: 'tóquio', category: 'Experiência', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300', rating: 4.8, price: '¥3200', openHours: '10:00 às 19:00', duration: 120, lat: 35.6256, lng: 139.7744 },

  // ── Londres ────────────────────────────────────────────────────────────────
  { id: 1701, name: 'British Museum', city: 'londres', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1590085438498-2c2efdc1e14e?w=300', rating: 4.8, price: 'Grátis', openHours: '10:00 às 17:00', duration: 180, lat: 51.5194, lng: -0.1270 },
  { id: 1702, name: 'Tower of London', city: 'londres', category: 'Castelo', categoryColor: '#DC2626', image: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=300', rating: 4.7, price: '£33', openHours: '09:00 às 17:30', duration: 120, lat: 51.5081, lng: -0.0759 },
  { id: 1703, name: 'Borough Market', city: 'londres', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300', rating: 4.6, price: '€', openHours: '10:00 às 17:00', duration: 60, lat: 51.5055, lng: -0.0910 },
  { id: 1704, name: 'Westminster Abbey', city: 'londres', category: 'Igreja', categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=300', rating: 4.7, price: '£27', openHours: '09:30 às 15:30', duration: 90, lat: 51.4994, lng: -0.1273 },
  { id: 1705, name: 'Hyde Park', city: 'londres', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=300', rating: 4.6, price: 'Grátis', openHours: '05:00 às 00:00', duration: 90, lat: 51.5073, lng: -0.1657 },
  { id: 1706, name: 'Tate Modern', city: 'londres', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1549489300-03dca9ca7bc6?w=300', rating: 4.6, price: 'Grátis', openHours: '10:00 às 18:00', duration: 120, lat: 51.5076, lng: -0.0994 },
  { id: 1707, name: 'Dishoom', city: 'londres', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300', rating: 4.5, price: '€€', openHours: '08:00 às 23:00', duration: 60, lat: 51.5100, lng: -0.1242 },
  { id: 1708, name: 'Sky Garden', city: 'londres', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300', rating: 4.4, price: 'Grátis', openHours: '10:00 às 18:00', duration: 45, lat: 51.5113, lng: -0.0836 },

  // ── Atenas ─────────────────────────────────────────────────────────────────
  { id: 1801, name: 'Acrópole de Atenas', city: 'atenas', category: 'Ruínas', categoryColor: '#EF4444', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=300', rating: 4.9, price: '€20', openHours: '08:00 às 20:00', duration: 120, lat: 37.9715, lng: 23.7257 },
  { id: 1802, name: 'Museu da Acrópole', city: 'atenas', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=300', rating: 4.8, price: '€10', openHours: '08:00 às 20:00', duration: 90, lat: 37.9685, lng: 23.7286 },
  { id: 1803, name: 'Ágora Antiga', city: 'atenas', category: 'Ruínas', categoryColor: '#EF4444', image: 'https://images.unsplash.com/photo-1608834007709-c7a13a849bfe?w=300', rating: 4.6, price: '€10', openHours: '08:00 às 19:00', duration: 60, lat: 37.9747, lng: 23.7226 },
  { id: 1804, name: 'Pláka', city: 'atenas', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1600240644455-3edc55c375fe?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 120, lat: 37.9725, lng: 23.7290 },
  { id: 1805, name: 'Praça Syntagma', city: 'atenas', category: 'Praça', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1594820843853-f49c4d8e16c8?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 30, lat: 37.9755, lng: 23.7348 },
  { id: 1806, name: 'Monastiraki Flea Market', city: 'atenas', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=300', rating: 4.3, price: 'Grátis', openHours: '08:00 às 21:00', duration: 60, lat: 37.9764, lng: 23.7254 },
  { id: 1807, name: 'Monte Licabeto', city: 'atenas', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1603852452515-2dc8cd24e991?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 60, lat: 37.9820, lng: 23.7440 },
  { id: 1808, name: 'Taverna To Kafeneio', city: 'atenas', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300', rating: 4.4, price: '€', openHours: '12:00 às 23:00', duration: 60, lat: 37.9735, lng: 23.7275 },

  // ── Santorini ──────────────────────────────────────────────────────────────
  { id: 1901, name: 'Oia Village', city: 'santorini', category: 'Cidade', categoryColor: '#3B82F6', image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=300', rating: 4.8, price: 'Grátis', openHours: '24h', duration: 180, lat: 36.4618, lng: 25.3753 },
  { id: 1902, name: 'Pôr do Sol em Oia', city: 'santorini', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=300', rating: 4.9, price: 'Grátis', openHours: '24h', duration: 60, lat: 36.4615, lng: 25.3720 },
  { id: 1903, name: 'Praia Vermelha', city: 'santorini', category: 'Praia', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 120, lat: 36.3481, lng: 25.3928 },
  { id: 1904, name: 'Fira', city: 'santorini', category: 'Cidade', categoryColor: '#3B82F6', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 120, lat: 36.4167, lng: 25.4315 },
  { id: 1905, name: 'Wine Tour Santorini', city: 'santorini', category: 'Experiência', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300', rating: 4.6, price: '€45', openHours: '10:00 às 18:00', duration: 180, lat: 36.3980, lng: 25.4580 },
  { id: 1906, name: 'Praia de Kamari', city: 'santorini', category: 'Praia', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=300', rating: 4.4, price: 'Grátis', openHours: '24h', duration: 120, lat: 36.3750, lng: 25.4850 },
  { id: 1907, name: 'Lucky\'s Souvlakis', city: 'santorini', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300', rating: 4.5, price: '€', openHours: '11:00 às 23:00', duration: 30, lat: 36.4170, lng: 25.4290 },
  { id: 1908, name: 'Ancient Thera', city: 'santorini', category: 'Ruínas', categoryColor: '#EF4444', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=300', rating: 4.3, price: '€6', openHours: '08:00 às 15:00', duration: 60, lat: 36.3680, lng: 25.4730 },

  // ── Bangkok ────────────────────────────────────────────────────────────────
  { id: 2001, name: 'Grand Palace', city: 'bangkok', category: 'Templo', categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=300', rating: 4.8, price: '฿500', openHours: '08:30 às 15:30', duration: 120, lat: 13.7500, lng: 100.4913 },
  { id: 2002, name: 'Wat Pho', city: 'bangkok', category: 'Templo', categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=300', rating: 4.7, price: '฿200', openHours: '08:00 às 18:30', duration: 60, lat: 13.7468, lng: 100.4927 },
  { id: 2003, name: 'Chatuchak Market', city: 'bangkok', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=300', rating: 4.5, price: 'Grátis', openHours: '09:00 às 18:00', duration: 180, lat: 13.7999, lng: 100.5505 },
  { id: 2004, name: 'Wat Arun', city: 'bangkok', category: 'Templo', categoryColor: '#F97316', image: 'https://images.unsplash.com/photo-1583395838144-09e3f0e1d2c5?w=300', rating: 4.7, price: '฿100', openHours: '08:00 às 18:00', duration: 60, lat: 13.7437, lng: 100.4888 },
  { id: 2005, name: 'Khao San Road', city: 'bangkok', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=300', rating: 4.3, price: 'Grátis', openHours: '24h', duration: 90, lat: 13.7588, lng: 100.4974 },
  { id: 2006, name: 'Chinatown Bangkok', city: 'bangkok', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=300', rating: 4.4, price: 'Grátis', openHours: '24h', duration: 90, lat: 13.7406, lng: 100.5092 },
  { id: 2007, name: 'Rooftop Bar Vertigo', city: 'bangkok', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=300', rating: 4.5, price: '€€€', openHours: '17:00 às 01:00', duration: 60, lat: 13.7234, lng: 100.5260 },
  { id: 2008, name: 'Jim Thompson House', city: 'bangkok', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=300', rating: 4.4, price: '฿200', openHours: '09:00 às 18:00', duration: 60, lat: 13.7490, lng: 100.5290 },

  // ── Nova York ──────────────────────────────────────────────────────────────
  { id: 2101, name: 'Central Park', city: 'nova york', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=300', rating: 4.8, price: 'Grátis', openHours: '06:00 às 01:00', duration: 120, lat: 40.7829, lng: -73.9654 },
  { id: 2102, name: 'MET Museum', city: 'nova york', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=300', rating: 4.8, price: '$30', openHours: '10:00 às 17:00', duration: 180, lat: 40.7794, lng: -73.9632 },
  { id: 2103, name: 'Times Square', city: 'nova york', category: 'Ponto Turístico', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 30, lat: 40.7580, lng: -73.9855 },
  { id: 2104, name: 'Estátua da Liberdade', city: 'nova york', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f04?w=300', rating: 4.7, price: '$24', openHours: '09:30 às 17:00', duration: 180, lat: 40.6892, lng: -74.0445 },
  { id: 2105, name: 'Brooklyn Bridge', city: 'nova york', category: 'Ponto Turístico', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 60, lat: 40.7061, lng: -73.9969 },
  { id: 2106, name: 'High Line', city: 'nova york', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1522083165195-3424ed14020d?w=300', rating: 4.6, price: 'Grátis', openHours: '07:00 às 22:00', duration: 60, lat: 40.7480, lng: -74.0048 },
  { id: 2107, name: 'Joe\'s Pizza', city: 'nova york', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300', rating: 4.5, price: '$', openHours: '10:00 às 04:00', duration: 20, lat: 40.7306, lng: -74.0021 },
  { id: 2108, name: 'Top of the Rock', city: 'nova york', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=300', rating: 4.7, price: '$40', openHours: '09:00 às 00:00', duration: 60, lat: 40.7593, lng: -73.9794 },
  { id: 2109, name: 'Chelsea Market', city: 'nova york', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555992643-0ab5a39ab10a?w=300', rating: 4.4, price: '€', openHours: '07:00 às 02:00', duration: 60, lat: 40.7425, lng: -74.0061 },
  { id: 2110, name: 'DUMBO, Brooklyn', city: 'nova york', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1543716091-a840c05249ec?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 90, lat: 40.7033, lng: -73.9894 },

  // ── Praga ──────────────────────────────────────────────────────────────────
  { id: 2201, name: 'Castelo de Praga', city: 'praga', category: 'Castelo', categoryColor: '#DC2626', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=300', rating: 4.8, price: 'CZK 250', openHours: '06:00 às 22:00', duration: 120, lat: 50.0910, lng: 14.4013 },
  { id: 2202, name: 'Ponte Carlos', city: 'praga', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=300', rating: 4.7, price: 'Grátis', openHours: '24h', duration: 30, lat: 50.0865, lng: 14.4114 },
  { id: 2203, name: 'Old Town Square', city: 'praga', category: 'Praça', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1562624475-96c2bc08fab9?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 45, lat: 50.0874, lng: 14.4213 },
  { id: 2204, name: 'Relógio Astronômico', city: 'praga', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1458150945447-7fb764c11a92?w=300', rating: 4.5, price: 'Grátis', openHours: '09:00 às 21:00', duration: 30, lat: 50.0870, lng: 14.4208 },
  { id: 2205, name: 'Bairro Judeu', city: 'praga', category: 'Bairro', categoryColor: '#EC4899', image: 'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=300', rating: 4.5, price: 'CZK 350', openHours: '09:00 às 18:00', duration: 90, lat: 50.0898, lng: 14.4185 },
  { id: 2206, name: 'Café Louvre', city: 'praga', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=300', rating: 4.4, price: '€', openHours: '08:00 às 23:30', duration: 60, lat: 50.0804, lng: 14.4168 },
  { id: 2207, name: 'Petřín Hill', city: 'praga', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1564429238961-bf8282c73b75?w=300', rating: 4.5, price: 'CZK 150', openHours: '10:00 às 22:00', duration: 60, lat: 50.0833, lng: 14.3950 },
  { id: 2208, name: 'Beer Spa', city: 'praga', category: 'Experiência', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300', rating: 4.3, price: 'CZK 1500', openHours: '10:00 às 22:00', duration: 90, lat: 50.0878, lng: 14.4245 },

  // ── Viena ──────────────────────────────────────────────────────────────────
  { id: 2301, name: 'Palácio de Schönbrunn', city: 'viena', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1609856878074-cf31e21ccb6b?w=300', rating: 4.8, price: '€22', openHours: '08:00 às 17:30', duration: 150, lat: 48.1845, lng: 16.3122 },
  { id: 2302, name: 'Catedral de São Estêvão', city: 'viena', category: 'Igreja', categoryColor: '#8B5CF6', image: 'https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=300', rating: 4.7, price: '€6', openHours: '06:00 às 22:00', duration: 60, lat: 48.2085, lng: 16.3731 },
  { id: 2303, name: 'Naschmarkt', city: 'viena', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300', rating: 4.5, price: '€', openHours: '06:00 às 21:00', duration: 60, lat: 48.1990, lng: 16.3630 },
  { id: 2304, name: 'Museu Belvedere', city: 'viena', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=300', rating: 4.7, price: '€16', openHours: '09:00 às 18:00', duration: 120, lat: 48.1916, lng: 16.3808 },
  { id: 2305, name: 'Café Central', city: 'viena', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=300', rating: 4.5, price: '€€', openHours: '08:00 às 22:00', duration: 60, lat: 48.2104, lng: 16.3654 },
  { id: 2306, name: 'Ópera de Viena', city: 'viena', category: 'Experiência', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=300', rating: 4.8, price: '€15-200', openHours: '10:00 às 22:00', duration: 150, lat: 48.2035, lng: 16.3689 },
  { id: 2307, name: 'Prater', city: 'viena', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=300', rating: 4.4, price: 'Grátis', openHours: '24h', duration: 90, lat: 48.2166, lng: 16.3956 },
  { id: 2308, name: 'Kunsthistorisches Museum', city: 'viena', category: 'Museu', categoryColor: '#6366F1', image: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=300', rating: 4.7, price: '€18', openHours: '10:00 às 18:00', duration: 120, lat: 48.2039, lng: 16.3614 },

  // ── Budapeste ──────────────────────────────────────────────────────────────
  { id: 2401, name: 'Parlamento Húngaro', city: 'budapeste', category: 'Monumento', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=300', rating: 4.8, price: 'HUF 6000', openHours: '08:00 às 18:00', duration: 60, lat: 47.5073, lng: 19.0458 },
  { id: 2402, name: 'Termas Széchenyi', city: 'budapeste', category: 'Experiência', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?w=300', rating: 4.7, price: 'HUF 7200', openHours: '06:00 às 22:00', duration: 180, lat: 47.5186, lng: 19.0822 },
  { id: 2403, name: 'Bastião dos Pescadores', city: 'budapeste', category: 'Mirante', categoryColor: '#0EA5E9', image: 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=300', rating: 4.7, price: 'HUF 1000', openHours: '09:00 às 23:00', duration: 45, lat: 47.5019, lng: 19.0348 },
  { id: 2404, name: 'Great Market Hall', city: 'budapeste', category: 'Mercado', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=300', rating: 4.5, price: 'Grátis', openHours: '06:00 às 18:00', duration: 60, lat: 47.4869, lng: 19.0596 },
  { id: 2405, name: 'Ruin Bar Szimpla', city: 'budapeste', category: 'Experiência', categoryColor: '#10B981', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300', rating: 4.4, price: '€', openHours: '12:00 às 04:00', duration: 90, lat: 47.4965, lng: 19.0625 },
  { id: 2406, name: 'Castelo de Buda', city: 'budapeste', category: 'Castelo', categoryColor: '#DC2626', image: 'https://images.unsplash.com/photo-1577867013863-21efd0ba7a91?w=300', rating: 4.6, price: 'Grátis', openHours: '24h', duration: 90, lat: 47.4960, lng: 19.0395 },
  { id: 2407, name: 'Ilha Margarida', city: 'budapeste', category: 'Parque', categoryColor: '#22C55E', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300', rating: 4.5, price: 'Grátis', openHours: '24h', duration: 90, lat: 47.5276, lng: 19.0489 },
  { id: 2408, name: 'Café Gerbeaud', city: 'budapeste', category: 'Restaurante', categoryColor: '#F59E0B', image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=300', rating: 4.5, price: '€€', openHours: '09:00 às 21:00', duration: 45, lat: 47.4963, lng: 19.0503 },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────────

/** Normalize a city name from destination string "City, Country" */
function normCity(destination: string): string {
  return destination.split(',')[0].trim().toLowerCase();
}

/**
 * Get places for given destinations. Sorted by rating desc.
 */
export function getPlacesForDestinations(destinations: string[]): CityPlace[] {
  const cities = new Set(destinations.map(normCity));
  return cityPlacesData
    .filter(p => cities.has(p.city))
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Get places for a single city name (already normalized or raw).
 */
export function getPlacesForCity(cityName: string): CityPlace[] {
  const norm = cityName.toLowerCase().trim();
  return cityPlacesData
    .filter(p => p.city === norm)
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Convert CityPlace[] to ItinerarySuggestion[] for the recommendations carousel.
 */
export function toSuggestions(places: CityPlace[]): ItinerarySuggestion[] {
  return places.map(p => ({
    id: p.id,
    name: p.name,
    rating: p.rating,
    distance: '',
    image: p.image,
    category: p.category,
    categoryColor: p.categoryColor,
    duration: p.duration,
    lat: p.lat,
    lng: p.lng,
    ...({
      city: p.city,
      price: p.price,
      openHours: p.openHours,
      description: p.description,
      suggestedTimeSlot: (p as any).suggestedTimeSlot,
      bucket: (p as any).bucket,
    } as Record<string, unknown>),
  }));
}

/**
 * Resolve destination for a specific day in a multi-destination trip.
 * Uses a simple heuristic: distributes days evenly across destinations.
 */
export function getDestinationForDay(
  destinations: string[],
  dayNumber: number,
  totalDays: number
): string {
  if (destinations.length === 0) return '';
  if (destinations.length === 1) return destinations[0];
  const daysPerDest = Math.ceil(totalDays / destinations.length);
  const idx = Math.min(Math.floor((dayNumber - 1) / daysPerDest), destinations.length - 1);
  return destinations[idx];
}

/** Get all unique cities in the database */
export function getAllCityPlaces(): CityPlace[] {
  return cityPlacesData;
}

/**
 * Search places with destination-aware prioritization.
 * Returns: exact matches first, then popular, then secondary.
 */
export function searchPlaces(
  query: string,
  destinations: string[]
): { local: CityPlace[]; global: CityPlace[] } {
  const q = query.toLowerCase();
  const cities = new Set(destinations.map(normCity));

  const sortWithPriority = (a: CityPlace, b: CityPlace) => {
    const aExact = a.name.toLowerCase().startsWith(q) ? 1 : 0;
    const bExact = b.name.toLowerCase().startsWith(q) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return b.rating - a.rating;
  };

  const localMatches = cityPlacesData.filter(
    p => cities.has(p.city) && (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  );

  const globalMatches = cityPlacesData.filter(
    p => !cities.has(p.city) && (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  );

  return {
    local: localMatches.sort(sortWithPriority),
    global: globalMatches.sort(sortWithPriority),
  };
}

/**
 * Group places by city, preserving order within each group.
 */
export function groupByCity(places: CityPlace[]): { city: string; places: CityPlace[] }[] {
  const map = new Map<string, CityPlace[]>();
  for (const p of places) {
    const list = map.get(p.city) || [];
    list.push(p);
    map.set(p.city, list);
  }
  return Array.from(map.entries()).map(([city, places]) => ({
    city: city.charAt(0).toUpperCase() + city.slice(1),
    places,
  }));
}
