import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Icon } from '@/components/ui/Icon';
import { ALL_COUNTRIES, CountryInfo } from '@/data/countriesCatalog';

interface AddVisitedCountriesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ISO-2 codes already marked as visited — shown as checked. */
  visitedCodes: string[];
  onConfirm: (countries: { country: CountryInfo, year: number }[]) => void;
}

/**
 * Multi-select bottom sheet that lists every known country. Lets the user pick
 * one or more to mark as visited at once (adds stamps to the passport).
 */
export function AddVisitedCountriesSheet({
  open,
  onOpenChange,
  visitedCodes,
  onConfirm,
}: AddVisitedCountriesSheetProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'select' | 'years'>('select');
  const [yearsMap, setYearsMap] = useState<Record<string, number>>({});
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visitedSet = useMemo(() => new Set(visitedCodes), [visitedCodes]);

  // Track visual viewport to react to keyboard open/close
  useEffect(() => {
    if (!open) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      setViewportHeight(vv.height);
    };

    // Set initial value
    onResize();

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);

    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [open]);

  // Reset viewport height when sheet closes
  useEffect(() => {
    if (!open) {
      setViewportHeight(null);
    }
  }, [open]);

  /**
   * Normaliza string removendo diacríticos (acentos, cedilha) para que a busca
   * seja insensível a acentuação. Ex: "brasil" casa com "Brasil"; "frança"
   * casa com "Franca" e vice-versa.
   */
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    // Só mostra países depois que o usuário começa a digitar.
    // Assim o sheet fica curto no mobile e o teclado não oculta o input.
    if (!q) return [];
    return ALL_COUNTRIES.filter(
      c => 
        normalize(c.name).includes(q) || 
        normalize(c.continent).includes(q) ||
        (c.aliases && c.aliases.some(alias => normalize(alias).includes(q)))
    );
  }, [query]);

  const hasQuery = query.trim().length > 0;

  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleProceedToYears = () => {
    const chosen = ALL_COUNTRIES.filter(c => selected.has(c.code) && !visitedSet.has(c.code));
    const initialYears: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    chosen.forEach(c => initialYears[c.code] = currentYear);
    setYearsMap(initialYears);
    setStep('years');
  };

  const handleConfirm = () => {
    const chosen = ALL_COUNTRIES.filter(c => selected.has(c.code) && !visitedSet.has(c.code));
    const result = chosen.map(c => ({
      country: c,
      year: yearsMap[c.code] || new Date().getFullYear()
    }));
    onConfirm(result);
    setSelected(new Set());
    setQuery('');
    setStep('select');
    onOpenChange(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setSelected(new Set());
      setQuery('');
      setStep('select');
    }
    onOpenChange(next);
  };

  // When the input receives focus, scroll the list container into view after
  // the keyboard finishes animating (small delay).
  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 350);
  }, []);

  const selectableCount = Array.from(selected).filter(code => !visitedSet.has(code)).length;

  // Compute the max-height for the sheet: when the keyboard is open,
  // use the visual viewport height; otherwise fall back to 85vh.
  const windowH = typeof window !== 'undefined' ? window.innerHeight : 0;
  const keyboardIsOpen = viewportHeight != null && windowH > 0 && (windowH - viewportHeight) > 100;
  const sheetMaxHeight = keyboardIsOpen
    ? `${viewportHeight}px`
    : '85vh';

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pb-0 pt-3 overflow-hidden flex flex-col"
        style={{ maxHeight: sheetMaxHeight, transition: 'max-height 0.15s ease-out' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: 'hsl(var(--muted))' }} />

        {step === 'select' ? (
          <>
            <SheetHeader className="text-left px-5 mb-3">
              <SheetTitle className="text-left" style={{ fontSize: 'var(--text-lg)' }}>
                Adicionar países visitados
              </SheetTitle>
            </SheetHeader>

            {/* Search */}
            <div className="px-5 mb-3">
              <div
                className="flex items-center gap-2 h-11 px-3 rounded-xl"
                style={{ background: '#F2F2F2' }}
              >
                <Icon name="search" size={18} style={{ color: '#8E8E93' }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={handleInputFocus}
                  placeholder="Buscar país ou continente"
                  className="flex-1 bg-transparent outline-none text-foreground"
                  style={{ fontSize: 16, fontWeight: 500 }}
                  autoFocus={false}
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Limpar">
                    <Icon name="close" size={18} style={{ color: '#8E8E93' }} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-2">
              {!hasQuery ? (
                /* Estado inicial: sem busca → convida o usuário a digitar */
                <div className="flex flex-col items-center justify-center py-12">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                    style={{ background: '#F2F2F2' }}
                  >
                    <Icon name="travel_explore" size={26} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 14, fontWeight: 600 }}>
                    Busque um país para adicionar
                  </p>
                  <p className="text-muted-foreground text-center mt-1" style={{ fontSize: 12 }}>
                    Digite o nome do país ou continente
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                    style={{ background: '#F2F2F2' }}
                  >
                    <Icon name="public" size={26} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 13 }}>
                    Nenhum país encontrado
                  </p>
                </div>
              ) : (
                <ul>
                  {filtered.map(country => {
                    const isVisited = visitedSet.has(country.code);
                    const isSelected = selected.has(country.code);
                    const checked = isVisited || isSelected;
                    return (
                      <li key={country.code}>
                        <button
                          onClick={() => !isVisited && toggle(country.code)}
                          disabled={isVisited}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-[#F7F7F7] disabled:opacity-60 disabled:active:bg-transparent"
                        >
                          <span style={{ fontSize: 22, lineHeight: 1 }}>{country.flag}</span>
                          <div className="flex-1 min-w-0 text-left">
                            <p
                              className="text-foreground truncate"
                              style={{ fontSize: 14, fontWeight: 600 }}
                            >
                              {country.name}
                              {query.trim() && !normalize(country.name).includes(normalize(query.trim())) && country.aliases?.some(a => normalize(a).includes(normalize(query.trim()))) ? ` (${country.aliases.find(a => normalize(a).includes(normalize(query.trim())))})` : ''}
                            </p>
                            <p
                              className="text-muted-foreground truncate"
                              style={{ fontSize: 12 }}
                            >
                              {country.continent}
                              {isVisited ? ' · Já visitado' : ''}
                            </p>
                          </div>
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{
                              background: checked ? '#9DCC36' : '#FFFFFF',
                              border: checked ? 'none' : '1.5px solid #D4D4D8',
                            }}
                          >
                            {checked && (
                              <Icon name="check" size={16} style={{ color: '#1A1C40' }} />
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="text-left px-5 mb-3 flex flex-row items-center gap-3">
              <button onClick={() => setStep('select')} className="w-8 h-8 rounded-full bg-[#F2F2F2] flex items-center justify-center shrink-0">
                <Icon name="arrow_back" size={16} className="text-[#1A1C40]" />
              </button>
              <div className="flex-1">
                <SheetTitle className="text-left" style={{ fontSize: 'var(--text-lg)' }}>
                  Ano da visita
                </SheetTitle>
                <p className="text-muted-foreground mt-1" style={{ fontSize: 13, fontWeight: 500 }}>
                  Informe o ano em que você visitou cada país
                </p>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5">
              <div className="flex flex-col gap-1">
                {ALL_COUNTRIES.filter(c => selected.has(c.code) && !visitedSet.has(c.code)).map(country => (
                  <div key={country.code} className="flex items-center gap-4 bg-[#F2F2F2] p-3 rounded-2xl">
                    <span className="shrink-0 text-center text-[#1A1C40]" style={{ fontSize: 16, fontWeight: 800, width: 32 }}>
                      {country.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate" style={{ fontSize: 14, fontWeight: 600 }}>{country.name}</p>
                      <p className="text-muted-foreground truncate" style={{ fontSize: 12 }}>{country.continent}</p>
                    </div>
                    <div className="shrink-0">
                       <input 
                         type="number"
                         inputMode="numeric"
                         value={yearsMap[country.code] || ''}
                         onChange={(e) => setYearsMap(prev => ({ ...prev, [country.code]: Number(e.target.value) }))}
                         max={new Date().getFullYear()}
                         className="w-20 h-10 rounded-xl bg-white border border-[#E5E7EB] text-center outline-none focus:border-[#1A1C40] text-[#1A1C40]"
                         style={{ fontSize: 14, fontWeight: 700 }}
                       />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div
          className="px-5 pt-3 pb-6 shrink-0"
          style={{ borderTop: '1px solid hsl(var(--divider))', background: '#FFFFFF' }}
        >
          <button
            onClick={step === 'select' ? handleProceedToYears : handleConfirm}
            disabled={selectableCount === 0}
            className="w-full h-12 rounded-2xl flex items-center justify-center bg-[#9DCC36] text-[#1A1C40] disabled:bg-[#D1D5DB] disabled:text-white disabled:opacity-100 transition-colors"
            style={{
              boxShadow: selectableCount === 0 ? undefined : '0 2px 8px rgba(157,204,54,0.30)',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {selectableCount === 0
              ? 'Adicionar'
              : `Adicionar ${selectableCount} ${selectableCount === 1 ? 'país' : 'países'}`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
