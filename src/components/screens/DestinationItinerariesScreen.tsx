import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getItinerariesByCountry } from '@/data/itineraries';
import { useFavorites } from '@/contexts/FavoritesContext';
import { differenceInDays } from 'date-fns';
import { BackButton } from '@/components/ui/BackButton';
import {
  DestinationFiltersSheet,
  DEFAULT_FILTERS,
  countActiveFilters,
  type DestinationFilters,
} from '@/components/travel/DestinationFiltersSheet';

interface DestinationItinerariesScreenProps {
  country: string;
  continent?: string;
  coverImage?: string;
  onBack: () => void;
  onItineraryClick: (id: number, item?: DisplayItinerary) => void;
}

type SortOption = 'recent' | 'rating' | 'price_asc';

const SEASON_IDS = ['verao', 'outono', 'inverno', 'primavera'];

export interface DisplayItinerary {
  id: number;
  title: string;
  image: string;
  days: number;
  places: number;
  rating: number;
  price: number;
  author: string;
  authorImage: string;
  category?: string;
  categoryEmoji?: string;
  season?: string;
}

const COUNTRY_IMAGES: Record<string, string[]> = {
  'maldivas': [
    'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800',
    'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
    'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=800',
    'https://images.unsplash.com/photo-1505881502353-a1986add3762?w=800',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
  ],
  'japão': [
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800',
    'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
  ],
  'frança': [
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800',
    'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=800',
    'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800',
    'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800',
    'https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?w=800',
  ],
  'argentina': [
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800',
    'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800',
    'https://images.unsplash.com/photo-1605559911160-a3d95d213904?w=800',
    'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=800',
    'https://images.unsplash.com/photo-1612456225451-1856f78cc7d4?w=800',
    'https://images.unsplash.com/photo-1544979590-37e9b47eb705?w=800',
  ],
  'indonésia': [
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
    'https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800',
    'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800',
    'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=800',
    'https://images.unsplash.com/photo-1551966775-a4ddc8df052b?w=800',
  ],
  'estados unidos': [
    'https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=800',
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800',
    'https://images.unsplash.com/photo-1522083165195-3424ed14020d?w=800',
    'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  ],
  'itália': [
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800',
    'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800',
    'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800',
    'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=800',
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800',
  ],
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1488646953014-85c8e12f0c0e?w=800',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
  'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=800',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800',
];

const AUTHORS = [
  { name: 'Laura Fernandes', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { name: 'Lucas Vieira', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Maria Santos', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { name: 'Pedro Almeida', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { name: 'Carolina Silva', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { name: 'Rafael Costa', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
];

const CATEGORIES: { name: string; emoji: string }[] = [
  { name: 'Praia', emoji: '🏖️' },
  { name: 'Cultural', emoji: '🏛️' },
  { name: 'Romântico', emoji: '💕' },
  { name: 'Aventura', emoji: '🥾' },
  { name: 'Gastronomia', emoji: '🍽️' },
  { name: 'Cidade', emoji: '🏙️' },
];

const TITLE_TEMPLATES = [
  'Roteiro completo em {C}',
  '{C} essencial em 7 dias',
  '{C} para casais',
  '{C} fora do óbvio',
  'Mochilão por {C}',
  '{C} em família',
  'Lua de mel em {C}',
  'Aventura em {C}',
  '{C} em uma semana',
  '{C} para a primeira viagem',
];

function generateMockItineraries(country: string): DisplayItinerary[] {
  const key = country.toLowerCase();
  const images = COUNTRY_IMAGES[key] ?? FALLBACK_IMAGES;
  const seedBase = Array.from(country).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TITLE_TEMPLATES.map((tpl, idx) => {
    const seed = seedBase + idx * 7;
    const author = AUTHORS[seed % AUTHORS.length];
    const cat = CATEGORIES[seed % CATEGORIES.length];
    return {
      id: 10000 + seedBase * 100 + idx,
      title: tpl.replace('{C}', country),
      image: images[idx % images.length],
      days: 5 + (seed % 10),
      places: 12 + (seed % 28),
      rating: Number((4.4 + ((seed % 6) / 10)).toFixed(1)),
      price: 49 + ((seed * 13) % 250),
      author: author.name,
      authorImage: author.image,
      category: cat.name,
      categoryEmoji: cat.emoji,
      season: SEASON_IDS[seed % 4],
    };
  });
}

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

  const allItineraries = useMemo<DisplayItinerary[]>(() => {
    const real = getItinerariesByCountry(country).map<DisplayItinerary>((it, i) => {
      const seed = Array.from(it.title).reduce((acc, c) => acc + c.charCodeAt(0), 0) + i;
      const cat = CATEGORIES[seed % CATEGORIES.length];
      const fallbackAuthor = AUTHORS[seed % AUTHORS.length];
      return {
        id: it.id,
        title: it.title,
        image: it.coverImage,
        days: Math.max(1, differenceInDays(it.endDate, it.startDate) + 1),
        places: it.places?.length ?? 18,
        rating: it.rating ?? 4.7,
        price: it.price ?? 79,
        author: it.author ?? fallbackAuthor.name,
        authorImage: it.authorImage ?? fallbackAuthor.image,
        category: cat.name,
        categoryEmoji: cat.emoji,
        season: SEASON_IDS[seed % 4],
      };
    });
    const mocks = generateMockItineraries(country);
    const seen = new Set(real.map((r) => r.title.toLowerCase()));
    return [...real, ...mocks.filter((m) => !seen.has(m.title.toLowerCase()))];
  }, [country]);

  const filtered = useMemo(() => {
    return allItineraries.filter((it) => {
      if (it.days < filters.daysRange[0] || it.days > filters.daysRange[1]) return false;
      if (it.price < filters.priceRange[0] || it.price > filters.priceRange[1]) return false;
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
      id: item.id,
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
        <BackButton onClick={onBack} ariaLabel="Voltar" className="absolute top-4 left-4 z-10" />
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
        className="px-5 pt-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide"
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

      {/* Cards (mesmo estilo da Home) */}
      <div className="px-5 pt-2 flex flex-col gap-4">
        {sorted.map((item) => (
          <button
            key={item.id}
            onClick={() => onItineraryClick(item.id, item)}
            className="w-full flex flex-col text-left bg-card rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}
          >
            <div className="relative w-full aspect-[16/6] overflow-hidden p-2">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-xl" />
              {item.category && (
                <div className="absolute top-4 left-4 flex items-center gap-1 bg-white rounded-full pl-2 pr-2.5 py-1 shadow-sm">
                  <span className="text-[13px] leading-none">{item.categoryEmoji}</span>
                  <span className="text-[11px] font-semibold text-foreground">{item.category}</span>
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
                  filled={isFavorite(item.id)}
                  className={isFavorite(item.id) ? 'text-florida' : ''}
                  style={!isFavorite(item.id) ? { color: '#1E293B' } : undefined}
                />
              </button>
            </div>
            <div className="px-4 pt-1 pb-4 flex flex-col gap-2">
              <h3 className="font-bold text-[15px] text-foreground leading-tight">{item.title}</h3>
              <div className="flex items-center gap-1.5">
                <Icon name="star" size={14} className="text-[#F2B90C]" />
                <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.rating}</span>
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
                <span className="text-[15px] font-bold text-foreground">R$ {item.price}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <DestinationFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={filters}
        onApply={setFilters}
      />
    </div>
  );
}
