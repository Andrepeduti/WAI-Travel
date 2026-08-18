import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, X, Pencil, MapPin, Calendar as CalendarIcon, DollarSign, Compass } from 'lucide-react';

export interface ItineraryFormData {
  destinations: string[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  invitedFriends: InvitedFriend[];
  tripName?: string;
  coverImage?: string;
  isPersonal?: boolean;
  isPublic?: boolean;
  priceCents?: number | null;
  description?: string;
  tags?: string[];
  isFlexible?: boolean;
  durationDays?: number;
}

interface InvitedFriend {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  status: 'pending' | 'accepted';
}

interface CreateItinerarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItineraryFormData) => void | Promise<void>;
  initialDestinations?: string[];
}

const popularDestinations = [
  { city: 'Paris', country: 'França', emoji: '🇫🇷' },
  { city: 'Londres', country: 'Reino Unido', emoji: '🇬🇧' },
  { city: 'Roma', country: 'Itália', emoji: '🇮🇹' },
  { city: 'Amsterdam', country: 'Países Baixos', emoji: '🇳🇱' },
  { city: 'Barcelona', country: 'Espanha', emoji: '🇪🇸' },
  { city: 'Tóquio', country: 'Japão', emoji: '🇯🇵' },
  { city: 'Nova York', country: 'Estados Unidos', emoji: '🇺🇸' },
  { city: 'Rio de Janeiro', country: 'Brasil', emoji: '🇧🇷' },
  { city: 'Lisboa', country: 'Portugal', emoji: '🇵🇹' },
  { city: 'Berlim', country: 'Alemanha', emoji: '🇩🇪' },
];

