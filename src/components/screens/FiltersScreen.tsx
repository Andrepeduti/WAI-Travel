import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/BackButton';

export interface ExploreFilters {
  regions: string[];
  tripTypes: string[];
  seasons: string[];
  priceRange: [number, number];
  durationRange: [number, number];
}

export const DEFAULT_FILTERS: ExploreFilters = {
  regions: [],
  tripTypes: [],
  seasons: [],
  priceRange: [0, 1000],
  durationRange: [1, 30],
};

const REGIONS = [
  { id: 'africa', label: 'África' },
  { id: 'americas', label: 'América do Norte' },
  { id: 'america-sul', label: 'América do Sul' },
  { id: 'asia', label: 'Ásia' },
  { id: 'europa', label: 'Europa' },
  { id: 'oceania', label: 'Oceania' },
  { id: 'antartica', label: 'Antártica' },
];

export const TRIP_TYPES = [
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
  { id: 'familia', label: 'Família', emoji: '👨‍👩‍👧‍👦' },
  { id: 'mochilao', label: 'Mochilão', emoji: '🎒' },
  { id: 'luxo', label: 'Luxo', emoji: '💎' },
  { id: 'compras', label: 'Compras', emoji: '🛍️' },
  { id: 'solo', label: 'Solo', emoji: '🚶' },
  { id: 'amigos', label: 'Amigos', emoji: '🍻' },
  { id: 'historico', label: 'Histórico', emoji: '🏰' },
  { id: 'roadtrip', label: 'Roadtrip', emoji: '🚗' },
  { id: 'relax', label: 'Relax', emoji: '🧘' },
  { id: 'economico', label: 'Econômico', emoji: '💸' },
  { id: 'festivais', label: 'Festivais', emoji: '🎪' },
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

interface FiltersScreenProps {
  onClose: () => void;
  initial?: ExploreFilters;
  onApply: (filters: ExploreFilters) => void;
  countResults?: (filters: ExploreFilters) => number;
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function FiltersScreen({ onClose, initial = DEFAULT_FILTERS, onApply, countResults }: FiltersScreenProps) {
  const [filters, setFilters] = useState<ExploreFilters>(initial);

  const toggleArr = <T extends string>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleClear = () => setFilters(DEFAULT_FILTERS);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const isUnchanged = JSON.stringify(filters) === JSON.stringify(initial);

  return (
    <div
      className="fixed inset-0 left-1/2 -translate-x-1/2 w-full w-full flex flex-col z-50"
      style={{ height: '100dvh', backgroundColor: '#FFFFFF' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 flex-shrink-0 bg-white"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        <BackButton onClick={onClose} ariaLabel="Voltar" />
        <h1 className="text-[17px] font-bold text-foreground absolute left-1/2 -translate-x-1/2">Filtros</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {/* Continente */}
        <Section title="Continente">
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => {
              const active = filters.regions.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => setFilters((f) => ({ ...f, regions: toggleArr(f.regions, r.id) }))}
                  className={cn(
                    'h-10 px-4 rounded-full text-[13px] font-medium transition-colors border flex items-center justify-center',
                    active
                      ? 'bg-[#1A1C40] text-white border-[#1A1C40]'
                      : 'bg-white text-foreground border-border/60 hover:border-[#9DCC36]'
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Tipo de viagem */}
        <Section title="Tipo de viagem">
          <ExpandableChipList
            items={TRIP_TYPES}
            selected={filters.tripTypes}
            onToggle={(id) => setFilters((f) => ({ ...f, tripTypes: toggleArr(f.tripTypes, id) }))}
          />
        </Section>

        {/* Temporada da viagem */}
        <Section title="Melhor época">
          <ChipGrid
            items={SEASONS}
            selected={filters.seasons}
            onToggle={(id) => setFilters((f) => ({ ...f, seasons: toggleArr(f.seasons, id) }))}
          />
        </Section>

        {/* Faixa de preço */}
        <Section title="Faixa de preço">
          <RangeSliderWithInputs
            min={0}
            max={1000}
            step={10}
            value={filters.priceRange}
            onValueChange={(v) => setFilters((f) => ({ ...f, priceRange: v }))}
            labelMin="Mínimo"
            labelMax="Máximo"
            prefix="R$ "
            maxSuffix="+"
          />
        </Section>

        {/* Duração */}
        <Section title="Duração da viagem">
          <RangeSliderWithInputs
            min={1}
            max={30}
            step={1}
            value={filters.durationRange}
            onValueChange={(v) => setFilters((f) => ({ ...f, durationRange: v }))}
            labelMin="Mínimo"
            labelMax="Máximo"
            suffix=" dias"
            maxSuffix="+"
          />
        </Section>
      </div>

      {/* Footer */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full w-full z-30 bg-white"
        style={{
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="px-5 py-4 border-t border-border/40 flex items-center gap-4">
          <button
            onClick={handleClear}
            className="flex-shrink-0 text-[14px] font-semibold text-[#1A1C40] hover:opacity-80 transition-opacity"
          >
            Limpar tudo
          </button>

          <button
            onClick={handleApply}
            disabled={isUnchanged}
            className={cn(
              "flex-1 h-12 rounded-full font-bold text-[15px] transition-transform flex items-center justify-center",
              isUnchanged ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground" : "active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]"
            )}
            style={isUnchanged ? {} : { backgroundColor: '#9DCC36', color: '#1A1C40' }}
          >
            {countResults && !isUnchanged
              ? (() => {
                const n = countResults(filters);
                if (n === 0) return 'Nenhum resultado';
                if (n === 1) return 'Mostrar 1 resultado';
                return `Mostrar ${n.toLocaleString('pt-BR')} resultados`;
              })()
              : 'Aplicar filtros'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <section className="pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-foreground flex items-center gap-2">
          {title}
        </h2>
        {subtitle && <span className="text-[13px] font-medium text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function ChipGrid({ items, selected, onToggle }: { items: { id: string; label: string; emoji?: string }[]; selected: string[]; onToggle: (id: string) => void; }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold transition-colors border',
              active
                ? 'bg-[#1A1C40] text-white border-[#1A1C40]'
                : 'bg-white text-foreground border-border/60 hover:border-[#9DCC36]'
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

function ExpandableChipList({ items, selected, onToggle, initialCount = 10 }: { items: { id: string; label: string; emoji?: string }[]; selected: string[]; onToggle: (id: string) => void; initialCount?: number; }) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? items : items.slice(0, initialCount);

  return (
    <div>
      <ChipGrid items={displayed} selected={selected} onToggle={onToggle} />
      {items.length > initialCount && (
        <button onClick={() => setExpanded(!expanded)} className="mt-3 text-[13px] font-bold text-[#1A1C40] flex items-center gap-1">
          {expanded ? 'Mostrar menos' : 'Mostrar mais'}
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={16} />
        </button>
      )}
    </div>
  );
}

function RangeSliderWithInputs({ min, max, step, value, onValueChange, labelMin, labelMax, prefix = '', suffix = '', maxSuffix = '' }: { min: number; max: number; step: number; value: [number, number]; onValueChange: (v: [number, number]) => void; labelMin: string; labelMax: string; prefix?: string; suffix?: string; maxSuffix?: string; }) {
  const [localMin, setLocalMin] = useState(value[0].toString());
  const [localMax, setLocalMax] = useState(value[1].toString());

  useEffect(() => {
    setLocalMin(value[0].toString());
    setLocalMax(value[1] === max && maxSuffix ? `${value[1]}+` : value[1].toString());
  }, [value, max, maxSuffix]);

  const handleMinBlur = () => {
    let val = parseInt(localMin.replace(/\D/g, ''), 10);
    if (isNaN(val)) val = min;
    if (val < min) val = min;
    if (val > value[1]) val = value[1];
    onValueChange([val, value[1]]);
    setLocalMin(val.toString());
  };

  const handleMaxBlur = () => {
    let val = parseInt(localMax.replace(/\D/g, ''), 10);
    if (isNaN(val)) val = max;
    if (val < value[0]) val = value[0];
    onValueChange([value[0], val]);
    setLocalMax(val === max && maxSuffix ? `${val}+` : val.toString());
  };

  return (
    <div>
      <Slider min={min} max={max} step={step} value={value} onValueChange={(v) => onValueChange([v[0], v[1]])} className="mt-4 mb-6 [&>:first-child]:!bg-[#E5E5EA] [&>:first-child>:first-child]:!bg-[#1A1C40] [&_[role=slider]]:!border-[#1A1C40]" />
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-field border border-border/60 rounded-[10px] px-3 py-1.5 focus-within:border-primary transition-colors relative">
          <div className="text-[11px] text-muted-foreground mb-0.5">{labelMin}</div>
          <div className="flex items-center gap-1">
            {prefix && <span className="text-[14px] text-foreground font-semibold">{prefix}</span>}
            <input type="number" value={localMin} onChange={e => setLocalMin(e.target.value)} onBlur={handleMinBlur} className="w-full bg-transparent text-[14px] font-semibold outline-none -ml-1" />
            {suffix && <span className="text-[14px] text-muted-foreground ml-1">{suffix}</span>}
          </div>
        </div>
        <div className="w-3 h-[1px] bg-border/60" />
        <div className="flex-1 bg-field border border-border/60 rounded-[10px] px-3 py-1.5 focus-within:border-primary transition-colors relative">
          <div className="text-[11px] text-muted-foreground mb-0.5">{labelMax}</div>
          <div className="flex items-center gap-1">
            {prefix && <span className="text-[14px] text-foreground font-semibold">{prefix}</span>}
            <input type="text" inputMode="numeric" value={localMax} onChange={e => setLocalMax(e.target.value)} onBlur={handleMaxBlur} className="w-full bg-transparent text-[14px] font-semibold outline-none -ml-1" />
            {suffix && <span className="text-[14px] text-muted-foreground ml-1">{suffix}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
