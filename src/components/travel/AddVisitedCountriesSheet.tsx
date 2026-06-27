import { useMemo, useState } from 'react';
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
  onConfirm: (countries: CountryInfo[]) => void;
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

  const visitedSet = useMemo(() => new Set(visitedCodes), [visitedCodes]);

  /**
   * Normaliza string removendo diacríticos (acentos, cedilha) para que a busca
   * seja insensível a acentuação. Ex: "brasil" casa com "Brasil"; "frança"
   * casa com "Franca" e vice-versa.
   */
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      c => normalize(c.name).includes(q) || normalize(c.continent).includes(q),
    );
  }, [query]);

  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleConfirm = () => {
    const chosen = ALL_COUNTRIES.filter(c => selected.has(c.code) && !visitedSet.has(c.code));
    onConfirm(chosen);
    setSelected(new Set());
    setQuery('');
    onOpenChange(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setSelected(new Set());
      setQuery('');
    }
    onOpenChange(next);
  };

  const selectableCount = Array.from(selected).filter(code => !visitedSet.has(code)).length;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pb-0 pt-3 max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: 'hsl(var(--muted))' }} />

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
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar país ou continente"
              className="flex-1 bg-transparent outline-none text-foreground"
              style={{ fontSize: 16, fontWeight: 500 }}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Limpar">
                <Icon name="close" size={18} style={{ color: '#8E8E93' }} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2">
          {filtered.length === 0 ? (
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

        {/* Footer */}
        <div
          className="px-5 pt-3 pb-6"
          style={{ borderTop: '1px solid hsl(var(--divider))', background: '#FFFFFF' }}
        >
          <button
            onClick={handleConfirm}
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
