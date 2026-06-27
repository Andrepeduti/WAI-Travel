import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/BackButton';

export interface ExploreFilters {
  searchType: 'roteiros' | 'pessoas';
  regions: string[];
  tripTypes: string[];
  seasons: string[];
  priceRange: [number, number];
  durationRange: [number, number];
  minRating: number;
  language: string;
  creatorType: string[]; // for "pessoas"
}

export const DEFAULT_FILTERS: ExploreFilters = {
  searchType: 'roteiros',
  regions: [],
  tripTypes: [],
  seasons: [],
  priceRange: [0, 1000],
  durationRange: [1, 30],
  minRating: 0,
  language: 'todos',
  creatorType: [],
};

const REGIONS = [
  { id: 'europa', label: 'Europa' },
  { id: 'asia', label: 'Ásia' },
  { id: 'americas', label: 'Américas' },
  { id: 'africa', label: 'África' },
  { id: 'oceania', label: 'Oceania' },
];

const TRIP_TYPES = [
  { id: 'praia', label: 'Praia', emoji: '🏖️' },
  { id: 'montanha', label: 'Montanha', emoji: '⛰️' },
  { id: 'urbano', label: 'Urbano', emoji: '🏙️' },
  { id: 'cultural', label: 'Cultural', emoji: '🏛️' },
  { id: 'gastronomia', label: 'Gastronomia', emoji: '🍽️' },
  { id: 'aventura', label: 'Aventura', emoji: '🧗' },
  { id: 'neve', label: 'Neve', emoji: '❄️' },
  { id: 'vida-noturna', label: 'Vida noturna', emoji: '🌃' },
  { id: 'natureza', label: 'Natureza', emoji: '🌿' },
  { id: 'romance', label: 'Romance', emoji: '💕' },
];

const SEASONS = [
  { id: 'verao', label: 'Verão', emoji: '☀️' },
  { id: 'outono', label: 'Outono', emoji: '🍂' },
  { id: 'inverno', label: 'Inverno', emoji: '❄️' },
  { id: 'primavera', label: 'Primavera', emoji: '🌸' },
  { id: 'alta-temporada', label: 'Alta temporada', emoji: '🔥' },
  { id: 'baixa-temporada', label: 'Baixa temporada', emoji: '🍃' },
  { id: 'feriados', label: 'Feriados', emoji: '🎉' },
];

const LANGUAGES = [
  { id: 'todos', label: 'Todos' },
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'Inglês' },
  { id: 'es', label: 'Espanhol' },
];

const CREATOR_TYPES = [
  { id: 'verificado', label: 'Verificados' },
  { id: 'top', label: 'Top criadores' },
  { id: 'amigos', label: 'Amigos' },
  { id: 'novos', label: 'Novos' },
];

const SEARCH_TYPES: { id: ExploreFilters['searchType']; label: string }[] = [
  { id: 'roteiros', label: 'Roteiros à venda' },
  { id: 'pessoas', label: 'Pessoas' },
];

