/**
 * Gerador de dataset sintético para roteiros do marketplace que vêm
 * de cards "mock" (gerados em DestinationItinerariesScreen) e que não
 * possuem entrada real em src/data/itineraries.ts.
 *
 * Garante que a tela de detalhe (MarketplaceItineraryScreen) tenha
 * `days` e `places` consistentes com os números mostrados no card,
 * evitando seções "Roteiro dia a dia" e "Lugares que você vai explorar"
 * em branco.
 */

import { addDays } from 'date-fns';
import type {
  ItineraryDataset,
  ItineraryDay,
  ItineraryActivity,
  ItineraryPlace,
} from '@/data/itineraries';
import type { DisplayItinerary } from '@/components/screens/DestinationItinerariesScreen';

// Pool genérico de atividades — variado o suficiente para qualquer destino.
// Cada entrada combina categoria + cor + nome + imagem temática.
const ACTIVITY_TEMPLATES: Array<Omit<ItineraryActivity, 'id' | 'startTime' | 'endTime'>> = [
  {
    category: 'Café da manhã',
    categoryColor: '#F59E0B',
    name: 'Café da manhã local',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
    openHours: 'Aberto das 07:00 às 11:00',
    rating: 4.6,
    price: '€€',
  },
  {
    category: 'Museu',
    categoryColor: '#6366F1',
    name: 'Museu histórico',
    image: 'https://images.unsplash.com/photo-1565060299811-1f7c0b3b1c8a?w=600',
    openHours: 'Aberto das 09:00 às 18:00',
    rating: 4.7,
    price: '€12',
  },
  {
    category: 'Ponto turístico',
    categoryColor: '#10B981',
    name: 'Atração principal da cidade',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
    openHours: 'Aberto das 09:00 às 19:00',
    rating: 4.8,
    price: '€18',
  },
  {
    category: 'Restaurante',
    categoryColor: '#F59E0B',
    name: 'Almoço típico',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
    openHours: 'Aberto das 12:00 às 23:00',
    rating: 4.5,
    price: '€€',
  },
  {
    category: 'Mercado',
    categoryColor: '#F59E0B',
    name: 'Mercado local',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600',
    openHours: 'Aberto das 08:00 às 17:00',
    rating: 4.4,
    price: 'Grátis',
  },
  {
    category: 'Mirante',
    categoryColor: '#0EA5E9',
    name: 'Mirante panorâmico',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600',
    openHours: 'Aberto 24h',
    rating: 4.8,
    price: 'Grátis',
  },
  {
    category: 'Parque',
    categoryColor: '#10B981',
    name: 'Parque urbano',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600',
    openHours: 'Aberto 24h',
    rating: 4.6,
    price: 'Grátis',
  },
  {
    category: 'Passeio',
    categoryColor: '#0EA5E9',
    name: 'Passeio guiado',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
    openHours: 'Saídas a cada hora',
    rating: 4.7,
    price: '€20',
  },
  {
    category: 'Igreja',
    categoryColor: '#8B5CF6',
    name: 'Igreja histórica',
    image: 'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=600',
    openHours: 'Aberto das 08:00 às 20:00',
    rating: 4.7,
    price: 'Grátis',
  },
  {
    category: 'Bar',
    categoryColor: '#EC4899',
    name: 'Drinks ao pôr do sol',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600',
    openHours: 'Aberto das 17:00 às 02:00',
    rating: 4.6,
    price: '€€€',
  },
  {
    category: 'Experiência',
    categoryColor: '#10B981',
    name: 'Experiência local',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600',
    openHours: 'Aberto das 10:00 às 19:00',
    rating: 4.7,
    price: '€25',
  },
  {
    category: 'Compras',
    categoryColor: '#F97316',
    name: 'Bairro de compras',
    image: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=600',
    openHours: 'Aberto das 10:00 às 22:00',
    rating: 4.4,
    price: 'Variado',
  },
];

// Horários de início aproximados ao longo do dia.
const START_TIMES = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:30'];
const END_TIMES   = ['10:30', '12:30', '14:30', '16:30', '18:30', '21:30'];

/**
 * Cria um dataset sintético de marketplace a partir de um card "mock".
 * O ID, dias, lugares, autor, preço, etc. respeitam exatamente os
 * metadados do card para manter consistência com a Home/Explorar.
 */
export function buildSyntheticMarketplaceDataset(item: DisplayItinerary): ItineraryDataset {
  const today = new Date();
  const totalDays = Math.max(1, item.days);
  const endDate = addDays(today, totalDays - 1);
  const totalPlaces = Math.max(totalDays, item.places);

  // Distribui os lugares entre os dias o mais uniformemente possível.
  const placesPerDay = Math.max(2, Math.round(totalPlaces / totalDays));

  // Activities IDs counter (único no dataset).
  let activityId = 1;
  const days: ItineraryDay[] = [];
  const places: ItineraryPlace[] = [];

  for (let d = 0; d < totalDays; d++) {
    const dayActivities: ItineraryActivity[] = [];
    const slotsThisDay = Math.min(placesPerDay, START_TIMES.length);
    for (let s = 0; s < slotsThisDay; s++) {
      const tpl = ACTIVITY_TEMPLATES[(d * 3 + s) % ACTIVITY_TEMPLATES.length];
      const placeName = `${tpl.name} ${places.length + 1}`;
      const activity: ItineraryActivity = {
        ...tpl,
        id: activityId++,
        startTime: START_TIMES[s],
        endTime: END_TIMES[s],
        name: placeName,
      };
      dayActivities.push(activity);
      places.push({
        id: places.length + 1,
        name: placeName,
        image: tpl.image,
        category: tpl.category,
        rating: tpl.rating,
        // Coordenadas simbólicas — não usadas no marketplace, mas exigidas pelo tipo.
        lat: 0,
        lng: 0,
        day: d + 1,
      });
      if (places.length >= totalPlaces) break;
    }
    days.push({
      day: d + 1,
      title: `Dia ${d + 1}`,
      date: addDays(today, d),
      activities: dayActivities,
      transports: [],
    });
  }

  return {
    id: item.id,
    title: item.title,
    type: 'marketplace',
    state: 'filled',
    destinations: [],
    startDate: today,
    endDate,
    coverImage: item.image,
    participants: [],
    days,
    places,
    suggestions: [],
    author: item.author,
    authorImage: item.authorImage,
    rating: item.rating,
    reviewCount: 0,
    price: item.price,
  };
}
