import { useEffect, useMemo, useRef, useState } from 'react';
import { useBackHandler } from '@/lib/backStack';
import { differenceInDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { FiltersScreen, DEFAULT_FILTERS, type ExploreFilters } from './FiltersScreen';
import { BackButton } from '@/components/ui/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { listPublicItineraries, type UserItinerary } from '@/lib/itinerariesApi';
import { COUNTRY_TO_TAGS } from '@/data/countriesCatalog';
import { toast } from 'sonner';
import { resolveCoverImage } from '@/lib/coverImageResolver';
import { MarketplaceItineraryCard } from '@/components/travel/MarketplaceItineraryCard';
import { getAverageRatings } from '@/lib/marketplaceApi';
import { getItineraryBadge, type ItineraryBadge } from '@/lib/itineraryBadge';
import { RecentSearchesList } from '@/components/home/RecentSearchesList';
import { SearchResultsSkeleton } from '@/components/ui/LoadingShimmers';
import { addRecentSearch, clearRecentSearches, getRecentSearches, removeRecentSearch } from '@/lib/recentSearches';
const defaultAvatarUrl = '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png';

let cachedPublicItineraries: SearchItinerary[] | null = null;
let lastReloadAtPublicItin = 0;
/** Fetch de roteiros em andamento — quem chegar durante ele espera em vez de pular. */
let publicInFlight: Promise<void> | null = null;
let cachedCurrentUserId: string | null = null;



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
  badge: ItineraryBadge | null;
  salesCount: number;
  publishedAt: string | null;
  /** Owner user_id, used to bubble up the user's own published itineraries. */
  ownerUserId?: string;
  /** Set when this entry comes from a user-published itinerary (uuid id). */
  userItinerary?: UserItinerary;
}

// Mocked search itineraries and destinations removed in favor of Supabase fetching.

interface SearchScreenProps {
  /** Filtros já aplicados ao abrir (ex.: categoria escolhida na Home). */
  initialFilters?: Partial<ExploreFilters>;
  /** Termo já buscado na Home: a tela abre direto nos resultados. */
  initialQuery?: string;
  onClose: () => void;
  onItineraryClick: (id: number) => void;
  onPublicUserItineraryClick?: (userItinerary: UserItinerary) => void;
}

