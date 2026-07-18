import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useFavorites } from '@/contexts/FavoritesContext';
import { differenceInDays } from 'date-fns';
import { BackButton } from '@/components/ui/BackButton';
import {
  DestinationFiltersSheet,
  DEFAULT_FILTERS,
  countActiveFilters,
  type DestinationFilters,
} from '@/components/travel/DestinationFiltersSheet';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQuery } from '@tanstack/react-query';
import { listPublicItineraries } from '@/lib/itinerariesApi';
import { Loader2 } from 'lucide-react';
import { ALL_COUNTRIES } from '@/data/countriesCatalog';

interface DestinationItinerariesScreenProps {
  country: string;
  continent?: string;
  coverImage?: string;
  onBack: () => void;
  onItineraryClick: (id: number | string, item?: DisplayItinerary) => void;
}

type SortOption = 'recent' | 'rating' | 'price_asc';

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

import { resolveCoverImage } from '@/lib/coverImageResolver';

export interface DisplayItinerary {
  id: number | string;
  title: string;
  image: string;
  days: number;
  places: number;
  rating: number; // 0 para sem avaliação
  price: number;
  author: string;
  authorImage: string;
  category?: string;
  season?: string;
  isPopular?: boolean;
  isNew?: boolean;
  userItinerary?: import('@/lib/itinerariesApi').UserItinerary;
}

const CATEGORIES: Record<string, string> = {
  'Praia': '🏖️',
  'Cultural': '🏛️',
  'Romântico': '💕',
  'Aventura': '🥾',
  'Gastronomia': '🍽️',
  'Cidade': '🏙️',
};

