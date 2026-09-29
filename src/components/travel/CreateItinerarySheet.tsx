import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';
import {
  ChevronLeft,
  ChevronDown,
  X,
  Pencil,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Compass,
} from 'lucide-react';

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
  isFlexible?: boolean;
  durationDays?: number;
  travelMonth?: string;
  status?: 'draft' | 'published' | 'suspended';
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
  initialCreationType?: 'personal' | 'seller';
}

const monthsOfYear = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

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
  initialCreationType,
}: CreateItinerarySheetProps) {
  // Step 1: selection ('type') | Step 2: form ('form')
  const [step, setStep] = useState<'type' | 'form'>(initialCreationType ? 'form' : 'type');
  const [creationType, setCreationType] = useState<'personal' | 'seller'>(initialCreationType || 'personal');

  const [tripName, setTripName] = useState('');
  const [destinations, setDestinations] = useState<string[]>(initialDestinations ?? []);
  const [destinationInput, setDestinationInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [remoteResults, setRemoteResults] = useState<{ label: string; sub: string; full: string; emoji: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Date Control: 'specific' (Data específica) | 'flexible' (Data flexível)
  const [dateMode, setDateMode] = useState<'specific' | 'flexible'>('specific');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [durationDays, setDurationDays] = useState<number | ''>('');
  const [travelMonth, setTravelMonth] = useState<string>('');

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
    if (isOpen) {
      setStep(initialCreationType ? 'form' : 'type');
      setCreationType(initialCreationType || 'personal');
    } else {
      setTripName('');
      setDestinations(initialDestinations ?? []);
      setDestinationInput('');
      setDateMode('specific');
      setStartDate(undefined);
      setEndDate(undefined);
      setDurationDays('');
      setTravelMonth('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialDestinations, initialCreationType]);

  // Handle autocomplete destination search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const term = destinationInput.trim();
    if (term.length < 3) {
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
    }, 500);

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

  // Reatividade e Validação dinâmica
  const isFormValid = useMemo(() => {
    if (destinations.length === 0) return false;

    if (dateMode === 'flexible') {
      return typeof durationDays === 'number' && durationDays > 0;
    }

    return !!startDate && !!endDate;
  }, [destinations, dateMode, durationDays, startDate, endDate]);

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isSelling = creationType === 'seller';
      const isFlex = dateMode === 'flexible';
      const daysCount = isFlex && typeof durationDays === 'number' ? durationDays : (startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 7);

      const effectiveStartDate = isFlex ? undefined : (startDate ?? new Date());
      const effectiveEndDate = isFlex
        ? undefined
        : (endDate ?? new Date());

      // Datas flexíveis e mês de viagem vão em isFlexible/travelMonth, não em tags.
      const tags: string[] = [];

      await onSubmit({
        tripName: tripName.trim() || `${destinations[0]} trip`,
        destinations,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        invitedFriends: [],
        isPersonal: !isSelling,
        isPublic: isSelling,
        priceCents: null,
        tags,
        isFlexible: isFlex,
        durationDays: daysCount,
        travelMonth: isFlex && travelMonth ? travelMonth : undefined,
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
        <div className="bg-[#FFFFFF] rounded-t-[24px] w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden pointer-events-auto animate-in slide-in-from-bottom duration-300 font-sans">

          {/* Header Block */}
          <div className="px-6 pt-6 pb-3 flex items-center justify-between bg-[#FFFFFF] border-b border-transparent">
            {step === 'form' && !initialCreationType ? (
              <button
                onClick={() => setStep('type')}
                className="w-6 h-6 flex items-center justify-center text-[#141530] hover:opacity-75 transition-opacity active:scale-95"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
              </button>
            ) : (
              <div className="w-6 h-6" />
            )}

            <button
              onClick={onClose}
              className="w-[18px] h-[18px] flex items-center justify-center text-[#141530] hover:opacity-75 transition-opacity active:scale-95"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Content Block */}
          <div className="px-6 pb-6 pt-1 overflow-y-auto space-y-6">
            {step === 'type' ? (
              /* Step 1: Type Selection */
              <div className="space-y-4">
                <h2 className="text-[22px] font-semibold text-[#171F2C] leading-[26px]">
                  O que você quer fazer com seu roteiro?
                </h2>

                {/* Opção 1: Planejar minha viagem */}
                <button
                  type="button"
                  onClick={() => setCreationType('personal')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${creationType === 'personal'
                    ? 'border-[#9DCC36] bg-[#F7FBEB]'
                    : 'border-[#F0F0F0] bg-white hover:border-[#E0E0E0]'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#141530] flex-shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#141530]">Planejar uma viagem pessoal</h3>
                      <p className="text-[12px] text-[#949494] mt-0.5">Organize sua viagem do seu jeito.</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${creationType === 'personal'
                      ? 'border-[#9DCC36] bg-[#9DCC36]'
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
                    ? 'border-[#9DCC36] bg-[#F7FBEB]'
                    : 'border-[#F0F0F0] bg-white hover:border-[#E0E0E0]'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#141530] flex-shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#141530]">Criar roteiro para vender</h3>
                      <p className="text-[12px] text-[#949494] mt-0.5">Transforme seu roteiro em renda.</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${creationType === 'seller'
                      ? 'border-[#9DCC36] bg-[#9DCC36]'
                      : 'border-[#D1D5DB] bg-white'
                      }`}
                  >
                    {creationType === 'seller' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (creationType === 'seller') {
                        setDateMode('flexible');
                      } else {
                        setDateMode('specific');
                      }
                      setStep('form');
                    }}
                    className="w-full h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] text-[16px] font-bold leading-[19px] flex items-center justify-center hover:opacity-95 active:scale-[0.99] transition-all shadow-none"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Form */
              <div className="space-y-4">
                {/* Title */}
                <h2 className="text-[22px] font-semibold text-[#171F2C] leading-[26px]">
                  {creationType === 'personal' ? 'Criar viagem pessoal' : 'Criar roteiro pra venda'}
                </h2>

                {/* Form Elements Container (gap: 16px) */}
                <div className="space-y-4">
                  {/* Input 1: Nome do roteiro (height: 60px, bg: #EEEEEE, radius: 12px) */}
                  <div className="bg-field border border-transparent focus-within:border-primary transition-colors rounded-[12px] p-3 min-h-[60px] flex items-center gap-3">
                    <Pencil className="w-4 h-4 text-[#141530] flex-shrink-0" />
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      <label className="text-[12px] font-medium text-[#949494] leading-4 block">
                        Nome do roteiro
                      </label>
                      <input
                        type="text"
                        value={tripName}
                        onChange={(e) => setTripName(e.target.value)}
                        placeholder="Dê um nome ao seu roteiro"
                        className="w-full bg-transparent text-[14px] font-medium text-[#141530] leading-4 placeholder:text-[#949494] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Input 2: Destinos (Multiple input, bg: #EEEEEE, radius: 12px) */}
                  <div className="bg-[#EEEEEE] rounded-[12px] p-3 min-h-[78px] flex items-center justify-center gap-3 relative">
                    <MapPin className="w-4 h-4 text-[#141530] flex-shrink-0" />
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      <label className="text-[12px] font-medium text-[#949494] leading-4 block">
                        Destinos
                      </label>

                      {/* Chips Container */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {destinations.map((dest) => (
                          <div
                            key={dest}
                            className="bg-[#E7E7EE] border border-[#141530] rounded-[24px] px-[16px] py-[8px] h-[34px] inline-flex items-center gap-[10px] transition-all box-border"
                          >
                            <span className="text-[14px] font-medium text-[#141530] leading-4">
                              {dest}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDestination(dest)}
                              className="text-[#141530] hover:opacity-70 transition-opacity flex items-center justify-center"
                              aria-label={`Remover ${dest}`}
                            >
                              <X className="w-3 h-3 stroke-[2]" />
                            </button>
                          </div>
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
                          placeholder={destinations.length === 0 ? "Adicione os destinos" : "+ Adicionar..."}
                          className={`bg-transparent text-[14px] font-medium text-[#141530] leading-4 placeholder:text-[#949494] focus:outline-none ${destinations.length === 0 ? 'w-full' : 'min-w-[80px] flex-1 py-1'
                            }`}
                        />
                      </div>
                    </div>

                    {/* Suggestions Popover */}
                    {showSuggestions && (
                      <div
                        ref={suggestionsRef}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E5E5E5] rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#F0F0F0]"
                      >
                        {isSearching && (
                          <div className="p-3 text-xs text-[#949494]">Buscando destinos...</div>
                        )}

                        {remoteResults.length > 0
                          ? remoteResults.map((r, idx) => (
                            <button
                              key={`rem-${idx}`}
                              type="button"
                              onClick={() => handleAddDestination(r.full || `${r.label}, ${r.sub}`)}
                              className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-[#F4F4F4] transition-colors"
                            >
                              <span className="text-base">{r.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[#141530] truncate">{r.label}</p>
                                {r.sub && <p className="text-[11px] text-[#949494] truncate">{r.sub}</p>}
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
                                className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-[#F4F4F4] transition-colors"
                              >
                                <span className="text-base">{p.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold text-[#141530] truncate">{p.city}</p>
                                  <p className="text-[11px] text-[#949494] truncate">{p.country}</p>
                                </div>
                              </button>
                            ))
                          )}
                      </div>
                    )}
                  </div>

                  {/* Frame 2087325080: Date Control + Dynamic Fields (gap: 12px) */}
                  <div className="space-y-3">
                    {/* Control (Segment/Tabs, height: 44px, bg: #F4F4F4, radius: rounded-full) */}
                    <div className="bg-[#F4F4F4] rounded-full p-[3.37px] flex items-center h-[44px]">
                      <button
                        type="button"
                        onClick={() => setDateMode('specific')}
                        className={cn(
                          "flex-1 h-[37.23px] rounded-[20.23px] text-[14px] font-semibold leading-[17px] transition-all flex items-center justify-center px-[26.98px]",
                          dateMode === 'specific'
                            ? "bg-[#1A1C40] text-[#FEFEFE] shadow-xs"
                            : "bg-transparent text-[#141530] hover:bg-black/5"
                        )}
                      >
                        Data específica
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateMode('flexible')}
                        className={cn(
                          "flex-1 h-[37.23px] rounded-[20.23px] text-[14px] font-semibold leading-[17px] transition-all flex items-center justify-center px-[26.98px]",
                          dateMode === 'flexible'
                            ? "bg-[#1A1C40] text-[#FEFEFE] shadow-xs"
                            : "bg-transparent text-[#141530] hover:bg-black/5"
                        )}
                      >
                        Data flexível
                      </button>
                    </div>

                    {/* Dynamic Fields */}
                    {dateMode === 'flexible' ? (
                      <div className="space-y-4">
                        {/* 1. Duração da viagem (height: 60px, bg: #EDEDED, radius: 12px) */}
                        <div className="bg-field border border-transparent focus-within:border-primary transition-colors rounded-[12px] p-3 min-h-[60px] flex items-center gap-3">
                          <Clock className="w-4 h-4 text-[#555555] flex-shrink-0" />
                          <div className="flex-1 flex flex-col justify-center gap-1">
                            <label className="text-[12px] font-medium text-[#949494] leading-4 block">
                              Duração da viagem
                            </label>
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={durationDays}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDurationDays(val === '' ? '' : Math.max(1, parseInt(val) || 1));
                                }}
                                placeholder="Informe a quantidade de dias"
                                className="w-full bg-transparent text-[14px] font-medium text-[#141530] leading-4 placeholder:text-[#949494] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-[14px] font-medium text-[#555555] leading-4 shrink-0 select-none">
                                dias
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Mês da viagem (Opcional) (Select, height: 60px, bg: #EEEEEE, radius: 12px) */}
                        <div className="bg-field rounded-[12px] p-3 min-h-[60px] flex items-center gap-3 relative">
                          <CalendarIcon className="w-4 h-4 text-[#141530] flex-shrink-0" />
                          <div className="flex-1 flex flex-col justify-center gap-1 relative">
                            <label className="text-[12px] font-medium text-[#949494] leading-4 block">
                              Mês da viagem (Opcional)
                            </label>
                            <select
                              value={travelMonth}
                              onChange={(e) => setTravelMonth(e.target.value)}
                              className={`w-full bg-transparent text-[14px] font-medium leading-4 focus:outline-none appearance-none cursor-pointer pr-6 ${travelMonth ? 'text-[#141530]' : 'text-[#949494]'}`}
                            >
                              <option value="" className="text-[#949494]">Selecione o mês</option>
                              {monthsOfYear.map((m) => (
                                <option key={m} value={m} className="text-[#141530]">
                                  {m}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-[#141530] absolute right-0 bottom-0 pointer-events-none stroke-[2]" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Modo: Data específica (Select/Popover) */
                      <div className="bg-field rounded-[12px] p-3 min-h-[60px] flex items-center gap-3">
                        <CalendarIcon className="w-4 h-4 text-[#141530] flex-shrink-0" />
                        <div className="flex-1 flex flex-col justify-center gap-1">
                          <label className="text-[12px] font-medium text-[#949494] leading-4 block">
                            Data da viagem
                          </label>

                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full flex items-center justify-between text-left text-[14px] font-medium text-[#141530] leading-4 focus:outline-none"
                              >
                                <span>
                                  {formatDateRange() || (
                                    <span className="text-[#949494] font-medium">Selecione a data da viagem</span>
                                  )}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-[#141530] shrink-0 stroke-[2] transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} />
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Button ("Criar", height: 48px, bg: #9DCC36, radius: 16px) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full h-[48px] rounded-[16px] text-[16px] font-bold leading-[19px] transition-all shadow-none flex items-center justify-center gap-2 ${isFormValid && !isSubmitting
                      ? 'bg-[#9DCC36] text-[#141530] hover:opacity-95 active:scale-[0.99]'
                      : 'bg-[#E5E5E7] text-[#949494] cursor-not-allowed'
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-[#141530]" viewBox="0 0 24 24" fill="none">
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
