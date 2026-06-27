import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { FiltersScreen, DEFAULT_FILTERS, type ExploreFilters } from './FiltersScreen';
import { getItinerariesByType, type ItineraryDataset } from '@/data/itineraries';
import { visitedCountries } from '@/data/visitedCountries';
import { BackButton } from '@/components/ui/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { listPublicItineraries, type UserItinerary } from '@/lib/itinerariesApi';
import { toast } from 'sonner';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Map of country -> continent / region keywords used to enrich tags so a
 * search like "europa" surfaces every European itinerary even when the title
 * doesn't literally contain the word.
 */
const COUNTRY_TO_TAGS: Record<string, string[]> = {
  // Europa
  'portugal': ['europa', 'iberia'],
  'espanha': ['europa', 'iberia'],
  'frança': ['europa'],
  'franca': ['europa'],
  'itália': ['europa', 'mediterraneo'],
  'italia': ['europa', 'mediterraneo'],
  'grécia': ['europa', 'mediterraneo'],
  'grecia': ['europa', 'mediterraneo'],
  'holanda': ['europa'],
  'países baixos': ['europa'],
  'reino unido': ['europa'],
  'inglaterra': ['europa', 'reino unido'],
  'escócia': ['europa', 'reino unido'],
  'escocia': ['europa', 'reino unido'],
  'alemanha': ['europa'],
  'suíça': ['europa', 'alpes'],
  'suica': ['europa', 'alpes'],
  'bélgica': ['europa'],
  'belgica': ['europa'],
  'república tcheca': ['europa', 'leste europeu'],
  'republica tcheca': ['europa', 'leste europeu'],
  'hungria': ['europa', 'leste europeu'],
  'áustria': ['europa', 'leste europeu'],
  'austria': ['europa', 'leste europeu'],
  // Ásia
  'japão': ['asia'],
  'japao': ['asia'],
  'tailândia': ['asia', 'sudeste asiatico'],
  'tailandia': ['asia', 'sudeste asiatico'],
  'indonésia': ['asia', 'sudeste asiatico'],
  'indonesia': ['asia', 'sudeste asiatico'],
  'china': ['asia'],
  'vietnã': ['asia', 'sudeste asiatico'],
  'vietna': ['asia', 'sudeste asiatico'],
  // Américas
  'brasil': ['america do sul', 'america latina'],
  'argentina': ['america do sul', 'america latina'],
  'chile': ['america do sul', 'america latina'],
  'peru': ['america do sul', 'america latina'],
  'eua': ['america do norte'],
  'estados unidos': ['america do norte'],
  'canadá': ['america do norte'],
  'canada': ['america do norte'],
  'méxico': ['america do norte', 'america latina'],
  'mexico': ['america do norte', 'america latina'],
  // África
  'marrocos': ['africa'],
  'egito': ['africa'],
  'áfrica do sul': ['africa'],
  'africa do sul': ['africa'],
};

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Aliases de cidades — diferentes grafias/idiomas que devem casar com a mesma busca.
 * Strings já normalizadas (lowercase + sem acento). Quando uma cidade do roteiro casa
 * com qualquer alias do grupo, todos os outros aliases entram no `tagSet`.
 */
const CITY_ALIASES: string[][] = [
  ['nova iorque', 'nova york', 'new york', 'nyc', 'ny'],
  ['londres', 'london'],
  ['toquio', 'tokyo'],
  ['roma', 'rome'],
  ['cidade do mexico', 'mexico city'],
  ['pequim', 'beijing'],
  ['moscou', 'moscow'],
  ['veneza', 'venice'],
  ['florenca', 'florence', 'firenze'],
  ['atenas', 'athens'],
  ['lisboa', 'lisbon'],
  ['praga', 'prague'],
  ['viena', 'vienna'],
  ['munique', 'munich'],
  ['copenhague', 'copenhagen'],
  ['estocolmo', 'stockholm'],
  ['varsovia', 'warsaw'],
  ['genebra', 'geneva'],
  ['zurique', 'zurich'],
  ['marrakech', 'marraquexe'],
];

function getCityAliases(city: string): string[] {
  const n = norm(city.trim());
  for (const group of CITY_ALIASES) {
    if (group.includes(n)) return group;
  }
  return [];
}

