import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, X, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';
import { SplitExpenseSheet, SplitConfig, SplitPerson } from './SplitExpenseSheet';
import type { Reserva } from '@/components/travel/AddReservaSheet';

interface AddAtividadeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onSave: (reserva: Reserva) => Promise<void> | void;
  editingReserva?: Reserva | null;
  splitPeople?: SplitPerson[];
}

export function AddAtividadeForm({
  isOpen,
  onClose,
  onBack,
  onSave,
  editingReserva,
  splitPeople,
}: AddAtividadeFormProps) {
  const [nome, setNome] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [data, setData] = useState<Date | undefined>();
  const [horario, setHorario] = useState('10:00');
  const [valor, setValor] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address search
  const [addressResults, setAddressResults] = useState<Array<{ display_name: string; place_id: number }>>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
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
    if (editingReserva) {
      setNome(editingReserva.nome || '');
      setLocalizacao(editingReserva.localizacao || '');
      setData(editingReserva.atividadeDate);
      setHorario(
        editingReserva.atividadeHora && editingReserva.atividadeMinuto
          ? `${editingReserva.atividadeHora}:${editingReserva.atividadeMinuto}`
          : '10:00'
      );
      setValor(editingReserva.valor || '');
    } else {
      setNome('');
      setLocalizacao('');
      setData(undefined);
      setHorario('10:00');
      setValor('');
      setSplitConfig({ type: 'none', assignedIds: [], customAmounts: {} });
    }
  }, [editingReserva, isOpen]);

  const searchAddress = useCallback((query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) {
      setAddressResults([]);
      setShowAddressDropdown(false);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(query);
        const mapped = predictions.map((p) => ({
          display_name: p.location ? `${p.name}, ${p.location}` : p.name,
          place_id: parseInt(p.placeId.replace(/\D/g, '').substring(0, 8)) || Math.floor(Math.random() * 1000000),
        }));
        setAddressResults(mapped as any);
        setShowAddressDropdown(mapped.length > 0);
      } catch {
        setAddressResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalizacao(val);
    searchAddress(val);
  };

  const handleSelectAddress = (address: string) => {
    setLocalizacao(address);
    setShowAddressDropdown(false);
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
    if (!nome.trim()) return;

    setIsSubmitting(true);
    try {
      const [hora, min] = horario.split(':');
      const reservaData: Reserva = {
        id: editingReserva?.id || crypto.randomUUID(),
        tipo: 'atividade',
        nome: nome.trim(),
        localizacao: localizacao.trim() || nome.trim(),
        atividadeDate: data,
        atividadeHora: hora || '10',
        atividadeMinuto: min || '00',
        valor: valor || undefined,
        attachmentPath: editingReserva?.attachmentPath,
        attachmentName: editingReserva?.attachmentName,
      };

      await onSave(reservaData);
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
            <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] mb-6">
              {editingReserva ? 'Editar atividade' : 'Adicionar atividade'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Nome da atividade */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] transition-colors">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-[#7F7F7F]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Nome da atividade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tour pelo museu Van Gogh"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#949494]/60 outline-none p-0"
                  />
                </div>
              </div>

              {/* Field 2: Local */}
              <div className="relative">
                <div className="flex items-center gap-3 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] transition-colors">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-[#7F7F7F]" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                      Local
                    </label>
                    <input
                      type="text"
                      placeholder="Amsterdam, Holanda"
                      value={localizacao}
                      onChange={handleLocalChange}
                      onFocus={() => {
                        if (localizacao.length >= 3) searchAddress(localizacao);
                      }}
                      className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#949494]/60 outline-none p-0"
                    />
                  </div>
                  {isSearching && (
                    <Loader2 size={16} className="animate-spin text-[#7F7F7F]" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showAddressDropdown && addressResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-50 max-h-44 overflow-y-auto">
                    {addressResults.map((res) => (
                      <button
                        key={res.place_id}
                        type="button"
                        onClick={() => handleSelectAddress(res.display_name)}
                        className="w-full text-left px-4 py-3 text-[13px] text-[#141530] hover:bg-muted/50 flex items-start gap-2.5 border-b border-border/40 last:border-b-0"
                      >
                        <MapPin size={16} className="text-[#7F7F7F] mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{res.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row: Data & Horário (Frame 1321316511, gap 16px, 164.5px each) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Data */}
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] bg-field h-[54px] text-left transition-colors"
                    >
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-[#7F7F7F]" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                          Data
                        </label>
                        <div className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] truncate">
                          {data ? format(data, 'dd/MM/yy') : '02/01/26'}
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[150] rounded-2xl shadow-xl" align="start">
                    <div className="p-3 bg-white rounded-2xl">
                      <Calendar
                        mode="single"
                        selected={data}
                        onSelect={(d) => {
                          setData(d);
                          setIsCalendarOpen(false);
                        }}
                        locale={ptBR}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Horário */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] bg-field border border-transparent focus-within:border-primary transition-colors h-[54px] relative overflow-hidden">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-[#7F7F7F]" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                      Horário
                    </label>
                    <input
                      type="time"
                      value={horario}
                      onChange={(e) => setHorario(e.target.value)}
                      className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none p-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Field: Valor */}
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
                    placeholder="R$ 300,00"
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

              {/* Main Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !nome.trim()}
                  className="w-full h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingReserva ? 'Salvar' : 'Adicionar'}</span>
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
