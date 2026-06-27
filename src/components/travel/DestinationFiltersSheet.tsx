import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';

export interface DestinationFilters {
  daysRange: [number, number];
  priceRange: [number, number];
  seasons: string[];
  categories: string[];
  minRating: number;
}

export const DEFAULT_FILTERS: DestinationFilters = {
  daysRange: [1, 30],
  priceRange: [0, 500],
  seasons: [],
  categories: [],
  minRating: 0,
};

const SEASONS = [
  { id: 'verao', label: 'Verão', emoji: '☀️' },
  { id: 'outono', label: 'Outono', emoji: '🍂' },
  { id: 'inverno', label: 'Inverno', emoji: '❄️' },
  { id: 'primavera', label: 'Primavera', emoji: '🌸' },
];

const CATEGORIES = [
  { name: 'Praia', emoji: '🏖️' },
  { name: 'Cultural', emoji: '🏛️' },
  { name: 'Romântico', emoji: '💕' },
  { name: 'Aventura', emoji: '🥾' },
  { name: 'Gastronomia', emoji: '🍽️' },
  { name: 'Cidade', emoji: '🏙️' },
];

const RATING_OPTIONS = [0, 4, 4.5, 4.8];

interface Props {
  open: boolean;
  onClose: () => void;
  initial: DestinationFilters;
  onApply: (filters: DestinationFilters) => void;
}

export function DestinationFiltersSheet({ open, onClose, initial, onApply }: Props) {
  const [filters, setFilters] = useState<DestinationFilters>(initial);

  useEffect(() => {
    if (open) setFilters(initial);
  }, [open, initial]);

  const toggleArr = (key: 'seasons' | 'categories', value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  };

  const reset = () => setFilters(DEFAULT_FILTERS);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filtros"
      maxHeight="85vh"
      headerExtra={
        <button
          onClick={reset}
          className="text-[13px] font-semibold"
          style={{ color: '#1A1C40' }}
        >
          Limpar
        </button>
      }
      footer={
        <button
          onClick={() => {
            onApply(filters);
            onClose();
          }}
          className="w-full h-12 rounded-full text-white text-[15px] font-semibold"
          style={{ background: '#1A1C40' }}
        >
          Aplicar filtros
        </button>
      }
    >
      <div className="flex flex-col gap-6 pt-2">
        {/* Days range */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[14px] font-bold text-foreground">Duração</h4>
            <span className="text-[12px] font-medium text-foreground/70">
              {filters.daysRange[0]}–{filters.daysRange[1]} dias
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={30}
              value={filters.daysRange[0]}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  daysRange: [Math.min(+e.target.value, f.daysRange[1]), f.daysRange[1]],
                }))
              }
              className="flex-1 accent-[#9DCC36]"
            />
            <input
              type="range"
              min={1}
              max={30}
              value={filters.daysRange[1]}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  daysRange: [f.daysRange[0], Math.max(+e.target.value, f.daysRange[0])],
                }))
              }
              className="flex-1 accent-[#9DCC36]"
            />
          </div>
        </section>

        {/* Price range */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[14px] font-bold text-foreground">Faixa de preço</h4>
            <span className="text-[12px] font-medium text-foreground/70">
              R$ {filters.priceRange[0]} – R$ {filters.priceRange[1]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={filters.priceRange[0]}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  priceRange: [Math.min(+e.target.value, f.priceRange[1]), f.priceRange[1]],
                }))
              }
              className="flex-1 accent-[#9DCC36]"
            />
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={filters.priceRange[1]}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  priceRange: [f.priceRange[0], Math.max(+e.target.value, f.priceRange[0])],
                }))
              }
              className="flex-1 accent-[#9DCC36]"
            />
          </div>
        </section>

        {/* Season */}
        <section>
          <h4 className="text-[14px] font-bold text-foreground mb-2">Temporada</h4>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((s) => {
              const active = filters.seasons.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleArr('seasons', s.id)}
                  className="inline-flex items-center gap-1.5 h-9 rounded-full px-3.5 border"
                  style={{
                    background: active ? '#1A1C40' : 'hsl(var(--card))',
                    color: active ? '#FFFFFF' : 'hsl(var(--foreground))',
                    borderColor: active ? 'transparent' : 'hsl(var(--border))',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span>{s.emoji}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h4 className="text-[14px] font-bold text-foreground mb-2">Estilo de viagem</h4>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = filters.categories.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => toggleArr('categories', c.name)}
                  className="inline-flex items-center gap-1.5 h-9 rounded-full px-3.5 border"
                  style={{
                    background: active ? '#1A1C40' : 'hsl(var(--card))',
                    color: active ? '#FFFFFF' : 'hsl(var(--foreground))',
                    borderColor: active ? 'transparent' : 'hsl(var(--border))',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span>{c.emoji}</span>
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Min rating */}
        <section>
          <h4 className="text-[14px] font-bold text-foreground mb-2">Avaliação mínima</h4>
          <div className="flex flex-wrap gap-2">
            {RATING_OPTIONS.map((r) => {
              const active = filters.minRating === r;
              return (
                <button
                  key={r}
                  onClick={() => setFilters((f) => ({ ...f, minRating: r }))}
                  className="inline-flex items-center gap-1 h-9 rounded-full px-3.5 border"
                  style={{
                    background: active ? '#1A1C40' : 'hsl(var(--card))',
                    color: active ? '#FFFFFF' : 'hsl(var(--foreground))',
                    borderColor: active ? 'transparent' : 'hsl(var(--border))',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {r === 0 ? (
                    'Qualquer'
                  ) : (
                    <>
                      <Icon name="star" size={12} className="text-[#F2B90C]" />
                      {r}+
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </BottomSheet>
  );
}

export function countActiveFilters(f: DestinationFilters): number {
  let n = 0;
  if (f.daysRange[0] !== DEFAULT_FILTERS.daysRange[0] || f.daysRange[1] !== DEFAULT_FILTERS.daysRange[1]) n++;
  if (f.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] || f.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]) n++;
  n += f.seasons.length;
  n += f.categories.length;
  if (f.minRating > 0) n++;
  return n;
}
