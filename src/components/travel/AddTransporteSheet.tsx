import { useState, useEffect, useRef, useCallback } from 'react';
import { FileUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, Plane, Train, Bus, Car } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePickerSheet } from '@/components/travel/TimePickerSheet';
import { cn } from '@/lib/utils';

export type TransporteTipo = 'voo' | 'trem' | 'onibus' | 'carro';

export interface Transporte {
  id: string;
  tipo: TransporteTipo;
  nome: string;
  origem: string;
  destino: string;
  partidaDate?: Date;
  partidaHora?: string;
  partidaMinuto?: string;
  chegadaDate?: Date;
  chegadaHora?: string;
  chegadaMinuto?: string;
  codigo?: string;
  valor?: string;
  /** Caminho no bucket `itinerary-documents` (após upload). */
  attachmentPath?: string;
  /** Nome original do arquivo, exibido na lista. */
  attachmentName?: string;
  /** Arquivo selecionado mas ainda não enviado — só transita até o save. */
  _pendingFile?: File;
}

interface AddTransporteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transporte: Transporte) => void;
  editingTransporte?: Transporte | null;
}

type TimePickerTarget = 'partida' | 'chegada' | null;

const tipoConfig: Record<TransporteTipo, { label: string; icon: typeof Plane; placeholder: string }> = {
  voo: { label: 'Voo', icon: Plane, placeholder: 'Ex: LATAM 3456' },
  trem: { label: 'Trem', icon: Train, placeholder: 'Ex: Eurostar Paris-London' },
  onibus: { label: 'Ônibus', icon: Bus, placeholder: 'Ex: FlixBus Amsterdam' },
  carro: { label: 'Carro', icon: Car, placeholder: 'Ex: Aluguel Hertz' },
};

