import { useState, useRef, useMemo } from 'react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon } from '@/components/ui/Icon';
import { Plane, Train, Bus, Car, Building2, TicketCheck, FileText, Paperclip } from 'lucide-react';
import { Transporte, TransporteTipo } from '@/components/travel/AddTransporteSheet';
import { Reserva } from '@/components/travel/AddReservaSheet';
import { AddDocumentoSheet } from '@/components/travel/AddDocumentoSheet';
import { DocTypePickerSheet, type DocType } from '@/components/travel/DocTypePickerSheet';
import { DocumentoDetailSheet } from '@/components/travel/DocumentoDetailSheet';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { BackButton } from '@/components/ui/BackButton';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocumentoTipo = 'transporte' | 'hospedagem' | 'ingresso' | 'outro';

interface DocumentoUnified {
  id: string;
  tipo: DocumentoTipo;
  title: string;
  subtitle: string;
  date: Date | undefined;
  dateLabel: string;
  price?: string;
  // (externalUrl removed — viewing happens in-app via DocumentoDetailSheet)
  source: 'transporte' | 'reserva';
  original: Transporte | Reserva;
  attachmentPath?: string;
  attachmentName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const transporteIcons: Record<TransporteTipo, typeof Plane> = {
  voo: Plane,
  trem: Train,
  onibus: Bus,
  carro: Car,
};

function getDocumentoIcon(doc: DocumentoUnified) {
  if (doc.source === 'transporte') {
    const t = doc.original as Transporte;
    const TIcon = transporteIcons[t.tipo];
    return <TIcon size={20} strokeWidth={1.5} style={{ color: '#1A1C40' }} />;
  }
  const r = doc.original as Reserva;
  if (r.tipo === 'hospedagem') {
    return <Building2 size={20} strokeWidth={1.5} style={{ color: '#1A1C40' }} />;
  }
  return <TicketCheck size={20} strokeWidth={1.5} style={{ color: '#1A1C40' }} />;
}

function formatShortAddress(full: string) {
  const parts = full.split(',').map(p => p.trim());
  if (parts.length <= 2) return full;
  return `${parts[0]}, ${parts[parts.length - 3] || parts[parts.length - 2]}`;
}

function getDateLabel(date: Date | undefined): string {
  if (!date) return '';
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd MMM", { locale: ptBR });
}

function unifyDocuments(transportes: Transporte[], reservas: Reserva[]): DocumentoUnified[] {
  const docs: DocumentoUnified[] = [];

  for (const t of transportes) {
    const shortenLocation = (loc: string) => {
      const match = loc.match(/^([A-Z]{2,4})\s*[-–]\s*/);
      return match ? match[1] : loc.split(' - ')[0].split(',')[0].trim();
    };
    const route = [t.origem, t.destino].filter(Boolean).map(shortenLocation).join(' → ');
    const dateTime = t.partidaDate
      ? t.tipo === 'carro' && t.chegadaDate
        ? `${format(t.partidaDate, 'dd/MM', { locale: ptBR })} - ${format(t.chegadaDate, 'dd/MM', { locale: ptBR })}`
        : `${getDateLabel(t.partidaDate)} às ${t.partidaHora}:${t.partidaMinuto}`
      : '';

    docs.push({
      id: `t-${t.id}`,
      tipo: 'transporte',
      title: t.nome || 'Sem nome',
      subtitle: route,
      date: t.partidaDate,
      dateLabel: dateTime,
      price: t.valor,
      source: 'transporte',
      original: t,
      attachmentPath: t.attachmentPath,
      attachmentName: t.attachmentName,
    });
  }

  for (const r of reservas) {
    const isHotel = r.tipo === 'hospedagem';
    const dateTime = isHotel
      ? r.checkInDate
        ? `${getDateLabel(r.checkInDate)}${r.checkOutDate ? ` - ${getDateLabel(r.checkOutDate)}` : ''}`
        : ''
      : r.atividadeDate
        ? `${getDateLabel(r.atividadeDate)} às ${r.atividadeHora}:${r.atividadeMinuto}`
        : '';

    docs.push({
      id: `r-${r.id}`,
      tipo: isHotel ? 'hospedagem' : 'ingresso',
      title: r.nome || 'Sem nome',
      subtitle: r.localizacao ? formatShortAddress(r.localizacao) : '',
      date: isHotel ? r.checkInDate : r.atividadeDate,
      dateLabel: dateTime,
      price: r.valor,
      source: 'reserva',
      original: r,
      attachmentPath: r.attachmentPath,
      attachmentName: r.attachmentName,
    });
  }

  // Sort by date chronologically
  docs.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });

  return docs;
}

