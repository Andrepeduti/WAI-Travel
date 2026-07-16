import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { FiltersScreen, DEFAULT_FILTERS, type ExploreFilters } from './FiltersScreen';
import { visitedCountries } from '@/data/visitedCountries';
import { BackButton } from '@/components/ui/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { listPublicItineraries, type UserItinerary } from '@/lib/itinerariesApi';
import { COUNTRY_TO_TAGS, ALL_COUNTRIES } from '@/data/countriesCatalog';
import { toast } from 'sonner';
import { resolveCoverImage } from '@/lib/coverImageResolver';
const defaultAvatarUrl = '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png';

let cachedRealPeople: PeopleSuggestion[] | null = null;
let cachedPublicItineraries: SearchItinerary[] | null = null;
let cachedDestinations: any[] | null = null;
let lastReloadAtPublicItin = 0;
let lastReloadAtProfiles = 0;
let lastReloadAtDestinations = 0;
let cachedCurrentUserId: string | null = null;

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });



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

// Mocked search itineraries and destinations removed in favor of Supabase fetching.

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

// Mocked people suggestions have been removed. Using real users from Supabase.

type RecentType = 'lugar' | 'pessoa' | 'roteiro' | 'termo';
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

const profileRowToPerson = (row: ProfileSearchRow): PeopleSuggestion => {
  const baseTags = [row.name, row.username ?? '', row.location, row.bio, ...(row.interests ?? [])].filter(Boolean).map(norm);
  const tagSet = new Set(baseTags);
  if (row.location) {
    const locNorm = norm(row.location);
    const matchedCountry = ALL_COUNTRIES.find(c => {
      const cNorm = norm(c.name);
      if (locNorm.includes(cNorm)) return true;
      if (c.aliases?.some(a => new RegExp(`\\b${norm(a)}\\b`).test(locNorm))) {
        return true;
      }
      return false;
    });

    if (matchedCountry) {
      const nc = norm(matchedCountry.name);
      tagSet.add(nc);
      tagSet.add(norm(matchedCountry.continent));
      const extras = COUNTRY_TO_TAGS[matchedCountry.name.toLowerCase()] ?? COUNTRY_TO_TAGS[nc] ?? [];
      extras.forEach((t) => tagSet.add(norm(t)));
    } else {
      const parts = row.location.split(',').map(s => s.trim());
      const country = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      if (country) {
        const nc = norm(country);
        const extras = COUNTRY_TO_TAGS[country.toLowerCase()] ?? COUNTRY_TO_TAGS[nc] ?? [];
        extras.forEach((t) => tagSet.add(norm(t)));
      }
    }
  }

  return {
    id: `profile-${row.user_id}`,
    userId: row.user_id,
    name: row.name || row.username || 'Viajante',
    handle: row.username ? `@${row.username.replace(/^@/, '')}` : '@viajante',
    image: row.avatar_url || '',
    location: row.location || 'WaiTravel',
    followers: String(row.followers_count ?? 0),
    following: row.following_count ?? 0,
    tags: Array.from(tagSet),
  };
};

