import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Icon } from '@/components/ui/Icon';
import { CountryInfo } from '@/data/countriesCatalog';
import { useState } from 'react';

interface CountryActionSheetProps {
  country: CountryInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkVisited: (country: CountryInfo, year: number) => void;
  onMarkWantToVisit: (country: CountryInfo) => void;
  /** When true, hide the "want to visit" action (e.g. country is already in the wanted list). */
  alreadyWanted?: boolean;
}

/**
 * Bottom sheet shown when a user clicks a NOT-yet-visited country on the world map.
 * Lets them mark it as Visited (adds a stamp) or as "Quero visitar" (adds to dream trips).
 */
export function CountryActionSheet({
  country,
  open,
  onOpenChange,
  onMarkVisited,
  onMarkWantToVisit,
  alreadyWanted = false,
}: CountryActionSheetProps) {
  const [mode, setMode] = useState<'actions' | 'year'>('actions');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [yearError, setYearError] = useState(false);

  if (!country) return null;

  const handleClose = (next: boolean) => {
    if (!next) { setMode('actions'); setYearError(false); }
    onOpenChange(next);
  };

  const handleConfirmYear = () => {
    if (year > currentYear) {
      setYearError(true);
      return;
    }
    setYearError(false);
    onMarkVisited(country, year);
    setMode('actions');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-3 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'hsl(var(--muted))' }} />

        <SheetHeader className="text-left mb-5">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '24px', lineHeight: 1 }}>{country.flag}</span>
            <div className="min-w-0">
              <SheetTitle className="text-left truncate" style={{ fontSize: 'var(--text-lg)' }}>
                {country.name}
              </SheetTitle>
              <SheetDescription className="text-left">
                {country.continent}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {mode === 'actions' ? (
          <div className="flex flex-col gap-2">
            {/* Marcar como visitado */}
            <button
              onClick={() => setMode('year')}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl active:scale-[0.98] transition-transform"
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #1A1C40',
              }}
            >
              <Icon name="check_circle" size={16} style={{ color: '#1A1C40' }} />
              <span style={{ color: '#1A1C40', fontSize: 13, fontWeight: 700 }}>
                Marcar como visitado
              </span>
            </button>

            {/* Quero visitar */}
            <button
              onClick={() => {
                if (alreadyWanted) {
                  onOpenChange(false);
                  return;
                }
                onMarkWantToVisit(country);
                onOpenChange(false);
              }}
              disabled={alreadyWanted}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100"
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #1A1C40',
              }}
            >
              <Icon name="favorite" size={16} style={{ color: '#1A1C40' }} />
              <span style={{ color: '#1A1C40', fontSize: 13, fontWeight: 700 }}>
                {alreadyWanted ? 'Já salvo' : 'Quero visitar'}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label
                className="block mb-2 text-foreground"
                style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
              >
                Ano da visita
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={year}
                onChange={e => { setYear(Number(e.target.value)); setYearError(false); }}
                onFocus={() => setYearError(false)}
                min={1900}
                max={currentYear}
                className={`w-full h-12 px-4 rounded-xl bg-background border text-foreground outline-none focus:border-[#1A1C40] ${yearError ? 'border-red-500' : 'border-[#D4D4D8]'}`}
                style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
              />
              {yearError && (
                <p className="mt-1.5 text-red-500" style={{ fontSize: 12, fontWeight: 500 }}>
                  O ano não pode ser posterior ao ano atual
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMode('actions')}
                className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl active:scale-[0.98] transition-transform"
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #1A1C40',
                }}
              >
                <span style={{ color: '#1A1C40', fontSize: 13, fontWeight: 700 }}>
                  Voltar
                </span>
              </button>
              <button
                onClick={handleConfirmYear}
                className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl active:scale-[0.98] transition-transform"
                style={{
                  background: '#9DCC36',
                  boxShadow: '0 2px 8px rgba(157,204,54,0.30)',
                }}
              >
                <span style={{ color: '#1A1C40', fontSize: 13, fontWeight: 700 }}>
                  Confirmar
                </span>
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
