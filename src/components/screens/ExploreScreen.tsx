import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { listPublicItineraries } from '@/lib/itinerariesApi';
import { getFriendsWhoVisited } from '@/lib/passportApi';
import { ALL_COUNTRIES } from '@/data/countriesCatalog';
import { resolveCoverImage } from '@/lib/coverImageResolver';

// ─── Quick Filters ───────────────────────────────────────────────────────────────

interface QuickFilter {
  id: string;
  label: string;
  icon: string;
}

const quickFilters: QuickFilter[] = [
  { id: 'todos', label: 'Para você', icon: 'auto_awesome' },
  { id: 'praia', label: 'Praia', icon: 'beach' },
  { id: 'montanha', label: 'Montanha', icon: 'mountain' },
  { id: 'neve', label: 'Neve', icon: 'snow' },
  { id: 'cultural', label: 'Cultural', icon: 'museum' },
  { id: 'vida-noturna', label: 'Vida noturna', icon: 'free_time' },
  { id: 'gastronomia', label: 'Gastronomia', icon: 'restaurant' },
];

type StatusTag = 'Trending' | 'Popular' | 'Em alta';

interface DestinationStory {
  id: string;
  country: string;
  continent: string;
  image: string;
  itineraryCount: number;
  category: string;
  status?: StatusTag;
  hashtags: string[];
  visitors: { user_id: string; avatar: string; name: string }[];
  totalVisitors: number;
}

interface ExploreScreenProps {
  onItineraryClick: (id: number) => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
  onSeeDestinationItineraries?: (destination: { country: string; continent: string; image: string }) => void;
}

// ─── Renderizador do conteúdo do destino (compartilhado entre preview e fullscreen) ─

interface DestinationContentProps {
  dest: DestinationStory;
  onSeeItineraries?: () => void;
}

