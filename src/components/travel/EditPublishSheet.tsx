import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Map, ChevronRight, ChevronLeft, ImagePlus, Trash2, Camera, FileText, DollarSign, Type, Tags, Power, X, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TRIP_TYPES } from '@/components/screens/FiltersScreen';
import { toast } from 'sonner';
import { loadPlannerData } from '@/lib/plannerApi';
import { DeleteConfirmSheet } from '@/components/travel/DeleteConfirmSheet';
import { UnpublishConfirmSheet } from '@/components/travel/UnpublishConfirmSheet';
import { TAG_CATEGORIES, TAG_LABEL_BY_ID } from '@/data/itineraryTags';


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
  onDelete?: () => void;
}



const formatBRLInput = (digits: string) => {
  if (!digits) return '';
  const num = Number(digits) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatBRLValue = (cents: number | null | undefined) => {
  if (cents === 0) return 'Grátis';
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
  onDelete,
}: EditPublishSheetProps) {
  const [title, setTitle] = useState(initialTitle);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [priceDigits, setPriceDigits] = useState('');
  const [isFreeState, setIsFreeState] = useState(initialPriceCents === 0);
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showTagsSheet, setShowTagsSheet] = useState(false);
  const [showTitleSheet, setShowTitleSheet] = useState(false);
  const [showPriceSheet, setShowPriceSheet] = useState(false);
  const [showDescriptionSheet, setShowDescriptionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activitiesCount, setActivitiesCount] = useState<number | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setCoverUrl(initialCoverUrl);
      setPriceDigits(initialPriceCents ? String(initialPriceCents) : '');
      setIsFreeState(initialPriceCents === 0);
      setDescription(initialDescription);
      setTags(initialTags);
      setShowUnpublishConfirm(false);
      setShowStatusSheet(false);
    }
  }, [open, initialTitle, initialCoverUrl, initialPriceCents, initialDescription, initialTags]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

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
          (sum: number, list) => sum + (Array.isArray(list) ? list.length : 0),
          0,
        );
        setActivitiesCount(total);
      } catch {
        if (!cancelled) setActivitiesCount(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, itineraryId]);

  const isAnySheetOpen = showTitleSheet || showPriceSheet || showDescriptionSheet || showTagsSheet || showStatusSheet || showUnpublishConfirm || showDeleteConfirm;

  const numericPrice = Number(priceDigits || '0') / 100;
  const priceChanged = isFreeState ? initialPriceCents !== 0 : Math.round(numericPrice * 100) !== initialPriceCents;
  const priceValid = (isFreeState ? true : numericPrice > 0) && priceChanged;

  const descriptionChanged = description.trim() !== (initialDescription || '').trim();
  const descriptionValid = description.trim().length >= 20 && descriptionChanged;

  const tagsChanged = JSON.stringify([...tags].sort()) !== JSON.stringify([...initialTags].sort());
  const tagsValid = tags.length >= 1 && tags.length <= 5 && tagsChanged;

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

  const titleChanged = title.trim() !== (initialTitle || '').trim();
  const titleValid = title.trim().length >= 3 && titleChanged;

  const confirmTitle = () => {
    if (!titleValid) return;
    onSave({ title: title.trim() });
    toast.success('Alteração salva');
    setView('summary');
  };

  const confirmPrice = () => {
    if (!priceValid) return;
    onSave({ priceCents: Math.round(numericPrice * 100) });
    toast.success('Alteração salva');
    setShowPriceSheet(false);
  };

  const confirmDescription = () => {
    if (!descriptionValid) return;
    onSave({ description: description.trim() });
    toast.success('Alteração salva');
    setShowDescriptionSheet(false);
  };

  const confirmTags = () => {
    if (!tagsValid) return;
    onSave({ tags });
    toast.success('Alteração salva');
    setShowTagsSheet(false);
  };

  const handleCoverPick = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setCoverUrl(dataUrl);
      onSave({ coverUrl: dataUrl });
      toast.success('Alteração salva');
    };
    reader.readAsDataURL(file);
  };

  const statusLabel = isPaused ? 'Pausado' : 'Ativo';
  const statusColor = isPaused ? 'text-[#E89A2C]' : 'text-[#3FA46A]';

  return (
    <div className="fixed inset-0 z-[210] flex justify-center" style={{ background: '#F3F3F3' }}>
      <div
        className="relative w-full w-full flex flex-col"
        style={{ height: '100dvh', background: '#F3F3F3' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-4 pb-6 flex items-center gap-[24px] shrink-0"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', background: '#F3F3F3' }}
        >
          <button
            onClick={onClose}
            className="w-[21.33px] h-[21.33px] flex items-center justify-center"
            aria-label="Voltar"
          >
            <ChevronLeft size={24} className="text-[#000000]" strokeWidth={1.5} />
          </button>
          <h2 className="font-['Urbanist'] font-bold text-[20px] leading-[24px] text-[#171F2C] flex-1">Editar publicação</h2>
          <div className="w-[21.33px] h-[21.33px]" />
        </div>

        {/* Body */}
        <div className={cn("flex-1 px-4 pb-6 flex flex-col gap-4", isAnySheetOpen ? "overflow-hidden touch-none" : "overflow-y-auto")}>
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

          {/* 1) Capa */}
          <div className="flex flex-col items-start p-4 gap-4 w-full bg-[#FFFFFF] rounded-[16px]">
            <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#171F2C]">
              Capa
            </span>

            <button
              onClick={() => coverInputRef.current?.click()}
              className="relative w-full h-[141px] rounded-[16px] overflow-hidden active:scale-[0.995] transition-transform flex items-center justify-center bg-[#F2F2F2]"
            >
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(357.27deg, rgba(0, 0, 0, 0.6) 34.24%, rgba(102, 102, 102, 0.6) 106.53%)' }} />
                </>
              ) : (
                <div className="absolute inset-0 bg-[#F2F2F2]" />
              )}

              <div className="relative w-[40px] h-[40px] bg-[#FEFEFE] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] rounded-[100px] flex items-center justify-center z-10">
                <Camera size={20} className="text-[#141530]" />
              </div>
            </button>
          </div>

          {/* 3) Informações da publicação + Status */}
          <div className="flex flex-col items-start p-4 gap-6 w-full bg-[#FFFFFF] rounded-[16px]">
            <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#171F2C]">
              Dados do roteiro
            </span>

            <div className="flex flex-col w-full gap-4">
              <SummaryRow
                label="Título"
                value={initialTitle || '—'}
                onClick={() => setShowTitleSheet(true)}
                icon={<Type size={20} className="text-[#141530]" />}
              />
              <hr className="w-full border-t border-[#F2F2F2]" />
              <SummaryRow
                label="Preço"
                value={formatBRLValue(initialPriceCents)}
                onClick={() => setShowPriceSheet(true)}
                icon={<DollarSign size={20} className="text-[#141530]" />}
              />
              <hr className="w-full border-t border-[#F2F2F2]" />
              <SummaryRow
                label="Descrição"
                value={
                  initialDescription
                    ? initialDescription.length > 35
                      ? initialDescription.slice(0, 35) + '…'
                      : initialDescription
                    : '—'
                }
                onClick={() => setShowDescriptionSheet(true)}
                icon={<FileText size={20} className="text-[#141530]" />}
              />
              <hr className="w-full border-t border-[#F2F2F2]" />
              <SummaryRow
                icon={<Target size={24} className="text-[#141530]" strokeWidth={1.5} />}
                label="Perfeito para"
                value={
                  tags.length > 0
                    ? tags.map((id) => TAG_LABEL_BY_ID[id] ?? id).join(' | ')
                    : 'Adicionar opções'
                }
                onClick={() => setShowTagsSheet(true)}
              />
              <hr className="w-full border-t border-[#F2F2F2]" />
              <SummaryRow
                label="Status"
                value={statusLabel}
                onClick={() => setShowStatusSheet(true)}
                icon={<Power size={20} className="text-[#141530]" />}
                tag={isPaused ? { text: 'Pausado', bg: '#E0B400' } : { text: 'Ativo', bg: '#3C8622' }}
              />
            </div>
          </div>

          {/* Excluir roteiro button */}
          {onDelete && (
            <div className="mt-8">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full h-[52px] rounded-2xl flex items-center justify-center font-semibold text-[15px] bg-[#FFEAEA] text-[#FF4B4B] active:scale-[0.99] transition-transform"
              >
                Excluir roteiro
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description Action Sheet */}
      {showDescriptionSheet && (
        <div
          className="absolute inset-0 z-[210] flex items-end justify-center"
          onClick={() => {
            setDescription(initialDescription);
            setShowDescriptionSheet(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30 touch-none" />
          <div
            className="relative w-full max-h-[90dvh] bg-white rounded-t-[24px] flex flex-col"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Block */}
            <div className="flex flex-col items-center pt-4 px-6 pb-3 gap-2 w-full h-[56px] bg-white rounded-t-[24px] shrink-0 relative">
              <div className="w-[44px] h-[4px] bg-[#DEDEDE] rounded-[4px]" />
              <div className="flex flex-row justify-end items-center w-full relative">
                <button
                  onClick={() => {
                    setDescription(initialDescription);
                    setShowDescriptionSheet(false);
                  }}
                  className="absolute right-0 flex items-center justify-center w-4 h-4 text-[#141530]"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Content Block */}
            <div className="flex flex-col items-start px-4 pt-4 pb-[34px] gap-6 w-full flex-1 bg-white overflow-y-auto">
              <div className="flex flex-col items-start gap-6 w-full">
                <div className="flex flex-col items-start gap-2 w-full">
                  <h2 className="font-['Urbanist'] font-semibold text-[24px] leading-[29px] text-[#171F2C]">
                    Alterar descrição
                  </h2>
                  <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
                    Dê uma ideia do que está no roteiro e do que eles podem esperar da viagem.
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 w-full">
                  <div className="flex flex-col items-start p-4 gap-6 w-full h-[181px] bg-field border border-transparent focus-within:border-primary transition-colors rounded-[16px]">
                    <div className="flex flex-col items-start w-full h-full gap-1">
                      <span className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494]">
                        Descrição
                      </span>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                        className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] bg-transparent border-0 p-0 w-full h-full outline-none focus:ring-0 placeholder:text-[#141530]/30 resize-none"
                        placeholder="Conte aos viajantes o que torna esse roteiro especial..."
                      />
                    </div>
                  </div>
                  <span className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#676767]">
                    {description.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* Fixed Button Container */}
            <div className="box-border flex flex-col items-start px-4 py-6 gap-[10px] w-full h-[97px] bg-white shrink-0">
              <button
                onClick={() => {
                  if (!descriptionValid) return;
                  setShowDescriptionSheet(false);
                  onSave({ description: description.trim() });
                  toast.success('Alteração salva');
                }}
                disabled={!descriptionValid}
                className={cn("flex flex-row justify-center items-center py-3 px-4 gap-2 w-full h-12 rounded-[16px] active:scale-[0.99] transition-transform", descriptionValid ? "bg-[#9DCC36] text-[#141530]" : "bg-[#F3F3F3] text-[#A6A6A6] cursor-not-allowed")}
              >
                <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px]">
                  Salvar
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish confirm */}
      <UnpublishConfirmSheet
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={() => {
          setShowUnpublishConfirm(false);
          onUnpublish();
          onClose();
        }}
      />
      {/* Tags Action Sheet */}
      {showTagsSheet && (
        <div
          className="absolute inset-0 z-[210] flex items-end justify-center"
          onClick={() => {
            setTags(initialTags);
            setShowTagsSheet(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30 touch-none" />
          <div
            className="relative w-full max-h-[90dvh] bg-white rounded-t-[24px] flex flex-col"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Block */}
            <div className="flex flex-col items-center pt-4 px-6 pb-3 gap-2 w-full h-[56px] bg-white rounded-t-[24px] shrink-0 relative">
              <div className="w-[44px] h-[4px] bg-[#DEDEDE] rounded-[4px]" />
              <div className="flex flex-row justify-end items-center w-full relative">
                <button
                  onClick={() => {
                    setTags(initialTags);
                    setShowTagsSheet(false);
                  }}
                  className="absolute right-0 flex items-center justify-center w-4 h-4 text-[#141530]"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Content Block */}
            <div className="flex flex-col items-start px-4 pt-4 pb-[34px] gap-6 w-full flex-1 bg-white overflow-y-auto">
              <div className="flex flex-col items-start gap-2 w-full">
                <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C]">
                  Alterar categorias
                </h2>
                <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
                  Escolha até 5 opções que melhor representam a experiência.
                </p>
              </div>

              <div className="flex flex-col items-start gap-6 w-full pb-[40px]">
                {TAG_CATEGORIES.map((cat) => (
                  <div key={cat.title} className="flex flex-col items-start gap-4 w-full">
                    <h3 className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#171F2C]">
                      {cat.title}
                    </h3>
                    <div className="flex flex-row flex-wrap items-start gap-3 w-full">
                      {cat.tags.map((tag) => {
                        const isSelected = tags.includes(tag.id);
                        const disabled = !isSelected && tags.length >= 5;
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            disabled={disabled}
                            className={cn(
                              "box-border flex flex-row items-center px-4 py-2 gap-4 h-10 border rounded-[16px] transition-all shrink-0",
                              isSelected
                                ? "bg-[#141530] text-white border-[#141530]"
                                : "bg-white text-[#141530] border-[#141530]",
                              disabled && "opacity-40 cursor-not-allowed border-[#141530]/20 text-[#141530]/40"
                            )}
                          >
                            <span className="text-[14px] leading-[17px] text-center w-6">{tag.emoji}</span>
                            <span className={cn("font-['Urbanist'] font-medium text-[14px] leading-[17px] text-center", isSelected ? "text-white" : "text-[#141530]")}>{tag.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fixed Button */}
            <div className="flex flex-col items-start p-4 pt-6 gap-[10px] w-full bg-white shrink-0 pb-safe">
              <button
                onClick={() => {
                  setShowTagsSheet(false);
                  onSave({ tags });
                  toast.success('Alteração salva');
                }}
                disabled={!tagsValid}
                className={cn("flex flex-row justify-center items-center py-3 px-4 gap-2 w-full h-12 rounded-[16px] active:scale-[0.99] transition-transform", tagsValid ? "bg-[#9DCC36] text-[#141530]" : "bg-[#F3F3F3] text-[#A6A6A6] cursor-not-allowed")}
              >
                <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px]">
                  Salvar ({tags.length}/5)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Action Sheet */}
      {showPriceSheet && (
        <div
          className="absolute inset-0 z-[210] flex items-end justify-center"
          onClick={() => {
            setPriceDigits(initialPriceCents ? String(initialPriceCents) : '');
            setIsFreeState(initialPriceCents === 0);
            setShowPriceSheet(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30 touch-none" />
          <div
            className="relative w-full max-h-[90dvh] bg-white rounded-t-[24px] flex flex-col"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Block */}
            <div className="flex flex-col items-center pt-4 px-6 pb-3 gap-2 w-full h-[56px] bg-white rounded-t-[24px] shrink-0 relative">
              <div className="w-[44px] h-[4px] bg-[#DEDEDE] rounded-[4px]" />
              <div className="flex flex-row justify-end items-center w-full relative">
                <button
                  onClick={() => {
                    setPriceDigits(initialPriceCents ? String(initialPriceCents) : '');
                    setIsFreeState(initialPriceCents === 0);
                    setShowPriceSheet(false);
                  }}
                  className="absolute right-0 flex items-center justify-center w-4 h-4 text-[#141530]"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Content Block */}
            <div className="flex flex-col items-start px-4 pt-4 pb-[34px] gap-6 w-full flex-1 bg-white overflow-y-auto">
              <div className="flex flex-col items-start gap-6 w-full">
                <h2 className="font-['Urbanist'] font-semibold text-[24px] leading-[28px] text-[#141530]">
                  Alterar preço
                </h2>

                <div className="flex flex-col items-start gap-6 w-full">
                  {/* Chips */}
                  <div className="flex flex-row items-start gap-3 w-full">
                    <button
                      onClick={() => setIsFreeState(false)}
                      className={cn("flex flex-row items-center justify-center py-2 px-4 gap-4 h-[33px] rounded-[16px] transition-colors", !isFreeState ? "bg-[#141530] text-[#FEFEFE]" : "border border-[#141530] text-[#141530] opacity-50")}
                    >
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-center">
                        Cobrar
                      </span>
                    </button>
                    <button
                      onClick={() => setIsFreeState(true)}
                      className={cn("flex flex-row items-center justify-center py-2 px-4 gap-4 h-[33px] rounded-[16px] transition-colors", isFreeState ? "bg-[#141530] text-[#FEFEFE]" : "border border-[#141530] text-[#141530] opacity-50")}
                    >
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-center">
                        Grátis
                      </span>
                    </button>
                  </div>

                  {isFreeState ? (
                    <div className="flex flex-row items-center p-4 gap-3 w-full h-[66px] border border-[#D5D5D5] rounded-[16px]">
                      <Target size={20} className="text-[#141530] shrink-0" />
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#646464]">
                        Seu roteiro ficará disponível gratuitamente na Loja WAI.
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Input Block */}
                      <div className="flex flex-row items-center px-3 gap-3 w-full h-[60px] bg-field border border-transparent focus-within:border-primary transition-colors rounded-[12px]">
                        <DollarSign size={16} className="text-[#141530] shrink-0" />
                        <div className="flex flex-col justify-center items-start flex-1 gap-1">
                          <span className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494]">
                            Preço do roteiro
                          </span>
                          <input
                            value={formatBRLInput(priceDigits)}
                            onChange={(e) => setPriceDigits(e.target.value.replace(/\D/g, ''))}
                            inputMode="numeric"
                            className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] bg-transparent border-0 p-0 w-full outline-none focus:ring-0 placeholder:text-[#141530]/30"
                            placeholder="0,00"
                          />
                        </div>
                      </div>

                      {/* Earnings Summary Block */}
                      {numericPrice > 0 && (
                        <div className="flex flex-col items-start p-4 gap-3 w-full h-[103px] border border-[#D5D5D5] rounded-[16px]">
                          <div className="flex flex-row justify-between items-start w-full">
                            <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#141530]">
                              Você recebe por venda
                            </span>
                            <span className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#141530]">
                              R$ {earning.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <div className="w-full border-t border-[#F2F2F2]" />
                          <div className="flex flex-row items-center gap-2 w-full">
                            <Target size={16} className="text-[#141530] shrink-0" />
                            <span className="font-['Urbanist'] font-medium text-[12px] leading-[14px] text-[#646464]">
                              Nós cobramos 10% de taxa. Você recebe 90% de cada venda.
                            </span>
                          </div>
                        </div>
                      )}
                      {!priceValid && priceDigits.length > 0 && (
                        <p className="mt-1.5 text-[12px] text-[#E5484D]">O valor deve ser maior que zero.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Button Container */}
            <div className="box-border flex flex-col items-start px-4 py-6 gap-[10px] w-full h-[97px] bg-white shrink-0">
              <button
                onClick={() => {
                  if (!priceValid) return;
                  setShowPriceSheet(false);
                  onSave({ priceCents: isFreeState ? 0 : Math.round(numericPrice * 100) });
                  toast.success('Alteração salva');
                }}
                disabled={!priceValid}
                className={cn("flex flex-row justify-center items-center py-3 px-4 gap-2 w-full h-12 rounded-[16px] active:scale-[0.99] transition-transform", priceValid ? "bg-[#9DCC36] text-[#141530]" : "bg-[#F3F3F3] text-[#A6A6A6] cursor-not-allowed")}
              >
                <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px]">
                  Salvar
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Action Sheet */}
      {showTitleSheet && (
        <div
          className="absolute inset-0 z-[210] flex items-end justify-center"
          onClick={() => {
            setTitle(initialTitle);
            setShowTitleSheet(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30 touch-none" />
          <div
            className="relative w-full max-h-[90dvh] bg-white rounded-t-[24px] flex flex-col"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Block */}
            <div className="flex flex-col items-center pt-4 px-6 pb-3 gap-2 w-full h-[56px] bg-white rounded-t-[24px] shrink-0 relative">
              <div className="w-[44px] h-[4px] bg-[#DEDEDE] rounded-[4px]" />
              <div className="flex flex-row justify-end items-center w-full relative">
                <button
                  onClick={() => {
                    setTitle(initialTitle);
                    setShowTitleSheet(false);
                  }}
                  className="absolute right-0 flex items-center justify-center w-4 h-4 text-[#141530]"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Content Block */}
            <div className="flex flex-col items-start px-4 pt-4 pb-[34px] gap-6 w-full flex-1 bg-white overflow-y-auto">
              <div className="flex flex-col items-start gap-6 w-full">
                <div className="flex flex-col items-start gap-2 w-full">
                  <h2 className="font-['Urbanist'] font-semibold text-[24px] leading-[29px] text-[#171F2C]">
                    Alterar Título
                  </h2>
                </div>

                <div className="flex flex-col items-start gap-2 w-full">
                  <div className="flex flex-col items-start p-4 gap-6 w-full h-[81px] bg-field border border-transparent focus-within:border-primary transition-colors rounded-[16px]">
                    <div className="flex flex-col items-start w-full h-full gap-1">
                      <span className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494]">
                        Título da publicação
                      </span>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                        className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] bg-transparent border-0 p-0 w-full outline-none focus:ring-0 placeholder:text-[#141530]/30"
                        placeholder="Nome do seu roteiro maravilhoso..."
                      />
                    </div>
                  </div>
                  <span className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#676767]">
                    {title.length}/60
                  </span>
                </div>
              </div>
            </div>

            {/* Fixed Button Container */}
            <div className="box-border flex flex-col items-start px-4 py-6 gap-[10px] w-full h-[97px] bg-white shrink-0">
              <button
                onClick={() => {
                  if (!titleValid) return;
                  setShowTitleSheet(false);
                  onSave({ title: title.trim() });
                  toast.success('Alteração salva');
                }}
                disabled={!titleValid}
                className={cn("flex flex-row justify-center items-center py-3 px-4 gap-2 w-full h-12 rounded-[16px] active:scale-[0.99] transition-transform", titleValid ? "bg-[#9DCC36] text-[#141530]" : "bg-[#F3F3F3] text-[#A6A6A6] cursor-not-allowed")}
              >
                <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px]">
                  Salvar
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Action Sheet */}
      {showStatusSheet && (
        <StatusSheet
          isPaused={!!isPaused}
          onClose={() => setShowStatusSheet(false)}
          onSave={(nextPaused) => {
            setShowStatusSheet(false);
            if (onTogglePause && nextPaused !== isPaused) {
              onTogglePause(nextPaused);
              toast.success('Alteração salva');
            }
          }}
          onUnpublishClick={() => {
            setShowStatusSheet(false);
            setShowUnpublishConfirm(true);
          }}
        />
      )}

      {/* Delete Confirmation Sheet */}
      {onDelete && (
        <DeleteConfirmSheet
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Excluir roteiro?"
          description="Tem certeza que deseja excluir este roteiro da sua loja? Esta ação não poderá ser desfeita."
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete();
            onClose();
          }}
        />
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onClick,
  icon,
  tag,
}: {
  label: string;
  value: string;
  onClick: () => void;
  icon?: React.ReactNode;
  tag?: { text: string; bg: string };
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between active:opacity-70 transition-opacity"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-[24px] h-[24px] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="flex flex-col items-start justify-center text-left">
          <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
            {label}
          </span>
          {!tag && (
            <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
              {value}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {tag && (
          <span
            className="px-3 py-1 rounded-[9px] font-['Urbanist'] font-medium text-[12px] leading-[14px] text-[#FEFEFE]"
            style={{ backgroundColor: tag.bg, border: `1px solid ${tag.bg}` }}
          >
            {tag.text}
          </span>
        )}
        <div className="w-[20px] h-[20px] flex items-center justify-center">
          <ChevronRight size={20} className="text-[#7F7F7F]" strokeWidth={1.5} />
        </div>
      </div>
    </button>
  );
}

function StatusSheet({
  isPaused,
  onClose,
  onSave,
  onUnpublishClick,
}: {
  isPaused: boolean;
  onClose: () => void;
  onSave: (nextPaused: boolean) => void;
  onUnpublishClick: () => void;
}) {
  const [selected, setSelected] = useState<'ativo' | 'pausado'>(isPaused ? 'pausado' : 'ativo');

  return (
    <div
      className="absolute inset-0 z-[210] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 touch-none" />
      <div
        className="relative w-full max-h-[90dvh] bg-white rounded-t-[24px] flex flex-col"
        style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Block */}
        <div className="flex flex-col items-center pt-4 px-6 pb-3 gap-2 w-full h-[56px] bg-white rounded-t-[24px] shrink-0 relative">
          <div className="w-[44px] h-[4px] bg-[#DEDEDE] rounded-[4px]" />
          <div className="flex flex-row justify-end items-center w-full relative">
            <button
              onClick={onClose}
              className="absolute right-0 flex items-center justify-center w-4 h-4 text-[#141530]"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content Block */}
        <div className="flex flex-col items-start px-4 pt-4 pb-[34px] gap-6 w-full bg-white flex-1 overflow-y-auto">
          <div className="flex flex-col items-start gap-[24px] w-full">
            <h2 className="font-['Urbanist'] font-semibold text-[24px] leading-[29px] text-[#171F2C]">
              Alterar status da publicação
            </h2>

            <div className="flex flex-col items-start gap-[16px] w-full">
              {/* Option Ativo */}
              <button
                onClick={() => setSelected('ativo')}
                className={cn(
                  "box-border flex flex-col items-start p-4 gap-6 w-full h-[81px] rounded-[16px] transition-colors",
                  selected === 'ativo' ? "bg-[#F4FDDF] border border-[#9DCC36]" : "bg-white border border-[#EBEBEB]"
                )}
              >
                <div className="flex flex-row items-center gap-4 w-full h-[49px]">
                  <div className="flex flex-row items-center gap-[13px] flex-1 h-[49px]">
                    <div className="relative w-6 h-6 flex items-center justify-center shrink-0 bg-[#141530] rounded-full">
                      <Target size={14} className="text-white" />
                    </div>
                    <div className="flex flex-col items-start gap-1 flex-1">
                      <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#1A1C40]">
                        Ativo
                      </span>
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#676767] text-left">
                        O roteiro ficará disponível na Loja WAI.
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center justify-center p-[6.4px] w-8 h-8 shrink-0">
                    <div className={cn("w-[19.2px] h-[19.2px] rounded-full transition-colors flex items-center justify-center", selected === 'ativo' ? "bg-[#9DCC36]" : "bg-[#9E9E9E]")}>
                      {selected === 'ativo' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Option Pausado */}
              <button
                onClick={() => setSelected('pausado')}
                className={cn(
                  "box-border flex flex-col items-start p-4 gap-6 w-full h-[81px] rounded-[16px] transition-colors",
                  selected === 'pausado' ? "bg-[#F4FDDF] border border-[#9DCC36]" : "bg-white border border-[#EBEBEB]"
                )}
              >
                <div className="flex flex-row items-center gap-4 w-full h-[49px]">
                  <div className="flex flex-row items-center gap-[13px] flex-1 h-[49px]">
                    <div className="relative w-6 h-6 flex items-center justify-center shrink-0 bg-[#141530] rounded-full">
                      <Target size={14} className="text-white" />
                    </div>
                    <div className="flex flex-col items-start gap-1 flex-1">
                      <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#1A1C40]">
                        Pausado
                      </span>
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#676767] text-left">
                        Ninguém poderá ver e comprar o roteiro.
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center justify-center p-[6.4px] w-8 h-8 shrink-0">
                    <div className={cn("w-[19.2px] h-[19.2px] rounded-full transition-colors flex items-center justify-center", selected === 'pausado' ? "bg-[#9DCC36]" : "bg-[#9E9E9E]")}>
                      {selected === 'pausado' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Unpublish Action */}
            <button
              onClick={onUnpublishClick}
              className="flex flex-row items-center gap-3 mt-4"
            >
              <Trash2 size={20} className="text-[#D00004]" />
              <span className="font-['Urbanist'] font-medium text-[16px] leading-[19px] text-[#D00004]">
                Excluir publicação
              </span>
            </button>
          </div>
        </div>

        {/* Fixed Button Container */}
        <div className="box-border flex flex-col items-start px-4 py-6 gap-[10px] w-full h-[97px] bg-white shrink-0">
          <button
            onClick={() => onSave(selected === 'pausado')}
            disabled={selected === (isPaused ? 'pausado' : 'ativo')}
            className={cn("flex flex-row justify-center items-center py-3 px-4 gap-2 w-full h-12 rounded-[16px] active:scale-[0.99] transition-transform", selected !== (isPaused ? 'pausado' : 'ativo') ? "bg-[#9DCC36] text-[#141530]" : "bg-[#F3F3F3] text-[#A6A6A6] cursor-not-allowed")}
          >
            <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px]">
              Salvar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
