import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { resolveNextRange } from '@/lib/dateRangeSelection';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';
import { toast } from 'sonner';

interface EditTripInfoSheetProps {
  open: boolean;
  onClose: () => void;
  destinations: string[];
  startDate?: Date;
  endDate?: Date;
  isFlexible?: boolean;
  durationDays?: number;
  isForSale?: boolean;
  onSave: (data: { destinations: string[]; startDate?: Date; endDate?: Date; isFlexible?: boolean; durationDays?: number }) => void;
}

interface CitySuggestion {
  display_name: string;
  name: string;
  country?: string;
}

export function EditTripInfoSheet({
  open,
  onClose,
  destinations: initialDest,
  startDate,
  endDate,
  isFlexible,
  durationDays: initialDuration,
  isForSale = false,
  onSave,
}: EditTripInfoSheetProps) {
  const [destinations, setDestinations] = useState<string[]>([]);
  const [destinationInput, setDestinationInput] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isFixedDate, setIsFixedDate] = useState(true);
  const [durationDays, setDurationDays] = useState<number | ''>(1);
  const [showCalendar, setShowCalendar] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (open) {
      const validInitial = (initialDest || []).filter((d) => d && d.trim() !== '');
      setDestinations(validInitial);
      setDestinationInput('');
      setSuggestions([]);
      setShowSuggestions(false);
      setDateRange(startDate && endDate ? { from: startDate, to: endDate } : undefined);
      // Personal itineraries are ALWAYS fixed dates. For-sale can be flexible if configured.
      setIsFixedDate(isForSale ? !isFlexible : true);
      const computedDuration =
        initialDuration ||
        (startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 1);
      setDurationDays(computedDuration > 0 ? computedDuration : 1);
    }
  }, [open, initialDest, startDate, endDate, isFlexible, initialDuration, isForSale]);

  // Autocomplete search for destinations
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const term = destinationInput.trim();
    if (term.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(term, ['(cities)']);
        const mapped: CitySuggestion[] = predictions.map((p) => ({
          display_name: p.location ? `${p.name}, ${p.location}` : p.name,
          name: p.name,
          country: p.location,
        }));
        setSuggestions(mapped);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [destinationInput]);

  // Click outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!open) return null;

  const handleAddDestination = (dest: string) => {
    const cityName = dest.split(',')[0].trim();
    if (cityName && !destinations.includes(cityName)) {
      setDestinations((prev) => [...prev, cityName]);
    }
    setDestinationInput('');
    setShowSuggestions(false);
  };

  const handleRemoveDestination = (index: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && destinationInput.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleAddDestination(suggestions[0].name || suggestions[0].display_name);
      } else {
        handleAddDestination(destinationInput);
      }
    }
  };

  const formatDateDisplay = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })} - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}`;
    }
    if (dateRange?.from) {
      return format(dateRange.from, "d 'de' MMM", { locale: ptBR });
    }
    return 'Selecionar datas';
  };

  const isValid =
    destinations.length > 0 &&
    (isFixedDate
      ? Boolean(dateRange?.from && dateRange?.to)
      : typeof durationDays === 'number' && durationDays > 0);

  const handleSave = () => {
    if (!isValid) return;

    let finalStart = dateRange?.from;
    let finalEnd = dateRange?.to;

    if (!isFixedDate) {
      finalStart = new Date();
      finalEnd = addDays(new Date(), Math.max(1, Number(durationDays) || 1) - 1);
    }

    onSave({
      destinations,
      startDate: finalStart,
      endDate: finalEnd,
      isFlexible: !isFixedDate,
      durationDays: !isFixedDate ? (durationDays === '' ? 1 : durationDays) : undefined,
    });

    toast.success('Destinos e datas salvos com sucesso!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" />

      {/* Sheet Modal Container - 100% width, sem margens laterais */}
      <div
        className="relative w-full bg-white rounded-t-[24px] shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Urbanist', sans-serif" }}
      >
        {/* Top Bar with Close Button */}
        <div className="flex items-center justify-end pt-6 px-6 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all text-[#171F2C] -mr-1"
            aria-label="Fechar"
          >
            <Icon name="close" size={18} className="text-[#171F2C]" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pb-4">
          <h2 className="text-[22px] font-semibold text-[#171F2C] leading-[26px]">
            Editar destinos e datas
          </h2>
        </div>

        {/* Content Body */}
        <div className="px-6 pb-8 flex flex-col gap-4">
          {/* Destinos Card */}
          <div className="relative bg-[#EEEEEE] rounded-[12px] p-3 flex items-center justify-center gap-3 min-h-[78px]">
            <Icon name="location_on" size={16} className="text-[#555555] flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[#949494] leading-[16px] block">
                Destinos
              </label>

              {/* Chips Container */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {destinations.map((dest, i) => (
                  <div
                    key={i}
                    className="bg-[#E7E7EE] border border-[#141530] rounded-[24px] px-[16px] py-[8px] h-[34px] inline-flex items-center gap-[10px] transition-all box-border"
                  >
                    <span className="text-[14px] font-medium text-[#141530] leading-4">
                      {dest.split(',')[0].trim()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDestination(i)}
                      className="text-[#141530] hover:opacity-70 transition-opacity flex items-center justify-center"
                    >
                      <Icon name="close" size={12} className="text-[#141530]" />
                    </button>
                  </div>
                ))}

                {/* Inline Input to add more destinations */}
                <input
                  ref={inputRef}
                  type="text"
                  value={destinationInput}
                  onChange={(e) => {
                    setDestinationInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={destinations.length === 0 ? 'Adicionar destino...' : '+ Adicionar...'}
                  className="flex-1 min-w-[100px] h-[32px] bg-transparent text-[14px] font-medium text-[#141530] placeholder:text-[#949494] outline-none py-1"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (isSearching || suggestions.length > 0) && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-[12px] shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-gray-100"
                >
                  {isSearching && (
                    <div className="p-3 text-xs text-[#949494]">Buscando destinos...</div>
                  )}
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleAddDestination(item.name || item.display_name)}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-[#F4F4F5] transition-colors"
                    >
                      <Icon name="location_on" size={16} className="text-[#555555] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#141530] truncate">{item.name}</p>
                        {item.country && (
                          <p className="text-[11px] text-[#949494] truncate">{item.country}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Data da Viagem Card & Optional Toggle */}
          <div className="flex flex-col gap-3">
            {/* Date Box */}
            <div className="bg-[#EDEDED] rounded-[12px] p-3 flex items-center gap-3 min-h-[58px]">
              <Icon name="calendar_today" size={16} className="text-[#555555] flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <label className="text-[12px] font-medium text-[#949494] leading-[16px] block">
                  Data da viagem
                </label>

                {isFixedDate ? (
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between text-left text-[14px] font-medium text-[#141530] leading-[16px] focus:outline-none py-0.5"
                      >
                        <span className="truncate">{formatDateDisplay()}</span>
                        <ChevronDown className={`w-4 h-4 text-[#141530] shrink-0 transition-transform duration-200 ${showCalendar ? 'rotate-180' : ''}`} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[230] bg-white rounded-2xl border border-gray-200 shadow-2xl"
                      align="start"
                    >
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
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="flex items-center justify-between gap-2 py-0.5">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={durationDays}
                      onChange={(e) =>
                        setDurationDays(e.target.value === '' ? '' : parseInt(e.target.value, 10) || '')
                      }
                      className="w-full bg-transparent text-[14px] font-semibold text-[#141530] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="15"
                    />
                    <span className="text-[14px] font-medium text-[#8E8E93] shrink-0 select-none">dias</span>
                  </div>
                )}
              </div>
            </div>

            {/* Toggle "Não tenho datas fixas" - Exclusivo para roteiros à venda */}
            {isForSale && (
              <div className="flex items-center justify-end gap-2 pt-0.5">
                <span className="text-[14px] font-medium text-[#141530] leading-[17px]">
                  Não tenho datas fixas
                </span>
                <Switch
                  checked={!isFixedDate}
                  onCheckedChange={(checked) => setIsFixedDate(!checked)}
                  className="data-[state=checked]:bg-[#9DCC36]"
                />
              </div>
            )}
          </div>

          {/* Botão Salvar */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className={`w-full h-[48px] rounded-[16px] font-bold text-[16px] leading-[19px] flex items-center justify-center transition-all mt-4 ${
              isValid
                ? 'bg-[#9DCC36] text-[#141530] hover:brightness-95 active:scale-[0.99] cursor-pointer shadow-sm'
                : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
            }`}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
