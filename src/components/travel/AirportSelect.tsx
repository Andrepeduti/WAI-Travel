import { useState, useRef, useEffect } from 'react';
import { Plane, ChevronDown, X, Loader2 } from 'lucide-react';
import { searchAirports, loadAirportsAsync, type Airport } from '@/data/airports';

interface AirportSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function AirportSelect({ value, onChange, placeholder = 'Buscar aeroporto' }: AirportSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !loaded) {
      setLoading(true);
      loadAirportsAsync().finally(() => {
        setLoaded(true);
        setLoading(false);
      });
    }
  }, [open, loaded]);

  // Pass loaded as a dependency so it re-renders the search
  const results = searchAirports(query, 8);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleSelect = (a: Airport) => {
    onChange(`${a.name} (${a.iata}) - ${a.city}`);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2"
      >
        <Plane size={16} className="text-muted-foreground flex-shrink-0" />
        <span className={`flex-1 truncate ${value ? 'text-foreground' : 'text-muted-foreground/50'}`}>
          {value || placeholder}
        </span>
        {value ? (
          <X
            size={14}
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          />
        ) : (
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-[200] mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="IATA, cidade ou país..."
              className="w-full h-10 rounded-lg bg-muted/40 px-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-[12px]">Carregando aeroportos...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-[12px] text-muted-foreground">Nenhum aeroporto encontrado</div>
            ) : (
              results.map((a) => (
                <button
                  key={a.iata}
                  type="button"
                  onClick={() => handleSelect(a)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
                >
                  <div
                    className="w-10 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{ background: '#F2F2F2', color: '#1A1C40' }}
                  >
                    {a.iata}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-foreground block truncate">{a.city}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">{a.name} · {a.country}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