/**
 * Build the search itinerary catalog directly from the canonical dataset so
 * that every search result links back to a real itinerary (matching id,
 * destinations, author and day count).
 */
interface SearchItinerary {
  id: number | string;
  title: string;
  image: string;
  rating: number;
  days: number;
  cities: number;
  author: string;
  authorImage: string;
  price: number;
  tags: string[];
  /** Raw destinations (full strings) for richer haystack matching. */
  destinationsRaw?: string[];
  /** Raw description text for haystack matching. */
  descriptionRaw?: string;
  /** Owner user_id, used to bubble up the user's own published itineraries. */
  ownerUserId?: string;
  /** Set when this entry comes from a user-published itinerary (uuid id). */
  userItinerary?: UserItinerary;
}

const buildSearchItineraries = (): SearchItinerary[] => {
  const datasets = getItinerariesByType('marketplace');
  return datasets.map((d: ItineraryDataset) => {
    const cities = new Set(
      d.destinations
        .map(dest => dest.split(',')[0]?.trim())
        .filter(Boolean) as string[],
    );
    const tagSet = new Set<string>();
    // Title words
    const normTitle = norm(d.title);
    normTitle.split(/\s+/).forEach(w => w && tagSet.add(w));
    CITY_ALIASES.forEach(group => {
      if (group.some(alias => normTitle.includes(alias))) {
        group.forEach(a => tagSet.add(a));
      }
    });
    // Destinations split into city + country
    d.destinations.forEach(dest => {
      const [city, country] = dest.split(',').map(s => s?.trim() ?? '');
      if (city) {
        tagSet.add(norm(city));
        getCityAliases(city).forEach(a => tagSet.add(a));
      }
      if (country) {
        const nc = norm(country);
        tagSet.add(nc);
        const extras = COUNTRY_TO_TAGS[country.toLowerCase()] ?? COUNTRY_TO_TAGS[nc];
        extras?.forEach(t => tagSet.add(t));
      }
    });
    const days = Math.max(d.days.length, differenceInDays(d.endDate, d.startDate) + 1);
    return {
      id: d.id,
      title: d.title,
      image: d.coverImage,
      rating: d.rating ?? 4.7,
      days,
      cities: cities.size,
      author: d.author ?? 'WaiTravel',
      authorImage: d.authorImage ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      price: d.price ?? 0,
      tags: Array.from(tagSet),
    };
  });
};

/**
 * Each destination carries a list of `tags` (continent, country, region) so a
 * query like "europa" or "asia" surfaces several places — not just the literal
 * city/country name.
 */
const trendingDestinations: {
  id: number;
  name: string;
  country: string;
  image: string;
  itineraryCount: number;
  rating: number;
  tags: string[];
}[] = [
  {
    id: 1, name: 'Praga', country: 'República Tcheca',
    image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800',
    itineraryCount: 45, rating: 4.8,
    tags: ['europa', 'leste europeu', 'republica tcheca'],
  },
  {
    id: 2, name: 'Bali', country: 'Indonésia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    itineraryCount: 67, rating: 4.9,
    tags: ['asia', 'indonesia', 'sudeste asiatico'],
  },
  {
    id: 3, name: 'Tóquio', country: 'Japão',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    itineraryCount: 89, rating: 4.9,
    tags: ['asia', 'japao'],
  },
  {
    id: 4, name: 'Santorini', country: 'Grécia',
    image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    itineraryCount: 52, rating: 4.8,
    tags: ['europa', 'grecia', 'mediterraneo'],
  },
  {
    id: 5, name: 'Barcelona', country: 'Espanha',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
    itineraryCount: 73, rating: 4.7,
    tags: ['europa', 'espanha', 'iberia', 'catalunha'],
  },
  {
    id: 6, name: 'Madrid', country: 'Espanha',
    image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800',
    itineraryCount: 41, rating: 4.6,
    tags: ['europa', 'espanha', 'iberia'],
  },
  {
    id: 7, name: 'Sevilha', country: 'Espanha',
    image: 'https://images.unsplash.com/photo-1559564484-0d8b4ec7ef84?w=800',
    itineraryCount: 22, rating: 4.8,
    tags: ['europa', 'espanha', 'andaluzia', 'iberia'],
  },
  {
    id: 8, name: 'Roma', country: 'Itália',
    image: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800',
    itineraryCount: 86, rating: 4.9,
    tags: ['europa', 'italia', 'mediterraneo'],
  },
  {
    id: 9, name: 'Paris', country: 'França',
    image: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800',
    itineraryCount: 102, rating: 4.7,
    tags: ['europa', 'franca'],
  },
  {
    id: 10, name: 'Lisboa', country: 'Portugal',
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
    itineraryCount: 64, rating: 4.7,
    tags: ['europa', 'portugal', 'iberia'],
  },
  {
    id: 11, name: 'Buenos Aires', country: 'Argentina',
    image: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800',
    itineraryCount: 38, rating: 4.6,
    tags: ['america do sul', 'argentina'],
  },
  {
    id: 12, name: 'Nova York', country: 'Estados Unidos',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    itineraryCount: 95, rating: 4.8,
    tags: ['america do norte', 'eua', 'estados unidos'],
  },
];

