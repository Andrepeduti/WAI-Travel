import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plane, Train, Bus, Car, Building2, TicketCheck, FileUp, X, ChevronDown } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePickerSheet } from '@/components/travel/TimePickerSheet';
import { AirportSelect } from '@/components/travel/AirportSelect';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Transporte, TransporteTipo } from './AddTransporteSheet';
import type { Reserva } from './AddReservaSheet';
import type { DocType } from './DocTypePickerSheet';

interface ExtractedFlight {
  airline: string;
  flight_number: string;
  origin_airport: string;
  origin_city: string;
  destination_airport: string;
  destination_city: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  booking_code: string;
  price: string;
}

interface ExtractedHotel {
  name: string;
  address: string;
  check_in_date: string;
  check_in_time: string;
  check_out_date: string;
  check_out_time: string;
  booking_code: string;
  price: string;
}

interface ExtractedTicket {
  name: string;
  location: string;
  date: string;
  time: string;
  booking_code: string;
  price: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const idx = res.indexOf(',');
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const parseISODate = (s: string): Date | undefined => {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const splitTime = (s: string): { h: string; m: string } => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  if (!m) return { h: '10', m: '00' };
  return { h: m[1].padStart(2, '0'), m: m[2] };
};

const flightLabel = (f: ExtractedFlight) => {
  const o = f.origin_airport || f.origin_city || '?';
  const d = f.destination_airport || f.destination_city || '?';
  const date = parseISODate(f.departure_date);
  const dateLabel = date ? format(date, "dd MMM", { locale: ptBR }) : '';
  return `${o} → ${d}${dateLabel ? ` · ${dateLabel} ${f.departure_time}` : ''}`;
};

const hotelLabel = (h: ExtractedHotel) => {
  const ci = parseISODate(h.check_in_date);
  const co = parseISODate(h.check_out_date);
  const range = [ci, co].every(Boolean)
    ? `${format(ci!, "dd MMM", { locale: ptBR })} → ${format(co!, "dd MMM", { locale: ptBR })}`
    : '';
  return `${h.name || 'Hospedagem'}${range ? ` · ${range}` : ''}`;
};

const ticketLabel = (t: ExtractedTicket) => {
  const d = parseISODate(t.date);
  const dateLabel = d ? format(d, "dd MMM", { locale: ptBR }) : '';
  return `${t.name || 'Ingresso'}${dateLabel ? ` · ${dateLabel}${t.time ? ' ' + t.time : ''}` : ''}`;
};

// ─── Types ───────────────────────────────────────────────────────────────────

type TransportSub = 'voo' | 'trem' | 'onibus' | 'carro';

interface HotelSuggestion {
  name: string;
  location: string;
}

export interface SplitPerson {
  id: string;
  initials: string;
  name: string;
  color: string;
  avatar?: string;
}

const fallbackSplitPeople: SplitPerson[] = [
  { id: '1', initials: 'AS', name: 'Ana', color: '#3B82F6' },
  { id: '2', initials: 'BC', name: 'Bruno', color: '#10B981' },
  { id: '3', initials: 'CM', name: 'Carla', color: '#8B5CF6' },
];

const shortenFileName = (name: string, max = 22) => {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  return base.length <= max ? name : `${base.slice(0, max)}…${ext}`;
};

interface AddDocumentoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransporte: (t: Transporte) => void;
  onAddTransportes?: (ts: Transporte[]) => void;
  onAddReserva: (r: Reserva) => void;
  onAddReservas?: (rs: Reserva[]) => void;
  editingTransporte?: Transporte | null;
  editingReserva?: Reserva | null;
  preSelectedType?: DocType;
  splitPeople?: SplitPerson[];
}

const transportSubs: { tipo: TransportSub; label: string; icon: typeof Plane }[] = [
  { tipo: 'voo', label: 'Voo', icon: Plane },
  { tipo: 'trem', label: 'Trem', icon: Train },
  { tipo: 'onibus', label: 'Ônibus', icon: Bus },
  { tipo: 'carro', label: 'Carro', icon: Car },
];

