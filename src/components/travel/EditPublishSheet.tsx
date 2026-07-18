import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Map, ChevronRight, ChevronLeft, ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TRIP_TYPES } from '@/components/screens/FiltersScreen';
import { toast } from 'sonner';
import { loadPlannerData } from '@/lib/plannerApi';

interface EditPublishSheetProps {
  open: boolean;
  onClose: () => void;
  itineraryId?: string;
  startDate?: string;
  endDate?: string;
  initialTitle?: string;
  initialCoverUrl?: string;
  initialPriceCents?: number | null;
  initialDescription?: string;
  initialTags?: string[];
  onSave: (patch: {
    title?: string;
    coverUrl?: string;
    priceCents?: number;
    description?: string;
    tags?: string[];
    mainTag?: string;
  }) => void;
  onUnpublish: () => void;
  onEditItinerary?: () => void;
  isPaused?: boolean;
  onTogglePause?: (next: boolean) => void;
  initialMainTag?: string;
}

type View = 'summary' | 'title' | 'price' | 'description' | 'tags';

const formatBRLInput = (digits: string) => {
  if (!digits) return '';
  const num = Number(digits) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatBRLValue = (cents: number | null | undefined) => {
  if (!cents) return '—';
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function diffDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

export function EditPublishSheet({
  open,
  onClose,
  itineraryId,
  startDate,
  endDate,
  initialTitle = '',
  initialCoverUrl = '',
  initialPriceCents,
  initialDescription = '',
  initialTags = [],
  onSave,
  onUnpublish,
  onEditItinerary,
  isPaused = false,
  onTogglePause,
  initialMainTag,
}: EditPublishSheetProps) {
  const [view, setView] = useState<View>('summary');
  const [title, setTitle] = useState(initialTitle);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [priceDigits, setPriceDigits] = useState('');
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [activitiesCount, setActivitiesCount] = useState<number | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setView('summary');
      setTitle(initialTitle);
      setCoverUrl(initialCoverUrl);
      setPriceDigits(initialPriceCents ? String(initialPriceCents) : '');
      setDescription(initialDescription);
      setTags(initialTags);
      setShowUnpublishConfirm(false);
      setShowStatusSheet(false);
    }
  }, [open, initialTitle, initialCoverUrl, initialPriceCents, initialDescription, initialTags]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem('wai-travel-planner-activities');
        if (!raw) {
          if (!cancelled) setActivitiesCount(0);
          return;
        }
        const data = JSON.parse(raw);
        const itinData = data[itineraryId]?.data;
        if (!itinData) {
          if (!cancelled) setActivitiesCount(0);
          return;
        }
        const total = Object.values(itinData as Record<string, any[]>).reduce(
          (sum: number, list) => sum + list.filter((a) => a.type !== 'note').length,
          0,
        );
        setActivitiesCount(total);
      } catch {
        if (!cancelled) setActivitiesCount(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, itineraryId]);

  const numericPrice = Number(priceDigits || '0') / 100;
  const priceValid = numericPrice > 0;
  const descriptionValid = description.trim().length >= 20;
  const tagsValid = tags.length >= 1 && tags.length <= 5;

  const platformFee = numericPrice * 0.1;
  const earning = numericPrice - platformFee;

  const days = useMemo(() => diffDays(startDate, endDate), [startDate, endDate]);

  if (!open) return null;
  const avgPerDay = activitiesCount && days ? (activitiesCount / days).toFixed(1).replace('.0', '') : null;

  const toggleTag = (t: string) => {
    setTags((prev) => {
      if (prev.includes(t)) {
        return prev.filter((x) => x !== t);
      }
      if (prev.length >= 5) return prev;
      return [...prev, t];
    });
  };

  const titleValid = title.trim().length >= 3;

  const confirmTitle = () => {
    if (!titleValid) return;
    onSave({ title: title.trim() });
    toast.success('Título atualizado!');
    setView('summary');
  };

  const confirmPrice = () => {
    if (!priceValid) return;
    onSave({ priceCents: Math.round(numericPrice * 100) });
    toast.success('Preço atualizado!');
    setView('summary');
  };

  const confirmDescription = () => {
    if (!descriptionValid) return;
    onSave({ description: description.trim() });
    toast.success('Descrição atualizada!');
    setView('summary');
  };

  const confirmTags = () => {
    if (!tagsValid) return;
    onSave({ tags });
    toast.success('Tags atualizadas!');
    setView('summary');
  };

  const handleCoverPick = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setCoverUrl(dataUrl);
      onSave({ coverUrl: dataUrl });
      toast.success('Capa atualizada!');
    };
    reader.readAsDataURL(file);
  };

  const statusLabel = isPaused ? 'Pausado' : 'Ativo';
  const statusColor = isPaused ? 'text-[#E89A2C]' : 'text-[#3FA46A]';

  const headerTitle =
    view === 'summary'
      ? 'Editar publicação'
      : view === 'title'
        ? 'Título'
        : view === 'price'
          ? 'Preço'
          : view === 'description'
            ? 'Descrição'
            : 'Tags';

  return (
    <div className="fixed inset-0 z-[210] flex justify-center" style={{ background: '#F2F2F2' }}>
      <div
        className="relative w-full w-full flex flex-col"
        style={{ height: '100dvh', background: '#F2F2F2' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 pb-3 flex items-center justify-between shrink-0"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', background: '#F2F2F2' }}
        >
          <button
            onClick={view === 'summary' ? onClose : () => setView('summary')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-card shadow-sm"
            aria-label="Voltar"
          >
            <ChevronLeft size={20} className="text-foreground" strokeWidth={2.4} />
          </button>
          <h2 className="text-[17px] font-bold text-foreground">{headerTitle}</h2>
          <div className="w-9 h-9" />
        </div>

        {/* Body */}
        {view === 'summary' && (
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {/* Hidden input para capa */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCoverPick(f);
                e.target.value = '';
              }}
            />

            {/* 1) Capa (preview grande) */}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm bg-card active:scale-[0.995] transition-transform"
            >
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[#F2F2F2] flex items-center justify-center">
                  <ImagePlus size={32} className="text-muted-foreground" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white drop-shadow">
                  {coverUrl ? 'Capa do roteiro' : 'Adicionar capa'}
                </span>
                <span className="px-3 h-8 inline-flex items-center rounded-full bg-white text-foreground text-[12px] font-semibold shadow-sm">
                  {coverUrl ? 'Alterar' : 'Adicionar'}
                </span>
              </div>
            </button>




            {/* 3) Informações da publicação + Status */}
            <div className="mt-4 rounded-2xl bg-card divide-y divide-border/50 overflow-hidden shadow-sm">
              <SummaryRow
                label="Título"
                value={initialTitle || '—'}
                onClick={() => setView('title')}
              />
              <SummaryRow
                label="Preço"
                value={formatBRLValue(initialPriceCents)}
                onClick={() => setView('price')}
              />
              <SummaryRow
                label="Descrição"
                value={
                  initialDescription
                    ? initialDescription.length > 60
                      ? initialDescription.slice(0, 60) + '…'
                      : initialDescription
                    : '—'
                }
                onClick={() => setView('description')}
              />
              <SummaryRow
                label="Tags"
                value={
                  initialTags.length > 0
                    ? `${initialTags.length} ${initialTags.length === 1 ? 'tag' : 'tags'}${initialMainTag ? ` · ${initialMainTag}` : ''}`
                    : '—'
                }
                onClick={() => setView('tags')}
              />
              <button
                onClick={() => setShowStatusSheet(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-foreground/5 transition-colors"
              >
                <span className="flex-1 text-[14px] font-semibold text-foreground">Status</span>
                <span className={cn('text-[13px] font-semibold', statusColor)}>{statusLabel}</span>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>
        )}

        {view === 'title' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Título
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Nome do roteiro"
              className="rounded-xl bg-white border-0 text-foreground font-semibold focus-visible:ring-2 focus-visible:ring-[#9DCC36]"
              style={{ fontSize: '16px', height: '52px' }}
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>Mínimo 3 caracteres</span>
              <span>{80 - title.length} restantes</span>
            </div>
          </div>
        )}

        {view === 'price' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Preço (R$)
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 font-semibold text-[15px] pointer-events-none">
                R$
              </div>
              <Input
                value={formatBRLInput(priceDigits)}
                onChange={(e) => setPriceDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="0,00"
                inputMode="numeric"
                className="rounded-xl bg-[#F2F2F2] border-0 pl-11 text-foreground font-semibold focus-visible:ring-2 focus-visible:ring-[#9DCC36]"
                style={{ fontSize: '16px', height: '52px' }}
              />
            </div>
            {numericPrice > 0 && (
              <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                <span>Taxa 10%: R$ {platformFee.toFixed(2).replace('.', ',')}</span>
                <span className="font-semibold text-foreground">Você recebe: R$ {earning.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {!priceValid && priceDigits.length > 0 && (
              <p className="mt-1.5 text-[12px] text-[#E5484D]">O valor deve ser maior que zero.</p>
            )}
          </div>
        )}

        {view === 'description' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Conte aos viajantes o que torna esse roteiro especial..."
              className="rounded-xl bg-white border-0 text-foreground placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-[#9DCC36] resize-none p-4"
              style={{ fontSize: '16px', minHeight: '160px', lineHeight: '1.5' }}
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>Mínimo 20 caracteres</span>
              <span>{500 - description.length} restantes</span>
            </div>
          </div>
        )}

        {view === 'tags' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Tags ({tags.length}/5)
              </label>
              <div className="flex flex-wrap gap-2">
                {TRIP_TYPES.map((tItem) => {
                  const t = tItem.label;
                  const isSelected = tags.includes(t);
                  const disabled = !isSelected && tags.length >= 5;
                  return (
                    <button
                      key={tItem.id}
                      onClick={() => toggleTag(t)}
                      disabled={disabled}
                      className={cn(
                        'px-3.5 h-9 rounded-full text-[12.5px] font-semibold transition-all border flex items-center gap-1.5',
                        isSelected
                          ? 'bg-[#1A1C40] text-white border-[#1A1C40]'
                          : disabled
                            ? 'bg-white text-foreground/30 border-foreground/5 cursor-not-allowed'
                            : 'bg-white text-foreground border-foreground/10'
                      )}
                    >
                      <span>{tItem.emoji}</span>
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Footer (only in edit views) */}
        {view !== 'summary' && (
          <div className="shrink-0 px-5 pb-8 pt-3 border-t border-border/40">
            {(() => {
              const isValid =
                view === 'title'
                  ? titleValid
                  : view === 'price'
                    ? priceValid
                    : view === 'description'
                      ? descriptionValid
                      : tagsValid;
              const onClick =
                view === 'title'
                  ? confirmTitle
                  : view === 'price'
                    ? confirmPrice
                    : view === 'description'
                      ? confirmDescription
                      : confirmTags;
              return (
                <button
                  onClick={onClick}
                  disabled={!isValid}
                  className={cn(
                    'w-full h-12 rounded-2xl font-semibold text-[14px] transition-all',
                    isValid
                      ? 'bg-[#9DCC36] text-[#141530] active:scale-[0.99]'
                      : 'bg-[#E7E7EE] text-[#CACAD0] cursor-not-allowed',
                  )}
                >
                  Salvar
                </button>
              );
            })()}
          </div>
        )}
      </div>

      {/* Unpublish confirm */}
      {showUnpublishConfirm && (
        <div
          className="absolute inset-0 z-10 flex items-end justify-center"
          onClick={() => setShowUnpublishConfirm(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full w-full bg-card rounded-t-2xl"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />
            <div className="px-5 pt-4 pb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F2F2F2] flex items-center justify-center mx-auto mb-4">
                <Globe size={26} className="text-foreground" />
              </div>
              <h3 className="text-[17px] font-bold text-foreground mb-1">Tirar do marketplace?</h3>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                O roteiro voltará a ser privado e não poderá mais ser comprado por outros viajantes.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnpublishConfirm(false)}
                  className="flex-1 py-3.5 rounded-xl border border-border text-[14px] font-semibold text-foreground bg-card"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowUnpublishConfirm(false);
                    onUnpublish();
                    onClose();
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-[#1A1C40] text-white text-[14px] font-semibold"
                >
                  Sim, tirar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Status action sheet */}
      {showStatusSheet && (
        <div
          className="absolute inset-0 z-10 flex items-end justify-center"
          onClick={() => setShowStatusSheet(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full w-full bg-card rounded-t-2xl"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />
            <div className="px-5 pt-3 pb-8">
              <h3 className="text-[15px] font-bold text-foreground mb-4">Status da publicação</h3>
              <StatusSheetBody
                isPaused={!!isPaused}
                onSave={(nextPaused) => {
                  setShowStatusSheet(false);
                  if (onTogglePause && nextPaused !== isPaused) {
                    onTogglePause(nextPaused);
                    toast.success(nextPaused ? 'Venda pausada' : 'Venda retomada');
                  }
                }}
                onUnpublishClick={() => {
                  setShowStatusSheet(false);
                  setShowUnpublishConfirm(true);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-foreground/5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-[14px] font-medium text-foreground truncate mt-0.5">{value}</p>
      </div>
      <ChevronRight size={18} className="text-muted-foreground shrink-0" />
    </button>
  );
}

function StatusSheetBody({
  isPaused,
  onSave,
  onUnpublishClick,
}: {
  isPaused: boolean;
  onSave: (nextPaused: boolean) => void;
  onUnpublishClick: () => void;
}) {
  const [selected, setSelected] = useState<'ativa' | 'pausada'>(isPaused ? 'pausada' : 'ativa');
  const NAVY = '#1A1C40';

  const Option = ({ value, label }: { value: 'ativa' | 'pausada'; label: string }) => {
    const checked = selected === value;
    return (
      <button
        type="button"
        onClick={() => setSelected(value)}
        className="w-full flex items-center gap-3 py-3.5 active:opacity-70 transition-opacity"
      >
        <span
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: NAVY }}
        >
          {checked && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NAVY }} />}
        </span>
        <span className="text-[14px] font-semibold" style={{ color: NAVY }}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col">
      <Option value="ativa" label="Ativa" />
      <Option value="pausada" label="Pausada" />

      <button
        type="button"
        onClick={onUnpublishClick}
        className="w-full flex items-center gap-3 py-3.5 mt-1 active:opacity-70 transition-opacity"
      >
        <Trash2 size={18} style={{ color: NAVY }} className="shrink-0" />
        <span className="text-[14px] font-semibold" style={{ color: NAVY }}>
          Excluir publicação
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSave(selected === 'pausada')}
        className="w-full h-12 rounded-2xl font-semibold text-[14px] mt-4 active:scale-[0.99] transition-transform"
        style={{ background: '#9DCC36', color: '#141530' }}
      >
        Salvar
      </button>
    </div>
  );
}
