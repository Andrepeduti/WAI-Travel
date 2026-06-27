/**
 * Centralized itinerary data store.
 *
 * Each itinerary has its own dataset of days, activities and places.
 * This prevents data leaking between itineraries.
 */

// ─── Shared Types ────────────────────────────────────────────────────────────

export type ItineraryType = 'marketplace' | 'planner';
export type ItineraryState = 'filled' | 'empty';

export interface ItineraryActivity {
  id: number;
  type?: 'activity' | 'note';
  startTime: string;
  endTime: string;
  category: string;
  categoryColor: string;
  name: string;
  image: string;
  openHours: string;
  rating: number;
  price: string;
  // Note-specific fields
  noteText?: string;
}

export interface TransportBetween {
  type: 'walk' | 'bus' | 'metro' | 'car';
  duration: string;
  cost?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  date: Date;
  activities: ItineraryActivity[];
  transports: TransportBetween[];
}

export interface ItineraryPlace {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
  lat: number;
  lng: number;
  day?: number; // which day of the itinerary this place belongs to
}

export interface ItinerarySuggestion {
  id: number;
  name: string;
  rating: number;
  distance: string;
  image: string;
  category?: string;
  categoryColor?: string;
  duration?: number; // recommended duration in minutes
  lat?: number;
  lng?: number;
}

export interface ItineraryDataset {
  id: number;
  title: string;
  type: ItineraryType;
  state: ItineraryState;
  destinations: string[];
  startDate: Date;
  endDate: Date;
  coverImage: string;
  participants: string[];
  days: ItineraryDay[];
  places: ItineraryPlace[];
  suggestions: ItinerarySuggestion[];
  // Marketplace-only fields
  author?: string;
  authorImage?: string;
  authorUsername?: string;
  authorVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  price?: number;
  /** Descrição preenchida pelo criador no fluxo de publicação */
  description?: string;
  /** Tags selecionadas pelo criador no fluxo de publicação */
  tags?: string[];
  /** Tag principal escolhida pelo criador no fluxo de publicação */
  mainTag?: string;
  /** Bump to invalidate persisted localStorage overrides for this itinerary */
  dataVersion?: number;
}

// ─── Private Itineraries ─────────────────────────────────────────────────────

