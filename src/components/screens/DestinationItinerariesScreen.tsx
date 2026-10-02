import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketplaceItineraryCard } from '@/components/travel/MarketplaceItineraryCard';
import {
  DestinationFiltersSheet,
  DEFAULT_FILTERS,
  countActiveFilters,
  type DestinationFilters,
} from '@/components/travel/DestinationFiltersSheet';
import { listPublicItineraries, type UserItinerary } from '@/lib/itinerariesApi';
import { getAverageRatings } from '@/lib/marketplaceApi';
import { getDestinationDescription } from '@/lib/destinationDescriptions';
import { getItineraryBadge, type ItineraryBadge } from '@/lib/itineraryBadge';
import { resolveCountriesForDestinations } from '@/lib/countryResolver';
import { resolveCoverImage } from '@/lib/coverImageResolver';

interface DestinationItinerariesScreenProps {
  country: string;
  continent?: string;
  coverImage?: string;
  onBack: () => void;
  onItineraryClick: (id: number | string, item?: DisplayItinerary) => void;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const FLEXIBLE_DATES_TAG = '_FLEXIBLE_DATES_';
/** Altura do hero; o header compacto aparece depois de rolar além dele. */
const HERO_HEIGHT = 244;

export interface DisplayItinerary {
  id: number | string;
  title: string;
  description?: string;
  salesCount: number;
  publishedAt: string | null;
  image: string;
  days: number;
  places: number;
  rating: number; // 0 para sem avaliação
  price: number;
  author: string;
  authorImage: string;
  /** Tag principal do roteiro — usada só pelo filtro de categorias, não é exibida. */
  category?: string;
  season?: string;
  badge: ItineraryBadge | null;
  userItinerary?: UserItinerary;
}

export function DestinationItinerariesScreen({
  country,
  coverImage,
  onBack,
  onItineraryClick,
}: DestinationItinerariesScreenProps) {
  // Mini descrição gerada por IA (uma vez por país, cacheada no banco).
  const { data: description, isLoading: descriptionLoading } = useQuery({
    queryKey: ['destination-description', country],
    queryFn: () => getDestinationDescription(country),
    staleTime: Infinity,
    retry: false, // falhou: some o shimmer; tenta de novo na próxima abertura
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DestinationFilters>(DEFAULT_FILTERS);
  const [compactHeader, setCompactHeader] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompactHeader(window.scrollY > HERO_HEIGHT - 72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Buscar todos os roteiros públicos do backend
  const { data: publicItineraries, isLoading, refetch } = useQuery({
    queryKey: ['public-itineraries'],
    queryFn: () => listPublicItineraries(),
  });

  const countryItineraries = useMemo(() => {
    const needle = norm(country);
    return (publicItineraries ?? []).filter((it) => {
      // Destinos costumam ser só a cidade ("Paris"): resolve os países pelo mapa
      // cidade → país. Roteiro com vários países aparece na coleção de cada um.
      const matchesCountry = resolveCountriesForDestinations(it.destinations).some((c) =>
        norm(c.name) === needle || c.aliases?.some((a) => norm(a) === needle),
      );
      return matchesCountry || it.destinations.some((d) => norm(d).includes(needle));
    });
  }, [country, publicItineraries]);

  const ratingIds = useMemo(() => countryItineraries.map((it) => it.id), [countryItineraries]);
  const { data: ratings } = useQuery({
    queryKey: ['itinerary-ratings', ratingIds],
    queryFn: () => getAverageRatings(ratingIds),
    enabled: ratingIds.length > 0,
  });

  const allItineraries = useMemo<DisplayItinerary[]>(() => countryItineraries.map((it) => {
    const start = new Date(it.startDate);
    const end = new Date(it.endDate);
    const days = it.isFlexible && it.durationDays ? it.durationDays : Math.max(1, differenceInDays(end, start) + 1);

    let image = it.images?.[0];
    if (!image || image.includes('placeholder')) {
      image = resolveCoverImage(it.destinations).url;
    }

    return {
      id: it.id,
      title: it.title || 'Roteiro',
      description: it.description,
      salesCount: it.salesCount,
      publishedAt: it.publishedAt,
      image,
      days,
      places: it.places || 0,
      rating: ratings?.[it.id] ?? 0,
      price: (it.priceCents ?? 0) / 100,
      author: it.authorName,
      authorImage: it.authorAvatar,
      category: it.tags.find((t) => t !== FLEXIBLE_DATES_TAG),
      badge: getItineraryBadge(it),
      userItinerary: it,
    };
  }), [countryItineraries, ratings]);

  const filtered = useMemo(() => {
    return allItineraries.filter((it) => {
      // Days filter (if max is 30, it means 30+ days)
      if (it.days < filters.daysRange[0]) return false;
      if (filters.daysRange[1] < 30 && it.days > filters.daysRange[1]) return false;

      // Price filter (if max is 2000, it means R$ 2000+)
      if (it.price < filters.priceRange[0]) return false;
      if (filters.priceRange[1] < 2000 && it.price > filters.priceRange[1]) return false;

      if (filters.seasons.length && (!it.season || !filters.seasons.includes(it.season))) return false;
      if (filters.categories.length && (!it.category || !filters.categories.includes(it.category))) return false;
      if (filters.minRating > 0 && it.rating < filters.minRating) return false;
      return true;
    });
  }, [allItineraries, filters]);

  // Destaques (impulsionados) primeiro, depois os mais vendidos, depois os mais recentes.
  const sorted = useMemo(() => [...filtered].sort((a, b) =>
    Number(b.badge === 'destaque') - Number(a.badge === 'destaque')
    || b.salesCount - a.salesCount
    || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
  ), [filtered]);

  const activeFilterCount = countActiveFilters(filters);
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'roteiro' : 'roteiros'}`;

  const filterButton = (variant: 'hero' | 'compact') => (
    <button
      type="button"
      onClick={() => setFiltersOpen(true)}
      aria-label="Filtros"
      className={
        variant === 'hero'
          ? 'relative w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform'
          : 'relative w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform'
      }
    >
      <Icon name="tune" size={variant === 'hero' ? 20 : 22} className="text-[#141530]" />
      {activeFilterCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full px-1 bg-[#9DCC36] text-[#141530] text-[10px] font-bold inline-flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-[100dvh] pb-8 bg-[#F3F3F3]">
      {/* Header compacto: aparece ao rolar além do hero */}
      <header
        className={`fixed top-0 inset-x-0 z-30 bg-[#F3F3F3] px-4 pb-3 flex items-center justify-between gap-3 transition-opacity duration-200 ${compactHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <BackButton onClick={onBack} className="bg-transparent shadow-none" />
          <h2 className="text-[20px] font-bold text-[#171F2C] truncate">{country}</h2>
        </div>
        {filterButton('compact')}
      </header>

      {/* Hero */}
      <div className="relative w-full overflow-hidden flex flex-col justify-between gap-2" style={{ minHeight: HERO_HEIGHT }}>
        <img
          src={coverImage || resolveCoverImage([country]).url}
          alt={country}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.26) 0%, rgba(0, 0, 0, 0.8) 65.98%)' }}
        />
        <div
          className="relative z-10 px-6 flex items-center justify-between"
          style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
        >
          <BackButton onClick={onBack} className="w-8 h-8 shadow-none" />
          {filterButton('hero')}
        </div>
        <div className="relative z-10 px-4 pb-10 flex flex-col gap-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          <h1 className="text-[24px] leading-[29px] font-semibold text-[#F2F2F2]">{country}</h1>
          {descriptionLoading ? (
            // Shimmer no espaço da descrição enquanto a IA/banco responde
            <Skeleton className="mt-1 h-2.5 w-4/5 rounded bg-white/25" aria-label="Carregando descrição" />
          ) : description ? (
            <p className="text-[14px] leading-[17px] font-medium text-[#E7E7EE]">{description}</p>
          ) : null}
        </div>
      </div>

      {/* Lista */}
      <main className="px-4 py-6 flex flex-col gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-24 rounded" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-[255px] rounded-[16px]" />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Icon name="map" size={48} className="text-[#646464]/40 mb-3" />
            <h3 className="text-[16px] font-semibold text-[#141530]">Nenhum roteiro encontrado</h3>
            <p className="text-[14px] text-[#646464] mt-1">
              Não encontramos roteiros em {country} com os filtros atuais.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[14px] font-medium text-[#646464]">{countLabel}</p>
            <div className="flex flex-col gap-6">
              {sorted.map((item) => (
                <MarketplaceItineraryCard
                  key={item.id}
                  className="w-full"
                  itinerary={item}
                  onClick={() => onItineraryClick(item.id, item)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <DestinationFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          refetch();
        }}
      />
    </div>
  );
}