export function SearchScreen({ onClose, onItineraryClick, onPublicUserItineraryClick, onPlaceClick }: SearchScreenProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('wai_searchQuery') || '');
  const [submittedQuery, setSubmittedQuery] = useState(() => sessionStorage.getItem('wai_submittedQuery') || '');
  const [recent, setRecent] = useState<RecentSearch[]>(() => loadRecent());
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ExploreFilters>(() => {
    try {
      const saved = sessionStorage.getItem('wai_appliedFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.searchType === 'todos') {
          parsed.searchType = null;
        }
        return { ...DEFAULT_FILTERS, ...parsed };
      }
      return DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  useEffect(() => {
    sessionStorage.setItem('wai_searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem('wai_submittedQuery', submittedQuery);
  }, [submittedQuery]);

  useEffect(() => {
    sessionStorage.setItem('wai_appliedFilters', JSON.stringify(appliedFilters));
  }, [appliedFilters]);
  const [realPeople, setRealPeople] = useState<PeopleSuggestion[]>(() => cachedRealPeople || []);
  const [publicItineraries, setPublicItineraries] = useState<SearchItinerary[]>(() => cachedPublicItineraries || []);
  const [destinations, setDestinations] = useState<{id: string; name: string; country: string; continent: string; image: string; itineraryCount: number; tags: string[]; rating: number}[]>(() => cachedDestinations || []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => cachedCurrentUserId);

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
    for (const it of [...own, ...others]) {
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
    if (now - lastReloadAtPublicItin < 5000) return;
    lastReloadAtPublicItin = now;
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
          image: row.images?.[0] && !row.images[0].includes('placeholder') ? row.images[0] : resolveCoverImage(row.destinations).url,
          rating: 0,
          days,
          cities: cities.size || 1,
          author: row.authorName,
          authorImage: row.authorAvatar || defaultAvatarUrl,
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

      const generatedDestinations = new Map<string, any>();
      rows.forEach(row => {
        (row.destinations || []).forEach(dest => {
          const [city, country] = dest.split(',').map((s) => s?.trim() ?? '');
          const placeName = city || dest;
          if (!placeName) return;
          const key = norm(placeName);
          
          if (!generatedDestinations.has(key)) {
            generatedDestinations.set(key, {
              id: key,
              name: placeName,
              country: country || '',
              continent: '',
              image: row.images?.[0] && !row.images[0].includes('placeholder') ? row.images[0] : resolveCoverImage([dest]).url,
              itineraryCount: 1,
              tags: Array.from(COUNTRY_TO_TAGS[norm(country || placeName)] || []),
              rating: row.rating || 4.7
            });
          } else {
            generatedDestinations.get(key).itineraryCount++;
          }
        });
      });

      cachedPublicItineraries = mapped;
      setPublicItineraries(mapped);

      setDestinations(prev => {
        const dbKeys = new Set(prev.map(d => norm(d.name)));
        const finalDests = [...prev];
        for (const gen of generatedDestinations.values()) {
          if (!dbKeys.has(norm(gen.name))) {
            finalDests.push(gen);
            dbKeys.add(norm(gen.name));
          }
        }
        cachedDestinations = finalDests;
        return finalDests;
      });
    } catch (err) {
      console.error('[SearchScreen] listPublicItineraries failed', err);
      toast.error('Não foi possível atualizar a lista de roteiros');
    }
  };

  const handleSubmit = () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSubmittedQuery(q);
    addRecent({
      id: `term-${norm(q)}`,
      type: 'termo',
      title: q,
      subtitle: 'Busca por termo',
      image: '',
      refId: q,
    });
    // Atualiza a lista no submit para garantir dados frescos (com guard de 5s).
    void reloadPublic();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (submittedQuery) setSubmittedQuery('');
  };

  const activeFiltersCount =
    (appliedFilters.searchType !== null ? 1 : 0) +
    (appliedFilters.regions?.length || 0) +
    (appliedFilters.countries?.length || 0) +
    (appliedFilters.tripTypes?.length || 0) +
    (appliedFilters.seasons?.length || 0) +
    (appliedFilters.priceRange?.[0] !== 0 || appliedFilters.priceRange?.[1] !== 1000 ? 1 : 0) +
    (appliedFilters.durationRange?.[0] !== 1 || appliedFilters.durationRange?.[1] !== 30 ? 1 : 0) +
    (appliedFilters.creatorType?.length || 0);

  useEffect(() => {
    saveRecent(recent);
  }, [recent]);

  // Captura o user atual para priorizar seus próprios roteiros publicados.
  useEffect(() => {
    let cancelled = false;
    if (cachedCurrentUserId) return; // If already cached, don't refetch
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        cachedCurrentUserId = data.user?.id ?? null;
        setCurrentUserId(cachedCurrentUserId);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProfiles = async () => {
      const now = Date.now();
      if (now - lastReloadAtProfiles < 5000) return;
      lastReloadAtProfiles = now;
      const { data, error } = await supabase
        .from('profiles_public')
        .select('user_id, name, username, location, avatar_url, bio, interests, followers_count, following_count')
        .not('username', 'is', null)
        .limit(50);
      if (error) {
        console.error('[SearchScreen] profiles search failed', error);
        return;
      }
      if (!cancelled) {
        const mapped = (data ?? []).map((row) => profileRowToPerson(row as ProfileSearchRow));
        cachedRealPeople = mapped;
        setRealPeople(mapped);
      }
    };
    loadProfiles();
    return () => { cancelled = true; };
  }, []);

  // Carrega no mount.
  useEffect(() => {
    void reloadPublic();
    
    // Load destinations
    let cancelled = false;
    const loadDestinations = async () => {
      const now = Date.now();
      if (now - lastReloadAtDestinations < 5000) return;
      lastReloadAtDestinations = now;
      const { data, error } = await supabase.from('destinations').select('*').order('created_at', { ascending: false });
      if (!cancelled && !error && data) {
        const mapped = data.map(d => ({
          id: d.id,
          name: d.name,
          country: d.country,
          continent: d.continent,
          image: d.image_url,
          itineraryCount: d.itinerary_count ?? 0,
          tags: d.hashtags ?? [],
          rating: d.rating ?? 4.7
        }));
        cachedDestinations = mapped;
        setDestinations(mapped);
      }
    };
    loadDestinations();

    return () => { cancelled = true; };
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

  const hasAnyFilter = (f: ExploreFilters) => {
    return f.searchType !== null || f.regions?.length > 0 || f.countries?.length > 0 || f.tripTypes?.length > 0 || f.seasons?.length > 0 || f.creatorType?.length > 0 || 
      f.priceRange?.[0] !== 0 || f.priceRange?.[1] !== 1000 || 
      f.durationRange?.[0] !== 1 || f.durationRange?.[1] !== 30;
  };

  const regionMatch = (haystack: string, r: string) => {
    if (r === 'americas') return haystack.includes('america');
    return haystack.includes(norm(r));
  };

  const buildResults = (q: string, f: ExploreFilters) => {
    if (!q && !hasAnyFilter(f)) return { places: [], people: [], itineraries: [] };
    const peopleCatalog = realPeople;
    
    const hasItineraryFilters = 
      f.regions.length > 0 || 
      f.tripTypes.length > 0 || 
      f.seasons.length > 0 || 
      f.priceRange[0] !== 0 || 
      f.priceRange[1] !== 1000 || 
      f.durationRange[0] !== 1 || 
      f.durationRange[1] !== 30;

    const forceRoteiros = f.searchType === null && hasItineraryFilters;

    return {
      places: (f.searchType === 'pessoas' || f.searchType === 'roteiros' || forceRoteiros) ? [] : destinations.filter((d) => {
        const haystack = [d.name, d.country, d.continent, ...d.tags].map(norm).join(' ');
        if (q && !haystack.includes(q)) return false;
        if (f.regions.length && !f.regions.some((r) => regionMatch(haystack, r))) return false;
        if (f.tripTypes.length && !f.tripTypes.some((t) => haystack.includes(norm(t)))) return false;
        if (f.seasons.length && !f.seasons.some((s) => haystack.includes(norm(s)))) return false;
        return true;
      }),
      people: (f.searchType === 'roteiros' || f.searchType === 'lugares' || forceRoteiros) ? [] : peopleCatalog.filter((p) => {
        const haystack = [p.name, p.handle, p.location, ...p.tags].map(norm).join(' ');
        if (q && !haystack.includes(q)) return false;
        if (f.regions.length && !f.regions.some((r) => regionMatch(haystack, r))) return false;
        if (f.countries?.length && !f.countries.some((c) => haystack.includes(norm(c)))) return false;
        if (f.creatorType?.length && !f.creatorType.some((c) => haystack.includes(norm(c)))) return false;
        return true;
      }),
      itineraries: (f.searchType === 'pessoas' || f.searchType === 'lugares') ? [] : mergedItineraries
        .filter((i) => {
          const tags = (i.tags ?? []).map(norm);
          const haystack = [
            i.title,
            i.author,
            ...tags,
            ...(i.destinationsRaw ?? []),
            i.descriptionRaw ?? '',
          ].map(norm).join(' ');
          if (q && !haystack.includes(q)) return false;
          if (f.regions.length && !f.regions.some((r) => regionMatch(haystack, r))) return false;
          if (f.tripTypes.length && !f.tripTypes.some((t) => haystack.includes(norm(t)))) return false;
          if (f.seasons.length && !f.seasons.some((s) => haystack.includes(norm(s)))) return false;
          if (typeof i.price === 'number') {
            if (i.price < f.priceRange[0]) return false;
            if (f.priceRange[1] < 1000 && i.price > f.priceRange[1]) return false;
          }
          if (typeof i.days === 'number') {
            if (i.days < f.durationRange[0]) return false;
            if (f.durationRange[1] < 30 && i.days > f.durationRange[1]) return false;
          }
          return true;
        })
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    };
  };

  const suggestions = useMemo(() => buildResults(query, appliedFilters), [query, realPeople, mergedItineraries, appliedFilters]);
  const results = useMemo(() => buildResults(resultsQuery, appliedFilters), [resultsQuery, realPeople, mergedItineraries, appliedFilters]);

  const handlePlaceClick = (dest: typeof destinations[number]) => {
    addRecent({
      id: `place-${dest.id}`,
      type: 'lugar',
      title: dest.name,
      subtitle: dest.country,
      image: dest.image,
      refId: dest.id,
    });
    if (onPlaceClick) {
      onPlaceClick({ country: dest.name, continent: dest.country, image: dest.image });
    }
  };

  const goToPersonProfile = (person: PeopleSuggestion) => {
    sessionStorage.setItem('wai_returnToSearch', 'true');
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
      const person = realPeople.find((p) => p.id === item.refId);
      if (person) goToPersonProfile(person);
    }
    if (item.type === 'lugar' && item.refId !== undefined) {
      const dest = destinations.find((d) => String(d.id) === String(item.refId));
      if (dest && onPlaceClick) {
        onPlaceClick({ country: dest.name, continent: dest.country, image: dest.image });
      }
    }
    if (item.type === 'termo') {
      setSearchQuery(item.title);
      setSubmittedQuery(item.title);
      void reloadPublic();
    }
  };

  const displayQuery = resultsQuery;
  const displayResults = results;
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
    const base = buildResults(baseQuery, f);

    if (!baseQuery && !hasAnyFilter(f)) {
      return mergedItineraries.length + destinations.length + realPeople.length;
    }

    return base.itineraries.length + base.places.length + base.people.length;
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
 <header className="sticky top-0 z-20 px-5 pb-3" style={{ backgroundColor: '#F2F2F2' }}>
        <div className="flex items-center gap-2 w-full min-w-0" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
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
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-muted-foreground hover:bg-muted/50"
                aria-label="Limpar"
              >
                <Icon name="close" size={16} />
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!searchQuery.trim()}
              className="text-[14px] font-bold transition-colors disabled:opacity-50"
              style={{ color: '#9DCC36' }}
            >
              Buscar
            </button>
          </div>
            {!!submittedQuery && (
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
            )}
        </div>
      </header>

      <main className="px-5 pt-2">
        {/* Empty query and no filters: recent searches */}
        {!(displayQuery || hasAnyFilter(appliedFilters)) && (
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
                        {item.type === 'termo' ? (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon name="search" size={20} className="text-muted-foreground" />
                          </div>
                        ) : (
                          <img
                            src={item.image}
                            alt={item.title}
                            className={`w-12 h-12 object-cover flex-shrink-0 ${
                              isCircle ? 'rounded-full' : 'rounded-lg'
                            }`}
                          />
                        )}
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

        {/* Active query or active filters: results */}
        {(displayQuery || hasAnyFilter(appliedFilters)) && (
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
                  {searchQuery ? `Nenhum resultado para "${searchQuery}"` : 'Nenhum resultado encontrado.'}
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
                          <p className="text-[12px] text-muted-foreground truncate">{d.country}</p>
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
                                <span className="font-semibold">{(item.rating ?? 0) > 0 ? (item.rating ?? 0).toFixed(1) : '-'}</span>
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