/**
 * Mock catalog used by the search screen. Derived from the canonical
 * itinerary dataset so each search hit opens the real itinerary
 * (correct id, days, destinations, author).
 */
const allItineraries: SearchItinerary[] = buildSearchItineraries();

/**
 * Catálogo de pessoas mostrado na busca. Os nomes batem com os autores reais
 * dos roteiros (em src/data/itineraries.ts e creatorItineraryMap em
 * FriendProfileScreen) para que ao clicar no perfil os roteiros e dados
 * apareçam de forma coerente.
 */
interface PeopleSuggestion {
  id: string;
  userId?: string;
  name: string;
  handle: string;
  image: string;
  location: string;
  followers: string;
  following: number;
  tags: string[];
}

interface ProfileSearchRow {
  user_id: string;
  name: string;
  username: string | null;
  location: string;
  avatar_url: string;
  bio: string;
  interests: string[];
  followers_count: number;
  following_count: number;
}

const peopleSuggestions: PeopleSuggestion[] = [
  {
    id: 'p1', name: 'Laura Fernandes', handle: '@laurafernandes',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
    location: 'Lisboa, Portugal', followers: '12.4k', following: 318,
    tags: ['europa', 'natal', 'cultural', 'leste europeu', 'portugal'],
  },
  {
    id: 'p2', name: 'Lucas Mendonça', handle: '@lucasmendonca',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
    location: 'Florianópolis, Brasil', followers: '8.7k', following: 412,
    tags: ['asia', 'praia', 'indonesia', 'bali', 'sudeste asiatico'],
  },
  {
    id: 'p3', name: 'Marina Costa', handle: '@marinacosta',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    location: 'Paris, França', followers: '24.1k', following: 587,
    tags: ['europa', 'romantico', 'franca', 'paris', 'cultural'],
  },
  {
    id: 'p4', name: 'Beatriz Almeida', handle: '@beatrizalmeida',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
    location: 'Nova York, EUA', followers: '18.9k', following: 296,
    tags: ['america do norte', 'eua', 'urbano', 'nova york'],
  },
  {
    id: 'p5', name: 'Rafael Duarte', handle: '@rafaelduarte',
    image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300',
    location: 'Bangkok, Tailândia', followers: '15.2k', following: 234,
    tags: ['asia', 'praia', 'tailandia', 'aventura', 'sudeste asiatico'],
  },
  {
    id: 'p6', name: 'Camila Ribeiro', handle: '@camilaribeiro',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300',
    location: 'Bariloche, Argentina', followers: '9.5k', following: 188,
    tags: ['america do sul', 'patagonia', 'aventura', 'argentina', 'natureza'],
  },
  {
    id: 'p7', name: 'Pedro Santos', handle: '@pedrosantos',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    location: 'Roma, Itália', followers: '11.3k', following: 405,
    tags: ['europa', 'italia', 'mediterraneo', 'gastronomia', 'amalfi'],
  },
  {
    id: 'p8', name: 'Ana Oliveira', handle: '@anaoliveira',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
    location: 'Porto, Portugal', followers: '7.8k', following: 152,
    tags: ['europa', 'portugal', 'gastronomia', 'vinhos', 'iberia'],
  },
  {
    id: 'p9', name: 'Thiago Lima', handle: '@thiagolima',
    image: 'https://images.unsplash.com/photo-1545996124-0501ebae84d0?w=300',
    location: 'Tóquio, Japão', followers: '21.6k', following: 379,
    tags: ['asia', 'japao', 'cultural', 'toquio', 'kyoto'],
  },
  {
    id: 'p10', name: 'Juliana Melo', handle: '@julianamelo',
    image: 'https://images.unsplash.com/photo-1521252659862-eec69941b071?w=300',
    location: 'Praga, República Tcheca', followers: '6.4k', following: 224,
    tags: ['europa', 'leste europeu', 'natal', 'cultural', 'inverno'],
  },
  {
    id: 'p11', name: 'Maria Vieira', handle: '@mariavieira',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300',
    location: 'Atenas, Grécia', followers: '13.7k', following: 301,
    tags: ['europa', 'grecia', 'mediterraneo', 'praia', 'cultural'],
  },
  {
    id: 'p12', name: 'Carlos Santos', handle: '@carlossantos',
    image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=300',
    location: 'Madrid, Espanha', followers: '10.2k', following: 267,
    tags: ['europa', 'espanha', 'iberia', 'portugal', 'cultural', 'gastronomia'],
  },
];