export function AddDocumentoSheet({
  isOpen,
  onClose,
  onAddTransporte,
  onAddTransportes,
  onAddReserva,
  onAddReservas,
  editingTransporte,
  editingReserva,
  preSelectedType,
  splitPeople,
}: AddDocumentoSheetProps) {
  const peopleList: SplitPerson[] = (splitPeople && splitPeople.length > 0) ? splitPeople : fallbackSplitPeople;
  const isEditing = !!(editingTransporte || editingReserva);
  const initialDocType: DocType = editingTransporte
    ? 'transporte'
    : editingReserva?.tipo === 'hospedagem'
      ? 'hospedagem'
      : editingReserva
        ? 'ingresso'
        : preSelectedType || 'transporte';

  const [docType, setDocType] = useState<DocType>(initialDocType);
  const [transportSub, setTransportSub] = useState<TransportSub>(editingTransporte?.tipo || 'voo');

  // Shared fields
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [codigo, setCodigo] = useState('');

  // Transport fields
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [partidaDate, setPartidaDate] = useState<Date | undefined>();
  const [partidaHora, setPartidaHora] = useState('');
  const [partidaMinuto, setPartidaMinuto] = useState('');
  const [showChegada, setShowChegada] = useState(false);
  const [chegadaDate, setChegadaDate] = useState<Date | undefined>();
  const [chegadaHora, setChegadaHora] = useState('');
  const [chegadaMinuto, setChegadaMinuto] = useState('');

  // Hospedagem fields
  const [localizacao, setLocalizacao] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();

  // Ingresso fields
  const [atividadeDate, setAtividadeDate] = useState<Date | undefined>();
  const [atividadeHora, setAtividadeHora] = useState('');
  const [atividadeMinuto, setAtividadeMinuto] = useState('');

  // Split / division
  const [splitType, setSplitType] = useState<'none' | 'equal' | 'custom'>('none');
  const [selectedPeople, setSelectedPeople] = useState<string[]>(peopleList.map(p => p.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [splitOpen, setSplitOpen] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  type PendingItems =
    | { kind: 'transporte'; items: ExtractedFlight[] }
    | { kind: 'hospedagem'; items: ExtractedHotel[] }
    | { kind: 'ingresso'; items: ExtractedTicket[] }
    | null;
  const [pendingItems, setPendingItems] = useState<PendingItems>(null);
  const [selectedItemIdx, setSelectedItemIdx] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time picker
  const [timePickerTarget, setTimePickerTarget] = useState<string | null>(null);

  // Hotel autocomplete (Photon API)
  const [hotelSuggestions, setHotelSuggestions] = useState<HotelSuggestion[]>([]);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const [isSearchingHotels, setIsSearchingHotels] = useState(false);
  const [hotelSelectedFromList, setHotelSelectedFromList] = useState(false);
  const hotelSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchHotels = useCallback((query: string) => {
    if (hotelSearchTimer.current) clearTimeout(hotelSearchTimer.current);
    if (query.trim().length < 2) {
      setHotelSuggestions([]);
      setShowHotelSuggestions(false);
      return;
    }
    setIsSearchingHotels(true);
    setShowHotelSuggestions(true);
    hotelSearchTimer.current = setTimeout(async () => {
      try {
        // Use Photon API with accommodation tag filtering for better fuzzy search
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=pt`;
        const res = await fetch(url);
        const data = await res.json();
        const features = data.features || [];

        const accommodationTypes = new Set([
          'hotel', 'hostel', 'guest_house', 'motel', 'apartment',
          'resort', 'camp_site', 'chalet', 'bed_and_breakfast',
        ]);

        const results: HotelSuggestion[] = [];
        const seen = new Set<string>();

        for (const f of features) {
          const props = f.properties || {};
          const osmValue = props.osm_value || '';
          const osmKey = props.osm_key || '';
          const name = props.name || '';
          const nameLower = name.toLowerCase();

          // Accept if OSM tourism accommodation type, or name contains accommodation keywords
          const isAccommodation =
            (osmKey === 'tourism' && accommodationTypes.has(osmValue)) ||
            (osmKey === 'building' && (osmValue === 'hotel' || osmValue === 'hostel')) ||
            nameLower.includes('hotel') ||
            nameLower.includes('hostel') ||
            nameLower.includes('pousada') ||
            nameLower.includes('resort') ||
            nameLower.includes('inn') ||
            nameLower.includes('motel') ||
            nameLower.includes('airbnb') ||
            nameLower.includes('guest house') ||
            nameLower.includes('b&b');

          if (!isAccommodation || !name) continue;

          const key = nameLower;
          if (seen.has(key)) continue;
          seen.add(key);

          const city = props.city || props.town || props.village || '';
          const country = props.country || '';
          const state = props.state || '';
          const locationParts = [city, state, country].filter(Boolean);
          const location = locationParts.join(', ');

          results.push({ name, location });
          if (results.length >= 6) break;
        }

        setHotelSuggestions(results);
      } catch {
        setHotelSuggestions([]);
      } finally {
        setIsSearchingHotels(false);
      }
    }, 400);
  }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      if (editingTransporte) {
        setDocType('transporte');
        setTransportSub(editingTransporte.tipo);
        setNome(editingTransporte.nome);
        setOrigem(editingTransporte.origem);
        setDestino(editingTransporte.destino);
        setPartidaDate(editingTransporte.partidaDate);
        setPartidaHora(editingTransporte.partidaHora || '');
        setPartidaMinuto(editingTransporte.partidaMinuto || '');
        setShowChegada(!!(editingTransporte.chegadaDate || editingTransporte.chegadaHora || editingTransporte.chegadaMinuto));
        setChegadaDate(editingTransporte.chegadaDate);
        setChegadaHora(editingTransporte.chegadaHora || '');
        setChegadaMinuto(editingTransporte.chegadaMinuto || '');

        setValor(editingTransporte.valor || '');
        setCodigo(editingTransporte.codigo || '');
      } else if (editingReserva) {
        setDocType(editingReserva.tipo === 'hospedagem' ? 'hospedagem' : 'ingresso');
        setNome(editingReserva.nome);
        setLocalizacao(editingReserva.localizacao);
        setCheckInDate(editingReserva.checkInDate);
        setCheckOutDate(editingReserva.checkOutDate);
        setAtividadeDate(editingReserva.atividadeDate);
        setAtividadeHora(editingReserva.atividadeHora || '');
        setAtividadeMinuto(editingReserva.atividadeMinuto || '');
        setValor(editingReserva.valor || '');
        setCodigo(editingReserva.codigo || '');
      } else {
        setDocType(preSelectedType || 'transporte');
        setTransportSub('voo');
        setNome('');
        setOrigem('');
        setDestino('');
        setLocalizacao('');
        setPartidaDate(undefined);
        setPartidaHora('');
        setPartidaMinuto('');
        setShowChegada(false);
        setChegadaDate(undefined);
        setChegadaHora('');
        setChegadaMinuto('');
        setCheckInDate(undefined);
        setCheckOutDate(undefined);
        setAtividadeDate(undefined);
        setAtividadeHora('');
        setAtividadeMinuto('');
        setValor('');
        setCodigo('');
        setPdfFile(null);
        setPendingItems(null);
        setSelectedItemIdx(new Set());
        setHotelSuggestions([]);
        setShowHotelSuggestions(false);
        setHotelSelectedFromList(false);
        setSplitType('none');
        setSelectedPeople(peopleList.map(p => p.id));
        setCustomAmounts({});
        setSplitOpen(false);
      }
    }
  }, [isOpen, editingTransporte, editingReserva, preSelectedType]);

  const applyFlightToForm = (f: ExtractedFlight) => {
    setDocType('transporte');
    setTransportSub('voo');
    const name = [f.airline, f.flight_number].filter(Boolean).join(' ').trim();
    setNome(name);
    setOrigem(f.origin_airport || f.origin_city || '');
    setDestino(f.destination_airport || f.destination_city || '');
    const pd = parseISODate(f.departure_date);
    if (pd) setPartidaDate(pd);
    const pt = splitTime(f.departure_time);
    setPartidaHora(pt.h); setPartidaMinuto(pt.m);
    const cd = parseISODate(f.arrival_date);
    if (cd) setChegadaDate(cd);
    const ct = splitTime(f.arrival_time);
    setChegadaHora(ct.h); setChegadaMinuto(ct.m);
    if (f.booking_code) setCodigo(f.booking_code);
    if (f.price) setValor(f.price);
  };

  const flightToTransporte = (f: ExtractedFlight): Transporte => ({
    id: crypto.randomUUID(),
    tipo: 'voo',
    nome: [f.airline, f.flight_number].filter(Boolean).join(' ').trim(),
    origem: f.origin_airport || f.origin_city || '',
    destino: f.destination_airport || f.destination_city || '',
    partidaDate: parseISODate(f.departure_date),
    partidaHora: splitTime(f.departure_time).h,
    partidaMinuto: splitTime(f.departure_time).m,
    chegadaDate: parseISODate(f.arrival_date),
    chegadaHora: splitTime(f.arrival_time).h,
    chegadaMinuto: splitTime(f.arrival_time).m,
    valor: f.price || undefined,
    codigo: f.booking_code || undefined,
  });

  const applyHotelToForm = (h: ExtractedHotel) => {
    setDocType('hospedagem');
    if (h.name) setNome(h.name);
    if (h.address) setLocalizacao(h.address);
    const ci = parseISODate(h.check_in_date); if (ci) setCheckInDate(ci);
    const co = parseISODate(h.check_out_date); if (co) setCheckOutDate(co);
    if (h.booking_code) setCodigo(h.booking_code);
    if (h.price) setValor(h.price);
  };

  const applyTicketToForm = (t: ExtractedTicket) => {
    setDocType('ingresso');
    if (t.name) setNome(t.name);
    if (t.location) setLocalizacao(t.location);
    const d = parseISODate(t.date); if (d) setAtividadeDate(d);
    if (t.time) {
      const at = splitTime(t.time);
      setAtividadeHora(at.h); setAtividadeMinuto(at.m);
    }
    if (t.booking_code) setCodigo(t.booking_code);
    if (t.price) setValor(t.price);
  };

  const hotelToReserva = (h: ExtractedHotel): Reserva => ({
    id: crypto.randomUUID(),
    tipo: 'hospedagem',
    nome: h.name || '',
    localizacao: h.address || '',
    checkInDate: parseISODate(h.check_in_date),
    checkOutDate: parseISODate(h.check_out_date),
    codigo: h.booking_code || undefined,
    valor: h.price || undefined,
  });

  const ticketToReserva = (t: ExtractedTicket): Reserva => {
    const at = t.time ? splitTime(t.time) : { h: '10', m: '00' };
    return {
      id: crypto.randomUUID(),
      tipo: 'atividade',
      nome: t.name || '',
      localizacao: t.location || '',
      atividadeDate: parseISODate(t.date),
      atividadeHora: at.h,
      atividadeMinuto: at.m,
      codigo: t.booking_code || undefined,
      valor: t.price || undefined,
    };
  };

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setPendingItems(null);
    setIsProcessingPdf(true);
    const currentDocType = docType;
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('extract-document-pdf', {
        body: { pdf: base64, docType: currentDocType },
      });
      if (error) {
        console.error(error);
        toast.error('Não consegui ler este PDF. Preencha manualmente.');
        return;
      }
      const items = data?.items || [];
      if (items.length === 0) {
        toast.error('Nenhum dado encontrado neste PDF.');
        return;
      }
      if (items.length === 1) {
        if (currentDocType === 'transporte') applyFlightToForm(items[0]);
        else if (currentDocType === 'hospedagem') applyHotelToForm(items[0]);
        else applyTicketToForm(items[0]);
        toast.success('Campos preenchidos automaticamente.');
      } else {
        setPendingItems({ kind: currentDocType, items } as PendingItems);
        setSelectedItemIdx(new Set(items.map((_: unknown, i: number) => i)));
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao ler o PDF.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const confirmPendingItems = (onlySelected: boolean) => {
    if (!pendingItems) return;
    const all = pendingItems.items as Array<ExtractedFlight | ExtractedHotel | ExtractedTicket>;
    const picked = onlySelected ? all.filter((_, i) => selectedItemIdx.has(i)) : all;
    if (picked.length === 0) {
      toast.error('Selecione ao menos um item.');
      return;
    }
    if (pendingItems.kind === 'transporte') {
      const transportes = (picked as ExtractedFlight[]).map(flightToTransporte);
      if (onAddTransportes && transportes.length > 1) onAddTransportes(transportes);
      else transportes.forEach(t => onAddTransporte(t));
      toast.success(`${transportes.length} ${transportes.length === 1 ? 'voo adicionado' : 'voos adicionados'}.`);
    } else if (pendingItems.kind === 'hospedagem') {
      const reservas = (picked as ExtractedHotel[]).map(hotelToReserva);
      if (onAddReservas && reservas.length > 1) onAddReservas(reservas);
      else reservas.forEach(r => onAddReserva(r));
      toast.success(`${reservas.length} ${reservas.length === 1 ? 'hospedagem adicionada' : 'hospedagens adicionadas'}.`);
    } else {
      const reservas = (picked as ExtractedTicket[]).map(ticketToReserva);
      if (onAddReservas && reservas.length > 1) onAddReservas(reservas);
      else reservas.forEach(r => onAddReserva(r));
      toast.success(`${reservas.length} ${reservas.length === 1 ? 'ingresso adicionado' : 'ingressos adicionados'}.`);
    }
    setPendingItems(null);
    onClose();
  };



  const handleSave = () => {
    if (docType === 'transporte') {
      const t: Transporte = {
        id: editingTransporte?.id || crypto.randomUUID(),
        tipo: transportSub,
        nome,
        origem,
        destino,
        partidaDate,
        partidaHora,
        partidaMinuto,
        chegadaDate: showChegada ? chegadaDate : undefined,
        chegadaHora: showChegada ? chegadaHora || undefined : undefined,
        chegadaMinuto: showChegada ? chegadaMinuto || undefined : undefined,
        valor: valor || undefined,
        codigo: codigo || undefined,
      };
      onAddTransporte(t);
    } else {
      const r: Reserva = {
        id: editingReserva?.id || crypto.randomUUID(),
        tipo: docType === 'hospedagem' ? 'hospedagem' : 'atividade',
        nome,
        localizacao,
        checkInDate: docType === 'hospedagem' ? checkInDate : undefined,
        checkOutDate: docType === 'hospedagem' ? checkOutDate : undefined,
        atividadeDate: docType === 'ingresso' ? atividadeDate : undefined,
        atividadeHora: docType === 'ingresso' ? atividadeHora : undefined,
        atividadeMinuto: docType === 'ingresso' ? atividadeMinuto : undefined,
        valor: valor || undefined,
        codigo: codigo || undefined,
      };
      onAddReserva(r);
    }
    onClose();
  };

  const canSave = nome.trim().length > 0;

  if (!isOpen) return null;

  const typeLabel = docType === 'transporte' ? 'transporte' : docType === 'hospedagem' ? 'hospedagem' : 'atividade';

  const timePickerValue = (() => {
    if (timePickerTarget === 'partida') return { h: partidaHora, m: partidaMinuto };
    if (timePickerTarget === 'chegada') return { h: chegadaHora, m: chegadaMinuto };
    if (timePickerTarget === 'atividade') return { h: atividadeHora, m: atividadeMinuto };
    return { h: '10', m: '00' };
  })();

  return (
    <>
      <BottomSheet
        open
        onClose={onClose}
        title={isEditing ? 'Editar documento' : `Adicionar ${typeLabel}`}
        maxHeight="90vh"
        zIndex={100}
        bodyClassName="px-5 pb-4"
        footer={
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: canSave ? '#9DCC36' : '#E5E5E5',
              color: canSave ? '#1A1C40' : '#8E8E93',
            }}
          >
            {isEditing ? 'Salvar alterações' : `Adicionar ${typeLabel}`}
          </button>
        }
      >
        <div>
          {/* */}
            {/* PDF Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePdfUpload(f);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-border mb-5 active:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                <FileUp size={18} strokeWidth={1.5} style={{ color: '#1A1C40' }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                {pdfFile ? (
                  <>
                    <span className="text-[13px] font-semibold text-foreground block truncate">{shortenFileName(pdfFile.name)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {isProcessingPdf ? 'Lendo documento...' : 'PDF anexado ✓'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[13px] font-semibold text-foreground block">Importar PDF</span>
                    <span className="text-[11px] text-muted-foreground">Preenche os campos automaticamente</span>
                  </>
                )}
              </div>
              {pdfFile && !isProcessingPdf && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: '#F2F2F2' }}
                >
                  <X size={14} style={{ color: '#8E8E93' }} />
                </button>
              )}
              {isProcessingPdf && (
                <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              )}
            </button>

            {/* Multi-item selector (flights, hotels, tickets) */}
            {pendingItems && pendingItems.items.length > 0 && (
              <div className="mb-5 p-3.5 rounded-2xl border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-foreground">
                    {pendingItems.items.length}{' '}
                    {pendingItems.kind === 'transporte'
                      ? 'trechos detectados'
                      : pendingItems.kind === 'hospedagem'
                        ? 'hospedagens detectadas'
                        : 'ingressos detectados'}
                  </span>
                  {pendingItems.kind === 'transporte' && (
                    <span className="text-[11px] text-muted-foreground">Conexões</span>
                  )}
                </div>
                <div className="space-y-2 mb-3">
                  {pendingItems.items.map((item, i) => {
                    const checked = selectedItemIdx.has(i);
                    let title = '';
                    let subtitle = '';
                    if (pendingItems.kind === 'transporte') {
                      const f = item as ExtractedFlight;
                      title = flightLabel(f);
                      subtitle = [f.airline, f.flight_number].filter(Boolean).join(' ');
                    } else if (pendingItems.kind === 'hospedagem') {
                      const h = item as ExtractedHotel;
                      title = hotelLabel(h);
                      subtitle = h.address || '';
                    } else {
                      const t = item as ExtractedTicket;
                      title = ticketLabel(t);
                      subtitle = t.location || '';
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          const next = new Set(selectedItemIdx);
                          if (checked) next.delete(i); else next.add(i);
                          setSelectedItemIdx(next);
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border text-left"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border",
                          checked ? "bg-primary border-primary" : "border-border bg-background"
                        )}>
                          {checked && <Icon name="check" size={14} className="text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-foreground truncate">{title}</div>
                          {subtitle && (
                            <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmPendingItems(true)}
                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold"
                  >
                    Adicionar selecionados
                  </button>
                  <button
                    onClick={() => { setPendingItems(null); }}
                    className="h-10 px-4 rounded-xl border border-border text-[13px] font-medium text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}



            {/* Transport sub-type */}
            {docType === 'transporte' && (
              <div className="flex gap-2 mb-5">
                {transportSubs.map(ts => {
                  const TsIcon = ts.icon;
                  const active = transportSub === ts.tipo;
                  return (
                    <button
                      key={ts.tipo}
                      onClick={() => setTransportSub(ts.tipo)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium transition-colors",
                        active ? "border-2 border-foreground" : "border border-border"
                      )}
                    >
                      <TsIcon size={14} strokeWidth={1.8} />
                      {ts.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── Fields per type ─── */}
            <div className="space-y-3">
              {/* Name field */}
              <div className="relative">
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                  {docType === 'transporte' ? 'Como deseja chamar este documento?' : docType === 'hospedagem' ? 'Nome da acomodação' : 'Nome do ingresso'}
                </label>
                <div className="relative">
                  <input
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      if (docType === 'hospedagem') {
                        setHotelSelectedFromList(false);
                        searchHotels(e.target.value);
                      }
                    }}
                    onFocus={() => {
                      if (docType === 'hospedagem' && hotelSuggestions.length > 0) {
                        setShowHotelSuggestions(true);
                      }
                    }}
                    placeholder={
                      docType === 'transporte' ? 'Ex: Voo de ida para Paris'
                      : docType === 'hospedagem' ? 'Buscar hotel, hostel, pousada...'
                      : 'Ex: Ingresso Louvre'
                    }
                    className="w-full h-12 rounded-xl border border-border bg-card px-4 pr-10 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {docType === 'hospedagem' && (
                    <Icon name="search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}
                </div>

                {/* Hotel suggestions dropdown */}
                {docType === 'hospedagem' && showHotelSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-[150] mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-[240px] overflow-y-auto">
                    {isSearchingHotels ? (
                      <div className="flex items-center gap-2 px-4 py-3">
                        <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                        <span className="text-[13px] text-muted-foreground">Buscando acomodações...</span>
                      </div>
                    ) : hotelSuggestions.length > 0 ? (
                      hotelSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setNome(s.name);
                            setLocalizacao(s.location);
                            setHotelSelectedFromList(true);
                            setShowHotelSuggestions(false);
                          }}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#F2F2F2' }}>
                            <Building2 size={14} strokeWidth={1.5} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-foreground block truncate">{s.name}</span>
                            {s.location && (
                              <span className="text-[11px] text-muted-foreground block truncate">{s.location}</span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : nome.trim().length >= 2 && !isSearchingHotels ? (
                      <div className="px-4 py-3">
                        <span className="text-[12px] text-muted-foreground block">Nenhum resultado encontrado</span>
                        <span className="text-[11px] text-muted-foreground/70">Continue digitando ou use o nome manualmente</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* ─── Transport-specific fields ─── */}
              {docType === 'transporte' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Origem</label>
                      {transportSub === 'voo' ? (
                        <AirportSelect value={origem} onChange={setOrigem} placeholder="Aeroporto de origem" />
                      ) : (
                        <input
                          value={origem}
                          onChange={(e) => setOrigem(e.target.value)}
                          placeholder="Ex: São Paulo"
                          className="w-full h-12 rounded-xl border border-border bg-card px-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Destino</label>
                      {transportSub === 'voo' ? (
                        <AirportSelect value={destino} onChange={setDestino} placeholder="Aeroporto de destino" />
                      ) : (
                        <input
                          value={destino}
                          onChange={(e) => setDestino(e.target.value)}
                          placeholder="Ex: Paris"
                          className="w-full h-12 rounded-xl border border-border bg-card px-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      )}
                    </div>
                  </div>

                  {/* Ida */}
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Ida</label>
                    <div className="grid grid-cols-2 gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2">
                            <Icon name="calendar_today" size={16} className="text-muted-foreground" />
                            <span className={partidaDate ? 'text-foreground' : 'text-muted-foreground/50'}>
                              {partidaDate ? format(partidaDate, 'dd/MM/yyyy') : 'Data'}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <Calendar mode="single" selected={partidaDate} onSelect={setPartidaDate} locale={ptBR} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <button
                        onClick={() => setTimePickerTarget('partida')}
                        className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2"
                      >
                        <Icon name="schedule" size={16} className="text-muted-foreground" />
                        <span className={partidaHora && partidaMinuto ? 'text-foreground' : 'text-muted-foreground/50'}>
                          {partidaHora && partidaMinuto ? `${partidaHora}:${partidaMinuto}` : 'Horário'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Chegada (opcional) */}
                  {!showChegada ? (
                    <button
                      type="button"
                      onClick={() => setShowChegada(true)}
                      className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
                      style={{ color: '#9DCC36' }}
                    >
                      <Icon name="add" size={16} />
                      Adicionar chegada
                    </button>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[12px] font-semibold text-muted-foreground">Chegada</label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowChegada(false);
                            setChegadaDate(undefined);
                            setChegadaHora('');
                            setChegadaMinuto('');
                          }}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2">
                              <Icon name="calendar_today" size={16} className="text-muted-foreground" />
                              <span className={chegadaDate ? 'text-foreground' : 'text-muted-foreground/50'}>
                                {chegadaDate ? format(chegadaDate, 'dd/MM/yyyy') : 'Data'}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[200]" align="start">
                            <Calendar mode="single" selected={chegadaDate} onSelect={setChegadaDate} locale={ptBR} className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                        <button
                          onClick={() => setTimePickerTarget('chegada')}
                          className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2"
                        >
                          <Icon name="schedule" size={16} className="text-muted-foreground" />
                          <span className={chegadaHora && chegadaMinuto ? 'text-foreground' : 'text-muted-foreground/50'}>
                            {chegadaHora && chegadaMinuto ? `${chegadaHora}:${chegadaMinuto}` : 'Horário'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Código de reserva (opcional) */}
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">
                      Código de reserva <span className="font-normal text-muted-foreground/60">(opcional)</span>
                    </label>
                    <input
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ex: LATAM 3456 / ABC123"
                      className="w-full h-12 rounded-xl border border-border bg-card px-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </>
              )}

              {/* ─── Hospedagem-specific fields ─── */}
              {docType === 'hospedagem' && (
                <>
                  {/* Show location chip if hotel was selected from list */}
                  {hotelSelectedFromList && localizacao && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F2F2F2' }}>
                      <Icon name="location_on" size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-[12px] text-muted-foreground flex-1 truncate">{localizacao}</span>
                      <button
                        onClick={() => { setHotelSelectedFromList(false); setLocalizacao(''); }}
                        className="text-muted-foreground/60"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}


                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Datas</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2">
                          <Icon name="calendar_today" size={16} className="text-muted-foreground" />
                          <span className={(checkInDate || checkOutDate) ? 'text-foreground' : 'text-muted-foreground/50'}>
                            {checkInDate && checkOutDate
                              ? `${format(checkInDate, 'dd/MM/yyyy')} → ${format(checkOutDate, 'dd/MM/yyyy')}`
                              : checkInDate
                                ? `${format(checkInDate, 'dd/MM/yyyy')} → Saída`
                                : 'Check-in → Check-out'}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[200]" align="start">
                        <Calendar
                          mode="range"
                          selected={checkInDate && checkOutDate ? { from: checkInDate, to: checkOutDate } : checkInDate ? { from: checkInDate, to: undefined } : undefined}
                          onSelect={(range) => {
                            setCheckInDate(range?.from || undefined);
                            setCheckOutDate(range?.to || undefined);
                          }}
                          locale={ptBR}
                          numberOfMonths={1}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* ─── Ingresso-specific fields ─── */}
              {docType === 'ingresso' && (
                <>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Local</label>
                    <input
                      value={localizacao}
                      onChange={(e) => setLocalizacao(e.target.value)}
                      placeholder="Ex: Museu do Louvre, Paris"
                      className="w-full h-12 rounded-xl border border-border bg-card px-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Data</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2">
                            <Icon name="calendar_today" size={16} className="text-muted-foreground" />
                            <span className={atividadeDate ? 'text-foreground' : 'text-muted-foreground/50'}>
                              {atividadeDate ? format(atividadeDate, 'dd/MM/yyyy') : 'Selecionar'}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <Calendar mode="single" selected={atividadeDate} onSelect={setAtividadeDate} locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Horário</label>
                      <button
                        onClick={() => setTimePickerTarget('atividade')}
                        className="w-full h-12 rounded-xl border border-border bg-card px-4 text-left text-[14px] flex items-center gap-2"
                      >
                        <Icon name="schedule" size={16} className="text-muted-foreground" />
                        <span className={atividadeHora && atividadeMinuto ? 'text-foreground' : 'text-muted-foreground/50'}>
                          {atividadeHora && atividadeMinuto ? `${atividadeHora}:${atividadeMinuto}` : 'Horário'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Valor - all types */}
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground pointer-events-none">R$</span>
                  <input
                    value={valor.replace(/^R\$\s?/, '')}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (!digits) { setValor(''); return; }
                      const num = parseInt(digits, 10) / 100;
                      const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      setValor(`R$ ${formatted}`);
                    }}
                    placeholder="0,00"
                    inputMode="numeric"
                    className="w-full h-12 rounded-xl border border-border bg-card pl-11 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Dividir entre */}
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Dividir entre</label>
                <button
                  onClick={() => setSplitOpen(!splitOpen)}
                  className="w-full h-12 flex items-center justify-between px-4 rounded-xl border border-border bg-card"
                >
                  <span className={`text-[14px] ${splitType === 'none' ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                    {splitType === 'none'
                      ? 'Não dividir'
                      : splitType === 'equal'
                        ? `${selectedPeople.length} pessoa${selectedPeople.length !== 1 ? 's' : ''} · Igualmente`
                        : `${selectedPeople.length} pessoa${selectedPeople.length !== 1 ? 's' : ''} · Personalizado`}
                  </span>
                  <ChevronDown size={16} className={`text-muted-foreground transition-transform ${splitOpen ? 'rotate-180' : ''}`} />
                </button>

                {splitOpen && (
                  <div className="mt-2 rounded-xl border border-border bg-card p-3 space-y-3 animate-in fade-in duration-200">
                    <div className="flex gap-2">
                      {(['none', 'equal', 'custom'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSplitType(type)}
                          className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-colors border ${
                            splitType === type
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-transparent border-border text-foreground'
                          }`}
                        >
                          {type === 'none' ? 'Não dividir' : type === 'equal' ? 'Igualmente' : 'Personalizado'}
                        </button>
                      ))}
                    </div>

                    {splitType !== 'none' && (
                      <div className="space-y-2">
                        {peopleList.map((person) => {
                          const isSelected = selectedPeople.includes(person.id);
                          const brlValue = valor ? parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0;
                          const equalShare = selectedPeople.length > 0 ? brlValue / selectedPeople.length : 0;

                          return (
                            <div
                              key={person.id}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                                isSelected ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50 border border-transparent'
                              }`}
                              onClick={() =>
                                setSelectedPeople((prev) =>
                                  prev.includes(person.id) ? prev.filter((p) => p !== person.id) : [...prev, person.id]
                                )
                              }
                            >
                              {person.avatar ? (
                                <img src={person.avatar} alt={person.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                  style={{ backgroundColor: person.color }}
                                >
                                  {person.initials}
                                </div>
                              )}
                              <span className="text-[13px] font-medium text-foreground flex-1">{person.name}</span>

                              {isSelected && splitType === 'equal' && brlValue > 0 && (
                                <span className="text-[12px] font-semibold text-foreground">
                                  R$ {equalShare.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}

                              {isSelected && splitType === 'custom' && (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0,00"
                                  value={customAmounts[person.id] || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setCustomAmounts((prev) => ({ ...prev, [person.id]: e.target.value }));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-20 px-2 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                              )}

                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                                }`}
                              >
                                {isSelected && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {selectedPeople.length === 0 && (
                          <p className="text-[11px] text-destructive mt-1.5">Selecione ao menos uma pessoa</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

        </div>
      </BottomSheet>

      {/* Time Picker */}
      {timePickerTarget && (
        <TimePickerSheet
          isOpen
          onClose={() => setTimePickerTarget(null)}
          initialHora={timePickerValue.h}
          initialMinuto={timePickerValue.m}
          onConfirm={(h, m) => {
            if (timePickerTarget === 'partida') {
              setPartidaHora(h);
              setPartidaMinuto(m);
            } else if (timePickerTarget === 'chegada') {
              setChegadaHora(h);
              setChegadaMinuto(m);
            } else if (timePickerTarget === 'atividade') {
              setAtividadeHora(h);
              setAtividadeMinuto(m);
            }
            setTimePickerTarget(null);
          }}
        />
      )}
    </>
  );
}
