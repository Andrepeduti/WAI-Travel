import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon } from '@/components/ui/Icon';
import { Plane, Train, Bus, Car } from 'lucide-react';
import { AddTransporteSheet, Transporte, TransporteTipo } from '@/components/travel/AddTransporteSheet';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { BackButton } from '@/components/ui/BackButton';

const tipoIcons: Record<TransporteTipo, typeof Plane> = {
  voo: Plane,
  trem: Train,
  onibus: Bus,
  carro: Car,
};

const SWIPE_THRESHOLD = 70;

interface TransportesScreenProps {
  onBack: () => void;
  transportes?: Transporte[];
  onTransportesChange?: (transportes: Transporte[]) => void;
  destination?: string;
  startDate?: Date;
  endDate?: Date;
}

export function TransportesScreen({ onBack, transportes: externalTransportes, onTransportesChange, destination, startDate, endDate }: TransportesScreenProps) {
  const [internalTransportes, setInternalTransportes] = useState<Transporte[]>([]);
  const transportes = externalTransportes ?? internalTransportes;
  const setTransportes = (updater: Transporte[] | ((prev: Transporte[]) => Transporte[])) => {
    const newVal = typeof updater === 'function' ? updater(transportes) : updater;
    if (onTransportesChange) onTransportesChange(newVal);
    else setInternalTransportes(newVal);
  };
  const [showSheet, setShowSheet] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState({ title: '', description: '' });
  const [editingTransporte, setEditingTransporte] = useState<Transporte | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const swipeRef = useRef<Record<string, HTMLDivElement | null>>({});

  const handleAdd = (transporte: Transporte) => {
    if (editingTransporte) {
      setTransportes((prev) => prev.map((t) => (t.id === transporte.id ? transporte : t)));
      setToastMsg({ title: 'Transporte atualizado!', description: 'Alterações salvas com sucesso ✨' });
    } else {
      setTransportes((prev) => [...prev, transporte]);
      setToastMsg({ title: 'Transporte adicionado!', description: 'Seu transporte foi salvo com sucesso ✨' });
    }
    setShowSheet(false);
    setEditingTransporte(null);
    setTimeout(() => setShowToast(true), 300);
  };

  const handleEdit = (transporte: Transporte) => {
    setEditingTransporte(transporte);
    setShowSheet(true);
  };

  const handleDelete = (id: string) => {
    setTransportes((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirmId(null);
    setToastMsg({ title: 'Transporte excluído', description: 'O transporte foi removido com sucesso' });
    setTimeout(() => setShowToast(true), 200);
  };

  const handleCloseSheet = () => {
    setShowSheet(false);
    setEditingTransporte(null);
  };

  const formatShortAddress = (full: string) => {
    const parts = full.split(',').map((p) => p.trim());
    if (parts.length <= 2) return full;
    const street = parts[0];
    const city = parts[parts.length - 3] || parts[parts.length - 2];
    return `${street}, ${city}`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return format(date, "dd MMM", { locale: ptBR });
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{ fontFamily: 'var(--font-family-primary)' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-4 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Transportes</h1>
        </div>
      </header>

      {transportes.length === 0 ? (
        <div className="flex-1 flex flex-col" style={{ paddingBottom: destination && startDate && endDate ? '260px' : '120px' }}>
          {/* Empty state centered */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Plane size={30} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground my-0 mt-[24px] mb-2">Nenhum transporte</h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[280px]">
              Adicione seus voos, trens e outros transportes para organizar sua viagem.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-safe-top pb-4 space-y-4" style={{ paddingBottom: destination && startDate && endDate ? '260px' : '120px' }}>
          {transportes.map((t) => {
            const TipoIcon = tipoIcons[t.tipo];
            const routeText = [t.origem, t.destino].filter(Boolean).join(' > ');
            const dateText = t.partidaDate
              ? t.tipo === 'carro' && t.chegadaDate
                ? `${format(t.partidaDate, 'dd/MM', { locale: ptBR })} - ${format(t.chegadaDate, 'dd/MM', { locale: ptBR })}`
                : `${formatDate(t.partidaDate)} às ${t.partidaHora}:${t.partidaMinuto}`
              : '';
            const isOpen = swipedId === t.id;
            return (
              <div key={t.id} className="rounded-2xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="relative overflow-hidden rounded-2xl">
                {/* Swipe actions behind */}
                <div className="absolute right-[-1px] top-0 bottom-0 flex items-stretch z-0">
                  <button
                    onClick={() => { setSwipedId(null); handleEdit(t); }}
                    className="w-[70px] flex flex-col items-center justify-center gap-1"
                    style={{ background: '#3587F2' }}
                  >
                    <Icon name="edit" size={18} style={{ color: '#fff' }} />
                    <span className="text-[11px] font-medium text-white">Editar</span>
                  </button>
                  <button
                    onClick={() => { setSwipedId(null); setDeleteConfirmId(t.id); }}
                    className="w-[70px] flex flex-col items-center justify-center gap-1 bg-destructive"
                  >
                    <Icon name="delete" size={18} style={{ color: '#fff' }} />
                    <span className="text-[11px] font-medium text-white">Excluir</span>
                  </button>
                </div>

                {/* Card content */}
                <div
                  ref={el => { swipeRef.current[t.id] = el; }}
                  className="relative z-10 bg-card rounded-2xl px-4 py-4 transition-transform"
                  style={{
                    transform: isOpen ? 'translateX(-140px)' : 'translateX(0)',
                    transition: 'transform 0.25s ease-out',
                  }}
                  onClick={() => {
                    if (isOpen) {
                      setSwipedId(null);
                    } else {
                      const query = t.codigo || t.nome || '';
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                    }
                  }}
                  onTouchStart={(e) => {
                    touchStartX.current = e.touches[0].clientX;
                    touchCurrentX.current = e.touches[0].clientX;
                  }}
                  onTouchMove={(e) => {
                    touchCurrentX.current = e.touches[0].clientX;
                    const diff = touchStartX.current - touchCurrentX.current;
                    const el = swipeRef.current[t.id];
                    if (el) {
                      const base = isOpen ? 140 : 0;
                      const offset = Math.max(0, Math.min(140, base + diff));
                      el.style.transition = 'none';
                      el.style.transform = `translateX(-${offset}px)`;
                    }
                  }}
                  onTouchEnd={() => {
                    const diff = touchStartX.current - touchCurrentX.current;
                    const el = swipeRef.current[t.id];
                    if (el) el.style.transition = 'transform 0.25s ease-out';

                    if (isOpen) {
                      setSwipedId(diff < -30 ? null : t.id);
                    } else {
                      setSwipedId(diff > SWIPE_THRESHOLD ? t.id : null);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Left icon */}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F3F3F3' }}>
                      <TipoIcon size={20} strokeWidth={1.5} style={{ color: '#1A1C40' }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-foreground truncate">{t.nome || 'Sem nome'}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {routeText && (
                          <span className="text-[13px] text-muted-foreground truncate">{routeText}</span>
                        )}
                        {routeText && dateText && <span className="text-muted-foreground/40">•</span>}
                        {dateText && (
                          <span className="text-[13px] text-muted-foreground whitespace-nowrap">{dateText}</span>
                        )}
                      </div>
                      {t.valor && (
                        <div className="flex items-center mt-1">
                          <span className="text-[13px] font-medium" style={{ color: '#1A1C40' }}>{t.valor}</span>
                        </div>
                      )}
                    </div>

                    {/* External link */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="open_in_new" size={18} style={{ color: '#1A1C40' }} />
                    </div>
                  </div>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fixed bottom: add button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-background">

        {/* Add button */}
        <div className="px-6 pb-8 pt-3 safe-bottom">
          <button
            onClick={() => { setEditingTransporte(null); setShowSheet(true); }}
            className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
            style={{ background: '#9DCC36', color: '#1A1C40' }}
          >
            <Icon name="add" size={20} />
            Adicionar
          </button>
        </div>
      </div>

      <AddTransporteSheet
        isOpen={showSheet}
        onClose={handleCloseSheet}
        onAdd={handleAdd}
        editingTransporte={editingTransporte}
      />

      {/* Delete Confirmation Bottom Sheet */}
      {deleteConfirmId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setDeleteConfirmId(null)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-[110] flex justify-center"
            style={{ fontFamily: 'var(--font-family-primary)' }}
          >
            <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-6">
                <h3 className="text-lg font-bold text-foreground mb-2">Excluir transporte?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Essa ação não pode ser desfeita. O transporte será removido permanentemente.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="w-full py-4 rounded-2xl bg-destructive text-destructive-foreground text-base font-semibold"
                  >
                    Excluir transporte
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
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
