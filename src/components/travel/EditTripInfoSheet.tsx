import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { resolveNextRange } from '@/lib/dateRangeSelection';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';

interface EditTripInfoSheetProps {
  open: boolean;
  onClose: () => void;
  destinations: string[];
  startDate?: Date;
  endDate?: Date;
  onSave: (data: { destinations: string[]; startDate?: Date; endDate?: Date }) => void;
}

interface CitySuggestion {
  display_name: string;
  name: string;
  type: string;
}

function useCitySearch(query: string) {
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(query, ['(cities)']);
        const mapped: CitySuggestion[] = predictions.map(p => ({
            display_name: p.location ? `${p.name}, ${p.location}` : p.name,
            name: p.name,
        }));
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading };
}

export function EditTripInfoSheet({ open, onClose, destinations: initialDest, startDate, endDate, onSave }: EditTripInfoSheetProps) {
  const [destinations, setDestinations] = useState<string[]>(initialDest.length > 0 ? initialDest : ['']);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    startDate ? { from: startDate, to: endDate } : undefined
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeQuery = activeIndex !== null ? destinations[activeIndex] || '' : '';
  const { results, loading } = useCitySearch(activeQuery);

  if (!open) return null;

  const handleSave = () => {
    const filtered = destinations.filter(d => d.trim() !== '');
    onSave({
      destinations: filtered,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    });
    onClose();
  };

  const updateDestination = (index: number, value: string) => {
    const updated = [...destinations];
    updated[index] = value;
    setDestinations(updated);
    setActiveIndex(index);
  };

  const selectSuggestion = (index: number, suggestion: CitySuggestion) => {
    const updated = [...destinations];
    updated[index] = suggestion.display_name;
    setDestinations(updated);
    setActiveIndex(null);
  };

  const addDestination = () => {
    setDestinations(prev => [...prev, '']);
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    setDestinations(prev => prev.filter((_, i) => i !== index));
    setActiveIndex(null);
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-[430px] bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <h2 className="text-[18px] font-bold text-foreground">Editar destinos e data</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
            <Icon name="close" size={18} className="text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Destinations */}
          <div>
            <label className="text-[13px] font-semibold text-foreground mb-2 block">Destinos</label>
            <div className="space-y-2">
              {destinations.map((dest, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-xl px-3 h-[44px]">
                      <Icon name="map" size={16} className="text-muted-foreground flex-shrink-0" />
                      <input
                        type="text"
                        value={dest}
                        onChange={e => updateDestination(i, e.target.value)}
                        onFocus={() => setActiveIndex(i)}
                        onBlur={() => setTimeout(() => {
                          if (activeIndex === i) setActiveIndex(null);
                        }, 200)}
                        placeholder="Cidade, País"
                        className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                      />
                      {loading && activeIndex === i && (
                        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                      )}
                    </div>
                    {destinations.length > 1 && (
                      <button
                        onClick={() => removeDestination(i)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                      >
                        <Icon name="close" size={16} className="text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete dropdown */}
                  {activeIndex === i && results.length > 0 && (
                    <div className="absolute left-0 right-8 top-[48px] bg-card rounded-xl border border-border shadow-lg z-10 overflow-hidden">
                      {results.map((r, idx) => (
                        <button
                          key={idx}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectSuggestion(i, r)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <Icon name="location_on" size={16} className="text-muted-foreground flex-shrink-0" />
                          <span className="text-[14px] text-foreground truncate">{r.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addDestination}
              className="flex items-center gap-1.5 mt-2 text-[13px] font-medium"
              style={{ color: '#1A1C40' }}
            >
              <Icon name="add" size={16} style={{ color: '#1A1C40' }} />
              Adicionar destino
            </button>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-[13px] font-semibold text-foreground mb-2 block">Datas</label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-2 bg-muted/40 rounded-xl px-3 h-[44px]">
                  <Icon name="calendar_today" size={16} className="text-muted-foreground" />
                  <span className="text-[14px] text-foreground">
                    {dateRange?.from
                      ? `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })}${dateRange.to ? ` - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}` : ''}`
                      : 'Selecionar datas'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[220]" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range, day) => {
                    const { range: next, isComplete } = resolveNextRange(dateRange, range, day);
                    setDateRange(next);
                    if (isComplete) setShowCalendar(false);
                  }}
                  locale={ptBR}
                  scrollable
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Save Button */}
          {(() => {
            const isEditing = activeIndex !== null || showCalendar;
            return (
              <button
                onClick={handleSave}
                disabled={isEditing}
                className={`w-full h-[41px] rounded-[16px] font-semibold text-[14px] flex items-center justify-center transition-colors ${
                  isEditing
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                Salvar
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