type RecentType = 'lugar' | 'pessoa' | 'roteiro';
interface RecentSearch {
  id: string;
  type: RecentType;
  title: string;
  subtitle: string;
  image: string;
  refId?: number | string;
}

const RECENT_KEY = 'wai-travel-recent-searches';
const MAX_RECENT = 8;

const DEFAULT_RECENT: RecentSearch[] = [];

const loadRecent = (): RecentSearch[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_RECENT;
};

const saveRecent = (items: RecentSearch[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {}
};

interface SearchScreenProps {
  onClose: () => void;
  onItineraryClick: (id: number) => void;
  onPublicUserItineraryClick?: (userItinerary: UserItinerary) => void;
  onPlaceClick?: (place: { country: string; continent: string; image: string }) => void;
}

const profileRowToPerson = (row: ProfileSearchRow): PeopleSuggestion => ({
  id: `profile-${row.user_id}`,
  userId: row.user_id,
  name: row.name || row.username || 'Viajante',
  handle: row.username ? `@${row.username.replace(/^@/, '')}` : '@viajante',
  image: row.avatar_url || '',
  location: row.location || 'WaiTravel',
  followers: String(row.followers_count ?? 0),
  following: row.following_count ?? 0,
  tags: [row.name, row.username ?? '', row.location, row.bio, ...(row.interests ?? [])].filter(Boolean).map(norm),
});

export function SearchScreen({ onClose, onItineraryClick, onPublicUserItineraryClick, onPlaceClick }: SearchScreenProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [recent, setRecent] = useState<RecentSearch[]>(() => loadRecent());
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [realPeople, setRealPeople] = useState<PeopleSuggestion[]>([]);
  const [publicItineraries, setPublicItineraries] = useState<SearchItinerary[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const lastReloadAtRef = useRef<number>(0);

  const mergedItineraries = useMemo<SearchItinerary[]>(() => {
    // Prioriza roteiros do próprio usuário, depois demais públicos, depois o catálogo estático.
    const seen = new Set<string | number>();
    const own: SearchItinerary[] = [];
    const others: SearchItinerary[] = [];
    for (const it of publicItineraries) {
      if (currentUserId && it.ownerUserId === currentUserId) own.push(it);
      else others.push(it);
    }
    const merged: SearchItinerary[] = [];
    for (const it of [...own, ...others, ...allItineraries]) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      merged.push(it);
    }
    return merged;
  }, [publicItineraries, currentUserId]);

  // Carrega TODOS os roteiros publicados (is_public = true) para alimentar a busca.
  // Extraído do useEffect para que possa ser reutilizado no submit (com guard de 5s).
  const reloadPublic = async () => {
    const now = Date.now();
    if (now - lastReloadAtRef.current < 5000) return;
    lastReloadAtRef.current = now;
    try {
      const rows = await listPublicItineraries(200);
      const mapped: SearchItinerary[] = rows.map((row) => {
        const cities = new Set(
          row.destinations
            .map((dest) => dest.split(',')[0]?.trim())
            .filter(Boolean) as string[],
        );
        const tagSet = new Set<string>();
        const normTitle = norm(row.title);
        normTitle.split(/\s+/).forEach((w) => w && tagSet.add(w));
        // Aliases também aplicados ao título inteiro (ex.: "Nova Iorque trip")
        CITY_ALIASES.forEach((group) => {
          if (group.some((alias) => normTitle.includes(alias))) {
            group.forEach((a) => tagSet.add(a));
          }
        });
        row.destinations.forEach((dest) => {
          // String completa normalizada (suporta busca por frase como "fernando de noronha")
          tagSet.add(norm(dest));
          const [city, country] = dest.split(',').map((s) => s?.trim() ?? '');
          if (city) {
            tagSet.add(norm(city));
            getCityAliases(city).forEach((a) => tagSet.add(a));
          }
          if (country) {
            const nc = norm(country);
            tagSet.add(nc);
            const extras = COUNTRY_TO_TAGS[country.toLowerCase()] ?? COUNTRY_TO_TAGS[nc];
            extras?.forEach((t) => tagSet.add(t));
          }
        });
        (row.tags ?? []).forEach((t) => t && tagSet.add(norm(t)));
        if (row.mainTag) tagSet.add(norm(row.mainTag));
        tagSet.add(norm(row.authorName));
        if (row.authorUsername) tagSet.add(norm(row.authorUsername.replace(/^@/, '')));
        // Descrição: cada palavra como tag adicional
        if (row.description) {
          norm(row.description).split(/\s+/).forEach((w) => w && tagSet.add(w));
        }

        const start = new Date(row.startDate);
        const end = new Date(row.endDate);
        const days = Math.max(1, differenceInDays(end, start) + 1);

        return {
          id: row.id,
          title: row.title || 'Roteiro',
          image: row.images?.[0] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
          rating: 4.7,
          days,
          cities: cities.size || 1,
          author: row.authorName,
          authorImage: row.authorAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          price: (row.priceCents ?? 0) / 100,
          tags: Array.from(tagSet),
          destinationsRaw: row.destinations ?? [],
          descriptionRaw: row.description ?? '',
          ownerUserId: row.userId,
          userItinerary: {
            id: row.id,
            title: row.title,
            destinations: row.destinations,
            startDate: row.startDate,
            endDate: row.endDate,
            images: row.images,
            participants: row.participants,
            places: row.places,
            sourceDatasetId: row.sourceDatasetId,
            isPublic: row.isPublic,
            priceCents: row.priceCents,
            description: row.description,
            tags: row.tags,
            mainTag: row.mainTag,
            userId: row.userId,
          },
        };
      });
      setPublicItineraries(mapped);
    } catch (err) {
      console.error('[SearchScreen] listPublicItineraries failed', err);
      toast.error('Não foi possível atualizar a lista de roteiros');
    }
  };

  const handleSubmit = () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSubmittedQuery(q);
    // Atualiza a lista no submit para garantir dados frescos (com guard de 5s).
    void reloadPublic();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (submittedQuery) setSubmittedQuery('');
  };

  const activeFiltersCount =
    appliedFilters.regions.length +
    appliedFilters.tripTypes.length +
    appliedFilters.seasons.length +
    (appliedFilters.priceRange[0] !== 0 || appliedFilters.priceRange[1] !== 1000 ? 1 : 0) +
    (appliedFilters.durationRange[0] !== 1 || appliedFilters.durationRange[1] !== 30 ? 1 : 0) +
    appliedFilters.creatorType.length;

  useEffect(() => {
    saveRecent(recent);
  }, [recent]);

  // Captura o user atual para priorizar seus próprios roteiros publicados.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setCurrentUserId(data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('user_id, name, username, location, avatar_url, bio, interests, followers_count, following_count')
        .limit(50);
      if (error) {
        console.error('[SearchScreen] profiles search failed', error);
        return;
      }
      if (!cancelled) setRealPeople((data ?? []).map((row) => profileRowToPerson(row as ProfileSearchRow)));
    };
    loadProfiles();
    return () => { cancelled = true; };
  }, []);

  // Carrega no mount.
  useEffect(() => {
    void reloadPublic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRecent = (item: RecentSearch) => {
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      return [item, ...filtered].slice(0, MAX_RECENT);
    });
  };

  const removeRecent = (id: string) => {
    setRecent((prev) => prev.filter((r) => r.id !== id));
  };

  const clearRecent = () => setRecent([]);

  // `norm` is declared at module scope.

  const query = norm(searchQuery.trim());
  const resultsQuery = norm(submittedQuery.trim());

  const buildResults = (q: string) => {
    if (!q) return { places: [], people: [], itineraries: [] };
    const peopleCatalog = [
      ...realPeople,
      ...peopleSuggestions.filter((mock) => !realPeople.some((real) => real.userId && real.name === mock.name)),
    ];
    return {
      places: trendingDestinations.filter((d) => {
        const haystack = [d.name, d.country, ...d.tags].map(norm).join(' ');
        return haystack.includes(q);
      }),
      people: peopleCatalog.filter((p) => {
        const haystack = [p.name, p.handle, p.location, ...p.tags].map(norm).join(' ');
        return haystack.includes(q);
      }),
      itineraries: mergedItineraries
        .filter((i) => {
          const haystack = [
            i.title,
            i.author,
            ...i.tags,
            ...(i.destinationsRaw ?? []),
            i.descriptionRaw ?? '',
          ].map(norm).join(' ');
          return haystack.includes(q);
        })
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    };
  };

  const suggestions = useMemo(() => buildResults(query), [query, realPeople, mergedItineraries]);
  const results = useMemo(() => buildResults(resultsQuery), [resultsQuery, realPeople, mergedItineraries]);

  const handlePlaceClick = (dest: typeof trendingDestinations[number]) => {
    addRecent({
      id: `place-${dest.id}`,
      type: 'lugar',
      title: dest.name,
      subtitle: `Lugar • ${dest.country}`,
      image: dest.image,
      refId: dest.id,
    });
    if (onPlaceClick) {
      onPlaceClick({ country: dest.name, continent: dest.country, image: dest.image });
    }
  };

  const goToPersonProfile = (person: PeopleSuggestion) => {
    // Rota canônica /u/:username quando temos o handle. FriendProfilePage
    // hidrata via fetch real do banco; o state apenas evita "flash" vazio.
    const handle = (person.handle || '').replace(/^@/, '').toLowerCase();
    const target = handle ? `/u/${handle}` : '/profile';
    navigate(target, {
      state: {
        friend: {
          userId: person.userId,
          name: person.name,
          username: person.handle,
          location: person.location,
          avatar: person.image,
          following: person.following,
          followers: person.followers,
          countries: visitedCountries.slice(0, 4),
        },
      },
    });
  };

  const handlePersonClick = (person: PeopleSuggestion) => {
    addRecent({
      id: `person-${person.id}`,
      type: 'pessoa',
      title: person.name,
      subtitle: `Pessoa • ${person.handle}`,
      image: person.image,
      refId: person.id,
    });
    goToPersonProfile(person);
  };

  const handleItineraryClick = (item: SearchItinerary) => {
    const refId = typeof item.id === 'string' ? item.id : item.id;
    addRecent({
      id: `itinerary-${item.id}`,
      type: 'roteiro',
      title: item.title,
      subtitle: `Roteiro • ${item.author}`,
      image: item.image,
      refId: refId as number | string,
    });
    if (item.userItinerary && onPublicUserItineraryClick) {
      onPublicUserItineraryClick(item.userItinerary);
      return;
    }
    if (typeof item.id === 'number') {
      onItineraryClick(item.id);
    }
  };

  const handleRecentClick = (item: RecentSearch) => {
    if (item.type === 'roteiro') {
      if (typeof item.refId === 'number') {
        onItineraryClick(item.refId);
        return;
      }
      if (typeof item.refId === 'string') {
        const match = mergedItineraries.find((i) => i.id === item.refId);
        if (match?.userItinerary && onPublicUserItineraryClick) {
          onPublicUserItineraryClick(match.userItinerary);
        }
        return;
      }
    }
    if (item.type === 'pessoa' && typeof item.refId === 'string') {
      const person = [...realPeople, ...peopleSuggestions].find((p) => p.id === item.refId);
      if (person) goToPersonProfile(person);
    }
    if (item.type === 'lugar' && typeof item.refId === 'number') {
      const dest = trendingDestinations.find((d) => d.id === item.refId);
      if (dest && onPlaceClick) {
        onPlaceClick({ country: dest.name, continent: dest.country, image: dest.image });
      }
    }
  };

  const displayQuery = resultsQuery || query;
  const displayResults = resultsQuery ? results : suggestions;
  const hasResults =
    displayResults.places.length > 0 ||
    displayResults.people.length > 0 ||
    displayResults.itineraries.length > 0;

  /**
   * Predicado de filtros aplicado a roteiros e pessoas para a tela de filtros
   * mostrar um preview do total de resultados antes de aplicar.
   * Match feito sobre `tags` normalizadas (já enriquecidas com região/país).
   */
  const countFilteredResults = (f: ExploreFilters): number => {
    const baseQuery = resultsQuery || query;
    const base = buildResults(baseQuery);
    const baseList = baseQuery
      ? f.searchType === 'pessoas'
        ? base.people.length
        : base.places.length + base.itineraries.length
      : f.searchType === 'pessoas'
        ? [...realPeople, ...peopleSuggestions].length
        : mergedItineraries.length + trendingDestinations.length;

    if (f.searchType === 'pessoas') {
      const peopleAll = baseQuery ? base.people : [...realPeople, ...peopleSuggestions];
      return peopleAll.filter((p) => {
        const hay = [p.name, p.handle, p.location, ...p.tags].map(norm).join(' ');
        if (f.regions.length && !f.regions.some((r) => hay.includes(norm(r)))) return false;
        if (f.creatorType.length && !f.creatorType.some((c) => hay.includes(norm(c)))) return false;
        return true;
      }).length;
    }

    // Roteiros (+ lugares contam)
    const itineraries = baseQuery ? base.itineraries : mergedItineraries;
    const places = baseQuery ? base.places : trendingDestinations;
    const matchItin = itineraries.filter((i) => {
      const tags = (i.tags ?? []).map(norm);
      const hay = [i.title, i.author, ...(i.destinationsRaw ?? []), i.descriptionRaw ?? '']
        .map(norm).join(' ') + ' ' + tags.join(' ');
      if (f.regions.length && !f.regions.some((r) => hay.includes(norm(r)))) return false;
      if (f.tripTypes.length && !f.tripTypes.some((t) => hay.includes(norm(t)))) return false;
      if (f.seasons.length && !f.seasons.some((s) => hay.includes(norm(s)))) return false;
      if (typeof i.price === 'number') {
        if (i.price < f.priceRange[0]) return false;
        if (f.priceRange[1] < 1000 && i.price > f.priceRange[1]) return false;
      }
      if (typeof i.days === 'number') {
        if (i.days < f.durationRange[0]) return false;
        if (f.durationRange[1] < 30 && i.days > f.durationRange[1]) return false;
      }
      return true;
    }).length;
    const matchPlaces = places.filter((p) => {
      const hay = [p.name, p.country, ...(p.tags ?? [])].map(norm).join(' ');
      if (f.regions.length && !f.regions.some((r) => hay.includes(norm(r)))) return false;
      if (f.tripTypes.length && !f.tripTypes.some((t) => hay.includes(norm(t)))) return false;
      if (f.seasons.length && !f.seasons.some((s) => hay.includes(norm(s)))) return false;
      return true;
    }).length;
    return matchItin + matchPlaces;
  };


  return (
    <>
      {showFilters && (
        <FiltersScreen
          initial={appliedFilters}
          onClose={() => setShowFilters(false)}
          onApply={(f) => setAppliedFilters(f)}
          countResults={countFilteredResults}
        />
      )}
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F2F2F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-5 pt-4 pb-3" style={{ backgroundColor: '#F2F2F2' }}>
        <div className="flex items-center gap-2 w-full min-w-0">
          <BackButton onClick={onClose} ariaLabel="Voltar" />
          <div className="flex-1 min-w-0 flex items-center gap-2.5 px-4 h-10 bg-card rounded-full border border-border">
            <Icon name="search" size={18} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Buscar lugar, pessoas, roteiros..."
              className="flex-1 bg-transparent text-[16px] placeholder:text-muted-foreground focus:outline-none min-w-0"
              autoFocus
              enterKeyHint="search"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSubmittedQuery('');
                }}
                className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
                aria-label="Limpar"
              >
                <Icon name="close" size={12} className="text-foreground" />
              </button>
            )}
          </div>
          <button
            aria-label="Filtros"
            onClick={() => setShowFilters(true)}
            className="relative w-10 h-10 -mr-1 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
          >
            <SlidersHorizontal size={18} className="text-foreground" />
            {activeFiltersCount > 0 && (
              <span
                className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ backgroundColor: '#9DCC36', color: '#1A1C40' }}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-5 pt-2">
        {/* Empty query: recent searches */}
        {!displayQuery && (
          <section>
            <div className="flex items-center justify-between mb-3 mt-2">
              <h2 className="text-[18px] font-bold text-foreground">Buscas recentes</h2>
              {recent.length > 0 && (
                <button
                  onClick={clearRecent}
                  className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpar tudo
                </button>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Icon name="history" size={24} className="text-muted-foreground" />
                </div>
                <p className="text-[14px] text-muted-foreground text-center">
                  Suas buscas recentes aparecerão aqui
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map((item) => {
                  const isCircle = item.type === 'pessoa';
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <button
                        onClick={() => handleRecentClick(item)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className={`w-12 h-12 object-cover flex-shrink-0 ${
                            isCircle ? 'rounded-full' : 'rounded-lg'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-foreground truncate">
                            {item.title}
                          </p>
                          <p className="text-[12px] text-muted-foreground truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => removeRecent(item.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
                        aria-label="Remover"
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Active query: results */}
        {displayQuery && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between mb-1 mt-2">
              <h2 className="text-[18px] font-bold text-foreground">Resultados</h2>
            </div>
            {!hasResults && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Icon name="search" size={24} className="text-muted-foreground" />
                </div>
                <p className="text-[14px] text-muted-foreground text-center">
                  Nenhum resultado para "{searchQuery}"
                </p>
              </div>
            )}

            {displayResults.places.length > 0 && (
              <section>
                <h2 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  Lugares
                </h2>
                <ul className="divide-y divide-border/60">
                  {displayResults.places.map((d) => (
                    <li key={d.id}>
                      <button
                        onClick={() => handlePlaceClick(d)}
                        className="w-full flex items-center gap-3 py-3 text-left"
                      >
                        <img src={d.image} alt={d.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-foreground truncate">{d.name}</p>
                          <p className="text-[12px] text-muted-foreground truncate">Lugar • {d.country}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {displayResults.people.length > 0 && (
              <section>
                <h2 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  Pessoas
                </h2>
                <ul className="divide-y divide-border/60">
                  {displayResults.people.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => handlePersonClick(p)}
                        className="w-full flex items-center gap-3 py-3 text-left"
                      >
                        <img src={p.image} alt={p.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-[12px] text-muted-foreground truncate">Pessoa • {p.handle}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {displayResults.itineraries.length > 0 && (
              <section>
                <h2 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  Roteiros à venda
                </h2>
                <ul className="space-y-3">
                  {displayResults.itineraries.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleItineraryClick(item)}
                        className="w-full flex gap-3 text-left bg-white rounded-2xl p-4 border border-border/60"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="min-w-0">
                            <div className="flex items-start gap-2 min-w-0">
                              <p className="text-[15px] font-bold text-foreground leading-tight line-clamp-2 flex-1 min-w-0">
                                {item.title}
                              </p>
                              <span className="flex items-center gap-0.5 text-[12px] text-foreground flex-shrink-0 mt-0.5">
                                <span className="text-[#FACC15]">★</span>
                                <span className="font-semibold">{(item.rating ?? 0).toFixed(1)}</span>
                              </span>
                            </div>
                            <p className="text-[12px] text-muted-foreground mt-1">
                              {item.days} {item.days === 1 ? 'dia' : 'dias'}
                              {item.cities > 0 && ` • ${item.cities} ${item.cities === 1 ? 'lugar' : 'lugares'}`}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={item.authorImage}
                                alt={item.author}
                                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              />
                              <span className="text-[12px] text-muted-foreground truncate">
                                {item.author}
                              </span>
                            </div>
                            <span className="text-[14px] font-bold text-foreground flex-shrink-0 ml-2">
                              {item.price > 0
                                ? formatBRL(item.price)
                                : 'Grátis'}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