interface FiltersScreenProps {
  onClose: () => void;
  initial?: ExploreFilters;
  onApply: (filters: ExploreFilters) => void;
  /** Optional: returns the live result count for the given filter draft. */
  countResults?: (filters: ExploreFilters) => number;
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function FiltersScreen({ onClose, initial = DEFAULT_FILTERS, onApply, countResults }: FiltersScreenProps) {
  const [filters, setFilters] = useState<ExploreFilters>(initial);

  const toggleArr = <T extends string>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const toggleRegion = (id: string) =>
    setFilters((f) => ({ ...f, regions: toggleArr(f.regions, id) }));

  const toggleTripType = (id: string) =>
    setFilters((f) => ({ ...f, tripTypes: toggleArr(f.tripTypes, id) }));

  const toggleSeason = (id: string) =>
    setFilters((f) => ({ ...f, seasons: toggleArr(f.seasons, id) }));

  const toggleCreatorType = (id: string) =>
    setFilters((f) => ({ ...f, creatorType: toggleArr(f.creatorType, id) }));

  const handleClear = () => setFilters(DEFAULT_FILTERS);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  // Count active filters (excl. defaults)
  const activeCount =
    (filters.regions.length) +
    (filters.tripTypes.length) +
    (filters.seasons.length) +
    (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 1000 ? 1 : 0) +
    (filters.durationRange[0] !== 1 || filters.durationRange[1] !== 30 ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.language !== 'todos' ? 1 : 0) +
    (filters.creatorType.length);

  const isPeople = filters.searchType === 'pessoas';

  return (
    <div
      className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex flex-col z-50"
      style={{ height: '100dvh', backgroundColor: '#F2F2F2' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', backgroundColor: '#F2F2F2' }}
      >
        <BackButton onClick={onClose} ariaLabel="Voltar" />
        <h1 className="text-[17px] font-bold text-foreground">Filtros</h1>
        <button
          onClick={handleClear}
          className="text-[14px] font-semibold text-[#1A1C40] hover:opacity-80 transition-opacity px-1"
        >
          Limpar
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {/* Tipo de busca */}
        <Section title="O que você procura">
          <div className="grid grid-cols-2 gap-2">
            {SEARCH_TYPES.map((t) => {
              const active = filters.searchType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setFilters((f) => ({ ...f, searchType: t.id }))}
                  className={cn(
                    'h-11 rounded-full text-[14px] font-semibold transition-colors',
                    active
                      ? 'bg-[#1A1C40] text-white'
                      : 'bg-white text-foreground border border-border/60'
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Filtros para PESSOAS */}
        {isPeople && (
          <Section title="Tipo de criador">
            <ChipGrid
              items={CREATOR_TYPES}
              selected={filters.creatorType}
              onToggle={toggleCreatorType}
            />
          </Section>
        )}

        {/* Continente / região */}
        <Section title="Continente / região">
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => {
              const active = filters.regions.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleRegion(r.id)}
                  className={cn(
                    'h-10 px-4 rounded-full text-[14px] font-medium transition-colors',
                    active
                      ? 'bg-[#1A1C40] text-white'
                      : 'bg-white text-foreground border border-border/60'
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Tipo de viagem (esconde para pessoas) */}
        {!isPeople && (
          <Section title="Tipo de viagem">
            <ChipGrid
              items={TRIP_TYPES}
              selected={filters.tripTypes}
              onToggle={toggleTripType}
            />
          </Section>
        )}

        {/* Temporada da viagem (esconde para pessoas) */}
        {!isPeople && (
          <Section title="Temporada da viagem">
            <ChipGrid
              items={SEASONS}
              selected={filters.seasons}
              onToggle={toggleSeason}
            />
          </Section>
        )}

        {/* Faixa de preço (apenas roteiros) */}
        {filters.searchType === 'roteiros' && (
          <Section
            title="Faixa de preço"
            subtitle={`${formatBRL(filters.priceRange[0])} – ${
              filters.priceRange[1] >= 1000 ? 'R$ 1.000+' : formatBRL(filters.priceRange[1])
            }`}
          >
            <Slider
              min={0}
              max={1000}
              step={10}
              value={filters.priceRange}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, priceRange: [v[0], v[1]] as [number, number] }))
              }
              className="mt-2 [&>:first-child]:!bg-[#E5E5EA] [&>:first-child>:first-child]:!bg-[#1A1C40] [&_[role=slider]]:!border-[#1A1C40]"
            />
          </Section>
        )}

        {/* Duração */}
        {!isPeople && (
          <Section
            title="Duração da viagem"
            subtitle={`${filters.durationRange[0]} – ${
              filters.durationRange[1] >= 30 ? '30+' : filters.durationRange[1]
            } dias`}
          >
            <Slider
              min={1}
              max={30}
              step={1}
              value={filters.durationRange}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, durationRange: [v[0], v[1]] as [number, number] }))
              }
              className="mt-2 [&>:first-child]:!bg-[#E5E5EA] [&>:first-child>:first-child]:!bg-[#1A1C40] [&_[role=slider]]:!border-[#1A1C40]"
            />
          </Section>
        )}

      </div>

      {/* Footer */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30"
        style={{
          backgroundColor: '#F2F2F2',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="px-5 pt-3 border-t border-border/40">
          <button
            onClick={handleApply}
            className="w-full h-12 rounded-full font-semibold text-[15px] transition-transform active:scale-[0.99]"
            style={{ backgroundColor: '#9DCC36', color: '#1A1C40' }}
          >
            {countResults
              ? (() => {
                  const n = countResults(filters);
                  if (n === 0) return 'Nenhum resultado';
                  if (n === 1) return 'Mostrar 1 resultado';
                  return `Mostrar ${n.toLocaleString('pt-BR')} resultados`;
                })()
              : activeCount > 0 ? `Aplicar filtros (${activeCount})` : 'Aplicar filtros'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {subtitle && (
          <span className="text-[13px] font-medium text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function ChipGrid({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; label: string; emoji?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[14px] font-medium transition-colors',
              active
                ? 'bg-[#1A1C40] text-white'
                : 'bg-white text-foreground border border-border/60'
            )}
          >
            {item.emoji && <span>{item.emoji}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
