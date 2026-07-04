import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon } from '@/components/ui/Icon';
import { TicketCheck } from 'lucide-react';
import { AddReservaSheet, Reserva } from '@/components/travel/AddReservaSheet';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { BackButton } from '@/components/ui/BackButton';

const SWIPE_THRESHOLD = 70;

interface ReservasScreenProps {
  onBack: () => void;
  reservas?: Reserva[];
  onReservasChange?: (reservas: Reserva[]) => void;
}

export function ReservasScreen({ onBack, reservas: externalReservas, onReservasChange }: ReservasScreenProps) {
  const [internalReservas, setInternalReservas] = useState<Reserva[]>([]);
  const reservas = externalReservas ?? internalReservas;
  const setReservas = (updater: Reserva[] | ((prev: Reserva[]) => Reserva[])) => {
    const newVal = typeof updater === 'function' ? updater(reservas) : updater;
    if (onReservasChange) onReservasChange(newVal);
    else setInternalReservas(newVal);
  };
  const [showSheet, setShowSheet] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [initialTipo, setInitialTipo] = useState<'hospedagem' | 'atividade'>('hospedagem');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState({ title: '', description: '' });
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const swipeRef = useRef<Record<string, HTMLDivElement | null>>({});

  const handleAdd = (reserva: Reserva) => {
    if (editingReserva) {
      setReservas((prev) => prev.map((r) => (r.id === reserva.id ? reserva : r)));
      setToastMsg({ title: 'Reserva atualizada!', description: 'Alterações salvas com sucesso ✨' });
    } else {
      setReservas((prev) => [...prev, reserva]);
      setToastMsg({ title: 'Reserva adicionada!', description: 'Sua reserva foi salva com sucesso ✨' });
    }
    setShowSheet(false);
    setEditingReserva(null);
    setTimeout(() => setShowToast(true), 300);
  };

  const handleEdit = (reserva: Reserva) => {
    setEditingReserva(reserva);
    setShowSheet(true);
  };

  const handleDelete = (id: string) => {
    setReservas((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirmId(null);
    setToastMsg({ title: 'Reserva excluída', description: 'A reserva foi removida com sucesso' });
    setTimeout(() => setShowToast(true), 200);
  };

  const handleCloseSheet = () => {
    setShowSheet(false);
    setEditingReserva(null);
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
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Reservas</h1>
        </div>
      </header>

      {reservas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
            <Icon name="calendar_month" size={30} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground my-0 mt-[24px] mb-2">Nenhuma reserva</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[280px]">
            Adicione suas reservas de hotéis, resorts e outros acomodações para organizar sua viagem.
          </p>
        </div>
      ) : (
 <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {reservas.map((r) => {
            const dateText = r.tipo === 'hospedagem'
              ? r.checkInDate
                ? `${formatDate(r.checkInDate)} - ${r.checkOutDate ? formatDate(r.checkOutDate) : ''}`
                : ''
              : r.atividadeDate
                ? `${formatDate(r.atividadeDate)} às ${r.atividadeHora}:${r.atividadeMinuto}`
                : '';
            const isOpen = swipedId === r.id;
            return (
              <div key={r.id} className="rounded-2xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div className="relative overflow-hidden rounded-2xl">
                  {/* Swipe actions behind */}
                  <div className="absolute right-[-1px] top-0 bottom-0 flex items-stretch z-0">
                    <button
                      onClick={() => { setSwipedId(null); handleEdit(r); }}
                      className="w-[70px] flex flex-col items-center justify-center gap-1"
                      style={{ background: '#3587F2' }}
                    >
                      <Icon name="edit" size={18} style={{ color: '#fff' }} />
                      <span className="text-[11px] font-medium text-white">Editar</span>
                    </button>
                    <button
                      onClick={() => { setSwipedId(null); setDeleteConfirmId(r.id); }}
                      className="w-[70px] flex flex-col items-center justify-center gap-1 bg-destructive"
                    >
                      <Icon name="delete" size={18} style={{ color: '#fff' }} />
                      <span className="text-[11px] font-medium text-white">Excluir</span>
                    </button>
                  </div>

                  {/* Card content */}
                  <div
                    ref={el => { swipeRef.current[r.id] = el; }}
                    className="relative z-10 bg-card rounded-2xl px-4 py-4 transition-transform"
                    style={{
                      transform: isOpen ? 'translateX(-140px)' : 'translateX(0)',
                      transition: 'transform 0.25s ease-out',
                    }}
                    onClick={() => {
                      if (isOpen) {
                        setSwipedId(null);
                      }
                    }}
                    onTouchStart={(e) => {
                      touchStartX.current = e.touches[0].clientX;
                      touchCurrentX.current = e.touches[0].clientX;
                    }}
                    onTouchMove={(e) => {
                      touchCurrentX.current = e.touches[0].clientX;
                      const diff = touchStartX.current - touchCurrentX.current;
                      const el = swipeRef.current[r.id];
                      if (el) {
                        const base = isOpen ? 140 : 0;
                        const offset = Math.max(0, Math.min(140, base + diff));
                        el.style.transition = 'none';
                        el.style.transform = `translateX(-${offset}px)`;
                      }
                    }}
                    onTouchEnd={() => {
                      const diff = touchStartX.current - touchCurrentX.current;
                      const el = swipeRef.current[r.id];
                      if (el) el.style.transition = 'transform 0.25s ease-out';

                      if (isOpen) {
                        setSwipedId(diff < -30 ? null : r.id);
                      } else {
                        setSwipedId(diff > SWIPE_THRESHOLD ? r.id : null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Left icon */}
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F3F3F3' }}>
                        {r.tipo === 'hospedagem' ? (
                          <Icon name="hotel" size={20} style={{ color: '#1A1C40' }} />
                        ) : (
                          <TicketCheck size={20} strokeWidth={1.5} style={{ color: '#1A1C40' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-foreground truncate">{r.nome || 'Sem nome'}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {r.localizacao && (
                            <span className="text-[13px] text-muted-foreground truncate">{formatShortAddress(r.localizacao)}</span>
                          )}
                          {r.localizacao && dateText && <span className="text-muted-foreground/40">•</span>}
                          {dateText && (
                            <span className="text-[13px] text-muted-foreground whitespace-nowrap">{dateText}</span>
                          )}
                        </div>
                        {r.valor && (
                          <div className="flex items-center mt-1">
                            <span className="text-[13px] font-medium" style={{ color: '#1A1C40' }}>{r.valor}</span>
                          </div>
                        )}
                      </div>

                      {/* External link */}
                      {r.localizacao && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.localizacao)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="open_in_new" size={18} style={{ color: '#1A1C40' }} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Button */}
      <div className="px-5 pb-8 pt-4 border-t border-border safe-bottom">
        <button
          onClick={() => { setEditingReserva(null); setShowTypeSelector(true); }}
          className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
          style={{ background: '#9DCC36', color: '#1A1C40' }}
        >
          <Icon name="add" size={20} />
          Adicionar reserva
        </button>
      </div>

      {showTypeSelector && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowTypeSelector(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-[110] flex justify-center"
            style={{ fontFamily: 'var(--font-family-primary)' }}
          >
            <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Qual tipo de reserva?</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setInitialTipo('hospedagem'); setShowTypeSelector(false); setShowSheet(true); }}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-border bg-background transition-colors"
                  >
                    <Icon name="hotel" size={24} className="text-foreground" />
                    <span className="text-sm font-medium text-foreground">Hospedagem</span>
                  </button>
                  <button
                    onClick={() => { setInitialTipo('atividade'); setShowTypeSelector(false); setShowSheet(true); }}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-border bg-background transition-colors"
                  >
                    <TicketCheck size={24} strokeWidth={1.5} className="text-foreground" />
                    <span className="text-sm font-medium text-foreground">Atividade</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <AddReservaSheet
        isOpen={showSheet}
        onClose={handleCloseSheet}
        onAdd={handleAdd}
        editingReserva={editingReserva}
        initialTipo={initialTipo}
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
                <h3 className="text-lg font-bold text-foreground mb-2">Excluir reserva?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Essa ação não pode ser desfeita. A reserva será removida permanentemente.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="w-full py-4 rounded-2xl bg-destructive text-destructive-foreground text-base font-semibold"
                  >
                    Excluir reserva
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