const amsterdamItinerary: ItineraryDataset = {
  id: 1,
  title: 'Amsterdam em 5 dias',
  type: 'planner',
  state: 'filled',
  dataVersion: 2,
  destinations: ['Amsterdam, Holanda'],
  startDate: new Date(2026, 2, 14),
  endDate: new Date(2026, 2, 18),
  coverImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800',
  participants: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=100',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100',
  ],
  days: [
    {
      day: 1,
      title: 'Centro Histórico',
      date: new Date(2026, 2, 14),
      activities: [
        {
          id: 1, startTime: '09:00', endTime: '11:30', category: 'Museu', categoryColor: '#6366F1',
          name: 'Rijksmuseum',
          image: 'https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=300',
          openHours: 'Aberto das 09:00 às 17:00', rating: 4.9, price: '€22,50',
        },
        {
          id: 2, startTime: '12:00', endTime: '13:30', category: 'Restaurante', categoryColor: '#F59E0B',
          name: 'Café de Klos',
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300',
          openHours: 'Aberto das 11:00 às 23:00', rating: 4.6, price: '€€',
        },
        {
          id: 3, startTime: '14:30', endTime: '16:30', category: 'Museu', categoryColor: '#6366F1',
          name: 'Museu Van Gogh',
          image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=300',
          openHours: 'Aberto das 09:00 às 18:00', rating: 4.8, price: '€20',
        },
      ],
      transports: [
        { type: 'walk', duration: '15 min' },
        { type: 'bus', duration: '10 min', cost: '3,20' },
      ],
    },
    {
      day: 2, title: 'Canais & Jordaan', date: new Date(2026, 2, 15),
      activities: [
        { id: 4, startTime: '09:30', endTime: '11:00', category: 'Museu', categoryColor: '#6366F1', name: 'Casa de Anne Frank', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=300', openHours: 'Aberto das 09:00 às 22:00', rating: 4.8, price: '€16' },
        { id: 5, startTime: '12:00', endTime: '13:30', category: 'Mercado', categoryColor: '#F59E0B', name: 'Bloemenmarkt', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=300', openHours: 'Aberto das 09:00 às 17:30', rating: 4.5, price: 'Grátis' },
        { id: 6, startTime: '15:00', endTime: '17:00', category: 'Passeio', categoryColor: '#0EA5E9', name: 'Cruzeiro pelos Canais', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=300', openHours: 'Saídas a cada 30min', rating: 4.7, price: '€18' },
      ],
      transports: [
        { type: 'walk', duration: '12 min' },
        { type: 'metro', duration: '8 min', cost: '3,40' },
      ],
    },
    {
      day: 3, title: 'Vondelpark & Museus', date: new Date(2026, 2, 16),
      activities: [
        { id: 7, startTime: '10:00', endTime: '12:00', category: 'Parque', categoryColor: '#10B981', name: 'Vondelpark', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300', openHours: 'Aberto 24h', rating: 4.7, price: 'Grátis' },
        { id: 8, startTime: '13:00', endTime: '14:30', category: 'Restaurante', categoryColor: '#F59E0B', name: 'The Pancake Bakery', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300', openHours: 'Aberto das 09:00 às 21:30', rating: 4.5, price: '€€' },
        { id: 9, startTime: '15:30', endTime: '17:30', category: 'Experiência', categoryColor: '#10B981', name: 'Heineken Experience', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300', openHours: 'Aberto das 10:30 às 19:00', rating: 4.4, price: '€23' },
      ],
      transports: [
        { type: 'walk', duration: '10 min' },
        { type: 'metro', duration: '15 min', cost: '3,40' },
      ],
    },
    {
      day: 4, title: 'Noord & NDSM', date: new Date(2026, 2, 17),
      activities: [
        { id: 10, startTime: '10:00', endTime: '11:00', category: 'Mirante', categoryColor: '#0EA5E9', name: "A'DAM Lookout", image: 'https://images.unsplash.com/photo-1512470876337-d72d5c37f8f3?w=300', openHours: 'Aberto das 10:00 às 22:00', rating: 4.6, price: '€16,50' },
        { id: 11, startTime: '12:30', endTime: '14:00', category: 'Restaurante', categoryColor: '#F59E0B', name: 'Café Restaurant Stork', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300', openHours: 'Aberto das 12:00 às 23:00', rating: 4.4, price: '€€€' },
        { id: 12, startTime: '15:00', endTime: '17:00', category: 'Cultura', categoryColor: '#6366F1', name: 'NDSM Wharf', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=300', openHours: 'Área aberta', rating: 4.5, price: 'Grátis' },
      ],
      transports: [
        { type: 'walk', duration: '15 min' },
        { type: 'walk', duration: '10 min' },
      ],
    },
    { day: 5, title: 'Despedida', date: new Date(2026, 2, 18), activities: [], transports: [] },
  ],
  places: [
    { id: 1, name: 'Rijksmuseum', image: 'https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=400', category: 'Museu', rating: 4.9, lat: 52.3600, lng: 4.8852, day: 1 },
    { id: 2, name: 'Museu Van Gogh', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400', category: 'Museu', rating: 4.8, lat: 52.3584, lng: 4.8811, day: 1 },
    { id: 3, name: 'Museu Anne Frank', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=400', category: 'Museu', rating: 4.8, lat: 52.3752, lng: 4.8840, day: 2 },
    { id: 4, name: 'Vondelpark', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', category: 'Parque', rating: 4.7, lat: 52.3580, lng: 4.8686, day: 3 },
    { id: 5, name: 'Café de Klos', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400', category: 'Restaurante', rating: 4.6, lat: 52.3656, lng: 4.8838, day: 1 },
    { id: 6, name: 'A\'DAM Lookout', image: 'https://images.unsplash.com/photo-1512470876337-d72d5c37f8f3?w=400', category: 'Mirante', rating: 4.6, lat: 52.3843, lng: 4.9013, day: 4 },
    { id: 7, name: 'Casa de Anne Frank', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=400', category: 'Museu', rating: 4.8, lat: 52.3752, lng: 4.8840 },
    { id: 8, name: 'Bloemenmarkt', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400', category: 'Mercado', rating: 4.5, lat: 52.3667, lng: 4.8913 },
    { id: 9, name: 'Heineken Experience', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', category: 'Experiência', rating: 4.4, lat: 52.3578, lng: 4.8919 },
  ],
  suggestions: [
    { id: 1, name: 'Casa de Anne Frank', rating: 4.8, distance: '2.1 KM', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=300', category: 'Museu', categoryColor: '#6366F1', duration: 90 },
    { id: 2, name: 'Bloemenmarkt', rating: 4.5, distance: '1.4 KM', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=300', category: 'Mercado', categoryColor: '#F59E0B', duration: 60 },
    { id: 3, name: 'A\'DAM Lookout', rating: 4.6, distance: '3.5 KM', image: 'https://images.unsplash.com/photo-1512470876337-d72d5c37f8f3?w=300', category: 'Mirante', categoryColor: '#0EA5E9', duration: 45 },
    { id: 4, name: 'Heineken Experience', rating: 4.4, distance: '1.8 KM', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300', category: 'Experiência', categoryColor: '#10B981', duration: 90 },
  ],
};

const parisItinerary: ItineraryDataset = {
  id: 2,
  title: 'Paris Romântica',
  type: 'planner',
  state: 'filled',
  destinations: ['Paris, França'],
  startDate: new Date(2026, 2, 14),
  endDate: new Date(2026, 3, 24),
  coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  participants: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
  ],
  days: [
    {
      day: 1, title: 'Histórico', date: new Date(2026, 2, 14),
      activities: [
        { id: 1, startTime: '08:00', endTime: '10:00', category: 'Museu', categoryColor: '#6366F1', name: 'Museu do Louvre', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300', openHours: 'Aberto das 09:00 às 18:00', rating: 4.8, price: '€17' },
        { id: 2, startTime: '11:30', endTime: '13:00', category: 'Restaurante', categoryColor: '#F59E0B', name: 'Café de Flore', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=300', openHours: 'Aberto das 07:00 às 01:00', rating: 4.5, price: '€€' },
        { id: 3, startTime: '14:00', endTime: '16:00', category: 'Ponto Turístico', categoryColor: '#10B981', name: 'Torre Eiffel', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=300', openHours: 'Aberto das 09:00 às 00:45', rating: 4.9, price: '€26' },
      ],
      transports: [
        { type: 'walk', duration: '10 min' },
        { type: 'bus', duration: '20 min', cost: '2,50' },
      ],
    },
    { day: 2, title: 'Montmartre', date: new Date(2026, 2, 15), activities: [], transports: [] },
    { day: 3, title: 'Versalhes', date: new Date(2026, 2, 16), activities: [], transports: [] },
  ],
  places: [
    { id: 1, name: 'Museu do Louvre', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400', category: 'Museu', rating: 4.8, lat: 48.8606, lng: 2.3376, day: 1 },
    { id: 2, name: 'Torre Eiffel', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=400', category: 'Monumento', rating: 4.9, lat: 48.8584, lng: 2.2945, day: 1 },
    { id: 3, name: 'Sacré-Cœur', image: 'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=400', category: 'Igreja', rating: 4.7, lat: 48.8867, lng: 2.3431, day: 2 },
    { id: 4, name: 'Jardim de Luxemburgo', image: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400', category: 'Parque', rating: 4.6, lat: 48.8462, lng: 2.3372, day: 1 },
    { id: 5, name: 'Café de Flore', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400', category: 'Restaurante', rating: 4.5, lat: 48.8540, lng: 2.3326, day: 1 },
    { id: 6, name: 'Palácio de Versalhes', image: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400', category: 'Palácio', rating: 4.9, lat: 48.8049, lng: 2.1204, day: 3 },
  ],
  suggestions: [
    { id: 1, name: 'Museu d\'Orsay', rating: 4.7, distance: '1.2 KM', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300', category: 'Museu', categoryColor: '#6366F1', duration: 120 },
    { id: 2, name: 'Arco do Triunfo', rating: 4.6, distance: '2.5 KM', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300', category: 'Monumento', categoryColor: '#8B5CF6', duration: 60 },
    { id: 3, name: 'Notre-Dame', rating: 4.8, distance: '0.8 KM', image: 'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=300', category: 'Igreja', categoryColor: '#8B5CF6', duration: 45 },
    { id: 4, name: 'Champs-Élysées', rating: 4.5, distance: '2.0 KM', image: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=300', category: 'Passeio', categoryColor: '#10B981', duration: 90 },
  ],
};

const tokyoItinerary: ItineraryDataset = {
  id: 3,
  title: 'Roteiro Completo Tóquio',
  type: 'planner',
  state: 'empty',
  destinations: ['Tóquio, Japão'],
  startDate: new Date(2026, 2, 14),
  endDate: new Date(2026, 3, 24),
  coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
  participants: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
  ],
  days: [
    { day: 1, title: 'Shibuya', date: new Date(2026, 2, 14), activities: [], transports: [] },
    { day: 2, title: 'Asakusa', date: new Date(2026, 2, 15), activities: [], transports: [] },
    { day: 3, title: 'Akihabara', date: new Date(2026, 2, 16), activities: [], transports: [] },
  ],
  places: [],
  suggestions: [
    { id: 1, name: 'Templo Senso-ji', rating: 4.8, distance: '3.2 KM', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=300', category: 'Templo', categoryColor: '#F97316', duration: 90 },
    { id: 2, name: 'Shibuya Crossing', rating: 4.7, distance: '1.5 KM', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=300', category: 'Ponto Turístico', categoryColor: '#10B981', duration: 30 },
    { id: 3, name: 'Meiji Shrine', rating: 4.9, distance: '2.8 KM', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=300', category: 'Templo', categoryColor: '#F97316', duration: 60 },
    { id: 4, name: 'Tokyo Tower', rating: 4.5, distance: '4.1 KM', image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=300', category: 'Mirante', categoryColor: '#0EA5E9', duration: 60 },
  ],
};

// ─── Marketplace Itineraries ─────────────────────────────────────────────────

const greciaItinerary: ItineraryDataset = {
  id: 4,
  title: 'Grécia Mitológica',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Atenas, Grécia', 'Santorini, Grécia'],
  startDate: new Date(2026, 4, 20),
  endDate: new Date(2026, 4, 30),
  coverImage: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
  participants: [],
  author: 'Maria Vieira',
  authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  rating: 4.8,
  reviewCount: 245,
  price: 59,
  tags: ['Cultura', 'História', 'Praia', 'Romance', 'Gastronomia'],
  mainTag: 'Cultura',
  days: [
    {
      day: 1, title: 'Chegada em Atenas', date: new Date(2026, 4, 20),
      activities: [
        { id: 401, startTime: '10:00', endTime: '12:30', category: 'Museu', categoryColor: '#6366F1', name: 'Museu Arqueológico Nacional', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400', openHours: '8h - 20h', rating: 4.7, price: '€ 12' },
        { id: 402, startTime: '13:30', endTime: '15:00', category: 'Praça', categoryColor: '#F59E0B', name: 'Praça Syntagma', image: 'https://images.unsplash.com/photo-1555400082-d78c66fa7a6a?w=400', openHours: '24h', rating: 4.5, price: 'Grátis' },
        { id: 403, startTime: '16:00', endTime: '18:00', category: 'Bairro', categoryColor: '#10B981', name: 'Pláka', image: 'https://images.unsplash.com/photo-1555400082-d78c66fa7a6a?w=400', openHours: '24h', rating: 4.6, price: 'Grátis' },
      ],
      transports: [{ type: 'walk', duration: '15 min' }, { type: 'walk', duration: '12 min' }],
    },
    {
      day: 2, title: 'Acrópole', date: new Date(2026, 4, 21),
      activities: [
        { id: 404, startTime: '08:30', endTime: '12:00', category: 'Ruínas', categoryColor: '#EF4444', name: 'Acrópole de Atenas', image: 'https://images.unsplash.com/photo-1555400082-d78c66fa7a6a?w=400', openHours: '8h - 20h', rating: 4.9, price: '€ 20' },
        { id: 405, startTime: '12:30', endTime: '14:00', category: 'Museu', categoryColor: '#6366F1', name: 'Museu da Acrópole', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400', openHours: '8h - 20h', rating: 4.8, price: '€ 10' },
        { id: 406, startTime: '15:00', endTime: '17:00', category: 'Passeio', categoryColor: '#10B981', name: 'Ágora Antiga', image: 'https://images.unsplash.com/photo-1555400082-d78c66fa7a6a?w=400', openHours: '8h - 19h', rating: 4.6, price: '€ 10' },
      ],
      transports: [{ type: 'walk', duration: '5 min' }, { type: 'walk', duration: '10 min' }],
    },
    {
      day: 3, title: 'Santorini', date: new Date(2026, 4, 22),
      activities: [
        { id: 407, startTime: '10:00', endTime: '13:00', category: 'Cidade', categoryColor: '#3B82F6', name: 'Oia, Santorini', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
        { id: 408, startTime: '14:00', endTime: '17:00', category: 'Praia', categoryColor: '#06B6D4', name: 'Praia Vermelha', image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=400', openHours: '24h', rating: 4.6, price: 'Grátis' },
        { id: 409, startTime: '18:00', endTime: '20:00', category: 'Mirante', categoryColor: '#F59E0B', name: 'Pôr do Sol em Oia', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
      ],
      transports: [{ type: 'bus', duration: '20 min' }, { type: 'walk', duration: '10 min' }],
    },
  ],
  places: [
    { id: 1, name: 'Acrópole de Atenas', image: 'https://images.unsplash.com/photo-1555400082-d78c66fa7a6a?w=400', category: 'Ruínas', rating: 4.9, lat: 37.9715, lng: 23.7257, day: 2 },
    { id: 2, name: 'Oia, Santorini', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400', category: 'Cidade', rating: 4.8, lat: 36.4618, lng: 25.3753, day: 3 },
    { id: 3, name: 'Museu Arqueológico', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400', category: 'Museu', rating: 4.7, lat: 37.9891, lng: 23.7322, day: 1 },
    { id: 4, name: 'Praia Vermelha', image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=400', category: 'Praia', rating: 4.6, lat: 36.3504, lng: 25.3962, day: 3 },
  ],
  suggestions: [],
};

const portugalEspanhaItinerary: ItineraryDataset = {
  id: 5,
  title: 'Portugal & Espanha',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Lisboa, Portugal', 'Madrid, Espanha', 'Barcelona, Espanha'],
  startDate: new Date(2026, 5, 10),
  endDate: new Date(2026, 5, 25),
  coverImage: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
  participants: [],
  author: 'Carlos Santos',
  authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  rating: 4.5,
  reviewCount: 182,
  price: 45,
  tags: ['História', 'Gastronomia', 'Praia', 'Arquitetura', 'Família'],
  mainTag: 'História',
  days: [
    {
      day: 1, title: 'Lisboa', date: new Date(2026, 5, 10),
      activities: [
        { id: 501, startTime: '10:00', endTime: '12:00', category: 'Monumento', categoryColor: '#F59E0B', name: 'Torre de Belém', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '10h - 17h30', rating: 4.7, price: '€ 8' },
        { id: 502, startTime: '12:30', endTime: '14:00', category: 'Monumento', categoryColor: '#8B5CF6', name: 'Mosteiro dos Jerónimos', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '10h - 17h', rating: 4.9, price: '€ 10' },
        { id: 503, startTime: '15:00', endTime: '17:00', category: 'Bairro', categoryColor: '#10B981', name: 'Alfama', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '24h', rating: 4.6, price: 'Grátis' },
      ],
      transports: [{ type: 'bus', duration: '15 min' }, { type: 'walk', duration: '20 min' }],
    },
    {
      day: 2, title: 'Sintra', date: new Date(2026, 5, 11),
      activities: [
        { id: 504, startTime: '09:00', endTime: '12:00', category: 'Castelo', categoryColor: '#EF4444', name: 'Palácio da Pena', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400', openHours: '9h30 - 18h30', rating: 4.9, price: '€ 14' },
        { id: 505, startTime: '13:00', endTime: '15:00', category: 'Castelo', categoryColor: '#EF4444', name: 'Castelo dos Mouros', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400', openHours: '10h - 18h', rating: 4.7, price: '€ 8' },
        { id: 506, startTime: '16:00', endTime: '17:30', category: 'Natureza', categoryColor: '#10B981', name: 'Cabo da Roca', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
      ],
      transports: [{ type: 'walk', duration: '15 min' }, { type: 'car', duration: '30 min' }],
    },
    {
      day: 3, title: 'Madrid', date: new Date(2026, 5, 12),
      activities: [
        { id: 507, startTime: '10:00', endTime: '14:00', category: 'Museu', categoryColor: '#6366F1', name: 'Museu do Prado', image: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=400', openHours: '10h - 20h', rating: 4.8, price: '€ 15' },
        { id: 508, startTime: '15:00', endTime: '17:00', category: 'Praça', categoryColor: '#F59E0B', name: 'Plaza Mayor', image: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=400', openHours: '24h', rating: 4.6, price: 'Grátis' },
        { id: 509, startTime: '18:00', endTime: '20:00', category: 'Parque', categoryColor: '#10B981', name: 'Parque del Retiro', image: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=400', openHours: '6h - 0h', rating: 4.7, price: 'Grátis' },
      ],
      transports: [{ type: 'walk', duration: '10 min' }, { type: 'walk', duration: '15 min' }],
    },
  ],
  places: [
    { id: 1, name: 'Torre de Belém', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', category: 'Monumento', rating: 4.7, lat: 38.6916, lng: -9.2160, day: 1 },
    { id: 2, name: 'Palácio da Pena', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400', category: 'Castelo', rating: 4.9, lat: 38.7876, lng: -9.3907, day: 2 },
    { id: 3, name: 'Museu do Prado', image: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=400', category: 'Museu', rating: 4.8, lat: 40.4138, lng: -3.6921, day: 3 },
    { id: 4, name: 'Sagrada Família', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', category: 'Igreja', rating: 4.9, lat: 41.4036, lng: 2.1744, day: 3 },
  ],
  suggestions: [],
};

// ─── Favorites (marketplace type) ────────────────────────────────────────────

const rotaVinhosItinerary: ItineraryDataset = {
  id: 101,
  title: 'Rota dos Vinhos - Portugal',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Porto, Portugal', 'Douro, Portugal'],
  startDate: new Date(2026, 6, 1),
  endDate: new Date(2026, 6, 7),
  coverImage: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
  participants: [],
  author: '@marianatravel',
  authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
  rating: 4.9,
  reviewCount: 312,
  price: 0,
    tags: ['Gastronomia', 'Romance', 'Natureza', 'Praia', 'Relaxamento'],
  mainTag: 'Gastronomia',
  days: [
    {
      day: 1, title: 'Porto', date: new Date(2026, 6, 1),
      activities: [
        { id: 601, startTime: '10:00', endTime: '12:00', category: 'Vinícola', categoryColor: '#8B5CF6', name: 'Cave Sandeman', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '10h - 18h', rating: 4.8, price: '€ 15' },
        { id: 602, startTime: '13:00', endTime: '15:00', category: 'Passeio', categoryColor: '#10B981', name: 'Ribeira do Porto', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
        { id: 603, startTime: '16:00', endTime: '17:30', category: 'Monumento', categoryColor: '#F59E0B', name: 'Livraria Lello', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '9h30 - 19h', rating: 4.7, price: '€ 5' },
      ],
      transports: [{ type: 'walk', duration: '10 min' }, { type: 'walk', duration: '15 min' }],
    },
    {
      day: 2, title: 'Vale do Douro', date: new Date(2026, 6, 2),
      activities: [
        { id: 604, startTime: '09:00', endTime: '12:00', category: 'Passeio', categoryColor: '#3B82F6', name: 'Cruzeiro no Douro', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '9h - 17h', rating: 4.9, price: '€ 55' },
        { id: 605, startTime: '13:00', endTime: '16:00', category: 'Vinícola', categoryColor: '#8B5CF6', name: 'Quinta do Vallado', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', openHours: '10h - 18h', rating: 4.8, price: '€ 20' },
      ],
      transports: [{ type: 'car', duration: '25 min' }],
    },
  ],
  places: [
    { id: 1, name: 'Cave Sandeman', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400', category: 'Vinícola', rating: 4.8, lat: 41.1372, lng: -8.6130, day: 1 },
    { id: 2, name: 'Ribeira do Porto', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400', category: 'Passeio', rating: 4.9, lat: 41.1405, lng: -8.6130, day: 1 },
  ],
  suggestions: [],
};

const tailandiaItinerary: ItineraryDataset = {
  id: 102,
  title: 'Tailândia Completa',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Bangkok, Tailândia', 'Chiang Mai, Tailândia', 'Phuket, Tailândia'],
  startDate: new Date(2026, 7, 1),
  endDate: new Date(2026, 7, 14),
  coverImage: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
  participants: [],
  author: '@alexmundo',
  authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
  rating: 4.7,
  reviewCount: 198,
  price: 79.90,
    tags: ['Cultura', 'Praia', 'Aventura', 'Gastronomia', 'Natureza'],
  mainTag: 'Cultura',
  days: [
    {
      day: 1, title: 'Bangkok', date: new Date(2026, 7, 1),
      activities: [
        { id: 701, startTime: '09:00', endTime: '12:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Grand Palace', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', openHours: '8h30 - 15h30', rating: 4.8, price: 'THB 500' },
        { id: 702, startTime: '13:00', endTime: '15:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Wat Pho', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', openHours: '8h - 18h30', rating: 4.7, price: 'THB 200' },
        { id: 703, startTime: '16:00', endTime: '18:00', category: 'Mercado', categoryColor: '#10B981', name: 'Chatuchak Market', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', openHours: '9h - 18h', rating: 4.5, price: 'Grátis' },
      ],
      transports: [{ type: 'bus', duration: '10 min' }, { type: 'metro', duration: '25 min' }],
    },
    {
      day: 2, title: 'Templos', date: new Date(2026, 7, 2),
      activities: [
        { id: 704, startTime: '08:00', endTime: '10:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Wat Arun', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', openHours: '8h - 18h', rating: 4.7, price: 'THB 100' },
        { id: 705, startTime: '11:00', endTime: '13:00', category: 'Mercado', categoryColor: '#EF4444', name: 'Mercado Flutuante', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', openHours: '7h - 14h', rating: 4.6, price: 'Grátis' },
        { id: 706, startTime: '17:00', endTime: '20:00', category: 'Passeio', categoryColor: '#3B82F6', name: 'Khao San Road', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', openHours: '24h', rating: 4.4, price: 'Grátis' },
      ],
      transports: [{ type: 'bus', duration: '15 min' }, { type: 'car', duration: '20 min' }],
    },
  ],
  places: [
    { id: 1, name: 'Grand Palace', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', category: 'Templo', rating: 4.8, lat: 13.7500, lng: 100.4913, day: 1 },
    { id: 2, name: 'Wat Arun', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400', category: 'Templo', rating: 4.7, lat: 13.7437, lng: 100.4889, day: 2 },
  ],
  suggestions: [],
};

// ─── Leste Europeu (used from marketplace/home) ──────────────────────────────

const lesteEuropeuItinerary: ItineraryDataset = {
  id: 100,
  title: 'Leste Europeu no Natal',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Praga, Tchéquia', 'Viena, Áustria', 'Budapeste, Hungria'],
  startDate: new Date(2026, 11, 18),
  endDate: new Date(2026, 11, 24),
  coverImage: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  participants: [],
  author: 'Laura Fernandes',
  authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  rating: 4.6,
  reviewCount: 234,
  price: 50,
    tags: ['História', 'Cultura', 'Gastronomia', 'Romance', 'Festivais'],
  mainTag: 'História',
  days: [
    {
      day: 1,
      title: 'Chegada em Praga',
      date: new Date(2026, 11, 18),
      activities: [
        { id: 102, startTime: '10:00', endTime: '12:00', category: 'Praça', categoryColor: '#F59E0B', name: 'Praça da Cidade Velha', image: 'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
        { id: 103, startTime: '12:30', endTime: '13:30', category: 'Monumento', categoryColor: '#8B5CF6', name: 'Relógio Astronômico', image: 'https://images.unsplash.com/photo-1458150945447-7fb764c11a92?w=400', openHours: '9h - 21h', rating: 4.7, price: 'CZK 250' },
        { id: 104, startTime: '14:00', endTime: '16:00', category: 'Passeio', categoryColor: '#10B981', name: 'Ponte Carlos', image: 'https://images.unsplash.com/photo-1574322092489-e5cb9e92aae0?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
      ],
      transports: [
        { type: 'walk', duration: '10 min' },
        { type: 'walk', duration: '15 min' },
      ],
    },
    {
      day: 2,
      title: 'Castelo de Praga',
      date: new Date(2026, 11, 19),
      activities: [
        { id: 201, startTime: '09:00', endTime: '12:00', category: 'História', categoryColor: '#EF4444', name: 'Castelo de Praga', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400', openHours: '9h - 17h', rating: 4.8, price: 'CZK 350' },
        { id: 202, startTime: '12:30', endTime: '14:00', category: 'Igreja', categoryColor: '#8B5CF6', name: 'Catedral de São Vito', image: 'https://images.unsplash.com/photo-1579862109958-c3d0e1c76d06?w=400', openHours: '9h - 17h', rating: 4.9, price: 'Incluído' },
        { id: 203, startTime: '14:30', endTime: '16:00', category: 'História', categoryColor: '#EF4444', name: 'Beco Dourado', image: 'https://images.unsplash.com/photo-1600623471616-8c1966c91ff6?w=400', openHours: '9h - 17h', rating: 4.5, price: 'Incluído' },
        { id: 204, startTime: '16:30', endTime: '18:00', category: 'Natureza', categoryColor: '#10B981', name: 'Jardins Reais', image: 'https://images.unsplash.com/photo-1588714477688-98f01cff5a36?w=400', openHours: '10h - 18h', rating: 4.6, price: 'Grátis' },
      ],
      transports: [
        { type: 'walk', duration: '5 min' },
        { type: 'walk', duration: '10 min' },
        { type: 'walk', duration: '15 min' },
      ],
    },
    {
      day: 3,
      title: 'Viagem para Viena',
      date: new Date(2026, 11, 20),
      activities: [
        { id: 301, startTime: '08:00', endTime: '12:00', category: 'Transporte', categoryColor: '#3B82F6', name: 'Trem Praga → Viena', image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400', openHours: '-', rating: 4.5, price: '€ 19' },
        { id: 302, startTime: '14:00', endTime: '16:00', category: 'Praça', categoryColor: '#F59E0B', name: 'Stephansplatz', image: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
        { id: 303, startTime: '16:30', endTime: '18:00', category: 'Passeio', categoryColor: '#10B981', name: 'Graben', image: 'https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=400', openHours: '24h', rating: 4.4, price: 'Grátis' },
      ],
      transports: [
        { type: 'walk', duration: '10 min' },
        { type: 'walk', duration: '8 min' },
      ],
    },
    {
      day: 4,
      title: 'Palácios de Viena',
      date: new Date(2026, 11, 21),
      activities: [
        { id: 401, startTime: '09:00', endTime: '12:00', category: 'Palácio', categoryColor: '#F59E0B', name: 'Palácio de Schönbrunn', image: 'https://images.unsplash.com/photo-1609856878074-cf31e21ccb6b?w=400', openHours: '8h30 - 17h', rating: 4.9, price: '€ 22' },
        { id: 402, startTime: '13:00', endTime: '15:00', category: 'Museu', categoryColor: '#8B5CF6', name: 'Museu de História da Arte', image: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400', openHours: '10h - 18h', rating: 4.8, price: '€ 16' },
        { id: 403, startTime: '15:30', endTime: '17:00', category: 'Passeio', categoryColor: '#10B981', name: 'Ringstrasse', image: 'https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=400', openHours: '24h', rating: 4.5, price: 'Grátis' },
      ],
      transports: [
        { type: 'metro', duration: '20 min', cost: '€ 2.40' },
        { type: 'walk', duration: '12 min' },
      ],
    },
    {
      day: 5,
      title: 'Viagem para Budapeste',
      date: new Date(2026, 11, 22),
      activities: [
        { id: 501, startTime: '08:00', endTime: '10:30', category: 'Transporte', categoryColor: '#3B82F6', name: 'Trem Viena → Budapeste', image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400', openHours: '-', rating: 4.6, price: '€ 25' },
        { id: 502, startTime: '12:00', endTime: '14:00', category: 'Passeio', categoryColor: '#10B981', name: 'Margem do Danúbio', image: 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
        { id: 503, startTime: '15:00', endTime: '17:00', category: 'História', categoryColor: '#EF4444', name: 'Parlamento Húngaro', image: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=400', openHours: '8h - 18h', rating: 4.9, price: 'HUF 6000' },
        { id: 504, startTime: '18:00', endTime: '20:00', category: 'Termas', categoryColor: '#06B6D4', name: 'Termas Széchenyi', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400', openHours: '6h - 22h', rating: 4.7, price: 'HUF 7200' },
      ],
      transports: [
        { type: 'bus', duration: '30 min' },
        { type: 'walk', duration: '15 min' },
        { type: 'metro', duration: '10 min', cost: 'HUF 450' },
      ],
    },
    {
      day: 6,
      title: 'Buda e o Castelo',
      date: new Date(2026, 11, 23),
      activities: [
        { id: 601, startTime: '09:00', endTime: '11:30', category: 'História', categoryColor: '#EF4444', name: 'Castelo de Buda', image: 'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?w=400', openHours: '10h - 18h', rating: 4.8, price: 'HUF 3000' },
        { id: 602, startTime: '12:00', endTime: '13:00', category: 'Igreja', categoryColor: '#8B5CF6', name: 'Igreja de Matias', image: 'https://images.unsplash.com/photo-1577281083916-2baf3c59cce6?w=400', openHours: '9h - 17h', rating: 4.7, price: 'HUF 2500' },
        { id: 603, startTime: '13:30', endTime: '14:30', category: 'Mirante', categoryColor: '#F59E0B', name: 'Bastião dos Pescadores', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400', openHours: '9h - 23h', rating: 4.9, price: 'HUF 1200' },
        { id: 604, startTime: '16:00', endTime: '18:00', category: 'Mercado', categoryColor: '#10B981', name: 'Mercado Central', image: 'https://images.unsplash.com/photo-1555992457-b8fefdd09069?w=400', openHours: '6h - 18h', rating: 4.6, price: 'Grátis' },
      ],
      transports: [
        { type: 'walk', duration: '8 min' },
        { type: 'walk', duration: '5 min' },
        { type: 'bus', duration: '20 min', cost: 'HUF 450' },
      ],
    },
    {
      day: 7,
      title: 'Natal em Budapeste',
      date: new Date(2026, 11, 24),
      activities: [
        { id: 701, startTime: '10:00', endTime: '12:00', category: 'Mercado', categoryColor: '#EF4444', name: 'Feira de Natal Vörösmarty', image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=400', openHours: '10h - 21h', rating: 4.9, price: 'Grátis' },
        { id: 702, startTime: '13:00', endTime: '14:30', category: 'Igreja', categoryColor: '#8B5CF6', name: 'Basílica de Santo Estêvão', image: 'https://images.unsplash.com/photo-1577281083916-2baf3c59cce6?w=400', openHours: '9h - 17h', rating: 4.8, price: 'HUF 600' },
        { id: 703, startTime: '15:00', endTime: '17:00', category: 'Passeio', categoryColor: '#10B981', name: 'Avenida Andrássy', image: 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=400', openHours: '24h', rating: 4.5, price: 'Grátis' },
      ],
      transports: [
        { type: 'walk', duration: '10 min' },
        { type: 'walk', duration: '12 min' },
      ],
    },
  ],
  places: [
    { id: 1, name: 'Castelo de Praga', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800', category: 'História', rating: 4.8, lat: 50.0910, lng: 14.4013, day: 1 },
    { id: 2, name: 'Ponte Carlos', image: 'https://images.unsplash.com/photo-1574322092489-e5cb9e92aae0?w=800', category: 'Passeio', rating: 4.9, lat: 50.0865, lng: 14.4114, day: 1 },
    { id: 3, name: 'Relógio Astronômico', image: 'https://images.unsplash.com/photo-1458150945447-7fb764c11a92?w=800', category: 'Monumento', rating: 4.7, lat: 50.0870, lng: 14.4208, day: 2 },
    { id: 4, name: 'Praça da Cidade Velha', image: 'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800', category: 'Praça', rating: 4.8, lat: 50.0874, lng: 14.4213, day: 2 },
    { id: 5, name: 'Stephansplatz', image: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800', category: 'Praça', rating: 4.7, lat: 48.2082, lng: 16.3738, day: 3 },
    { id: 6, name: 'Palácio de Schönbrunn', image: 'https://images.unsplash.com/photo-1609856878074-cf31e21ccb6b?w=800', category: 'Palácio', rating: 4.9, lat: 48.1845, lng: 16.3122, day: 4 },
    { id: 7, name: 'Parlamento Húngaro', image: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=800', category: 'História', rating: 4.9, lat: 47.5073, lng: 19.0458, day: 5 },
    { id: 8, name: 'Termas Széchenyi', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', category: 'Termas', rating: 4.7, lat: 47.5185, lng: 19.0823, day: 5 },
    { id: 9, name: 'Castelo de Buda', image: 'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?w=800', category: 'História', rating: 4.8, lat: 47.4962, lng: 19.0396, day: 6 },
    { id: 10, name: 'Bastião dos Pescadores', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800', category: 'Mirante', rating: 4.9, lat: 47.5020, lng: 19.0348, day: 6 },
    { id: 11, name: 'Basílica de Santo Estêvão', image: 'https://images.unsplash.com/photo-1577281083916-2baf3c59cce6?w=800', category: 'Igreja', rating: 4.8, lat: 47.5009, lng: 19.0536, day: 7 },
  ],
  suggestions: [],
};

// ─── Additional Marketplace Itineraries ──────────────────────────────────────

const parisRomanticaItinerary: ItineraryDataset = {
  id: 106,
  title: 'Paris Romântica',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Paris, França'],
  startDate: new Date(2026, 4, 1),
  endDate: new Date(2026, 4, 6),
  coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  participants: [],
  author: 'Marina Costa',
  authorImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  rating: 4.9,
  reviewCount: 412,
  price: 75,
  tags: ['Romance', 'Cultura', 'Gastronomia', 'Arte', 'História'],
  mainTag: 'Romance',
  days: [
    { day: 1, title: 'Chegada & Montmartre', date: new Date(2026, 4, 1), activities: [
      { id: 1, startTime: '10:00', endTime: '12:00', category: 'Bairro', categoryColor: '#F59E0B', name: 'Montmartre', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
      { id: 2, startTime: '12:30', endTime: '14:00', category: 'Igreja', categoryColor: '#8B5CF6', name: 'Sacré-Cœur', image: 'https://images.unsplash.com/photo-1568684333877-4d2e9d48a718?w=400', openHours: '6h - 22h30', rating: 4.9, price: 'Grátis' },
      { id: 3, startTime: '15:00', endTime: '17:00', category: 'Restaurante', categoryColor: '#EF4444', name: 'Le Consulat', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400', openHours: '12h - 23h', rating: 4.6, price: '€€' },
    ], transports: [{ type: 'walk', duration: '10 min' }, { type: 'walk', duration: '15 min' }] },
    { day: 2, title: 'Torre Eiffel & Sena', date: new Date(2026, 4, 2), activities: [
      { id: 4, startTime: '09:00', endTime: '12:00', category: 'Monumento', categoryColor: '#3B82F6', name: 'Torre Eiffel', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400', openHours: '9h - 0h45', rating: 4.9, price: '€ 29,40' },
      { id: 5, startTime: '14:00', endTime: '16:00', category: 'Passeio', categoryColor: '#10B981', name: 'Cruzeiro no Sena', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400', openHours: '10h - 22h', rating: 4.8, price: '€ 16' },
    ], transports: [{ type: 'walk', duration: '20 min' }] },
    { day: 3, title: 'Louvre & Tuileries', date: new Date(2026, 4, 3), activities: [
      { id: 6, startTime: '09:00', endTime: '13:00', category: 'Museu', categoryColor: '#6366F1', name: 'Museu do Louvre', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400', openHours: '9h - 18h', rating: 4.9, price: '€ 22' },
      { id: 7, startTime: '14:00', endTime: '16:00', category: 'Jardim', categoryColor: '#10B981', name: 'Jardins de Tuileries', image: 'https://images.unsplash.com/photo-1555992457-5c7d9e3b5aa9?w=400', openHours: '7h - 21h', rating: 4.7, price: 'Grátis' },
    ], transports: [{ type: 'walk', duration: '10 min' }] },
    { day: 4, title: 'Le Marais & Île de la Cité', date: new Date(2026, 4, 4), activities: [
      { id: 8, startTime: '10:00', endTime: '12:00', category: 'Bairro', categoryColor: '#F59E0B', name: 'Le Marais', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
      { id: 9, startTime: '14:00', endTime: '16:00', category: 'Igreja', categoryColor: '#8B5CF6', name: 'Notre-Dame (exterior)', image: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
    ], transports: [{ type: 'walk', duration: '15 min' }] },
    { day: 5, title: 'Versalhes', date: new Date(2026, 4, 5), activities: [
      { id: 10, startTime: '09:00', endTime: '16:00', category: 'Palácio', categoryColor: '#F59E0B', name: 'Palácio de Versalhes', image: 'https://images.unsplash.com/photo-1551410224-699683e15636?w=400', openHours: '9h - 18h30', rating: 4.9, price: '€ 21' },
    ], transports: [] },
    { day: 6, title: 'Despedida', date: new Date(2026, 4, 6), activities: [
      { id: 11, startTime: '10:00', endTime: '12:00', category: 'Passeio', categoryColor: '#10B981', name: 'Champs-Élysées', image: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=400', openHours: '24h', rating: 4.6, price: 'Grátis' },
      { id: 12, startTime: '12:30', endTime: '14:00', category: 'Monumento', categoryColor: '#3B82F6', name: 'Arco do Triunfo', image: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400', openHours: '10h - 23h', rating: 4.8, price: '€ 16' },
    ], transports: [{ type: 'walk', duration: '5 min' }] },
  ],
  places: [
    { id: 1, name: 'Torre Eiffel', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400', category: 'Monumento', rating: 4.9, lat: 48.8584, lng: 2.2945, day: 2 },
    { id: 2, name: 'Museu do Louvre', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400', category: 'Museu', rating: 4.9, lat: 48.8606, lng: 2.3376, day: 3 },
    { id: 3, name: 'Sacré-Cœur', image: 'https://images.unsplash.com/photo-1568684333877-4d2e9d48a718?w=400', category: 'Igreja', rating: 4.9, lat: 48.8867, lng: 2.3431, day: 1 },
    { id: 4, name: 'Palácio de Versalhes', image: 'https://images.unsplash.com/photo-1551410224-699683e15636?w=400', category: 'Palácio', rating: 4.9, lat: 48.8049, lng: 2.1204, day: 5 },
    { id: 5, name: 'Notre-Dame', image: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=400', category: 'Igreja', rating: 4.8, lat: 48.8530, lng: 2.3499, day: 4 },
    { id: 6, name: 'Arco do Triunfo', image: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400', category: 'Monumento', rating: 4.8, lat: 48.8738, lng: 2.2950, day: 6 },
  ],
  suggestions: [],
};

const nycItinerary: ItineraryDataset = {
  id: 107,
  title: 'NYC em 5 Dias',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Nova York, EUA'],
  startDate: new Date(2026, 8, 1),
  endDate: new Date(2026, 8, 5),
  coverImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  participants: [],
  author: 'Beatriz Almeida',
  authorImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  rating: 4.7,
  reviewCount: 328,
  price: 60,
  tags: ['Aventura', 'Natureza', 'Praia', 'Esportes', 'Gastronomia'],
  mainTag: 'Aventura',
  days: [
    { day: 1, title: 'Manhattan', date: new Date(2026, 8, 1), activities: [
      { id: 1, startTime: '09:00', endTime: '12:00', category: 'Parque', categoryColor: '#10B981', name: 'Central Park', image: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400', openHours: '6h - 1h', rating: 4.9, price: 'Grátis' },
      { id: 2, startTime: '13:00', endTime: '15:00', category: 'Museu', categoryColor: '#6366F1', name: 'MET Museum', image: 'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=400', openHours: '10h - 17h', rating: 4.8, price: 'US$ 30' },
    ], transports: [{ type: 'walk', duration: '15 min' }] },
    { day: 2, title: 'Brooklyn', date: new Date(2026, 8, 2), activities: [
      { id: 3, startTime: '10:00', endTime: '12:00', category: 'Passeio', categoryColor: '#F59E0B', name: 'Brooklyn Bridge', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
      { id: 4, startTime: '13:00', endTime: '15:00', category: 'Bairro', categoryColor: '#EF4444', name: 'DUMBO', image: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
    ], transports: [{ type: 'walk', duration: '20 min' }] },
    { day: 3, title: 'Midtown', date: new Date(2026, 8, 3), activities: [
      { id: 5, startTime: '09:00', endTime: '11:00', category: 'Mirante', categoryColor: '#3B82F6', name: 'Top of the Rock', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400', openHours: '9h - 0h', rating: 4.8, price: 'US$ 43' },
      { id: 6, startTime: '12:00', endTime: '14:00', category: 'Praça', categoryColor: '#F59E0B', name: 'Times Square', image: 'https://images.unsplash.com/photo-1560719887-fe3105fa1e55?w=400', openHours: '24h', rating: 4.5, price: 'Grátis' },
    ], transports: [{ type: 'walk', duration: '10 min' }] },
    { day: 4, title: 'Estátua da Liberdade', date: new Date(2026, 8, 4), activities: [
      { id: 7, startTime: '09:00', endTime: '13:00', category: 'Monumento', categoryColor: '#8B5CF6', name: 'Estátua da Liberdade', image: 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=400', openHours: '9h - 17h', rating: 4.9, price: 'US$ 24' },
    ], transports: [] },
    { day: 5, title: 'SoHo & Greenwich', date: new Date(2026, 8, 5), activities: [
      { id: 8, startTime: '10:00', endTime: '13:00', category: 'Bairro', categoryColor: '#10B981', name: 'SoHo', image: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=400', openHours: '24h', rating: 4.6, price: 'Grátis' },
      { id: 9, startTime: '14:00', endTime: '16:00', category: 'Parque', categoryColor: '#10B981', name: 'High Line', image: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400', openHours: '7h - 22h', rating: 4.8, price: 'Grátis' },
    ], transports: [{ type: 'walk', duration: '15 min' }] },
  ],
  places: [
    { id: 1, name: 'Central Park', image: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400', category: 'Parque', rating: 4.9, lat: 40.7829, lng: -73.9654, day: 1 },
    { id: 2, name: 'Brooklyn Bridge', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400', category: 'Passeio', rating: 4.8, lat: 40.7061, lng: -73.9969, day: 2 },
    { id: 3, name: 'Top of the Rock', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400', category: 'Mirante', rating: 4.8, lat: 40.7587, lng: -73.9787, day: 3 },
    { id: 4, name: 'Estátua da Liberdade', image: 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=400', category: 'Monumento', rating: 4.9, lat: 40.6892, lng: -74.0445, day: 4 },
    { id: 5, name: 'High Line', image: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400', category: 'Parque', rating: 4.8, lat: 40.7480, lng: -74.0048, day: 5 },
    { id: 6, name: 'MET Museum', image: 'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=400', category: 'Museu', rating: 4.8, lat: 40.7794, lng: -73.9632, day: 1 },
  ],
  suggestions: [],
};

const baliItinerary: ItineraryDataset = {
  id: 108,
  title: 'Bali & Komodo',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Bali, Indonésia', 'Komodo, Indonésia'],
  startDate: new Date(2026, 9, 10),
  endDate: new Date(2026, 9, 17),
  coverImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
  participants: [],
  author: 'Lucas Mendonça',
  authorImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  rating: 4.9,
  reviewCount: 276,
  price: 85,
  tags: ['História', 'Cultura', 'Aventura', 'Natureza', 'Praia'],
  mainTag: 'História',
  days: [
    { day: 1, title: 'Ubud', date: new Date(2026, 9, 10), activities: [
      { id: 1, startTime: '08:00', endTime: '10:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Tirta Empul', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400', openHours: '8h - 18h', rating: 4.8, price: 'IDR 50K' },
      { id: 2, startTime: '11:00', endTime: '13:00', category: 'Natureza', categoryColor: '#10B981', name: 'Tegallalang Rice Terrace', image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400', openHours: '8h - 18h', rating: 4.9, price: 'IDR 20K' },
    ], transports: [{ type: 'car', duration: '30 min' }] },
    { day: 2, title: 'Templos & Praias', date: new Date(2026, 9, 11), activities: [
      { id: 3, startTime: '16:00', endTime: '19:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Tanah Lot', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400', openHours: '7h - 19h', rating: 4.7, price: 'IDR 60K' },
    ], transports: [] },
    { day: 3, title: 'Nusa Penida', date: new Date(2026, 9, 12), activities: [
      { id: 4, startTime: '07:00', endTime: '17:00', category: 'Praia', categoryColor: '#06B6D4', name: 'Kelingking Beach', image: 'https://images.unsplash.com/photo-1570789210967-2cac24f04bf2?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Tegallalang Rice Terrace', image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400', category: 'Natureza', rating: 4.9, lat: -8.4312, lng: 115.2793, day: 1 },
    { id: 2, name: 'Tanah Lot', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400', category: 'Templo', rating: 4.7, lat: -8.6213, lng: 115.0868, day: 2 },
    { id: 3, name: 'Kelingking Beach', image: 'https://images.unsplash.com/photo-1570789210967-2cac24f04bf2?w=400', category: 'Praia', rating: 4.9, lat: -8.7525, lng: 115.4428, day: 3 },
    { id: 4, name: 'Tirta Empul', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400', category: 'Templo', rating: 4.8, lat: -8.4152, lng: 115.3155, day: 1 },
  ],
  suggestions: [],
};

const patagoniaItinerary: ItineraryDataset = {
  id: 109,
  title: 'Patagônia Selvagem',
  type: 'marketplace',
  state: 'filled',
  destinations: ['El Calafate, Argentina', 'Torres del Paine, Chile'],
  startDate: new Date(2026, 10, 1),
  endDate: new Date(2026, 10, 12),
  coverImage: 'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800',
  participants: [],
  author: 'Camila Ribeiro',
  authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  rating: 4.6,
  reviewCount: 156,
  price: 0,
  tags: ['Aventura', 'História', 'Natureza', 'Cultura', 'Gastronomia'],
  mainTag: 'Aventura',
  days: [
    { day: 1, title: 'El Calafate', date: new Date(2026, 10, 1), activities: [
      { id: 1, startTime: '09:00', endTime: '17:00', category: 'Natureza', categoryColor: '#10B981', name: 'Glaciar Perito Moreno', image: 'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=400', openHours: '8h - 18h', rating: 4.9, price: 'ARS 8000' },
    ], transports: [] },
    { day: 2, title: 'Torres del Paine', date: new Date(2026, 10, 2), activities: [
      { id: 2, startTime: '07:00', endTime: '18:00', category: 'Trekking', categoryColor: '#EF4444', name: 'Trilha Base Torres', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400', openHours: '24h', rating: 4.9, price: 'CLP 21000' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Glaciar Perito Moreno', image: 'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=400', category: 'Natureza', rating: 4.9, lat: -50.4964, lng: -73.1378, day: 1 },
    { id: 2, name: 'Torres del Paine', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400', category: 'Trekking', rating: 4.9, lat: -50.9423, lng: -73.4068, day: 2 },
  ],
  suggestions: [],
};

const japaoItinerary: ItineraryDataset = {
  id: 104,
  title: 'Japão Cultural',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Tóquio, Japão', 'Quioto, Japão', 'Osaka, Japão'],
  startDate: new Date(2026, 3, 1),
  endDate: new Date(2026, 3, 12),
  coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
  participants: [],
  author: 'Camila Ribeiro',
  authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  rating: 4.7,
  reviewCount: 289,
  price: 95,
  tags: ['Cultura', 'História', 'Gastronomia', 'Arte', 'Natureza'],
  mainTag: 'Cultura',
  days: [
    { day: 1, title: 'Tóquio Moderno', date: new Date(2026, 3, 1), activities: [
      { id: 1, startTime: '09:00', endTime: '11:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Senso-ji', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400', openHours: '6h - 17h', rating: 4.8, price: 'Grátis' },
      { id: 2, startTime: '13:00', endTime: '15:00', category: 'Bairro', categoryColor: '#EF4444', name: 'Shibuya Crossing', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
    ], transports: [{ type: 'metro', duration: '25 min' }] },
    { day: 2, title: 'Akihabara & Harajuku', date: new Date(2026, 3, 2), activities: [
      { id: 3, startTime: '10:00', endTime: '13:00', category: 'Bairro', categoryColor: '#3B82F6', name: 'Akihabara', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400', openHours: '24h', rating: 4.6, price: 'Grátis' },
      { id: 4, startTime: '14:00', endTime: '17:00', category: 'Bairro', categoryColor: '#F59E0B', name: 'Harajuku', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
    ], transports: [{ type: 'metro', duration: '15 min' }] },
    { day: 3, title: 'Quioto', date: new Date(2026, 3, 3), activities: [
      { id: 5, startTime: '09:00', endTime: '11:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Fushimi Inari', image: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
      { id: 6, startTime: '14:00', endTime: '16:00', category: 'Templo', categoryColor: '#F59E0B', name: 'Kinkaku-ji', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400', openHours: '9h - 17h', rating: 4.9, price: '¥ 400' },
    ], transports: [{ type: 'bus', duration: '40 min' }] },
  ],
  places: [
    { id: 1, name: 'Senso-ji', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400', category: 'Templo', rating: 4.8, lat: 35.7148, lng: 139.7967, day: 1 },
    { id: 2, name: 'Shibuya Crossing', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400', category: 'Bairro', rating: 4.7, lat: 35.6595, lng: 139.7004, day: 1 },
    { id: 3, name: 'Fushimi Inari', image: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400', category: 'Templo', rating: 4.9, lat: 34.9671, lng: 135.7727, day: 3 },
    { id: 4, name: 'Kinkaku-ji', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400', category: 'Templo', rating: 4.9, lat: 35.0394, lng: 135.7292, day: 3 },
  ],
  suggestions: [],
};

const costaAmalfitanaItinerary: ItineraryDataset = {
  id: 105,
  title: 'Costa Amalfitana',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Amalfi, Itália', 'Positano, Itália', 'Ravello, Itália'],
  startDate: new Date(2026, 6, 15),
  endDate: new Date(2026, 6, 19),
  coverImage: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800',
  participants: [],
  author: 'Lucas Mendonça',
  authorImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  rating: 4.5,
  reviewCount: 198,
  price: 70,
    tags: ['Praia', 'Romance', 'Gastronomia', 'Natureza', 'Luxo'],
  mainTag: 'Praia',
  days: [
    { day: 1, title: 'Positano', date: new Date(2026, 6, 15), activities: [
      { id: 1, startTime: '10:00', endTime: '13:00', category: 'Praia', categoryColor: '#06B6D4', name: 'Spiaggia Grande', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
      { id: 2, startTime: '14:00', endTime: '16:00', category: 'Passeio', categoryColor: '#10B981', name: 'Sentiero degli Dei', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
    ], transports: [{ type: 'walk', duration: '15 min' }] },
    { day: 2, title: 'Amalfi', date: new Date(2026, 6, 16), activities: [
      { id: 3, startTime: '10:00', endTime: '12:00', category: 'Igreja', categoryColor: '#8B5CF6', name: 'Duomo di Amalfi', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', openHours: '9h - 19h', rating: 4.7, price: '€ 3' },
    ], transports: [] },
    { day: 3, title: 'Ravello', date: new Date(2026, 6, 17), activities: [
      { id: 4, startTime: '10:00', endTime: '13:00', category: 'Jardim', categoryColor: '#10B981', name: 'Villa Rufolo', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', openHours: '9h - 20h', rating: 4.8, price: '€ 10' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Spiaggia Grande', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', category: 'Praia', rating: 4.8, lat: 40.6282, lng: 14.4844, day: 1 },
    { id: 2, name: 'Duomo di Amalfi', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', category: 'Igreja', rating: 4.7, lat: 40.6340, lng: 14.6027, day: 2 },
    { id: 3, name: 'Villa Rufolo', image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', category: 'Jardim', rating: 4.8, lat: 40.6490, lng: 14.6117, day: 3 },
  ],
  suggestions: [],
};

const marrocosItinerary: ItineraryDataset = {
  id: 106,
  title: 'Marrocos Imperial',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Marraquexe, Marrocos', 'Fez, Marrocos', 'Chefchaouen, Marrocos'],
  startDate: new Date(2026, 8, 10),
  endDate: new Date(2026, 8, 17),
  coverImage: 'https://images.unsplash.com/photo-1539020140153-e479b8c5cf6b?w=800',
  participants: [],
  author: 'Rafael Duarte',
  authorImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
  rating: 4.8, reviewCount: 167, price: 78,
  tags: ['Cultura', 'História', 'Aventura', 'Gastronomia', 'Natureza'],
  mainTag: 'Cultura',
  days: [
    { day: 1, title: 'Marraquexe', date: new Date(2026, 8, 10), activities: [
      { id: 1, startTime: '10:00', endTime: '13:00', category: 'Mercado', categoryColor: '#F59E0B', name: 'Jemaa el-Fnaa', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c5cf6b?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
    ], transports: [] },
    { day: 2, title: 'Fez', date: new Date(2026, 8, 11), activities: [
      { id: 2, startTime: '09:00', endTime: '12:00', category: 'Histórico', categoryColor: '#8B5CF6', name: 'Medina de Fez', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c5cf6b?w=400', openHours: '8h - 18h', rating: 4.8, price: 'Grátis' },
    ], transports: [] },
    { day: 3, title: 'Chefchaouen', date: new Date(2026, 8, 12), activities: [
      { id: 3, startTime: '10:00', endTime: '14:00', category: 'Passeio', categoryColor: '#3B82F6', name: 'Cidade Azul', image: 'https://images.unsplash.com/photo-1553244542-2e5cf1b1c63b?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Jemaa el-Fnaa', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c5cf6b?w=400', category: 'Mercado', rating: 4.7, lat: 31.6258, lng: -7.9891, day: 1 },
    { id: 2, name: 'Medina de Fez', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c5cf6b?w=400', category: 'Histórico', rating: 4.8, lat: 34.0631, lng: -4.9779, day: 2 },
  ],
  suggestions: [],
};

const islandiaItinerary: ItineraryDataset = {
  id: 107,
  title: 'Islândia Selvagem',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Reykjavík, Islândia', 'Vík, Islândia'],
  startDate: new Date(2026, 7, 5),
  endDate: new Date(2026, 7, 12),
  coverImage: 'https://images.unsplash.com/photo-1486022138526-7ddc26eb3a02?w=800',
  participants: [],
  author: 'Camila Ribeiro',
  authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  rating: 4.9, reviewCount: 312, price: 120,
  tags: ['Aventura', 'Natureza', 'Praia', 'Esportes', 'Gastronomia'],
  mainTag: 'Aventura',
  days: [
    { day: 1, title: 'Círculo Dourado', date: new Date(2026, 7, 5), activities: [
      { id: 1, startTime: '09:00', endTime: '13:00', category: 'Natureza', categoryColor: '#10B981', name: 'Geysir', image: 'https://images.unsplash.com/photo-1486022138526-7ddc26eb3a02?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
    ], transports: [] },
    { day: 2, title: 'Cachoeiras', date: new Date(2026, 7, 6), activities: [
      { id: 2, startTime: '10:00', endTime: '12:00', category: 'Natureza', categoryColor: '#3B82F6', name: 'Seljalandsfoss', image: 'https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Geysir', image: 'https://images.unsplash.com/photo-1486022138526-7ddc26eb3a02?w=400', category: 'Natureza', rating: 4.9, lat: 64.3104, lng: -20.3022, day: 1 },
  ],
  suggestions: [],
};

const egitoItinerary: ItineraryDataset = {
  id: 108,
  title: 'Egito Antigo',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Cairo, Egito', 'Luxor, Egito'],
  startDate: new Date(2026, 9, 1),
  endDate: new Date(2026, 9, 8),
  coverImage: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=800',
  participants: [],
  author: 'Pedro Santos',
  authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  rating: 4.7, reviewCount: 203, price: 88,
  tags: ['História', 'Cultura', 'Aventura', 'Natureza', 'Praia'],
  mainTag: 'História',
  days: [
    { day: 1, title: 'Pirâmides', date: new Date(2026, 9, 1), activities: [
      { id: 1, startTime: '09:00', endTime: '13:00', category: 'Histórico', categoryColor: '#F59E0B', name: 'Pirâmides de Gizé', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=400', openHours: '8h - 17h', rating: 4.9, price: 'EGP 240' },
    ], transports: [] },
    { day: 2, title: 'Luxor', date: new Date(2026, 9, 2), activities: [
      { id: 2, startTime: '08:00', endTime: '12:00', category: 'Histórico', categoryColor: '#8B5CF6', name: 'Vale dos Reis', image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400', openHours: '6h - 17h', rating: 4.8, price: 'EGP 260' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Pirâmides de Gizé', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=400', category: 'Histórico', rating: 4.9, lat: 29.9792, lng: 31.1342, day: 1 },
  ],
  suggestions: [],
};

const peruItinerary: ItineraryDataset = {
  id: 109,
  title: 'Peru e Machu Picchu',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Cusco, Peru', 'Machu Picchu, Peru', 'Lima, Peru'],
  startDate: new Date(2026, 5, 10),
  endDate: new Date(2026, 5, 17),
  coverImage: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800',
  participants: [],
  author: 'Camila Ribeiro',
  authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  rating: 4.9, reviewCount: 421, price: 105,
  tags: ['Aventura', 'História', 'Natureza', 'Cultura', 'Gastronomia'],
  mainTag: 'Aventura',
  days: [
    { day: 1, title: 'Cusco', date: new Date(2026, 5, 10), activities: [
      { id: 1, startTime: '10:00', endTime: '13:00', category: 'Histórico', categoryColor: '#8B5CF6', name: 'Plaza de Armas', image: 'https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
    ], transports: [] },
    { day: 2, title: 'Machu Picchu', date: new Date(2026, 5, 11), activities: [
      { id: 2, startTime: '06:00', endTime: '13:00', category: 'Histórico', categoryColor: '#10B981', name: 'Machu Picchu', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=400', openHours: '6h - 17h', rating: 5.0, price: 'PEN 152' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Machu Picchu', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=400', category: 'Histórico', rating: 5.0, lat: -13.1631, lng: -72.5450, day: 2 },
  ],
  suggestions: [],
};

const mexicoItinerary: ItineraryDataset = {
  id: 110,
  title: 'México: Cancún e Tulum',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Cancún, México', 'Tulum, México', 'Playa del Carmen, México'],
  startDate: new Date(2026, 0, 15),
  endDate: new Date(2026, 0, 22),
  coverImage: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800',
  participants: [],
  author: 'Lucas Mendonça',
  authorImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  rating: 4.6, reviewCount: 278, price: 82,
    tags: ['Praia', 'Luxo', 'Gastronomia', 'História', 'Relaxamento'],
  mainTag: 'Praia',
  days: [
    { day: 1, title: 'Cancún', date: new Date(2026, 0, 15), activities: [
      { id: 1, startTime: '10:00', endTime: '15:00', category: 'Praia', categoryColor: '#06B6D4', name: 'Playa Delfines', image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400', openHours: '24h', rating: 4.8, price: 'Grátis' },
    ], transports: [] },
    { day: 2, title: 'Tulum', date: new Date(2026, 0, 16), activities: [
      { id: 2, startTime: '09:00', endTime: '12:00', category: 'Histórico', categoryColor: '#F59E0B', name: 'Ruínas de Tulum', image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400', openHours: '8h - 17h', rating: 4.7, price: 'MXN 90' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Playa Delfines', image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400', category: 'Praia', rating: 4.8, lat: 21.0820, lng: -86.7710, day: 1 },
  ],
  suggestions: [],
};

const croaciaItinerary: ItineraryDataset = {
  id: 111,
  title: 'Croácia Costeira',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Dubrovnik, Croácia', 'Split, Croácia', 'Hvar, Croácia'],
  startDate: new Date(2026, 6, 1),
  endDate: new Date(2026, 6, 8),
  coverImage: 'https://images.unsplash.com/photo-1555990538-32308e3a06f1?w=800',
  participants: [],
  author: 'Maria Vieira',
  authorImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150',
  rating: 4.8, reviewCount: 245, price: 92,
    tags: ['Praia', 'Natureza', 'História', 'Aventura', 'Gastronomia'],
  mainTag: 'Praia',
  days: [
    { day: 1, title: 'Dubrovnik', date: new Date(2026, 6, 1), activities: [
      { id: 1, startTime: '10:00', endTime: '13:00', category: 'Histórico', categoryColor: '#8B5CF6', name: 'Cidade Velha', image: 'https://images.unsplash.com/photo-1555990538-32308e3a06f1?w=400', openHours: '24h', rating: 4.9, price: 'Grátis' },
    ], transports: [] },
    { day: 2, title: 'Split', date: new Date(2026, 6, 2), activities: [
      { id: 2, startTime: '10:00', endTime: '12:00', category: 'Histórico', categoryColor: '#F59E0B', name: 'Palácio de Diocleciano', image: 'https://images.unsplash.com/photo-1555990538-32308e3a06f1?w=400', openHours: '8h - 19h', rating: 4.8, price: 'HRK 50' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Cidade Velha de Dubrovnik', image: 'https://images.unsplash.com/photo-1555990538-32308e3a06f1?w=400', category: 'Histórico', rating: 4.9, lat: 42.6407, lng: 18.1077, day: 1 },
  ],
  suggestions: [],
};

const escociaItinerary: ItineraryDataset = {
  id: 112,
  title: 'Escócia & Highlands',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Edimburgo, Escócia', 'Inverness, Escócia'],
  startDate: new Date(2026, 4, 20),
  endDate: new Date(2026, 4, 26),
  coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  participants: [],
  author: 'Juliana Melo',
  authorImage: 'https://images.unsplash.com/photo-1521252659862-eec69941b071?w=150',
  rating: 4.7, reviewCount: 156, price: 98,
    tags: ['Natureza', 'Aventura', 'História', 'Cultura', 'Esportes'],
  mainTag: 'Natureza',
  days: [
    { day: 1, title: 'Edimburgo', date: new Date(2026, 4, 20), activities: [
      { id: 1, startTime: '10:00', endTime: '13:00', category: 'Histórico', categoryColor: '#8B5CF6', name: 'Castelo de Edimburgo', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', openHours: '9h30 - 18h', rating: 4.8, price: '£ 19' },
    ], transports: [] },
    { day: 2, title: 'Highlands', date: new Date(2026, 4, 21), activities: [
      { id: 2, startTime: '09:00', endTime: '15:00', category: 'Natureza', categoryColor: '#10B981', name: 'Loch Ness', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Castelo de Edimburgo', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', category: 'Histórico', rating: 4.8, lat: 55.9486, lng: -3.1999, day: 1 },
  ],
  suggestions: [],
};

const dubaiItinerary: ItineraryDataset = {
  id: 113,
  title: 'Dubai Luxo',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Dubai, Emirados Árabes Unidos'],
  startDate: new Date(2026, 10, 5),
  endDate: new Date(2026, 10, 10),
  coverImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
  participants: [],
  author: 'Beatriz Almeida',
  authorImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  rating: 4.6, reviewCount: 189, price: 110,
    tags: ['Luxo', 'Arquitetura', 'Compras', 'Praia', 'Gastronomia'],
  mainTag: 'Luxo',
  days: [
    { day: 1, title: 'Burj Khalifa', date: new Date(2026, 10, 5), activities: [
      { id: 1, startTime: '14:00', endTime: '17:00', category: 'Mirante', categoryColor: '#3B82F6', name: 'Burj Khalifa', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400', openHours: '10h - 22h', rating: 4.8, price: 'AED 169' },
    ], transports: [] },
    { day: 2, title: 'Deserto', date: new Date(2026, 10, 6), activities: [
      { id: 2, startTime: '15:00', endTime: '21:00', category: 'Aventura', categoryColor: '#F59E0B', name: 'Safari no Deserto', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400', openHours: '15h - 21h', rating: 4.9, price: 'AED 250' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Burj Khalifa', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400', category: 'Mirante', rating: 4.8, lat: 25.1972, lng: 55.2744, day: 1 },
  ],
  suggestions: [],
};

const africaSulItinerary: ItineraryDataset = {
  id: 114,
  title: 'África do Sul Safári',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Cidade do Cabo, África do Sul', 'Kruger, África do Sul'],
  startDate: new Date(2026, 8, 1),
  endDate: new Date(2026, 8, 10),
  coverImage: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800',
  participants: [],
  author: 'Rafael Duarte',
  authorImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
  rating: 4.9, reviewCount: 267, price: 135,
    tags: ['Natureza', 'Aventura', 'Esportes', 'Praia', 'Família'],
  mainTag: 'Natureza',
  days: [
    { day: 1, title: 'Cidade do Cabo', date: new Date(2026, 8, 1), activities: [
      { id: 1, startTime: '10:00', endTime: '14:00', category: 'Natureza', categoryColor: '#10B981', name: 'Table Mountain', image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400', openHours: '8h - 19h', rating: 4.9, price: 'ZAR 380' },
    ], transports: [] },
    { day: 2, title: 'Kruger', date: new Date(2026, 8, 2), activities: [
      { id: 2, startTime: '06:00', endTime: '12:00', category: 'Aventura', categoryColor: '#F59E0B', name: 'Safari Kruger', image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400', openHours: '6h - 18h', rating: 5.0, price: 'ZAR 1500' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Table Mountain', image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400', category: 'Natureza', rating: 4.9, lat: -33.9628, lng: 18.4098, day: 1 },
  ],
  suggestions: [],
};

const vietnamItinerary: ItineraryDataset = {
  id: 115,
  title: 'Vietnã Essencial',
  type: 'marketplace',
  state: 'filled',
  destinations: ['Hanói, Vietnã', 'Ha Long, Vietnã', 'Ho Chi Minh, Vietnã'],
  startDate: new Date(2026, 2, 5),
  endDate: new Date(2026, 2, 14),
  coverImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800',
  participants: [],
  author: 'Thiago Lima',
  authorImage: 'https://images.unsplash.com/photo-1545996124-0501ebae84d0?w=150',
  rating: 4.8, reviewCount: 198, price: 75,
    tags: ['Cultura', 'Gastronomia', 'Natureza', 'História', 'Aventura'],
  mainTag: 'Cultura',
  days: [
    { day: 1, title: 'Hanói', date: new Date(2026, 2, 5), activities: [
      { id: 1, startTime: '10:00', endTime: '13:00', category: 'Cultural', categoryColor: '#8B5CF6', name: 'Old Quarter', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400', openHours: '24h', rating: 4.7, price: 'Grátis' },
    ], transports: [] },
    { day: 2, title: 'Baía de Ha Long', date: new Date(2026, 2, 6), activities: [
      { id: 2, startTime: '08:00', endTime: '17:00', category: 'Natureza', categoryColor: '#06B6D4', name: 'Cruzeiro Ha Long', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400', openHours: '8h - 17h', rating: 4.9, price: 'VND 1.500.000' },
    ], transports: [] },
  ],
  places: [
    { id: 1, name: 'Baía de Ha Long', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400', category: 'Natureza', rating: 4.9, lat: 20.9101, lng: 107.1839, day: 2 },
  ],
  suggestions: [],
};

// ─── Registry ────────────────────────────────────────────────────────────────

const allItineraries: ItineraryDataset[] = [
  amsterdamItinerary,
  parisItinerary,
  tokyoItinerary,
  greciaItinerary,
  portugalEspanhaItinerary,
  rotaVinhosItinerary,
  tailandiaItinerary,
  lesteEuropeuItinerary,
  parisRomanticaItinerary,
  nycItinerary,
  baliItinerary,
  patagoniaItinerary,
  japaoItinerary,
  costaAmalfitanaItinerary,
  marrocosItinerary,
  islandiaItinerary,
  egitoItinerary,
  peruItinerary,
  mexicoItinerary,
  croaciaItinerary,
  escociaItinerary,
  dubaiItinerary,
  africaSulItinerary,
  vietnamItinerary,
];

// --- App-user override -------------------------------------------------------
// Substitui o autor de todos os roteiros estáticos pelo perfil do usuário logado,
// para que os roteiros "templates" do app pareçam ser criados pelo próprio app.
type AuthorOverride = { name: string; avatar: string; username?: string; verified?: boolean } | null;
let authorOverride: AuthorOverride = null;

export function setItineraryAuthorOverride(override: AuthorOverride): void {
  authorOverride = override;
}

function applyAuthorOverride(it: ItineraryDataset): ItineraryDataset {
  if (!authorOverride) return it;
  return {
    ...it,
    author: authorOverride.name,
    authorImage: authorOverride.avatar,
    authorUsername: authorOverride.username ?? it.authorUsername,
    authorVerified: authorOverride.verified ?? it.authorVerified,
  };
}

export function getItineraryById(id: number): ItineraryDataset | undefined {
  const it = allItineraries.find(it => it.id === id);
  return it ? applyAuthorOverride(it) : undefined;
}

export function getItinerariesByType(type: ItineraryType): ItineraryDataset[] {
  return allItineraries.filter(it => it.type === type).map(applyAuthorOverride);
}

export function getItinerariesByAuthor(author: string): ItineraryDataset[] {
  return allItineraries
    .filter(it => (it.author ?? '').toLowerCase() === author.toLowerCase())
    .map(applyAuthorOverride);
}

export function getItinerariesByCountry(country: string): ItineraryDataset[] {
  const needle = country.toLowerCase();
  return allItineraries
    .filter(it =>
      it.type === 'marketplace' &&
      it.destinations.some(d => d.toLowerCase().includes(needle))
    )
    .map(applyAuthorOverride);
}