function DestinationContent({ dest, onSeeItineraries }: DestinationContentProps) {
  return (
    <>
      {/* Imagem full bleed */}
      <img
        src={dest.image}
        alt={dest.country}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradiente inferior — escurecido para legibilidade */}
      <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />

      {/* Bloco inferior */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 text-left">
        {/* Nome do país + continente */}
        <h2 className="text-[28px] font-bold text-white leading-[1.05] mb-2 drop-shadow-md text-left">
          {dest.country}{' '}
          <span className="text-[16px] font-medium text-white/85">({dest.continent})</span>
        </h2>

        {/* Hashtags + tag de status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-white/95">
            {dest.hashtags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          {dest.status && (
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md flex-shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                color: '#1A1C40',
              }}
            >
              {dest.status === 'Popular' && (
                <Flame size={12} fill="#FF6B35" color="#FF6B35" strokeWidth={2.5} />
              )}
              {dest.status === 'Popular' ? 'Populares' : dest.status}
            </span>
          )}
        </div>

        {/* Prova social */}
        {dest.visitors.length > 0 && (
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center -space-x-2 flex-shrink-0">
              {dest.visitors.slice(0, 3).map((v) => (
                <img
                  key={v.user_id}
                  src={v.avatar}
                  alt={v.name}
                  className="w-7 h-7 rounded-full object-cover border-2 border-white"
                />
              ))}
            </div>
            <span className="text-[12px] font-medium text-white/95">
              Amigos que visitaram
            </span>
          </div>
        )}

        {/* Card "X roteiros" */}
        <button
          onClick={onSeeItineraries}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md border border-white/35 active:scale-[0.99] transition-transform"
          style={{ background: 'rgba(255, 255, 255, 0.18)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary"
          >
            <Icon name="map" size={16} style={{ color: '#FFFFFF' }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[14px] font-semibold text-white leading-tight">
              +{dest.itineraryCount} roteiros disponíveis
            </p>
          </div>
          <Icon name="chevron_right" size={22} className="text-white flex-shrink-0" />
        </button>
      </div>
    </>
  );
}

export function ExploreScreen({ onSearchClick, onSeeDestinationItineraries }: ExploreScreenProps) {
  const [activeFilter, setActiveFilter] = useState<string>('todos');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [destinationStories, setDestinationStories] = useState<DestinationStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchDestinations = async () => {
      setLoading(true);
      try {
        const publicItineraries = await listPublicItineraries(1000);
        if (cancelled) return;

        // Buscar vendas para calcular métrica de Popularidade
        const { data: sales } = await supabase.from('itinerary_sales').select('itinerary_id');
        const salesCountByItinerary: Record<string, number> = {};
        if (sales) {
          sales.forEach((s) => {
            salesCountByItinerary[s.itinerary_id] = (salesCountByItinerary[s.itinerary_id] || 0) + 1;
          });
        }

        const countryMap = new Map<string, {
          itinerariesCount: number;
          salesCount: number;
          tags: Record<string, number>;
          firstImage: string;
          countryName: string;
          continent: string;
          code: string;
        }>();

        publicItineraries.forEach(it => {
          if (!it.destinations || it.destinations.length === 0) return;
          
          let mappedCountry = null;
          for (const d of it.destinations) {
            const countryPart = d.split(',').pop()?.trim().toLowerCase() || d.toLowerCase();
            const match = ALL_COUNTRIES.find(c => 
              c.name.toLowerCase() === countryPart || 
              c.aliases?.some(a => a.toLowerCase() === countryPart)
            );
            if (match) {
              mappedCountry = match;
              break;
            }
          }

          let countryName = 'Outro';
          let continent = 'Mundo';
          let countryCode = '';
          if (mappedCountry) {
            countryName = mappedCountry.name;
            continent = mappedCountry.continent;
            countryCode = mappedCountry.code;
          } else {
            const lastDest = it.destinations[it.destinations.length - 1];
            if (lastDest) {
               countryName = lastDest.split(',').pop()?.trim() || lastDest;
            }
          }

          const existing = countryMap.get(countryName) || {
            itinerariesCount: 0,
            salesCount: 0,
            tags: {},
            firstImage: '',
            countryName,
            continent,
            code: countryCode
          };

          existing.itinerariesCount += 1;
          existing.salesCount += (salesCountByItinerary[it.id] || 0);
          
          if (!existing.firstImage && it.images && it.images[0]) {
            existing.firstImage = it.images[0];
          }

          
          if (it.tags) {
            it.tags.forEach(t => {
              existing.tags[t] = (existing.tags[t] || 0) + 1;
            });
          }

          countryMap.set(countryName, existing);
        });

        // Busca os amigos (followers) que visitaram esses países
        const uniqueCodes = Array.from(countryMap.values()).map(d => d.code).filter(Boolean);
        const friendsVisits = await getFriendsWhoVisited(uniqueCodes);

        const stories: (DestinationStory & { salesCount: number })[] = [];
        let maxSales = -1;
        let mostPopularCountry = '';

        for (const [name, data] of countryMap.entries()) {
          const sortedTags = Object.entries(data.tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(t => t[0].replace('#', ''));
          
          let coverImage = data.firstImage;
          if (!coverImage || coverImage.includes('placeholder')) {
             coverImage = resolveCoverImage([name]).url;
          }

          // Enhance image resolution for fullscreen display
          if (coverImage.includes('unsplash.com')) {
            coverImage = coverImage.replace('w=400', 'w=1200').replace('w=800', 'w=1200');
            if (!coverImage.includes('q=')) coverImage += '&q=90';
            if (!coverImage.includes('auto=')) coverImage += '&auto=format,compress';
          } else if (coverImage.includes('googleapis.com')) {
            coverImage = coverImage
              .replace('maxwidth=400', 'maxwidth=1200')
              .replace('maxWidthPx=400', 'maxWidthPx=1200')
              .replace('maxheight=400', 'maxheight=1200')
              .replace('maxHeightPx=400', 'maxHeightPx=1200');
          }

          if (data.salesCount > maxSales || (data.salesCount === maxSales && data.itinerariesCount > 0)) {
            maxSales = data.salesCount;
            mostPopularCountry = name;
          }

          // Pegamos as visitas reais dos amigos para este código de país
          const realVisitors = data.code ? (friendsVisits[data.code] || []) : [];

          stories.push({
            id: name,
            country: name,
            continent: data.continent,
            image: coverImage,
            itineraryCount: data.itinerariesCount,
            category: 'todos',
            hashtags: sortedTags.length > 0 ? sortedTags : ['viagem'],
            visitors: realVisitors,
            totalVisitors: realVisitors.length,
            salesCount: data.salesCount
          });
        }

        if (mostPopularCountry) {
          const pop = stories.find(s => s.country === mostPopularCountry);
          if (pop) {
            pop.status = 'Popular';
          }
        }

        stories.sort((a, b) => {
          if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
          return b.itineraryCount - a.itineraryCount;
        });

        if (!cancelled) {
          setDestinationStories(stories);
        }
      } catch (err) {
        console.error('Failed to load destinations:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDestinations();
    return () => { cancelled = true; };
  }, []);

  const filteredStories =
    activeFilter === 'todos'
      ? destinationStories
      : destinationStories.filter((s) => s.category === activeFilter);

  const activeStory = activeStoryId
    ? destinationStories.find((s) => s.id === activeStoryId) ?? null
    : null;

  const openDestinationList = (dest: DestinationStory) => {
    onSeeDestinationItineraries?.({
      country: dest.country,
      continent: dest.continent,
      image: dest.image,
    });
  };

  // ─── Modo Fullscreen (Story aberto) ─────────────────────────────
  if (activeStory) {
    return (
      <div
        className="fixed inset-0 left-1/2 -translate-x-1/2 w-full w-full bg-black overflow-hidden"
        style={{ height: '100dvh' }}
      >
        <DestinationContent dest={activeStory} onSeeItineraries={() => openDestinationList(activeStory)} />

        {/* Botão Voltar */}
        <button
          onClick={() => setActiveStoryId(null)}
          aria-label="Voltar"
          className="absolute z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 active:scale-95 transition-transform"
          style={{
            top: 'calc(env(safe-area-inset-top, 12px) + 12px)',
            left: 16,
            background: 'rgba(0, 0, 0, 0.45)',
          }}
        >
          <Icon name="chevron_left" size={22} className="text-white" />
        </button>
      </div>
    );
  }

  // ─── Modo Padrão (preview com header + filtros + 1 card) ─────────
  return (
    <div
      className="fixed inset-0 left-1/2 -translate-x-1/2 w-full w-full flex flex-col"
      style={{ height: '100dvh', backgroundColor: '#F2F2F2' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 pb-6 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', backgroundColor: '#F2F2F2' }}
      >
        <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-tight">
          Explorar
        </h1>
      </header>

      {/* Search bar + filtros */}
      <div className="pb-5 flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
        <div className="px-5 mb-3">
          <button
            onClick={onSearchClick}
            className="w-full h-11 px-4 rounded-full bg-card border border-border/60 flex items-center gap-2.5 active:scale-[0.99] transition-transform"
          >
            <Icon name="search" size={18} className="text-muted-foreground" />
            <span className="text-[14px] text-muted-foreground font-medium">
              Buscar lugar, pessoas, roteiros...
            </span>
          </button>
        </div>


        <div
          className="flex gap-2 overflow-x-auto px-5 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {quickFilters.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'h-9 px-4 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap flex-shrink-0 active:scale-[0.97] border inline-flex items-center gap-1.5'
                )}
                style={
                  active
                    ? {
                        backgroundColor: '#1A1C40',
                        color: '#FFFFFF',
                        borderColor: 'transparent',
                      }
                    : {
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        borderColor: 'hsl(var(--border))',
                      }
                }
              >
                <Icon name={filter.icon} size={14} className={active ? 'text-white' : ''} />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed de previews (cards arredondados, scroll vertical) */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-1 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex flex-col gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skel-${i}`}
                className="w-full bg-[#E5E5EA] animate-pulse rounded-3xl"
                style={{ aspectRatio: '4 / 5' }}
              />
            ))
          ) : (
            filteredStories.map((dest) => (
            <div
              key={dest.id}
              className="relative w-full overflow-hidden rounded-3xl"
              style={{
                aspectRatio: '4 / 5',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
              }}
            >
              <DestinationContent dest={dest} onSeeItineraries={() => openDestinationList(dest)} />
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