export function AddTransporteSheet({ isOpen, onClose, onAdd, editingTransporte }: AddTransporteSheetProps) {
  const [tipo, setTipo] = useState<TransporteTipo>(editingTransporte?.tipo || 'voo');
  const [isLoading, setIsLoading] = useState(false);
  const [nome, setNome] = useState(editingTransporte?.nome || '');
  const [origem, setOrigem] = useState(editingTransporte?.origem || '');
  const [destino, setDestino] = useState(editingTransporte?.destino || '');
  const [partidaDate, setPartidaDate] = useState<Date | undefined>(editingTransporte?.partidaDate);
  const [partidaHora, setPartidaHora] = useState(editingTransporte?.partidaHora || '08');
  const [partidaMinuto, setPartidaMinuto] = useState(editingTransporte?.partidaMinuto || '00');
  const [showChegada, setShowChegada] = useState(!!editingTransporte?.chegadaDate || !!editingTransporte?.chegadaHora);
  const [chegadaDate, setChegadaDate] = useState<Date | undefined>(editingTransporte?.chegadaDate);
  const [chegadaHora, setChegadaHora] = useState(editingTransporte?.chegadaHora || '12');
  const [chegadaMinuto, setChegadaMinuto] = useState(editingTransporte?.chegadaMinuto || '00');
  const [codigo, setCodigo] = useState(editingTransporte?.codigo || '');
  const [valor, setValor] = useState(editingTransporte?.valor || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget>(null);

  // Address search state
  const [searchField, setSearchField] = useState<'origem' | 'destino' | null>(null);
  const [addressResults, setAddressResults] = useState<Array<{ display_name: string; place_id: number }>>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editingTransporte) {
      setTipo(editingTransporte.tipo);
      setNome(editingTransporte.nome || '');
      setOrigem(editingTransporte.origem || '');
      setDestino(editingTransporte.destino || '');
      setPartidaDate(editingTransporte.partidaDate);
      setPartidaHora(editingTransporte.partidaHora || '08');
      setPartidaMinuto(editingTransporte.partidaMinuto || '00');
      setShowChegada(!!editingTransporte.chegadaDate || !!editingTransporte.chegadaHora);
      setChegadaDate(editingTransporte.chegadaDate);
      setChegadaHora(editingTransporte.chegadaHora || '12');
      setChegadaMinuto(editingTransporte.chegadaMinuto || '00');
      setCodigo(editingTransporte.codigo || '');
      setValor(editingTransporte.valor || '');
    } else {
      setTipo('voo');
      setNome('');
      setOrigem('');
      setDestino('');
      setPartidaDate(undefined);
      setPartidaHora('08');
      setPartidaMinuto('00');
      setShowChegada(false);
      setChegadaDate(undefined);
      setChegadaHora('12');
      setChegadaMinuto('00');
      setCodigo('');
      setValor('');
    }
  }, [editingTransporte]);

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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const data = await res.json();
        setAddressResults(data.map((item: any) => ({ display_name: item.display_name, place_id: item.place_id })));
        setShowAddressDropdown(data.length > 0);
      } catch {
        setAddressResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleAddressChange = (field: 'origem' | 'destino', value: string) => {
    if (field === 'origem') setOrigem(value);
    else setDestino(value);
    setSearchField(field);
    searchAddress(value);
  };

  const selectAddress = (address: string) => {
    if (searchField === 'origem') setOrigem(address);
    else setDestino(address);
    setShowAddressDropdown(false);
    setAddressResults([]);
    setSearchField(null);
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
    const attachmentMeta: Pick<Transporte, 'attachmentPath' | 'attachmentName' | '_pendingFile'> = pdfFile
      ? { _pendingFile: pdfFile, attachmentName: pdfFile.name }
      : {
          attachmentPath: editingTransporte?.attachmentPath,
          attachmentName: editingTransporte?.attachmentName,
        };
    const transporte: Transporte = {
      id: editingTransporte?.id || crypto.randomUUID(),
      tipo,
      nome,
      origem,
      destino,
      partidaDate, partidaHora, partidaMinuto,
      chegadaDate, chegadaHora, chegadaMinuto,
      codigo,
      valor,
      ...attachmentMeta,
    };
    setIsLoading(false);
    onAdd(transporte);
    setNome(''); setOrigem(''); setDestino('');
    setPartidaDate(undefined); setChegadaDate(undefined);
    setCodigo(''); setValor(''); setTipo('voo'); setShowChegada(false);
    setPdfFile(null);
  };

  const handleTimeConfirm = (hora: string, minuto: string) => {
    if (timePickerTarget === 'partida') {
      setPartidaHora(hora);
      setPartidaMinuto(minuto);
    } else if (timePickerTarget === 'chegada') {
      setChegadaHora(hora);
      setChegadaMinuto(minuto);
    }
    setTimePickerTarget(null);
  };

  const getTimePickerInitial = () => {
    if (timePickerTarget === 'partida') return { hora: partidaHora, minuto: partidaMinuto };
    if (timePickerTarget === 'chegada') return { hora: chegadaHora, minuto: chegadaMinuto };
    return { hora: '08', minuto: '00' };
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary-official transition-colors";
  const timeButtonClass = "px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground flex items-center gap-2 transition-colors hover:border-muted-foreground";
  const { hora: tpHora, minuto: tpMinuto } = getTimePickerInitial();

  const renderAddressInput = (field: 'origem' | 'destino', label: string, placeholder: string) => (
    <div className="relative mb-4">
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={field === 'origem' ? origem : destino}
          onChange={(e) => handleAddressChange(field, e.target.value)}
          onFocus={() => searchField === field && addressResults.length > 0 && setShowAddressDropdown(true)}
          className={cn(inputClass, 'pl-10')}
        />
        {isSearching && searchField === field && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>
      {showAddressDropdown && searchField === field && addressResults.length > 0 && (
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
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center" style={{ fontFamily: 'var(--font-family-primary)' }}>
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">{editingTransporte ? 'Editar transporte' : 'Novo transporte'}</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
                <Icon name="close" size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Tipo */}
            <label className="text-sm font-medium text-foreground mb-2 block">Tipo</label>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {(Object.keys(tipoConfig) as TransporteTipo[]).map((t) => {
                const config = tipoConfig[t];
                const IconComp = config.icon;
                return (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                      tipo === t ? 'border-primary-official bg-primary-official/10' : 'border-border bg-background'
                    }`}
                  >
                    <IconComp size={20} strokeWidth={1.5} className={tipo === t ? 'text-primary-official' : 'text-muted-foreground'} />
                    <span className={`text-xs font-medium ${tipo === t ? 'text-foreground' : 'text-muted-foreground'}`}>{config.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Nome */}
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
            <input type="text" placeholder={tipoConfig[tipo].placeholder} value={nome} onChange={(e) => setNome(e.target.value)} className={cn(inputClass, 'mb-4')} />

            {/* Origem e Destino */}
            {renderAddressInput('origem', 'Origem', 'Buscar origem...')}
            {renderAddressInput('destino', 'Destino', 'Buscar destino...')}

            {/* Partida */}
            <div className="mb-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Partida</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm text-left flex items-center gap-2 transition-colors hover:border-muted-foreground", !partidaDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {partidaDate ? format(partidaDate, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
                    <Calendar mode="single" selected={partidaDate} onSelect={setPartidaDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <button onClick={() => setTimePickerTarget('partida')} className={timeButtonClass}>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {partidaHora}:{partidaMinuto}
                </button>
              </div>
            </div>

            {/* Chegada (opcional) */}
            {!showChegada ? (
              <button
                type="button"
                onClick={() => setShowChegada(true)}
                className="flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors"
                style={{ color: '#9DCC36' }}
              >
                <Icon name="add" size={16} />
                Adicionar chegada
              </button>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Chegada</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChegada(false);
                      setChegadaDate(undefined);
                      setChegadaHora('12');
                      setChegadaMinuto('00');
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remover
                  </button>
                </div>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn("flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm text-left flex items-center gap-2 transition-colors hover:border-muted-foreground", !chegadaDate && "text-muted-foreground")}>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {chegadaDate ? format(chegadaDate, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[60]" align="start">
                      <Calendar mode="single" selected={chegadaDate} onSelect={setChegadaDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <button onClick={() => setTimePickerTarget('chegada')} className={timeButtonClass}>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {chegadaHora}:{chegadaMinuto}
                  </button>
                </div>
              </div>
            )}

            {/* Valor */}
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Valor <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <input type="text" inputMode="numeric" placeholder="0,00" value={valor} onChange={handleValorChange} className={cn(inputClass, 'pl-10')} />
            </div>


            {/* PDF Upload */}
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
            ) : editingTransporte?.attachmentName ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background mb-6">
                <FileUp size={18} className="text-primary-official flex-shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{editingTransporte.attachmentName}</span>
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
                  {editingTransporte ? 'Salvando...' : 'Adicionando...'}
                </>
              ) : (
                editingTransporte ? 'Salvar' : 'Adicionar'
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
        label={timePickerTarget === 'partida' ? 'Horário de partida' : 'Horário de chegada'}
      />
    </>
  );
}