// Group documents by date for section headers
function groupByDate(docs: DocumentoUnified[]): { label: string; docs: DocumentoUnified[] }[] {
  const groups: { label: string; docs: DocumentoUnified[] }[] = [];
  let currentLabel = '';

  for (const doc of docs) {
    const label = doc.date ? format(doc.date, "d 'de' MMMM", { locale: ptBR }) : 'Sem data';
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, docs: [doc] });
    } else {
      groups[groups.length - 1].docs.push(doc);
    }
  }

  return groups;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DocumentosScreenProps {
  onBack: () => void;
  transportes: Transporte[];
  onTransportesChange: (t: Transporte[]) => void;
  reservas: Reserva[];
  onReservasChange: (r: Reserva[]) => void;
  splitPeople?: { id: string; initials: string; name: string; color: string; avatar?: string }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 70;

// (removed — type options are now inline in AddDocumentoSheet)

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentosScreen({
  onBack,
  transportes,
  onTransportesChange,
  reservas,
  onReservasChange,
  splitPeople,
}: DocumentosScreenProps) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocType>('transporte');
  const [editingTransporte, setEditingTransporte] = useState<Transporte | null>(null);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState({ title: '', description: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<DocumentoUnified | null>(null);
  const [detailDoc, setDetailDoc] = useState<DocumentoUnified | null>(null);

  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const swipeRef = useRef<Record<string, HTMLDivElement | null>>({});

  const documents = useMemo(() => unifyDocuments(transportes, reservas), [transportes, reservas]);
  const groups = useMemo(() => groupByDate(documents), [documents]);

  const handleAddTransporte = (t: Transporte) => {
    if (editingTransporte) {
      onTransportesChange(transportes.map(x => x.id === t.id ? t : x));
      setToastMsg({ title: 'Documento atualizado!', description: 'Alterações salvas ✨' });
    } else {
      onTransportesChange([...transportes, t]);
      setToastMsg({ title: 'Documento adicionado!', description: 'Seu documento foi salvo ✨' });
    }
    setShowAddSheet(false);
    setEditingTransporte(null);
    setTimeout(() => setShowToast(true), 300);
  };

  const handleAddTransportes = (ts: Transporte[]) => {
    if (ts.length === 0) return;
    onTransportesChange([...transportes, ...ts]);
    setShowAddSheet(false);
    setEditingTransporte(null);
    setToastMsg({
      title: `${ts.length} ${ts.length === 1 ? 'voo adicionado' : 'voos adicionados'}!`,
      description: 'Seus documentos foram salvos ✨',
    });
    setTimeout(() => setShowToast(true), 300);
  };

  const handleAddReserva = (r: Reserva) => {
    if (editingReserva) {
      onReservasChange(reservas.map(x => x.id === r.id ? r : x));
      setToastMsg({ title: 'Documento atualizado!', description: 'Alterações salvas ✨' });
    } else {
      onReservasChange([...reservas, r]);
      setToastMsg({ title: 'Documento adicionado!', description: 'Seu documento foi salvo ✨' });
    }
    setShowAddSheet(false);
    setEditingReserva(null);
    setTimeout(() => setShowToast(true), 300);
  };

  const handleAddReservas = (rs: Reserva[]) => {
    if (rs.length === 0) return;
    onReservasChange([...reservas, ...rs]);
    setShowAddSheet(false);
    setEditingReserva(null);
    const allHotel = rs.every(r => r.tipo === 'hospedagem');
    const allTicket = rs.every(r => r.tipo === 'atividade');
    const title = allHotel
      ? `${rs.length} ${rs.length === 1 ? 'hospedagem adicionada' : 'hospedagens adicionadas'}!`
      : allTicket
        ? `${rs.length} ${rs.length === 1 ? 'ingresso adicionado' : 'ingressos adicionados'}!`
        : `${rs.length} documentos adicionados!`;
    setToastMsg({ title, description: 'Seus documentos foram salvos ✨' });
    setTimeout(() => setShowToast(true), 300);
  };


  // ── Edit / Delete handlers ──
  const handleEdit = (doc: DocumentoUnified) => {
    if (doc.source === 'transporte') {
      setEditingTransporte(doc.original as Transporte);
      setEditingReserva(null);
    } else {
      setEditingReserva(doc.original as Reserva);
      setEditingTransporte(null);
    }
    setShowAddSheet(true);
  };

  const handleDelete = (doc: DocumentoUnified) => {
    // Best-effort: remove o anexo do bucket sem bloquear UX.
    if (doc.attachmentPath) {
      void import('@/lib/itineraryDocsApi').then(({ deleteDocumentAttachment }) =>
        deleteDocumentAttachment(doc.attachmentPath!),
      );
    }
    if (doc.source === 'transporte') {
      onTransportesChange(transportes.filter(t => t.id !== (doc.original as Transporte).id));
    } else {
      onReservasChange(reservas.filter(r => r.id !== (doc.original as Reserva).id));
    }
    setDeleteConfirm(null);
    setToastMsg({ title: 'Documento excluído', description: 'O item foi removido com sucesso' });
    setTimeout(() => setShowToast(true), 200);
  };

  // (attachment now previewed in-app via DocumentoDetailSheet)

  // ── Proximity badge ──
  const getProximityBadge = (doc: DocumentoUnified) => {
    if (!doc.date) return null;
    if (isToday(doc.date)) return { text: 'Hoje', bg: 'hsl(142 71% 45% / 0.12)', color: '#16a34a' };
    if (isTomorrow(doc.date)) return { text: 'Amanhã', bg: 'hsl(38 92% 50% / 0.12)', color: '#d97706' };
    return null;
  };

  // ── Render card ──
  const renderCard = (doc: DocumentoUnified) => {
    const isOpen = swipedId === doc.id;
    const badge = getProximityBadge(doc);

    return (
      <div key={doc.id} className="rounded-2xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="relative overflow-hidden rounded-2xl">
          {/* Swipe actions */}
          <div className="absolute right-[-1px] top-0 bottom-0 flex items-stretch z-0">
            <button
              onClick={() => { setSwipedId(null); handleEdit(doc); }}
              className="w-[70px] flex flex-col items-center justify-center gap-1"
              style={{ background: '#3587F2' }}
            >
              <Icon name="edit" size={18} style={{ color: '#fff' }} />
              <span className="text-[11px] font-medium text-white">Editar</span>
            </button>
            <button
              onClick={() => { setSwipedId(null); setDeleteConfirm(doc); }}
              className="w-[70px] flex flex-col items-center justify-center gap-1 bg-destructive"
            >
              <Icon name="delete" size={18} style={{ color: '#fff' }} />
              <span className="text-[11px] font-medium text-white">Excluir</span>
            </button>
          </div>

          {/* Card content */}
          <div
            ref={el => { swipeRef.current[doc.id] = el; }}
            className="relative z-10 bg-card rounded-2xl px-4 py-4 transition-transform"
            style={{
              transform: isOpen ? 'translateX(-140px)' : 'translateX(0)',
              transition: 'transform 0.25s ease-out',
            }}
            onClick={() => {
              if (isOpen) setSwipedId(null);
              else setDetailDoc(doc);
            }}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
              touchCurrentX.current = e.touches[0].clientX;
            }}
            onTouchMove={(e) => {
              touchCurrentX.current = e.touches[0].clientX;
              const diff = touchStartX.current - touchCurrentX.current;
              const el = swipeRef.current[doc.id];
              if (el) {
                const base = isOpen ? 140 : 0;
                const offset = Math.max(0, Math.min(140, base + diff));
                el.style.transition = 'none';
                el.style.transform = `translateX(-${offset}px)`;
              }
            }}
            onTouchEnd={() => {
              const diff = touchStartX.current - touchCurrentX.current;
              const el = swipeRef.current[doc.id];
              if (el) el.style.transition = 'transform 0.25s ease-out';
              if (isOpen) {
                setSwipedId(diff < -30 ? null : doc.id);
              } else {
                setSwipedId(diff > SWIPE_THRESHOLD ? doc.id : null);
              }
            }}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F3F3F3' }}>
                {getDocumentoIcon(doc)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-foreground truncate">{doc.title}</h3>
                  <span
                    className="text-[10px] font-semibold px-2 h-5 rounded-2xl inline-flex items-center justify-center flex-shrink-0 whitespace-nowrap"
                    style={{ background: '#F2F2F2', color: '#8E8E93' }}
                  >
                    {doc.tipo === 'transporte' ? 'Transporte' : doc.tipo === 'hospedagem' ? 'Hotel' : doc.tipo === 'ingresso' ? 'Atividade' : 'Outro'}
                  </span>
                  {badge && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.text}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                  {doc.subtitle && (
                    <span className="text-[13px] text-muted-foreground truncate flex-shrink">{doc.subtitle}</span>
                  )}
                  {doc.subtitle && doc.dateLabel && <span className="text-muted-foreground/40 flex-shrink-0">•</span>}
                  {doc.dateLabel && (
                    <span className="text-[13px] text-muted-foreground whitespace-nowrap flex-shrink-0">{doc.dateLabel}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {doc.price && (
                    <span className="text-[13px] font-medium" style={{ color: '#1A1C40' }}>{doc.price}</span>
                  )}
                  {doc.attachmentName && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Paperclip size={11} strokeWidth={2} />
                      <span className="truncate max-w-[120px]">{doc.attachmentName}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Right-side affordance: PDF indicator only */}
              {doc.attachmentPath && (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="description" size={18} style={{ color: '#1A1C40' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-4 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Documentos</h1>
        </div>
      </header>

      {documents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
            <FileText size={30} strokeWidth={1.5} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground my-0 mt-[24px] mb-2">Nenhum documento</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[280px]">
            Adicione seus voos, hospedagens, ingressos e outros documentos para organizar sua viagem.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4" style={{ paddingBottom: '120px' }}>
          {groups.map((group, gi) => (
            <div key={gi}>
              {/* Date section header */}
              <div className="flex items-center gap-2 py-3 px-1">
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-3">
                {group.docs.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fixed bottom: add button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-background">
        <div className="px-6 pb-8 pt-3 safe-bottom">
          <button
            onClick={() => { setEditingTransporte(null); setEditingReserva(null); setShowTypePicker(true); }}
            className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
            style={{ background: '#9DCC36', color: '#1A1C40' }}
          >
            <Icon name="add" size={20} />
            Adicionar documento
          </button>
        </div>
      </div>

      {/* Type picker sheet */}
      <DocTypePickerSheet
        isOpen={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        onSelect={(type) => {
          setSelectedDocType(type);
          setShowTypePicker(false);
          setShowAddSheet(true);
        }}
      />

      {/* Unified add/edit sheet */}
      <AddDocumentoSheet
        isOpen={showAddSheet}
        onClose={() => { setShowAddSheet(false); setEditingTransporte(null); setEditingReserva(null); }}
        onAddTransporte={handleAddTransporte}
        onAddTransportes={handleAddTransportes}
        onAddReserva={handleAddReserva}
        onAddReservas={handleAddReservas}
        editingTransporte={editingTransporte}
        editingReserva={editingReserva}
        preSelectedType={selectedDocType}
        splitPeople={splitPeople}
      />

      {/* Detail sheet (in-app preview) */}
      <DocumentoDetailSheet
        item={detailDoc}
        onClose={() => setDetailDoc(null)}
        onEdit={() => { if (detailDoc) { handleEdit(detailDoc); setDetailDoc(null); } }}
        onDelete={() => { if (detailDoc) { setDeleteConfirm(detailDoc); setDetailDoc(null); } }}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setDeleteConfirm(null)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-[110] flex justify-center"
            style={{ fontFamily: 'var(--font-family-primary)' }}
          >
            <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-6">
                <h3 className="text-lg font-bold text-foreground mb-2">Excluir documento?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Essa ação não pode ser desfeita. "{deleteConfirm.title}" será removido permanentemente.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="w-full py-4 rounded-2xl bg-destructive text-destructive-foreground text-base font-semibold"
                  >
                    Excluir documento
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="w-full py-4 rounded-2xl border border-border text-base font-semibold text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <SuccessToast
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        title={toastMsg.title}
        description={toastMsg.description}
      />
    </div>
  );
}
