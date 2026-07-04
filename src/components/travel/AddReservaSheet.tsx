import { useState, useEffect, useRef, useCallback } from 'react';
import { FileUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, TicketCheck } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePickerSheet } from '@/components/travel/TimePickerSheet';
import { cn } from '@/lib/utils';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';

type ReservaTipo = 'hospedagem' | 'atividade';

export interface Reserva {
  id: string;
  tipo: ReservaTipo;
  nome: string;
  localizacao: string;
  checkInDate?: Date;
  checkInHora?: string;
  checkInMinuto?: string;
  checkOutDate?: Date;
  checkOutHora?: string;
  checkOutMinuto?: string;
  atividadeDate?: Date;
  atividadeHora?: string;
  atividadeMinuto?: string;
  codigo?: string;
  valor?: string;
  /** Caminho no bucket `itinerary-documents` (após upload). */
  attachmentPath?: string;
  /** Nome original do arquivo, exibido na lista. */
  attachmentName?: string;
  /** Arquivo selecionado mas ainda não enviado — só transita até o save. */
  _pendingFile?: File;
}

interface AddReservaSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (reserva: Reserva) => void;
  editingReserva?: Reserva | null;
  initialTipo?: ReservaTipo;
}

type TimePickerTarget = 'checkIn' | 'checkOut' | 'atividade' | null;