export function DestinationItinerariesScreen({
  country,
  continent,
  coverImage,
  onBack,
  onItineraryClick,
}: DestinationItinerariesScreenProps) {
  const [sort, setSort] = useState<SortOption>('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DestinationFilters>(DEFAULT_FILTERS);
  const { toggleFavorite, isFavorite } = useFavorites();

  // Buscar todos os roteiros públicos do backend
  const { data: publicItineraries, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['public-itineraries'],
    queryFn: () => listPublicItineraries(),
  });

  const allItineraries = useMemo<DisplayItinerary[]>(() => {
    const needle = norm(country);

    // Roteiros do marketplace (backend)
    const marketplaceItineraries = (publicItineraries ?? [])
      .filter((it) => {
        return it.destinations.some((d) => {
          const lowerD = norm(d);
          // First check exact includes
          if (lowerD.includes(needle)) return true;

          // Then try to match by country alias or name to handle variations
          const countryPart = d.split(',').pop()?.trim() || lowerD;
          const normCountryPart = norm(countryPart);
          const match = ALL_COUNTRIES.find(c =>
            norm(c.name) === normCountryPart ||
            c.aliases?.some(a => norm(a) === normCountryPart)
          );
          if (match) {
            return norm(match.name) === needle || (match.aliases && match.aliases.some(a => norm(a) === needle));
          }
          return false;
        });
      })
      .map<DisplayItinerary>((it) => {
        const start = new Date(it.startDate);
        const end = new Date(it.endDate);
        const days = Math.max(1, differenceInDays(end, start) + 1);

        let itCover = it.images?.[0];
        if (!itCover || itCover.includes('placeholder')) {
          itCover = resolveCoverImage(it.destinations).url;
        }

        // Definindo regras simples de "Novo" e "Popular" para a tag
        const isNew = true; // Por enquanto vamos considerar todos como novo até termos datas de criação no DB
        const isPopular = (it.priceCents ?? 0) < 5000; // Mock: se for "barato", é popular

        return {
          id: it.id,
          title: it.title || 'Roteiro',
          image: itCover,
          days,
          places: it.places || 0,
          rating: 0, // Alterado para 0 para mostrar '-' na UI
          price: (it.priceCents ?? 0) / 100,
          author: it.authorName,
          authorImage: it.authorAvatar,
          category: it.tags.filter(t => t !== '_FLEXIBLE_DATES_')[0] || 'Viagem',
          categoryEmoji: CATEGORIES[it.tags.filter(t => t !== '_FLEXIBLE_DATES_')[0] || ''] || '🗺️',
          season: undefined, // Poderia ser extraído de tags se suportado
          isNew,
          isPopular,
          userItinerary: it
        };
      });

    return marketplaceItineraries;
  }, [country, publicItineraries]);

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

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    return list;
  }, [filtered, sort]);

  const activeFilterCount = countActiveFilters(filters);

  const sortLabels: Record<SortOption, string> = {
    recent: 'Mais recentes',
    rating: 'Melhor avaliados',
    price_asc: 'Menor preço',
  };

  const toggleSave = (item: DisplayItinerary, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({
      id: item.id as number | string,
      title: item.title,
      image: item.image,
      creator: item.author,
      creatorImage: item.authorImage,
      days: item.days,
      places: item.places,
      price: item.price,
      rating: item.rating,
    });
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#F2F2F2' }}>
      {/* Hero */}
      <div className="relative h-[200px] w-full overflow-hidden">
        {coverImage && (
          <img src={coverImage} alt={country} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        <div className="absolute top-0 left-4 z-10" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} ariaLabel="Voltar" />
        </div>
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <h1 className="text-[26px] font-bold leading-tight drop-shadow-md">
            Roteiros à venda em {country}
          </h1>
          {continent && (
            <p className="text-[13px] font-medium text-white/85 mt-0.5">{continent}</p>
          )}
        </div>
      </div>

      {/* Sort chips + filter */}
      <div
        className="px-5 pt-safe-top pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        <button
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-1.5 h-8 rounded-full px-3.5 flex-shrink-0 border whitespace-nowrap relative"
          style={{
            background: activeFilterCount > 0 ? '#1A1C40' : 'hsl(var(--card))',
            color: activeFilterCount > 0 ? '#FFFFFF' : 'hsl(var(--foreground))',
            borderColor: activeFilterCount > 0 ? 'transparent' : 'hsl(var(--border))',
            fontSize: '12px',
            fontWeight: 600,
          }}
          aria-label="Filtros"
        >
          <Icon name="tune" size={14} />
          Filtros
          {activeFilterCount > 0 && (
            <span
              className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold"
              style={{ background: '#9DCC36', color: '#1A1C40' }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
        {(Object.keys(sortLabels) as SortOption[]).map((opt) => {
          const active = sort === opt;
          return (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className="inline-flex items-center h-8 rounded-full px-3.5 flex-shrink-0 border whitespace-nowrap"
              style={{
                background: active ? '#1A1C40' : 'hsl(var(--card))',
                color: active ? '#FFFFFF' : 'hsl(var(--foreground))',
                borderColor: active ? 'transparent' : 'hsl(var(--border))',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {sortLabels[opt]}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="px-5 pt-2 flex flex-col gap-4">
        {isLoading || isFetching ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
            <p className="mt-4 text-sm text-muted-foreground font-medium">Buscando roteiros...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Icon name="map" size={48} className="text-muted-foreground/30 mb-3" />
            <h3 className="text-[17px] font-semibold text-foreground">Nenhum roteiro encontrado</h3>
            <p className="text-[14px] text-muted-foreground mt-1">
              Não encontramos roteiros em {country} com os filtros atuais.
            </p>
          </div>
        ) : (
          sorted.map((item) => (
            <button
              key={item.id}
              onClick={() => onItineraryClick(item.id, item)}
              className="w-full flex flex-col text-left bg-card rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}
            >
              <div className="relative w-full aspect-[16/6] overflow-hidden p-2">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-xl" />
                {(item.isPopular || item.isNew) && (
                  <div
                    className="absolute top-4 left-4 flex items-center gap-1 rounded-full px-2.5 py-1 shadow-sm"
                    style={{ backgroundColor: item.isPopular ? '#9DCC36' : '#16A34A' }}
                  >
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: item.isPopular ? '#1A1C40' : '#FFFFFF' }}
                    >
                      {item.isPopular ? 'Popular' : 'Novo roteiro'}
                    </span>
                  </div>
                )}
                <button
                  onClick={(e) => toggleSave(item, e)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
                  aria-label="Salvar"
                >
                  <Icon
                    name="favorite"
                    size={18}
                    filled={isFavorite(item.id as number | string)}
                    className={isFavorite(item.id as number | string) ? 'text-florida' : ''}
                    style={!isFavorite(item.id as number | string) ? { color: '#1E293B' } : undefined}
                  />
                </button>
              </div>
              <div className="px-4 pt-1 pb-4 flex flex-col gap-2">
                <h3 className="font-bold text-[15px] text-foreground leading-tight">{item.title}</h3>
                <div className="flex items-center gap-1.5">
                  <Icon name="star" size={14} className="text-[#F2B90C]" />
                  <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.rating > 0 ? item.rating.toFixed(1) : '-'}</span>
                  <span className="mx-1 text-foreground/30">·</span>
                  <Icon name="location_on" size={14} style={{ color: '#1E293B' }} />
                  <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.places} locais</span>
                  <span className="mx-1 text-foreground/30">·</span>
                  <Icon name="schedule" size={14} style={{ color: '#1E293B' }} />
                  <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.days} dias</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <img src={item.authorImage} alt={item.author} className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-[13px] font-medium" style={{ color: '#171F2C' }}>{item.author}</span>
                  </div>
                  <span className="text-[15px] font-bold text-foreground">
                    {item.price === 0 ? 'Grátis' : `R$ ${item.price}`}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

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
