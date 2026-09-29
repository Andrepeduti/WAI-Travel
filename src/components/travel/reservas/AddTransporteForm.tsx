import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, X, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';
import { SplitExpenseSheet, SplitConfig, SplitPerson } from './SplitExpenseSheet';
import type { Transporte } from '@/components/travel/AddTransporteSheet';

/*
// =========================================================================
// [FEATURE FLIGHT AEROAPI - DESATIVADA TEMPORARIAMENTE]
// Para reativar a busca automática por número de voo no futuro, descomente
// o import de 'searchFlightByNumber' de '@/lib/aeroApi' e o bloco da feature.
// =========================================================================
*/

interface AddTransporteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onSave: (transporte: Transporte) => Promise<void> | void;
  editingTransporte?: Transporte | null;
  splitPeople?: SplitPerson[];
}

export function AddTransporteForm({
  isOpen,
  onClose,
  onBack,
  onSave,
  editingTransporte,
  splitPeople,
}: AddTransporteFormProps) {
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [partidaDate, setPartidaDate] = useState<Date | undefined>();
  const [partidaHora, setPartidaHora] = useState('10:00');
  const [chegadaDate, setChegadaDate] = useState<Date | undefined>();
  const [chegadaHora, setChegadaHora] = useState('10:00');
  const [valor, setValor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popover calendar states
  const [isPartidaCalendarOpen, setIsPartidaCalendarOpen] = useState(false);
  const [isChegadaCalendarOpen, setIsChegadaCalendarOpen] = useState(false);

  // Autocomplete states
  const [activeSearchField, setActiveSearchField] = useState<'origem' | 'destino' | null>(null);
  const [addressResults, setAddressResults] = useState<Array<{ display_name: string; place_id: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Split Expense
  const [showSplitSheet, setShowSplitSheet] = useState(false);
  const [splitConfig, setSplitConfig] = useState<SplitConfig>({
    type: 'none',
    assignedIds: [],
    customAmounts: {},
  });

  useEffect(() => {
    if (editingTransporte) {
      setOrigem(editingTransporte.origem || '');
      setDestino(editingTransporte.destino || '');
      setPartidaDate(editingTransporte.partidaDate);
      setPartidaHora(
        editingTransporte.partidaHora && editingTransporte.partidaMinuto
          ? `${editingTransporte.partidaHora}:${editingTransporte.partidaMinuto}`
          : '10:00'
      );
      setChegadaDate(editingTransporte.chegadaDate);
      setChegadaHora(
        editingTransporte.chegadaHora && editingTransporte.chegadaMinuto
          ? `${editingTransporte.chegadaHora}:${editingTransporte.chegadaMinuto}`
          : '10:00'
      );
      setIsRoundTrip(Boolean(editingTransporte.chegadaDate));
      setValor(editingTransporte.valor || '');
    } else {
      setIsRoundTrip(true);
      setOrigem('');
      setDestino('');
      setPartidaDate(undefined);
      setPartidaHora('10:00');
      setChegadaDate(undefined);
      setChegadaHora('10:00');
      setValor('');
      setSplitConfig({ type: 'none', assignedIds: [], customAmounts: {} });
    }
  }, [editingTransporte, isOpen]);

  const searchPlaces = useCallback((query: string, field: 'origem' | 'destino') => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) {
      setAddressResults([]);
      setActiveSearchField(null);
      return;
    }
    setActiveSearchField(field);
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(query);
        const mapped = predictions.map((p) => ({
          display_name: p.location ? `${p.name}, ${p.location}` : p.name,
          place_id: parseInt(p.placeId.replace(/\D/g, '').substring(0, 8)) || Math.floor(Math.random() * 1000000),
        }));
        setAddressResults(mapped as any);
      } catch {
        setAddressResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleOrigemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrigem(val);
    searchPlaces(val, 'origem');
  };

  const handleDestinoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestino(val);
    searchPlaces(val, 'destino');
  };

  const handleSelectPlace = (placeName: string) => {
    if (activeSearchField === 'origem') {
      setOrigem(placeName);
    } else if (activeSearchField === 'destino') {
      setDestino(placeName);
    }
    setActiveSearchField(null);
    setAddressResults([]);
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setValor('');
      return;
    }
    const num = parseInt(digits, 10) / 100;
    const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setValor(`R$ ${formatted}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origem.trim() || !destino.trim()) return;

    setIsSubmitting(true);
    try {
      const [pHora, pMin] = partidaHora.split(':');
      const [cHora, cMin] = chegadaHora.split(':');

      const title = `Viagem a ${destino.split('-')[0].split(',')[0].trim() || destino}`;

      const transporteData: Transporte = {
        id: editingTransporte?.id || crypto.randomUUID(),
        tipo: editingTransporte?.tipo || 'voo',
        nome: editingTransporte?.nome || title,
        origem: origem.trim(),
        destino: destino.trim(),
        partidaDate,
        partidaHora: pHora || '10',
        partidaMinuto: pMin || '00',
        chegadaDate: isRoundTrip ? chegadaDate : undefined,
        chegadaHora: isRoundTrip ? cHora || '10' : undefined,
        chegadaMinuto: isRoundTrip ? cMin || '00' : undefined,
        valor: valor || undefined,
        attachmentPath: editingTransporte?.attachmentPath,
        attachmentName: editingTransporte?.attachmentName,
      };

      await onSave(transporteData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[90] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
        style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
      >
        <div className="bg-white rounded-t-[24px] w-full max-w-lg pointer-events-auto shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto">
          {/* Top Bar (Height 60px, padding 24px 24px 12px) */}
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="w-6 h-6 flex items-center justify-center -ml-1 text-[#141530] hover:bg-muted/50 rounded-full transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <div className="w-6" />
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-[18px] h-[18px] flex items-center justify-center text-[#141530] hover:opacity-70 transition-opacity"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Body */}
          <div className="px-6 pt-2 pb-8">
            {/* Title: 22px semibold #171F2C */}
            <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] mb-4">
              {editingTransporte ? 'Editar transporte' : 'Adicionar transporte'}
            </h2>

            {/* Toggle: Frame 1321316542 (width 180px, height 24px, gap 8px) */}
            <div className="flex items-center gap-2 mb-4">
              {/* Tag 1: Ida e volta (width 80px, height 24px, padding 4px 12px, radius 9px) */}
              <button
                type="button"
                onClick={() => setIsRoundTrip(true)}
                className={`h-[24px] px-3 flex items-center justify-center rounded-[9px] font-['Urbanist'] font-medium text-[12px] leading-[14px] transition-all ${
                  isRoundTrip
                    ? 'bg-[#141530] text-[#FEFEFE]'
                    : 'bg-transparent border border-[#141530] text-[#141530]'
                }`}
              >
                Ida e volta
              </button>

              {/* Tag 2: Somente ida (width 92px, height 24px, padding 4px 12px, radius 9px) */}
              <button
                type="button"
                onClick={() => setIsRoundTrip(false)}
                className={`h-[24px] px-3 flex items-center justify-center rounded-[9px] font-['Urbanist'] font-medium text-[12px] leading-[14px] transition-all ${
                  !isRoundTrip
                    ? 'bg-[#141530] text-[#FEFEFE]'
                    : 'bg-transparent border border-[#141530] text-[#141530]'
                }`}
              >
                Somente ida
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: De (Origem) (Height 54px, bg #EDEDED, radius 12px) */}
              <div className="relative">
                <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] transition-colors">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-[#7F7F7F]" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                      De
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="GRU - Aeroporto de São Paulo"
                      value={origem}
                      onChange={handleOrigemChange}
                      onFocus={() => {
                        if (origem.length >= 3) searchPlaces(origem, 'origem');
                      }}
                      className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#949494]/60 outline-none p-0"
                    />
                  </div>
                  {isSearching && activeSearchField === 'origem' && (
                    <Loader2 size={16} className="animate-spin text-[#7F7F7F]" />
                  )}
                </div>

                {/* Origem Dropdown */}
                {activeSearchField === 'origem' && addressResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-50 max-h-44 overflow-y-auto">
                    {addressResults.map((res) => (
                      <button
                        key={res.place_id}
                        type="button"
                        onClick={() => handleSelectPlace(res.display_name)}
                        className="w-full text-left px-4 py-3 text-[13px] text-[#141530] hover:bg-muted/50 flex items-start gap-2.5 border-b border-border/40 last:border-b-0"
                      >
                        <MapPin size={16} className="text-[#7F7F7F] mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{res.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Field 2: Para (Destino) */}
              <div className="relative">
                <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] transition-colors">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-[#7F7F7F]" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                      Para
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="JFK - Aeroporto de Nova Iorque"
                      value={destino}
                      onChange={handleDestinoChange}
                      onFocus={() => {
                        if (destino.length >= 3) searchPlaces(destino, 'destino');
                      }}
                      className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#949494]/60 outline-none p-0"
                    />
                  </div>
                  {isSearching && activeSearchField === 'destino' && (
                    <Loader2 size={16} className="animate-spin text-[#7F7F7F]" />
                  )}
                </div>

                {/* Destino Dropdown */}
                {activeSearchField === 'destino' && addressResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-50 max-h-44 overflow-y-auto">
                    {addressResults.map((res) => (
                      <button
                        key={res.place_id}
                        type="button"
                        onClick={() => handleSelectPlace(res.display_name)}
                        className="w-full text-left px-4 py-3 text-[13px] text-[#141530] hover:bg-muted/50 flex items-start gap-2.5 border-b border-border/40 last:border-b-0"
                      >
                        <MapPin size={16} className="text-[#7F7F7F] mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{res.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 1: Data da ida & Horário da ida (Frame 1321316543, gap 16px, 164.5px each) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Data da ida */}
                <Popover open={isPartidaCalendarOpen} onOpenChange={setIsPartidaCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field h-[54px] text-left transition-colors"
                    >
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-[#7F7F7F]" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                          Data da ida
                        </label>
                        <div className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] truncate">
                          {partidaDate ? format(partidaDate, 'dd/MM/yy') : '02/01/26'}
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[150] rounded-2xl shadow-xl" align="start">
                    <div className="p-3 bg-white rounded-2xl">
                      <Calendar
                        mode="single"
                        selected={partidaDate}
                        onSelect={(date) => {
                          setPartidaDate(date);
                          setIsPartidaCalendarOpen(false);
                        }}
                        locale={ptBR}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Horário da ida */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] relative overflow-hidden">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-[#7F7F7F]" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                      Horário da ida
                    </label>
                    <input
                      type="time"
                      value={partidaHora}
                      onChange={(e) => setPartidaHora(e.target.value)}
                      className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none p-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Data da volta & Horário da volta (Frame 1321316545, gap 16px, 164.5px each - if Round-trip) */}
              {isRoundTrip && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  {/* Data da volta */}
                  <Popover open={isChegadaCalendarOpen} onOpenChange={setIsChegadaCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field h-[54px] text-left transition-colors"
                      >
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          <MapPin size={16} className="text-[#7F7F7F]" />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                            Data da volta
                          </label>
                          <div className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] truncate">
                            {chegadaDate ? format(chegadaDate, 'dd/MM/yy') : '02/01/26'}
                          </div>
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[150] rounded-2xl shadow-xl" align="start">
                      <div className="p-3 bg-white rounded-2xl">
                        <Calendar
                          mode="single"
                          selected={chegadaDate}
                          onSelect={(date) => {
                            setChegadaDate(date);
                            setIsChegadaCalendarOpen(false);
                          }}
                          locale={ptBR}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Horário da volta */}
                  <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] relative overflow-hidden">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} className="text-[#7F7F7F]" />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                        Horário da volta
                      </label>
                      <input
                        type="time"
                        value={chegadaHora}
                        onChange={(e) => setChegadaHora(e.target.value)}
                        className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none p-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Field: Valor (Height 54px, bg #EDEDED, radius 12px) */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] transition-colors">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-[#7F7F7F]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Valor
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 3.600,00"
                    value={valor}
                    onChange={handleValorChange}
                    className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#949494]/60 outline-none p-0"
                  />
                </div>
              </div>

              {/* Directional Button: Dividir gasto com outros viajantes */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSplitSheet(true)}
                  className="flex items-center gap-2 py-1 text-left font-['Urbanist'] font-bold text-[14px] leading-[17px] text-[#141530] hover:opacity-80 transition-opacity"
                >
                  <span>Dividir gasto com outros viajantes</span>
                  <ChevronRight size={16} className="text-[#141530]" />
                </button>
              </div>

              {/* Main Button: 345px width, 48px height, #9DCC36, radius 16px */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !origem.trim() || !destino.trim()}
                  className="w-full h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingTransporte ? 'Salvar' : 'Adicionar'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Split Expense Sheet */}
      <SplitExpenseSheet
        isOpen={showSplitSheet}
        onClose={() => setShowSplitSheet(false)}
        onConfirm={setSplitConfig}
        initialConfig={splitConfig}
        people={splitPeople}
        totalValueFormatted={valor}
      />
    </>
  );
}