export function AddReservaSheet({ isOpen, onClose, onAdd, editingReserva, initialTipo }: AddReservaSheetProps) {
  const [tipo, setTipo] = useState<ReservaTipo>(editingReserva?.tipo || initialTipo || 'hospedagem');
  const [isLoading, setIsLoading] = useState(false);
  const [nome, setNome] = useState(editingReserva?.nome || '');
  const [localizacao, setLocalizacao] = useState(editingReserva?.localizacao || '');
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(editingReserva?.checkInDate);
  const [checkInHora, setCheckInHora] = useState(editingReserva?.checkInHora || '14');
  const [checkInMinuto, setCheckInMinuto] = useState(editingReserva?.checkInMinuto || '00');
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(editingReserva?.checkOutDate);
  const [checkOutHora, setCheckOutHora] = useState(editingReserva?.checkOutHora || '11');
  const [checkOutMinuto, setCheckOutMinuto] = useState(editingReserva?.checkOutMinuto || '00');
  const [atividadeDate, setAtividadeDate] = useState<Date | undefined>(editingReserva?.atividadeDate);
  const [atividadeHora, setAtividadeHora] = useState(editingReserva?.atividadeHora || '10');
  const [atividadeMinuto, setAtividadeMinuto] = useState(editingReserva?.atividadeMinuto || '00');
  const [codigo, setCodigo] = useState(editingReserva?.codigo || '');
  const [valor, setValor] = useState(editingReserva?.valor || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget>(null);
  const [addressResults, setAddressResults] = useState<Array<{ display_name: string; place_id: number }>>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [isCheckInCalendarOpen, setIsCheckInCalendarOpen] = useState(false);
  const [isCheckOutCalendarOpen, setIsCheckOutCalendarOpen] = useState(false);
  const [isAtividadeCalendarOpen, setIsAtividadeCalendarOpen] = useState(false);

  // Sync form state when editingReserva changes
  useEffect(() => {
    if (editingReserva) {
      setTipo(editingReserva.tipo);
      setNome(editingReserva.nome || '');
      setLocalizacao(editingReserva.localizacao || '');
      setCheckInDate(editingReserva.checkInDate);
      setCheckInHora(editingReserva.checkInHora || '14');
      setCheckInMinuto(editingReserva.checkInMinuto || '00');
      setCheckOutDate(editingReserva.checkOutDate);
      setCheckOutHora(editingReserva.checkOutHora || '11');
      setCheckOutMinuto(editingReserva.checkOutMinuto || '00');
      setAtividadeDate(editingReserva.atividadeDate);
      setAtividadeHora(editingReserva.atividadeHora || '10');
      setAtividadeMinuto(editingReserva.atividadeMinuto || '00');
      setCodigo(editingReserva.codigo || '');
      setValor(editingReserva.valor || '');
    } else {
      setTipo(initialTipo || 'hospedagem');
      setNome('');
      setLocalizacao('');
      setCheckInDate(undefined);
      setCheckInHora('14');
      setCheckInMinuto('00');
      setCheckOutDate(undefined);
      setCheckOutHora('11');
      setCheckOutMinuto('00');
      setAtividadeDate(undefined);
      setAtividadeHora('10');
      setAtividadeMinuto('00');
      setCodigo('');
      setValor('');
    }
  }, [editingReserva, initialTipo]);

  const searchAddress = useCallback((query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) {
      setAddressResults([]);
      setShowAddressDropdown(false);
      return;
    }
    setIsSearching(true);
    let active = true;
    searchTimeout.current = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(query);
        const mapped = predictions.map(p => ({
            display_name: p.location ? `${p.name}, ${p.location}` : p.name,
            place_id: parseInt(p.placeId.replace(/\D/g, '').substring(0, 8)) || Math.floor(Math.random() * 1000000)
        }));
        if (active) {
          setAddressResults(mapped as any);
          setShowAddressDropdown(mapped.length > 0);
        }
      } catch {
        if (active) setAddressResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 1000);
    return () => {
      active = false;
    }
  }, []);

  const handleLocalizacaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalizacao(val);
    searchAddress(val);
  };

  const selectAddress = (address: string) => {
    setLocalizacao(address);
    setShowAddressDropdown(false);
    setAddressResults([]);
  };

  if (!isOpen) return null;

  const formatCurrency = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValor(formatCurrency(e.target.value));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Preserva o anexo já enviado (caso editando) ou marca um novo upload pendente.
    const attachmentMeta: Pick<Reserva, 'attachmentPath' | 'attachmentName' | '_pendingFile'> = pdfFile
      ? { _pendingFile: pdfFile, attachmentName: pdfFile.name }
      : {
          attachmentPath: editingReserva?.attachmentPath,
          attachmentName: editingReserva?.attachmentName,
        };
    const reserva: Reserva = {
      id: editingReserva?.id || crypto.randomUUID(),
      tipo,
      nome,
      localizacao,
      ...(tipo === 'hospedagem'
        ? { checkInDate, checkInHora, checkInMinuto, checkOutDate, checkOutHora, checkOutMinuto, codigo, valor }
        : { atividadeDate, atividadeHora, atividadeMinuto, valor }
      ),
      ...attachmentMeta,
    };
    setIsLoading(false);
    onAdd(reserva);
    setNome(''); setLocalizacao(''); setCheckInDate(undefined); setCheckOutDate(undefined);
    setAtividadeDate(undefined); setCodigo(''); setValor('');
    setTipo(initialTipo || 'hospedagem');
    setPdfFile(null);
  };

  const handleTimeConfirm = (hora: string, minuto: string) => {
    if (timePickerTarget === 'checkIn') {
      setCheckInHora(hora);
      setCheckInMinuto(minuto);
    } else if (timePickerTarget === 'checkOut') {
      setCheckOutHora(hora);
      setCheckOutMinuto(minuto);
    } else if (timePickerTarget === 'atividade') {
      setAtividadeHora(hora);
      setAtividadeMinuto(minuto);
    }
    setTimePickerTarget(null);
  };

  const getTimePickerInitial = () => {
    if (timePickerTarget === 'checkIn') return { hora: checkInHora, minuto: checkInMinuto };
    if (timePickerTarget === 'checkOut') return { hora: checkOutHora, minuto: checkOutMinuto };
    if (timePickerTarget === 'atividade') return { hora: atividadeHora, minuto: atividadeMinuto };
    return { hora: '14', minuto: '00' };
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary-official transition-colors";
  const timeButtonClass = "px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground flex items-center gap-2 transition-colors hover:border-muted-foreground";
  const { hora: tpHora, minuto: tpMinuto } = getTimePickerInitial();

  const renderPdfUpload = () => (
    <>
      <label className="text-sm font-medium text-foreground mb-1.5 block">
        Comprovante <span className="text-muted-foreground font-normal">(opcional)</span>
      </label>
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPdfFile(file);
        }}
      />
      {pdfFile ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background mb-6">
          <FileUp size={18} className="text-primary-official flex-shrink-0" />
          <span className="text-sm text-foreground truncate flex-1">{pdfFile.name}</span>
          <button type="button" onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }}>
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
      ) : editingReserva?.attachmentName ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background mb-6">
          <FileUp size={18} className="text-primary-official flex-shrink-0" />
          <span className="text-sm text-foreground truncate flex-1">{editingReserva.attachmentName}</span>
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            className="text-xs font-medium text-primary-official"
          >
            Trocar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground hover:border-muted-foreground transition-colors mb-6"
        >
          <FileUp size={16} />
          Anexar PDF
        </button>
      )}
    </>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="px-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">
                {editingReserva ? 'Editar reserva' : `Adicionar ${tipo === 'hospedagem' ? 'Hospedagem' : 'Atividade'}`}
              </h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
                <Icon name="close" size={20} className="text-muted-foreground" />
              </button>
            </div>

            {tipo === 'hospedagem' ? (
              <>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
                <input type="text" placeholder="Ex: Hotel NH Amsterdam" value={nome} onChange={(e) => setNome(e.target.value)} className={cn(inputClass, 'mb-4')} />

                <label className="text-sm font-medium text-foreground mb-1.5 block">Localização</label>
                <div className="relative mb-4">
                  <div className="relative">
                    <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={addressInputRef}
                      type="text"
                      placeholder="Buscar endereço..."
                      value={localizacao}
                      onChange={handleLocalizacaoChange}
                      onFocus={() => addressResults.length > 0 && setShowAddressDropdown(true)}
                      className={cn(inputClass, 'pl-10')}
                    />
                    {isSearching && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {showAddressDropdown && addressResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {addressResults.map((result) => (
                        <button
                          key={result.place_id}
                          type="button"
                          onClick={() => selectAddress(result.display_name)}
                          className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 flex items-start gap-2.5 border-b border-border/50 last:border-b-0 transition-colors"
                        >
                          <Icon name="location_on" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{result.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Check-in</label>
                  <div className="flex gap-2">
                    <Popover open={isCheckInCalendarOpen} onOpenChange={setIsCheckInCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button className={cn("flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm text-left flex items-center gap-2 transition-colors hover:border-muted-foreground", !checkInDate && "text-muted-foreground")}>
                          <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {checkInDate ? format(checkInDate, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[60]" align="start">
                        <Calendar mode="single" selected={checkInDate} onSelect={(date) => { setCheckInDate(date); setIsCheckInCalendarOpen(false); }} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <button onClick={() => setTimePickerTarget('checkIn')} className={timeButtonClass}>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {checkInHora}:{checkInMinuto}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Check-out</label>
                  <div className="flex gap-2">
                    <Popover open={isCheckOutCalendarOpen} onOpenChange={setIsCheckOutCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button className={cn("flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm text-left flex items-center gap-2 transition-colors hover:border-muted-foreground", !checkOutDate && "text-muted-foreground")}>
                          <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {checkOutDate ? format(checkOutDate, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[60]" align="start">
                        <Calendar mode="single" selected={checkOutDate} onSelect={(date) => { setCheckOutDate(date); setIsCheckOutCalendarOpen(false); }} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <button onClick={() => setTimePickerTarget('checkOut')} className={timeButtonClass}>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {checkOutHora}:{checkOutMinuto}
                    </button>
                  </div>
                </div>

                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Valor <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input type="text" inputMode="numeric" placeholder="0,00" value={valor} onChange={handleValorChange} className={cn(inputClass, 'pl-10')} />
                </div>

                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Código de reserva <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input type="text" placeholder="Ex: HTL123" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={cn(inputClass, 'mb-4')} />

                {renderPdfUpload()}
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome da atividade</label>
                <input type="text" placeholder="Ex: Tour de bicicleta" value={nome} onChange={(e) => setNome(e.target.value)} className={cn(inputClass, 'mb-4')} />

                <label className="text-sm font-medium text-foreground mb-1.5 block">Localização</label>
                <div className="relative mb-4">
                  <div className="relative">
                    <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar endereço..."
                      value={localizacao}
                      onChange={handleLocalizacaoChange}
                      onFocus={() => addressResults.length > 0 && setShowAddressDropdown(true)}
                      className={cn(inputClass, 'pl-10')}
                    />
                    {isSearching && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {showAddressDropdown && addressResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {addressResults.map((result) => (
                        <button
                          key={result.place_id}
                          type="button"
                          onClick={() => selectAddress(result.display_name)}
                          className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 flex items-start gap-2.5 border-b border-border/50 last:border-b-0 transition-colors"
                        >
                          <Icon name="location_on" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{result.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Data</label>
                  <Popover open={isAtividadeCalendarOpen} onOpenChange={setIsAtividadeCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn("w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-left flex items-center gap-2 transition-colors hover:border-muted-foreground", !atividadeDate && "text-muted-foreground")}>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {atividadeDate ? format(atividadeDate, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[60]" align="start">
                      <Calendar mode="single" selected={atividadeDate} onSelect={(date) => { setAtividadeDate(date); setIsAtividadeCalendarOpen(false); }} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Horário</label>
                  <button onClick={() => setTimePickerTarget('atividade')} className={cn(timeButtonClass, 'w-full')}>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {atividadeHora}:{atividadeMinuto}
                  </button>
                </div>

                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Valor <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input type="text" inputMode="numeric" placeholder="0,00" value={valor} onChange={handleValorChange} className={cn(inputClass, 'pl-10')} />
                </div>

                {renderPdfUpload()}
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-90"
              style={{ background: '#9DCC36', color: '#1A1C40' }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {editingReserva ? 'Salvando...' : 'Adicionando reserva...'}
                </>
              ) : (
                editingReserva ? 'Salvar' : 'Adicionar'
              )}
            </button>
          </div>
        </div>
      </div>

      <TimePickerSheet
        isOpen={timePickerTarget !== null}
        onClose={() => setTimePickerTarget(null)}
        onConfirm={handleTimeConfirm}
        initialHora={tpHora}
        initialMinuto={tpMinuto}
        label={
          timePickerTarget === 'checkIn' ? 'Horário do check-in'
          : timePickerTarget === 'checkOut' ? 'Horário do check-out'
          : 'Horário'
        }
      />
    </>
  );
}
