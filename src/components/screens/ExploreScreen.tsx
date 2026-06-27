import { useState } from 'react';
import { Flame } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

// ─── Mock data ───────────────────────────────────────────────────────────────

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
  visitors: { id: number; avatar: string; name: string }[];
  totalVisitors: number;
}

const destinationStories: DestinationStory[] = [
  {
    id: 'maldivas',
    country: 'Maldivas',
    continent: 'Ásia',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600',
    itineraryCount: 87,
    category: 'praia',
    status: 'Popular',
    hashtags: ['praia', 'luademel'],
    visitors: [
      { id: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', name: 'Marina' },
      { id: 2, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', name: 'Alessandra' },
      { id: 3, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', name: 'Camila' },
    ],
    totalVisitors: 11,
  },
  {
    id: 'japao',
    country: 'Japão',
    continent: 'Ásia',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600',
    itineraryCount: 132,
    category: 'cultural',
    status: 'Trending',
    hashtags: ['cultura', 'tóquio'],
    visitors: [
      { id: 1, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', name: 'Beatriz' },
      { id: 2, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', name: 'Alex' },
      { id: 3, avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100', name: 'Carlos' },
    ],
    totalVisitors: 17,
  },
  {
    id: 'franca',
    country: 'França',
    continent: 'Europa',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600',
    itineraryCount: 198,
    category: 'cultural',
    status: 'Popular',
    hashtags: ['paris', 'romântico'],
    visitors: [
      { id: 1, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', name: 'Ana' },
      { id: 2, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', name: 'Marina' },
    ],
    totalVisitors: 23,
  },
  {
    id: 'argentina',
    country: 'Argentina',
    continent: 'América do Sul',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600',
    itineraryCount: 64,
    category: 'montanha',
    status: 'Em alta',
    hashtags: ['patagônia', 'aventura'],
    visitors: [
      { id: 1, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', name: 'Camila' },
      { id: 2, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', name: 'Beatriz' },
      { id: 3, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', name: 'Alex' },
    ],
    totalVisitors: 9,
  },
  {
    id: 'indonesia',
    country: 'Indonésia',
    continent: 'Ásia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600',
    itineraryCount: 89,
    category: 'praia',
    status: 'Trending',
    hashtags: ['bali', 'surf'],
    visitors: [
      { id: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', name: 'Marina' },
      { id: 2, avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100', name: 'Carlos' },
    ],
    totalVisitors: 14,
  },
  {
    id: 'eua',
    country: 'Estados Unidos',
    continent: 'América do Norte',
    image: 'https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=1600',
    itineraryCount: 156,
    category: 'neve',
    status: 'Popular',
    hashtags: ['aspen', 'ski'],
    visitors: [
      { id: 1, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', name: 'Alessandra' },
      { id: 2, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', name: 'Beatriz' },
      { id: 3, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', name: 'Alex' },
    ],
    totalVisitors: 19,
  },
  {
    id: 'italia',
    country: 'Itália',
    continent: 'Europa',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600',
    itineraryCount: 167,
    category: 'gastronomia',
    status: 'Em alta',
    hashtags: ['roma', 'gastronomia'],
    visitors: [
      { id: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', name: 'Marina' },
      { id: 2, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', name: 'Alessandra' },
      { id: 3, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', name: 'Camila' },
    ],
    totalVisitors: 26,
  },
];

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
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center -space-x-2 flex-shrink-0">
            {dest.visitors.slice(0, 3).map((v) => (
              <img
                key={v.id}
                src={v.avatar}
                alt={v.name}
                className="w-7 h-7 rounded-full object-cover border-2 border-white"
              />
            ))}
          </div>
          <span className="text-[12px] font-medium text-white/95">
            Já visitaram esse lugar
          </span>
        </div>

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
        className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black overflow-hidden"
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
      className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex flex-col"
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
          {filteredStories.map((dest) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
