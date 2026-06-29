import { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface PublicItinerary {
  id: number;
  title: string;
  destination: string;
  image: string;
  rating: number;
  reviewCount: number;
  price: number | null;
  duration: string;
  cities: number;
}

interface CreatorItinerariesScreenProps {
  creatorName: string;
  itineraries: PublicItinerary[];
  acquiredIds: Set<number>;
  onBack: () => void;
  onItineraryClick: (id: number) => void;
}

type SortOption = 'recent' | 'rating' | 'price_asc' | 'price_desc';

export function CreatorItinerariesScreen({
  creatorName,
  itineraries,
  acquiredIds,
  onBack,
  onItineraryClick,
}: CreatorItinerariesScreenProps) {
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>('recent');

  const filtered = useMemo(() => {
    let list = itineraries.filter(it =>
      it.title.toLowerCase().includes(query.toLowerCase()) ||
      it.destination.toLowerCase().includes(query.toLowerCase())
    );
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === 'price_asc') list = [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === 'price_desc') list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return list;
  }, [itineraries, query, sort]);

  const sortLabels: Record<SortOption, string> = {
    recent: 'Mais recentes',
    rating: 'Melhor avaliados',
    price_asc: 'Menor preço',
    price_desc: 'Maior preço',
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
            Roteiros à venda de {creatorName.split(' ')[0]}
          </h1>
        </div>

        {/* Search + filter */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 h-11 rounded-2xl" style={{ background: '#F2F2F2' }}>
            <Icon name="search" size={18} style={{ color: '#8E8E93' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar roteiro ou destino"
              className="flex-1 bg-transparent focus:outline-none"
              style={{ fontSize: '14px', color: '#1A1C40' }}
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <Icon name="close" size={16} style={{ color: '#8E8E93' }} />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterOpen(o => !o)}
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: filterOpen ? '#1A1C40' : '#F2F2F2' }}
          >
            <Icon name="tune" size={18} style={{ color: filterOpen ? '#FFFFFF' : '#1A1C40' }} />
          </button>
        </div>

        {filterOpen && (
          <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {(Object.keys(sortLabels) as SortOption[]).map(opt => (
              <button
                key={opt}
                onClick={() => setSort(opt)}
                className="inline-flex items-center h-8 rounded-2xl px-3 flex-shrink-0"
                style={{
                  background: sort === opt ? '#1A1C40' : '#F2F2F2',
                  color: sort === opt ? '#FFFFFF' : '#8E8E93',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {sortLabels[opt]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="px-5 pt-2 pb-3">
        <span className="text-muted-foreground" style={{ fontSize: '12px' }}>
          {filtered.length} {filtered.length === 1 ? 'roteiro' : 'roteiros'}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="px-5 py-12 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
            <Icon name="search" size={24} style={{ color: '#8E8E93' }} />
          </div>
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Nenhum roteiro encontrado</p>
        </div>
      ) : (
        <div className="px-5 grid grid-cols-2 gap-3">
          {filtered.map(it => {
            const isAcquired = acquiredIds.has(it.id);
            return (
              <button
                key={it.id}
                onClick={() => onItineraryClick(it.id)}
                className="rounded-2xl overflow-hidden bg-card text-left flex flex-col w-full"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <div className="relative h-[110px] overflow-hidden">
                  <img src={it.image} alt={it.title} className="w-full h-full object-cover object-center scale-110" />
                  {it.rating >= 4.7 && (
                    <div className="absolute top-2 left-2 inline-flex items-center h-6 rounded-2xl px-3" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
                      <span className="font-medium" style={{ fontSize: '10px', color: '#1A1C40' }}>Recomendado</span>
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h4 className="text-foreground font-semibold text-[13px] leading-tight mb-1 line-clamp-2 min-h-[32px]">{it.title}</h4>
                  <p className="text-muted-foreground mb-1.5" style={{ fontSize: '11px' }}>{it.duration} · {it.cities} cidades</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Icon name="star" size={12} filled style={{ color: '#F2B90C' }} />
                    <span className="text-foreground font-semibold" style={{ fontSize: '11px' }}>{it.rating}</span>
                    <span className="text-muted-foreground" style={{ fontSize: '10px' }}>({it.reviewCount})</span>
                  </div>
                  <div className="mt-auto">
                    {isAcquired ? (
                      <div className="inline-flex items-center gap-1 h-6 rounded-2xl px-2.5" style={{ background: '#F2F2F2' }}>
                        <Icon name="check_circle" size={12} style={{ color: '#1A1C40' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#1A1C40' }}>Adquirido</span>
                      </div>
                    ) : it.price !== null ? (
                      <span className="text-foreground font-bold" style={{ fontSize: '14px' }}>
                        R$ {it.price.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-semibold" style={{ fontSize: '12px' }}>Grátis</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
