import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plane, Train, Bus, Car, Building2, TicketCheck, Paperclip } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getDocumentAttachmentUrl } from '@/lib/itineraryDocsApi';
import type { Transporte, TransporteTipo } from './AddTransporteSheet';
import type { Reserva } from './AddReservaSheet';

export interface DocumentoDetailItem {
  source: 'transporte' | 'reserva';
  original: Transporte | Reserva;
  tipo: 'transporte' | 'hospedagem' | 'ingresso' | 'outro';
  title: string;
  attachmentPath?: string;
  attachmentName?: string;
}

interface DocumentoDetailSheetProps {
  item: DocumentoDetailItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const transporteIcons: Record<TransporteTipo, typeof Plane> = {
  voo: Plane, trem: Train, onibus: Bus, carro: Car,
};

function fmtDate(d?: Date) {
  return d ? format(d, "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : '—';
}
function fmtTime(h?: string, m?: string) {
  if (!h && !m) return '—';
  return `${(h || '--').padStart(2, '0')}:${(m || '--').padStart(2, '0')}`;
}
function shortenName(name: string, max = 28) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  return base.length <= max ? name : `${base.slice(0, max)}…${ext}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-border/60 last:border-0">
      <span className="text-[13px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-[14px] font-medium text-foreground text-right break-words min-w-0">
        {value || '—'}
      </span>
    </div>
  );
}

export function DocumentoDetailSheet({ item, onClose, onEdit, onDelete }: DocumentoDetailSheetProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (!item) {
      setPdfUrl(null);
      setShowPdf(false);
    }
  }, [item]);

  if (!item) return null;

  const handleOpenPdf = async () => {
    if (!item.attachmentPath) return;
    setShowPdf(true);
    if (pdfUrl) return;
    setLoadingPdf(true);
    const url = await getDocumentAttachmentUrl(item.attachmentPath);
    setPdfUrl(url);
    setLoadingPdf(false);
  };

  const Icn = (() => {
    if (item.source === 'transporte') {
      const T = transporteIcons[(item.original as Transporte).tipo];
      return <T size={22} strokeWidth={1.6} style={{ color: '#1A1C40' }} />;
    }
    if (item.tipo === 'hospedagem') return <Building2 size={22} strokeWidth={1.6} style={{ color: '#1A1C40' }} />;
    return <TicketCheck size={22} strokeWidth={1.6} style={{ color: '#1A1C40' }} />;
  })();

  const typeLabel = item.tipo === 'transporte' ? 'Transporte' : item.tipo === 'hospedagem' ? 'Hotel' : 'Atividade';

  const renderFields = () => {
    if (item.source === 'transporte') {
      const t = item.original as Transporte;
      return (
        <>
          <Row label="Origem" value={t.origem} />
          <Row label="Destino" value={t.destino} />
          <Row label="Partida" value={`${fmtDate(t.partidaDate)} · ${fmtTime(t.partidaHora, t.partidaMinuto)}`} />
          <Row label="Chegada" value={`${fmtDate(t.chegadaDate)} · ${fmtTime(t.chegadaHora, t.chegadaMinuto)}`} />
          {t.codigo && <Row label="Código" value={t.codigo} />}
          {t.valor && <Row label="Valor" value={t.valor} />}
        </>
      );
    }
    const r = item.original as Reserva;
    if (r.tipo === 'hospedagem') {
      return (
        <>
          <Row label="Local" value={r.localizacao} />
          <Row label="Check-in" value={`${fmtDate(r.checkInDate)} · ${fmtTime(r.checkInHora, r.checkInMinuto)}`} />
          <Row label="Check-out" value={`${fmtDate(r.checkOutDate)} · ${fmtTime(r.checkOutHora, r.checkOutMinuto)}`} />
          {r.codigo && <Row label="Código" value={r.codigo} />}
          {r.valor && <Row label="Valor" value={r.valor} />}
        </>
      );
    }
    return (
      <>
        <Row label="Local" value={r.localizacao} />
        <Row label="Data" value={`${fmtDate(r.atividadeDate)} · ${fmtTime(r.atividadeHora, r.atividadeMinuto)}`} />
        {r.codigo && <Row label="Código" value={r.codigo} />}
        {r.valor && <Row label="Valor" value={r.valor} />}
      </>
    );
  };

  const footer = !showPdf ? (
    <div className="flex gap-3">
      <button
        onClick={onDelete}
        className="flex-1 h-12 rounded-2xl border border-destructive text-destructive text-[14px] font-semibold"
      >
        Excluir
      </button>
      <button
        onClick={onEdit}
        className="flex-1 h-12 rounded-2xl text-[14px] font-semibold"
        style={{ background: '#9DCC36', color: '#1A1C40' }}
      >
        Editar
      </button>
    </div>
  ) : null;

  return (
    <BottomSheet
      open={!!item}
      onClose={onClose}
      title="Detalhes do documento"
      maxHeight="90vh"
      zIndex={100}
      footer={footer}
    >
      {showPdf ? (
        <div className="pb-4">
          <button
            onClick={() => setShowPdf(false)}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground"
          >
            <Icon name="chevron_left" size={18} />
            Voltar aos dados
          </button>
          {loadingPdf || !pdfUrl ? (
            <div className="h-[70vh] flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              title={item.attachmentName || 'Documento'}
              className="w-full h-[70vh] rounded-xl border border-border bg-background"
            />
          )}
        </div>
      ) : (
        <>
          {/* Title block */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F2F2F2' }}>
              {Icn}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-bold text-foreground truncate">{item.title}</h2>
              <span
                className="inline-flex items-center text-[10px] font-semibold px-2 h-5 rounded-2xl mt-0.5"
                style={{ background: '#F2F2F2', color: '#8E8E93' }}
              >
                {typeLabel}
              </span>
            </div>
          </div>

          {/* Fields */}
          <div className="rounded-2xl border border-border/60 px-4 mb-4">
            {renderFields()}
          </div>

          {/* Attachment */}
          {item.attachmentPath && (
            <button
              onClick={handleOpenPdf}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border mb-4 active:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                <Paperclip size={18} strokeWidth={1.7} style={{ color: '#1A1C40' }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[13px] font-semibold text-foreground block truncate">
                  {shortenName(item.attachmentName || 'Anexo.pdf')}
                </span>
                <span className="text-[11px] text-muted-foreground">Ver PDF aqui no app</span>
              </div>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>
          )}
        </>
      )}
    </BottomSheet>
  );
}