export function SearchScreen({ initialFilters, initialQuery = '', onClose, onItineraryClick, onPublicUserItineraryClick }: SearchScreenProps) {
  // Arrastar da borda esquerda executa o mesmo que a seta de voltar.
  useBackHandler(onClose);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>(() => getRecentSearches());
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ExploreFilters>(() => ({ ...DEFAULT_FILTERS, ...initialFilters }));


  const [publicItineraries, setPublicItineraries] = useState<SearchItinerary[]>(() => cachedPublicItineraries || []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => cachedCurrentUserId);
  // Sem cache, os resultados ainda não existem: mostra shimmer até a primeira carga terminar.
  const [loadingPublic, setLoadingPublic] = useState(() => cachedPublicItineraries === null);

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
    if (publicInFlight) {
      await publicInFlight;
      if (cachedPublicItineraries) setPublicItineraries(cachedPublicItineraries);
      setLoadingPublic(false);
      return;
    }
    const now = Date.now();
    if (now - lastReloadAtPublicItin < 5000) {
      setLoadingPublic(false);
      return;
    }
    lastReloadAtPublicItin = now;
    publicInFlight = fetchPublic().finally(() => { publicInFlight = null; });
    await publicInFlight;
    setLoadingPublic(false);
  };

  const fetchPublic = async () => {
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
        if ((row as any).mainTag) tagSet.add(norm((row as any).mainTag));
        tagSet.add(norm(row.authorName));
        if (row.authorUsername) tagSet.add(norm(row.authorUsername.replace(/^@/, '')));
        // Descrição: cada palavra como tag adicional
        if (row.description) {
          norm(row.description).split(/\s+/).forEach((w) => w && tagSet.add(w));
        }

        const start = new Date(row.startDate);
        const end = new Date(row.endDate);
        const days = row.isFlexible && row.durationDays ? row.durationDays : Math.max(1, differenceInDays(end, start) + 1);

        return {
          id: row.id,
          title: row.title || 'Roteiro',
          image: row.images?.[0] && !row.images[0].includes('placeholder') ? row.images[0] : resolveCoverImage(row.destinations).url,
          days,
          cities: cities.size || 1,
          author: row.authorName,
          authorImage: row.authorAvatar || defaultAvatarUrl,
          price: (row.priceCents ?? 0) / 100,
          badge: getItineraryBadge(row),
          salesCount: row.salesCount,
          publishedAt: row.publishedAt,
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
            mainTag: (row as any).mainTag,
            userId: row.userId,
          },
        };
      });

      cachedPublicItineraries = mapped;
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
    setRecent(addRecentSearch(q));
    // Atualiza a lista no submit para garantir dados frescos (com guard de 5s).
    void reloadPublic();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (submittedQuery) setSubmittedQuery('');
  };

  const activeFiltersCount =
    (appliedFilters.regions?.length || 0) +
    (appliedFilters.tripTypes?.length || 0) +
    (appliedFilters.seasons?.length || 0) +
    (appliedFilters.priceRange?.[0] !== 0 || appliedFilters.priceRange?.[1] !== 1000 ? 1 : 0) +
    (appliedFilters.durationRange?.[0] !== 1 || appliedFilters.durationRange?.[1] !== 30 ? 1 : 0);

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

  // Carrega no mount.
  useEffect(() => {
    void reloadPublic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `norm` is declared at module scope.

  const query = norm(searchQuery.trim());
  const resultsQuery = norm(submittedQuery.trim());

  const hasAnyFilter = (f: ExploreFilters) =>
    f.regions.length > 0 || f.tripTypes.length > 0 || f.seasons.length > 0 ||
    f.priceRange[0] !== 0 || f.priceRange[1] !== 1000 ||
    f.durationRange[0] !== 1 || f.durationRange[1] !== 30;

  const regionMatch = (haystack: string, r: string) => {
    if (r === 'americas') return haystack.includes('america');
    return haystack.includes(norm(r));
  };

  const searchItineraries = (q: string, f: ExploreFilters): SearchItinerary[] => {
    if (!q && !hasAnyFilter(f)) return [];
    return mergedItineraries
      .filter((i) => {
        const haystack = [
          i.title,
          i.author,
          ...(i.tags ?? []),
          ...(i.destinationsRaw ?? []),
          i.descriptionRaw ?? '',
        ].map(norm).join(' ');
        if (q && !haystack.includes(q)) return false;
        if (f.regions.length && !f.regions.some((r) => regionMatch(haystack, r))) return false;
        if (f.tripTypes.length && !f.tripTypes.some((t) => haystack.includes(norm(t)))) return false;
        if (f.seasons.length && !f.seasons.some((s) => haystack.includes(norm(s)))) return false;
        if (i.price < f.priceRange[0]) return false;
        // 1000 no slider atua como "sem limite".
        if (f.priceRange[1] !== 1000 && i.price > f.priceRange[1]) return false;
        if (i.days < f.durationRange[0]) return false;
        // Da mesma forma, 30 atua como sem limite.
        if (f.durationRange[1] !== 30 && i.days > f.durationRange[1]) return false;
        return true;
      })
      // Destaques (impulsionados) primeiro, depois os mais vendidos, depois os mais recentes.
      .sort((a, b) =>
        Number(b.badge === 'destaque') - Number(a.badge === 'destaque')
        || b.salesCount - a.salesCount
        || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  };

  const results = useMemo(
    () => searchItineraries(resultsQuery, appliedFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resultsQuery, mergedItineraries, appliedFilters],
  );

  const ratingIds = useMemo(
    () => results.map((i) => i.id).filter((id): id is string => typeof id === 'string'),
    [results],
  );
  const { data: ratings } = useQuery({
    queryKey: ['itinerary-ratings', ratingIds],
    queryFn: () => getAverageRatings(ratingIds),
    enabled: ratingIds.length > 0,
  });

  const toCardData = (item: SearchItinerary) => ({
    title: item.title,
    description: item.descriptionRaw,
    image: item.image,
    rating: ratings?.[String(item.id)] ?? 0,
    places: item.userItinerary?.places ?? 0,
    days: item.days,
    author: item.author,
    authorImage: item.authorImage,
    price: item.price,
    badge: item.badge,
  });

  const handleItineraryClick = (item: SearchItinerary) => {
    if (item.userItinerary && onPublicUserItineraryClick) {
      onPublicUserItineraryClick(item.userItinerary);
      return;
    }
    if (typeof item.id === 'number') {
      onItineraryClick(item.id);
    }
  };

  const handleRecentSelect = (term: string) => {
    setSearchQuery(term);
    setSubmittedQuery(term);
    setRecent(addRecentSearch(term));
    void reloadPublic();
  };

  const displayQuery = resultsQuery;
  const resultsCountLabel = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`;
  const hasResults = results.length > 0;

  /** Total mostrado na tela de filtros antes de aplicar. */
  const countFilteredResults = (f: ExploreFilters): number => {
    const baseQuery = resultsQuery || query;
    if (!baseQuery && !hasAnyFilter(f)) return mergedItineraries.length;
    return searchItineraries(baseQuery, f).length;
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
      <div className="min-h-[100dvh] pb-24 bg-[#F3F3F3]">
        <header className="sticky top-0 z-20 px-4 pb-6 bg-[#F3F3F3]" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <div className="flex items-center gap-4 w-full min-w-0">
            <div className="flex-1 min-w-0 h-[49px] px-4 flex items-center gap-2 bg-white border border-[#FEFEFE] rounded-[12px]">
              <button type="button" onClick={onClose} aria-label="Voltar" className="flex-shrink-0 active:scale-95 transition-transform">
                <Icon name="arrow_back" size={16} className="text-[#141530]" />
              </button>
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
                placeholder="Comece a buscar"
                className="flex-1 min-w-0 !bg-transparent text-[14px] font-medium text-[#080B43] placeholder:text-[#949494] focus:outline-none"
                autoFocus={!initialQuery}
                enterKeyHint="search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSubmittedQuery('');
                  }}
                  className="flex-shrink-0 text-[#141530]"
                  aria-label="Limpar"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
            {(!!submittedQuery || hasAnyFilter(appliedFilters)) && (
              <button
                type="button"
                aria-label="Filtros"
                onClick={() => setShowFilters(true)}
                className="relative w-6 h-6 flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
              >
                <Icon name="tune" size={24} className="text-[#141530]" />
                {activeFiltersCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: '#9DCC36', color: '#1A1C40' }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="px-4">
          {/* Empty query and no filters: recent searches */}
          {!(displayQuery || hasAnyFilter(appliedFilters)) && (
            <section>
              <div className="flex items-center justify-between mb-3 mt-2">
                <h2 className="text-[18px] font-bold text-foreground">Buscas recentes</h2>
                {recent.length > 0 && (
                  <button
                    onClick={() => setRecent(clearRecentSearches())}
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
                <RecentSearchesList
                  terms={recent}
                  onSelect={handleRecentSelect}
                  onRemove={(term) => setRecent(removeRecentSearch(term))}
                />
              )}
            </section>
          )}

          {/* Active query or active filters: results */}
          {(displayQuery || hasAnyFilter(appliedFilters)) && (
            <div className="flex flex-col gap-4">
              {!loadingPublic && hasResults && (
                <p className="text-[14px] font-medium text-[#646464]">{resultsCountLabel}</p>
              )}
              {loadingPublic && <SearchResultsSkeleton />}
              {!loadingPublic && !hasResults && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Icon name="search" size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-[14px] text-muted-foreground text-center">
                    {searchQuery ? `Nenhum resultado para "${searchQuery}"` : 'Nenhum resultado encontrado.'}
                  </p>
                </div>
              )}

              {!loadingPublic && results.length > 0 && (
                <div className="flex flex-col gap-6">
                  {results.map((item) => (
                    <MarketplaceItineraryCard
                      key={item.id}
                      className="w-full"
                      itinerary={toCardData(item)}
                      onClick={() => handleItineraryClick(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