export function CreateItinerarySheet({
  isOpen,
  onClose,
  onSubmit,
  initialDestinations,
}: CreateItinerarySheetProps) {
  // Step 1: selection ('type') | Step 2: form ('form')
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [creationType, setCreationType] = useState<'personal' | 'seller'>('personal');

  const [tripName, setTripName] = useState('');
  const [destinations, setDestinations] = useState<string[]>(initialDestinations ?? []);
  const [destinationInput, setDestinationInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [remoteResults, setRemoteResults] = useState<{ label: string; sub: string; full: string; emoji: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFlexibleDates, setIsFlexibleDates] = useState(false);
  const [durationDays, setDurationDays] = useState<number | ''>(5);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadingPhrases = [
    'Criando roteiro...',
    'Buscando melhores locais...',
    'Organizando os dias...',
    'Quase pronto...',
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSubmitting) {
      setLoadingTextIndex(0);
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSubmitting]);

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      setStep('type');
      setCreationType('personal');
      setTripName('');
      setDestinations(initialDestinations ?? []);
      setDestinationInput('');
      setStartDate(undefined);
      setEndDate(undefined);
      setIsFlexibleDates(false);
      setDurationDays(5);
      setIsSubmitting(false);
    }
  }, [isOpen, initialDestinations]);

  // Handle autocomplete destination search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const term = destinationInput.trim();
    if (term.length < 2) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchGooglePlacesAutocomplete(term, ['(cities)']);
        const mapped = results.map((r) => {
          const rawDescription = r.description || r.fullText || (r.location ? `${r.name}, ${r.location}` : r.name) || '';
          const parts = rawDescription.split(',');
          const label = r.name || parts[0]?.trim() || term;
          const sub = r.location || parts.slice(1).join(',').trim();
          return { label, sub, full: rawDescription || label, emoji: '📍' };
        });
        setRemoteResults(mapped);
      } catch (err) {
        console.error('Failed to autocomplete destination:', err);
        setRemoteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [destinationInput]);

  // Click outside suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddDestination = (dest: string) => {
    const cityName = dest.split(',')[0].trim();
    if (!destinations.includes(cityName)) {
      setDestinations((prev) => [...prev, cityName]);
    }
    setDestinationInput('');
    setShowSuggestions(false);
    if (!tripName) {
      setTripName(`${cityName} trip`);
    }
  };

  const handleRemoveDestination = (dest: string) => {
    setDestinations((prev) => prev.filter((d) => d !== dest));
  };

  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'dd MMM', { locale: ptBR })} - ${format(endDate, 'dd MMM yyyy', { locale: ptBR })}`;
    }
    if (startDate) {
      return `A partir de ${format(startDate, 'dd MMM yyyy', { locale: ptBR })}`;
    }
    return '';
  };

  const isFormValid = useMemo(() => {
    if (destinations.length === 0) return false;
    if (creationType === 'personal') {
      return !!startDate && !!endDate;
    }
    // Seller
    if (isFlexibleDates) {
      return typeof durationDays === 'number' && durationDays > 0;
    }
    return !!startDate && !!endDate;
  }, [destinations, creationType, isFlexibleDates, durationDays, startDate, endDate]);

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isSelling = creationType === 'seller';
      const isFlex = isSelling && isFlexibleDates;
      const daysCount = isFlex && typeof durationDays === 'number' ? durationDays : (startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 5);

      const effectiveStartDate = startDate ?? new Date();
      const effectiveEndDate = isFlex
        ? new Date(effectiveStartDate.getTime() + (daysCount - 1) * 86400000)
        : (endDate ?? new Date());

      const tags = isFlex ? ['_FLEXIBLE_DATES_'] : [];

      await onSubmit({
        tripName: tripName.trim() || `${destinations[0]} trip`,
        destinations,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        invitedFriends: [],
        isPersonal: !isSelling,
        isPublic: isSelling,
        priceCents: isSelling ? 2990 : null,
        tags,
        isFlexible: isFlex,
        durationDays: daysCount,
      });
    } catch (err) {
      console.error('Error submitting itinerary form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet Container */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] flex flex-col justify-end pointer-events-none">
        <div className="bg-white rounded-t-[32px] w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden pointer-events-auto animate-in slide-in-from-bottom duration-300">

          {/* Top Bar with Back and Close */}
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            {step === 'form' ? (
              <button
                onClick={() => setStep('type')}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F4F4F5] text-[#1A1C40] hover:bg-[#ECECED] transition-colors -ml-1"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9" />
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F4F4F5] text-[#1A1C40] hover:bg-[#ECECED] transition-colors -mr-1"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title Area */}
          <div className="px-6 pt-1 pb-3">
            <h2 className="text-[20px] font-bold text-[#1A1C40]">
              {step === 'type' ? 'O que você quer fazer com seu roteiro?' : 'Criar roteiro'}
            </h2>
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto space-y-4">
            {step === 'type' ? (
              /* Step 1: Type Selection (IMAGEM 2) */
              <div className="space-y-4 pt-1">
                {/* Opção 1: Planejar minha viagem */}
                <button
                  type="button"
                  onClick={() => setCreationType('personal')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${creationType === 'personal'
                    ? 'border-[#9ecc3b] bg-[#F7FBEB]'
                    : 'border-[#F0F0F0] bg-white hover:border-[#E0E0E0]'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#1A1C40] flex-shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#1A1C40]">Planejar minha viagem</h3>
                      <p className="text-[12px] text-[#8E8E93] mt-0.5">Organize sua viagem do seu jeito.</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${creationType === 'personal'
                      ? 'border-[#9ecc3b] bg-[#9ecc3b]'
                      : 'border-[#D1D5DB] bg-white'
                      }`}
                  >
                    {creationType === 'personal' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>

                {/* Opção 2: Criar um roteiro para vender */}
                <button
                  type="button"
                  onClick={() => setCreationType('seller')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${creationType === 'seller'
                    ? 'border-[#9ecc3b] bg-[#F7FBEB]'
                    : 'border-[#F0F0F0] bg-white hover:border-[#E0E0E0]'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#1A1C40] flex-shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#1A1C40]">Criar um roteiro para vender</h3>
                      <p className="text-[12px] text-[#8E8E93] mt-0.5">Transforme seu roteiro em renda.</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${creationType === 'seller'
                      ? 'border-[#9ecc3b] bg-[#9ecc3b]'
                      : 'border-[#D1D5DB] bg-white'
                      }`}
                  >
                    {creationType === 'seller' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="w-full py-4 rounded-2xl text-[15px] font-bold bg-[#9ecc3b] text-[#1A1C40] hover:opacity-95 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Form (IMAGEM 2) */
              <div className="space-y-4">
                {/* Campo 1: Nome do roteiro */}
                <div className="bg-[#F4F4F5] rounded-2xl p-3.5 flex items-start gap-3">
                  <Pencil className="w-4 h-4 text-[#8E8E93] mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-[#8E8E93] block">Nome do roteiro</label>
                    <input
                      type="text"
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                      placeholder="Dê um nome ao seu roteiro"
                      className="w-full bg-transparent text-[14px] font-semibold text-[#1A1C40] placeholder:text-[#8E8E93] focus:outline-none mt-0.5"
                    />
                  </div>
                </div>

                {/* Campo 2: Destinos */}
                <div className="bg-[#F4F4F5] rounded-2xl p-3.5 relative">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#8E8E93] mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="text-[11px] font-medium text-[#8E8E93] block">Destinos</label>

                      {/* Chips & Input Container */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {destinations.map((dest) => (
                          <span
                            key={dest}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1A1C40] text-white text-[13px] font-medium shadow-sm"
                          >
                            <span>{dest}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDestination(dest)}
                              className="text-white hover:opacity-75 transition-opacity flex items-center justify-center"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                          </span>
                        ))}

                        {/* Autocomplete Input */}
                        <input
                          ref={inputRef}
                          type="text"
                          value={destinationInput}
                          onChange={(e) => {
                            setDestinationInput(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder={destinations.length === 0 ? "Adicione os destinos" : ""}
                          className={`bg-transparent text-[13px] font-medium text-[#1A1C40] placeholder:text-[#8E8E93] focus:outline-none ${
                            destinations.length === 0 ? 'w-full mt-0.5' : 'min-w-[50px] flex-1 py-1'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Suggestions Popover */}
                  {showSuggestions && (
                    <div
                      ref={suggestionsRef}
                      className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E5E5E5] rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#F0F0F0]"
                    >
                      {isSearching && (
                        <div className="p-3 text-xs text-[#8E8E93]">Buscando destinos...</div>
                      )}

                      {remoteResults.length > 0
                        ? remoteResults.map((r, idx) => (
                          <button
                            key={`rem-${idx}`}
                            type="button"
                            onClick={() => handleAddDestination(r.full || `${r.label}, ${r.sub}`)}
                            className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-[#F4F4F5] transition-colors"
                          >
                            <span className="text-base">{r.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-[#1A1C40] truncate">{r.label}</p>
                              {r.sub && <p className="text-[11px] text-[#8E8E93] truncate">{r.sub}</p>}
                            </div>
                          </button>
                        ))
                        : !isSearching && (
                          (destinationInput.trim().length >= 2
                            ? popularDestinations.filter(p =>
                              p.city.toLowerCase().includes(destinationInput.trim().toLowerCase()) ||
                              p.country.toLowerCase().includes(destinationInput.trim().toLowerCase())
                            )
                            : popularDestinations
                          ).map((p, idx) => (
                            <button
                              key={`pop-${idx}`}
                              type="button"
                              onClick={() => handleAddDestination(`${p.city}, ${p.country}`)}
                              className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-[#F4F4F5] transition-colors"
                            >
                              <span className="text-base">{p.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[#1A1C40] truncate">{p.city}</p>
                                <p className="text-[11px] text-[#8E8E93] truncate">{p.country}</p>
                              </div>
                            </button>
                          ))
                        )}
                    </div>
                  )}
                </div>

                {/* Campo 3: Data / Período */}
                <div className="bg-[#F4F4F5] rounded-2xl p-3.5 flex items-start gap-3">
                  <CalendarIcon className="w-4 h-4 text-[#8E8E93] mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-[#8E8E93] block">
                      {isFlexibleDates ? 'Quantidade de dias' : 'Selecione a data da viagem'}
                    </label>

                    {isFlexibleDates ? (
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={durationDays}
                          onChange={(e) =>
                            setDurationDays(e.target.value === '' ? '' : parseInt(e.target.value) || 1)
                          }
                          className="w-full bg-transparent text-[14px] font-semibold text-[#1A1C40] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[13px] font-semibold text-[#8E8E93] shrink-0 select-none">dias</span>
                      </div>
                    ) : (
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full text-left mt-1 text-[14px] font-semibold text-[#1A1C40]"
                          >
                            {formatDateRange() || (
                              <span className="text-[#8E8E93] font-normal">23 nov - 23 dez 2026</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl" align="start">
                          <Calendar
                            mode="range"
                            selected={{ from: startDate, to: endDate }}
                            onSelect={(range) => {
                              setStartDate(range?.from);
                              setEndDate(range?.to);
                              if (range?.from && range?.to) {
                                setIsCalendarOpen(false);
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className={cn('pointer-events-auto p-3')}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Toggle "Não tenho datas fixas" (exclusivo para "Criar um roteiro para vender") */}
                {creationType === 'seller' && (
                  <div className="flex items-center justify-end gap-3 pt-1 px-1">
                    <span className="text-[13px] font-medium text-[#1A1C40]">Não tenho datas fixas</span>
                    <Switch
                      checked={isFlexibleDates}
                      onCheckedChange={setIsFlexibleDates}
                    />
                  </div>
                )}

                {/* Botão Criar */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${isFormValid && !isSubmitting
                      ? 'bg-[#9ecc3b] text-[#1A1C40] hover:opacity-95 active:scale-[0.99]'
                      : 'bg-[#E5E5E7] text-[#8E8E93] cursor-not-allowed'
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-[#1A1C40]" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{loadingPhrases[loadingTextIndex]}</span>
                      </>
                    ) : (
                      'Criar'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
