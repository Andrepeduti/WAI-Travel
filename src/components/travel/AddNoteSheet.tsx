import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DaySelector } from './DaySelector';

interface AddNoteSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    text: string;
    day: number;
    startTime?: string;
    endTime?: string;
    location?: string;
    lat?: number;
    lng?: number;
  }) => void;
  dayNumber: number;
  totalDays: number;
  startDate?: Date;
}

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

function parseTime(t: string): [number, number] {
  const [h, m] = t.split(':').map(Number);
  return [h, m];
}

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function stepTime(time: string, delta: number): string {
  let [h, m] = parseTime(time);
  m += delta;
  if (m >= 60) { h += 1; m -= 60; }
  if (m < 0) { h -= 1; m += 60; }
  if (h >= 24) h = 0;
  if (h < 0) h = 23;
  return formatTime(h, m);
}

export function AddNoteSheet({ open, onClose, onSave, dayNumber, totalDays, startDate }: AddNoteSheetProps) {
  const [text, setText] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayNumber);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('13:15');

  // Localização opcional — quando preenchida com lat/lng, o planner usa
  // para calcular automaticamente o trajeto até o próximo ponto turístico.
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSelectedDay(dayNumber); }, [dayNumber]);

  const searchAddress = useCallback((query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalized)}&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'pt-BR' } },
        );
        const data = (await res.json()) as AddressSuggestion[];
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocation(val);
    // Qualquer edição manual invalida as coordenadas resolvidas anteriormente
    setCoords(null);
    searchAddress(val);
  };

  const selectSuggestion = (s: AddressSuggestion) => {
    setLocation(s.display_name);
    setCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  if (!open) return null;

  const handleSave = () => {
    // Localização só é considerada se o usuário selecionou uma sugestão (coords presentes).
    // Texto digitado livre é ignorado para evitar entradas que não sejam um lugar real.
    const hasValidLocation = !!coords;
    onSave({
      title: '',
      text: text.trim(),
      day: selectedDay,
      startTime,
      endTime,
      location: hasValidLocation ? location.trim() : undefined,
      lat: hasValidLocation ? coords?.lat : undefined,
      lng: hasValidLocation ? coords?.lng : undefined,
    });
    setText('');
    setStartTime('11:00');
    setEndTime('13:15');
    setLocation('');
    setCoords(null);
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-foreground">Adicionar tempo livre</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 space-y-4 overflow-y-auto flex-1">
          {/* Day selector */}
          <DaySelector selectedDay={selectedDay} totalDays={totalDays} onChange={setSelectedDay} startDate={startDate} />

          {/* Time steppers */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Horário
            </label>
            <div className="flex items-center gap-2">
              {/* Start time stepper */}
              <div className="flex-1 flex items-center rounded-full border border-border/60 overflow-hidden h-11">
                <button
                  onClick={() => setStartTime(stepTime(startTime, -15))}
                  className="w-11 h-full flex items-center justify-center text-muted-foreground active:bg-muted/60 transition-colors"
                >
                  <Icon name="remove" size={18} />
                </button>
                <span className="flex-1 text-center text-[14px] font-semibold text-foreground">{startTime}</span>
                <button
                  onClick={() => setStartTime(stepTime(startTime, 15))}
                  className="w-11 h-full flex items-center justify-center text-muted-foreground active:bg-muted/60 transition-colors"
                >
                  <Icon name="add" size={18} />
                </button>
              </div>

              <span className="text-[13px] text-muted-foreground font-medium">-</span>

              {/* End time stepper */}
              <div className="flex-1 flex items-center rounded-full border border-border/60 overflow-hidden h-11">
                <button
                  onClick={() => setEndTime(stepTime(endTime, -15))}
                  className="w-11 h-full flex items-center justify-center text-muted-foreground active:bg-muted/60 transition-colors"
                >
                  <Icon name="remove" size={18} />
                </button>
                <span className="flex-1 text-center text-[14px] font-semibold text-foreground">{endTime}</span>
                <button
                  onClick={() => setEndTime(stepTime(endTime, 15))}
                  className="w-11 h-full flex items-center justify-center text-muted-foreground active:bg-muted/60 transition-colors"
                >
                  <Icon name="add" size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Localização (opcional) — usada para calcular o trajeto até o próximo ponto */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Localização (opcional)
            </label>
            <div className="relative">
              <Icon
                name="location_on"
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={location}
                onChange={handleLocationChange}
                onFocus={() => location.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => {
                  setShowSuggestions(false);
                  // Se o usuário digitou mas não selecionou um endereço, limpamos
                  // o campo para forçar a seleção de um lugar real.
                  if (!coords && location.trim().length > 0) {
                    setLocation('');
                  }
                }, 150)}
                placeholder="Buscar local (ex: Torre Eiffel, Av. Paulista)"
                className="w-full rounded-xl pl-10 pr-10 py-3 text-[16px] text-foreground placeholder:text-muted-foreground outline-none"
                style={{ background: '#F2F2F2' }}
                autoComplete="off"
              />
              {coords && (
                <Icon
                  name="check_circle"
                  size={18}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#9DCC36' }}
                />
              )}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-background shadow-lg max-h-64 overflow-y-auto">
                  {isSearching && suggestions.length === 0 && (
                    <div className="px-4 py-3 text-[13px] text-muted-foreground">Buscando...</div>
                  )}
                  {!isSearching && suggestions.length === 0 && (
                    <div className="px-4 py-3 text-[13px] text-muted-foreground">
                      Nenhum endereço encontrado
                    </div>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 flex items-start gap-2 border-b border-border last:border-b-0"
                    >
                      <Icon
                        name="location_on"
                        size={16}
                        className="text-muted-foreground flex-shrink-0 mt-0.5"
                      />
                      <span className="text-[13px] text-foreground leading-snug">
                        {s.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Anotação
            </label>
            <textarea
              placeholder="Ex: Dormir, comer, aproveitar o pôr do sol, visitar alguém..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
              style={{ background: '#F2F2F2' }}
            />
          </div>
        </div>

        {/* Footer button */}
        <div className="px-5 pb-8 pt-3 border-t border-border/40">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-primary text-primary-foreground transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
