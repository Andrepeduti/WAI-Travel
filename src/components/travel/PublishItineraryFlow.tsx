import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, DollarSign, TrendingUp, Star, ShieldCheck, Sparkles, Users, Check, Copy, Loader2, HelpCircle, Flower, Calendar, Info, MapPin, CalendarDays, Ticket, Target, Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface PublishItineraryResult {
  name?: string;
  price: number;
  description: string;
  tags: string[];
  seasons: string[];
  mainTag?: string;
  dateType?: 'FLEXIBLE' | 'SPECIFIC';
  duration?: number;
  month?: string;
  startDate?: Date;
  endDate?: Date;
}

interface PublishItineraryFlowProps {
  open: boolean;
  tripName?: string;
  coverImage?: string;
  totalDays?: number;
  totalActivities?: number;
  totalCities?: number;
  initialDescription?: string;
  initialTags?: string[];
  initialSeasons?: string[];
  onClose: () => void;
  onPublished?: (result: PublishItineraryResult) => void | Promise<void>;
  onNavigateToSales?: () => void;
  onNavigateToFAQ?: () => void;
  startDate?: Date;
  endDate?: Date;
  initialMainTag?: string;
  destinations?: string[];
  isFlexible?: boolean;
  durationDays?: number;
}



export const SEASONS_OPTIONS = [
  { id: 'verao', label: 'Verão', emoji: '☀️' },
  { id: 'inverno', label: 'Inverno', emoji: '❄️' },
  { id: 'primavera', label: 'Primavera', emoji: '🌸' },
  { id: 'outono', label: 'Outono', emoji: '🍂' },
  { id: 'qualquer', label: 'O ano todo', emoji: '📅' },
];
import { Icon } from '@/components/ui/Icon';

const TOTAL_QUESTION_STEPS = 5; // Price, Description, Season, Tags, Review

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-500',
            i === current ? 'w-5 bg-[#0A0A0A]' : 'w-1.5 bg-[#0A0A0A]/20'
          )}
        />
      ))}
    </div>
  );
}

export function PublishBreadcrumb({ step }: { step: number }) {
  if (step <= 0) return null;
  return (
    <div className="flex items-center gap-[12px] mb-[34px]">
      <span className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#646464]">
        {step} de 5
      </span>
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-[6px] rounded-full transition-all duration-500',
              i < step - 1
                ? 'w-[6px] bg-[#9DCC36]'
                : i === step - 1
                  ? 'w-8 bg-[#141530]'
                  : 'w-[6px] bg-[#B6B6B6]'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function PublishItineraryFlow({
  open,
  tripName,
  coverImage,
  totalDays,
  totalActivities,
  totalCities,
  initialDescription = '',
  initialTags = [],
  initialSeasons = [],
  onClose,
  onPublished,
  onNavigateToSales,
  onNavigateToFAQ,
  startDate,
  endDate,
  initialMainTag,
  destinations,
  isFlexible,
  durationDays,
}: PublishItineraryFlowProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(tripName || '');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const initialDateType = isFlexible ? 'FLEXIBLE' : (startDate && endDate ? 'SPECIFIC' : 'FLEXIBLE');
  const initialDuration = isFlexible && durationDays ? durationDays.toString() : (totalDays ? totalDays.toString() : '');
  const initialMonth = (startDate && !endDate && startDate instanceof Date)
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][startDate.getMonth()]
    : '';

  const [seasons, setSeasons] = useState<string[]>(initialSeasons);
  const [dateType, setDateType] = useState<'FLEXIBLE' | 'SPECIFIC'>(initialDateType);
  const [duration, setDuration] = useState(initialDuration);
  const [month, setMonth] = useState(initialMonth);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isReviewingTerms, setIsReviewingTerms] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [startDateState, setStartDateState] = useState<Date | undefined>(isFlexible ? undefined : startDate);
  const [endDateState, setEndDateState] = useState<Date | undefined>(isFlexible ? undefined : endDate);

  useEffect(() => {
    if (!open) {
      setKeyboardHeight(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = typeof window !== 'undefined' ? window.innerHeight - vv.height : 0;
      setKeyboardHeight(offset > 80 ? offset : 0);
    };
    onResize();
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const qs = document.querySelector('#root') as HTMLElement | null;
      const originalRootPos = qs ? qs.style.position : '';
      const originalRootOvf = qs ? qs.style.overflow : '';
      const originalRootH = qs ? qs.style.height : '';
      const originalRootW = qs ? qs.style.width : '';

      if (qs) {
        qs.style.position = 'fixed';
        qs.style.overflow = 'hidden';
        qs.style.height = '100vh'; // Stops Safari from resizing root
        qs.style.width = '100%';
      }

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        if (qs) {
          qs.style.position = originalRootPos;
          qs.style.overflow = originalRootOvf;
          qs.style.height = originalRootH;
          qs.style.width = originalRootW;
        }
      };
    }
  }, [open]);

  if (!open) return null;

  if (showFAQ) {
    return (
      <div className="fixed inset-0 z-[220] bg-background w-full h-full overflow-y-auto pb-safe">
        <HelpCenterScreen onBack={() => setShowFAQ(false)} hideTourGuide={true} />
      </div>
    );
  }

  const numericPrice = isFree ? 0 : Number(price.replace(/\D/g, '')) / 100;
  const platformFee = numericPrice * 0.10;
  const earning = numericPrice - platformFee;

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatPriceInput = (v: string) => {
    const digits = v.replace(/\D/g, '');
    if (!digits) return '';
    const num = Number(digits) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const priceValid = isFree || numericPrice > 0;
  const priceError = isFree
    ? null
    : touched && price.length > 0 && !priceValid
      ? 'O valor deve ser maior que zero.'
      : touched && price.length === 0
        ? 'Defina um preço para o seu roteiro.'
        : null;

  const nameValid = name.trim().length >= 3;
  const descriptionValid = description.trim().length > 0;
  const infoValid = nameValid && descriptionValid;

  const tagsValid = tags.length >= 1 && tags.length <= 5;
  const seasonValid = seasons.length > 0 &&
    (dateType === 'SPECIFIC' ? (startDateState !== undefined && endDateState !== undefined) : duration.trim().length > 0);

  const LAST_STEP = 5;

  const formatDateRange = () => {
    if (!startDateState) return '';
    if (startDateState && endDateState) {
      if (startDateState.getTime() === endDateState.getTime()) {
        return format(startDateState, "dd 'de' MMM", { locale: ptBR });
      }
      return `${format(startDateState, "dd 'de' MMM", { locale: ptBR })} - ${format(endDateState, "dd 'de' MMM", { locale: ptBR })}`;
    }
    return format(startDateState, "dd 'de' MMM", { locale: ptBR });
  };

  const next = async () => {
    if (step === 0 && isReviewingTerms) {
      setIsReviewingTerms(false);
      setStep(5);
      return;
    }
    if (step < LAST_STEP) {
      setStep((s) => s + 1);
    } else {
      setIsPublishing(true);
      try {
        await onPublished?.({
          name: name.trim(),
          price: numericPrice,
          description: description.trim(),
          tags: Array.from(new Set(tags.filter(t => t !== ''))),
          seasons: seasons,
          dateType,
          duration: dateType === 'FLEXIBLE' && duration ? Number(duration) : undefined,
          month: dateType === 'FLEXIBLE' ? month : undefined,
          startDate: dateType === 'SPECIFIC' ? startDateState : undefined,
          endDate: dateType === 'SPECIFIC' ? endDateState : undefined,
        });
        handleClose();
        onNavigateToSales?.();
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const back = () => {
    if (step === 0 && isReviewingTerms) {
      setIsReviewingTerms(false);
      return;
    }
    if (step <= 0) {
      handleClose();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(0);
      setName(tripName || '');
      setPrice('');
      setIsFree(false);
      setTouched(false);
      setDescription(initialDescription);
      setSeasons([]);
      setDateType(initialDateType);
      setDuration(initialDuration);
      setMonth(initialMonth);
      setTags(initialTags);
      setStartDateState(startDate);
      setEndDateState(endDate);
      setIsReviewingTerms(false);
      setShowFAQ(false);
    }, 300);
  };

  const toggleTag = (t: string) => {
    setTags((prev) => {
      const displayLen = prev.filter(x => x !== '_FLEXIBLE_DATES_').length;
      if (prev.includes(t)) {
        return prev.filter((x) => x !== t);
      }
      if (displayLen >= 5) return prev;
      return [...prev, t];
    });
  };

  const displayTags = tags.filter((t) => t !== '_FLEXIBLE_DATES_');
  const tagsValidCheck = displayTags.length >= 1 && displayTags.length <= 5;

  const canAdvance =
    step === 1 ? infoValid :
      step === 2 ? tagsValid :
        step === 3 ? seasonValid :
          step === 4 ? priceValid :
            true;

  return (
    <div className={cn("fixed inset-0 z-[200]", step <= 4 ? "bg-white" : "bg-[#F3F3F3]")}>
      <div
        className="absolute inset-x-0 top-0 flex flex-col overflow-hidden font-sans mx-auto transition-all duration-75 ease-out"
        style={{ bottom: keyboardHeight }}
      >
        {/* Top bar — only back button */}
        <div
          className={cn("absolute top-0 left-0 right-0 z-30 pb-8", step <= 4 ? "bg-white" : "bg-[#F3F3F3]")}
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)))' }}
        >
          <div className="px-4">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={back}
                className="rounded-full flex items-center justify-center transition-all text-[#0A0A0A] shrink-0 w-10 h-10 -ml-2 bg-transparent active:opacity-70"
                aria-label="Voltar"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                onClick={() => setShowFAQ(true)}
                className="rounded-full flex items-center justify-center transition-all text-[#0A0A0A] shrink-0 w-10 h-10 -mr-2 bg-transparent active:opacity-70"
                aria-label="Ajuda"
              >
                <HelpCircle size={24} />
              </button>
            </div>

            {/* Global Breadcrumb removed from header */}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 0 && <HowItWorksScreen key="how" onNext={next} onBack={back} onFAQ={() => setShowFAQ(true)} />}
            {step === 1 && (
              <InfoScreen
                key="info"
                name={name}
                onNameChange={setName}
                description={description}
                onDescriptionChange={setDescription}
                onNext={next}
                canAdvance={canAdvance}
              />
            )}
            {step === 2 && (
              <TagsScreen
                key="tags"
                selected={displayTags}
                onToggle={toggleTag}
                onNext={next}
                canAdvance={canAdvance}
              />
            )}
            {step === 3 && (
              <SeasonScreen
                key="season"
                seasons={seasons}
                onToggleSeason={(s) => {
                  if (s === 'Qualquer época do ano') {
                    setSeasons(seasons.includes(s) ? [] : [s]);
                  } else {
                    setSeasons(prev => {
                      const withoutAny = prev.filter(x => x !== 'Qualquer época do ano');
                      if (withoutAny.includes(s)) return withoutAny.filter(x => x !== s);
                      return [...withoutAny, s];
                    });
                  }
                }}
                dateType={dateType}
                setDateType={setDateType}
                duration={duration}
                setDuration={setDuration}
                month={month}
                setMonth={setMonth}
                onNext={next}
                canAdvance={canAdvance}
                startDateState={startDateState}
                setStartDateState={setStartDateState}
                endDateState={endDateState}
                setEndDateState={setEndDateState}
                formatDateRange={formatDateRange}
              />
            )}
            {step === 4 && (
              <PriceScreen
                key="price"
                value={price}
                displayValue={formatPriceInput(price)}
                onChange={(v) => {
                  setPrice(v.replace(/\D/g, ''));
                  if (touched) setTouched(false);
                }}
                onBlur={() => setTouched(true)}
                error={priceError}
                numericPrice={numericPrice}
                platformFee={platformFee}
                earning={earning}
                formatBRL={formatBRL}
                isFree={isFree}
                onToggleFree={(v) => {
                  setIsFree(v);
                  if (v) {
                    setPrice('');
                    setTouched(false);
                  }
                }}
                onNext={next}
                canAdvance={canAdvance}
              />
            )}
            {step === 5 && (
              <ReviewScreen
                key="review"
                tripName={name || tripName}
                coverImage={coverImage}
                totalDays={totalDays}
                totalActivities={totalActivities}
                totalCities={totalCities}
                numericPrice={numericPrice}
                earning={earning}
                description={description}
                tags={tags}
                formatBRL={formatBRL}
                onPublish={next}
                isPublishing={isPublishing}
                onReviewTerms={() => {
                  setIsReviewingTerms(true);
                  setStep(0);
                }}
                seasons={seasons}
                dateType={dateType}
                duration={duration}
                month={month}
                startDateState={startDateState}
                endDateState={endDateState}
                destinations={destinations}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="w-full px-4 py-6 bg-white flex items-center shrink-0 z-30 relative shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
          <button
            onClick={next}
            disabled={step === 5 ? isPublishing : !canAdvance}
            className={cn(
              'w-full h-14 rounded-[16px] font-["Urbanist"] font-bold text-[16px] transition-all flex items-center justify-center gap-2',
              (step === 5 ? isPublishing : !canAdvance)
                ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60'
                : 'bg-[#9DCC36] text-[#141530] hover:brightness-105 active:scale-[0.99]'
            )}
          >
            {step === 5 ? (
              isPublishing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publicando...
                </>
              ) : 'Publicar'
            ) : step === 0 ? 'Começar a publicar' : step === 4 ? 'Revisar' : step === 2 ? `Continuar (${displayTags.length}/5)` : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorksScreen({ onNext, onBack, onFAQ }: { onNext: () => void; onBack: () => void; onFAQ: () => void; hideCheckbox?: boolean }) {
  const listItems = [
    {
      title: 'Ganhe dinheiro com seus roteiros',
      subtitle: 'Defina o preço e receba por cada venda.',
      divider: true,
    },
    {
      title: 'Alcance milhares de viajantes',
      subtitle: 'Seus roteiros ficam disponíveis para quem está planejando uma viagem.',
      divider: true,
    },
    {
      title: 'Alcance milhares de viajantes',
      subtitle: 'Crie experiências práticas e interativas para os viajantes acompanharem a viagem.',
      divider: false,
    },
  ];



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col bg-white overflow-hidden"
    >
      <div
        className="flex-1 overflow-y-auto px-4 pb-6"
        style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 66px)' }}
      >
        {/* Titulos */}
        <div className="flex flex-col gap-2 mb-8 mt-2 w-full">
          <h1 className="font-['Urbanist'] font-semibold text-[24px] leading-[29px] text-[#171F2C]">
            Publique seus roteiros e inspire o mundo
          </h1>
          <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
            Compartilhe suas viagens, ajude outros viajantes e ainda faça renda com o que você já ama fazer.
          </p>
        </div>

        {/* Cards */}
        <div className="relative w-full mb-10 mt-2 flex justify-center">
          <img src="/cardsnew.png" alt="Exemplos de cards de roteiros publicados" className="w-full h-auto object-contain drop-shadow-[0px_4px_16px_rgba(0,0,0,0.15)]" />
        </div>

        {/* Lista */}
        <div className="flex flex-col w-full mt-6">
          {listItems.map((item, i) => (
            <div key={i} className="flex flex-col w-full">
              <div className="flex items-center gap-3 py-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative">
                  <Target size={24} className="text-[#141530] absolute" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                    {item.title}
                  </span>
                  <span className="font-['Urbanist'] font-medium text-[14px] leading-[18px] text-[#7F7F7F]">
                    {item.subtitle}
                  </span>
                </div>
              </div>
              {item.divider && <div className="h-px bg-[#F2F2F2] w-full" />}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Price ---------------- */

function PriceScreen({
  displayValue,
  onChange,
  onBlur,
  error,
  numericPrice,
  platformFee,
  earning,
  formatBRL,
  isFree,
  onToggleFree,
  onNext,
  canAdvance,
}: {
  value: string;
  displayValue: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error: string | null;
  numericPrice: number;
  platformFee: number;
  earning: number;
  formatBRL: (v: number) => string;
  isFree: boolean;
  onToggleFree: (v: boolean) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-white overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div
          className="flex flex-col justify-start px-4 pb-6"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 72px)' }}
        >
          <PublishBreadcrumb step={4} />
          <h1 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C]">
            Por quanto você quer vender seu roteiro?
          </h1>

          <div className="flex items-center gap-2 mb-6 mt-8">
            <button
              onClick={() => onToggleFree(false)}
              className={cn(
                "px-6 py-2 rounded-full font-['Urbanist'] font-medium text-[14px] transition-all border",
                !isFree
                  ? "bg-[#141530] text-white border-[#141530]"
                  : "bg-white text-[#171F2C] border-[#E5E5E5]"
              )}
            >
              Cobrar
            </button>
            <button
              onClick={() => onToggleFree(true)}
              className={cn(
                "px-6 py-2 rounded-full font-['Urbanist'] font-medium text-[14px] transition-all border",
                isFree
                  ? "bg-[#141530] text-white border-[#141530]"
                  : "bg-white text-[#171F2C] border-[#E5E5E5]"
              )}
            >
              Grátis
            </button>
          </div>

          {!isFree && (
            <>
              {/* Input field */}
              <div className="flex flex-col gap-2 mb-4">
                <div
                  className={cn(
                    "flex flex-col relative rounded-[16px] bg-[#F4F4F4] transition-all px-4 py-2",
                    error ? "ring-1 ring-[#E5484D] border border-[#E5484D]" : "border border-transparent focus-within:ring-1 focus-within:ring-[#141530]"
                  )}
                  style={{ height: '72px' }}
                >
                  <div className="flex items-center h-full">
                    <Target size={20} className="text-[#171F2C] shrink-0 mr-3" />
                    <div className="flex flex-col flex-1 h-full justify-center">
                      <span className="font-['Urbanist'] font-medium text-[12px] text-[#7F7F7F]">
                        Preço do roteiro
                      </span>
                      <div className="flex items-center">
                        <span className="font-['Urbanist'] font-semibold text-[16px] text-[#171F2C] mr-1">R$</span>
                        <input
                          value={displayValue}
                          onChange={(e) => onChange(e.target.value)}
                          onBlur={onBlur}
                          placeholder="0,00"
                          inputMode="numeric"
                          className="flex-1 w-full bg-transparent font-['Urbanist'] font-semibold text-[16px] text-[#171F2C] placeholder:text-[#171F2C]/50 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {error && (
                  <p className="text-[13px] text-[#E5484D] font-medium ml-1" role="alert">
                    {error}
                  </p>
                )}
              </div>

              {/* Card below input */}
              <div className="rounded-[16px] bg-white border border-[#E5E5E5] p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-['Urbanist'] font-medium text-[14px] text-[#171F2C]">Você recebe por venda</span>
                  <span className="font-['Urbanist'] font-semibold text-[14px] text-[#171F2C]">R$ {earning.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full border-t border-[#F2F2F2]" />
                <div className="flex gap-2">
                  <Target size={16} className="text-[#171F2C] shrink-0 mt-0.5" />
                  <span className="font-['Urbanist'] font-medium text-[12px] leading-[18px] text-[#7F7F7F]">
                    Nós cobramos 10% de taxa. Você recebe 90% de cada venda.
                  </span>
                </div>
              </div>
            </>
          )}

          {isFree && (
            <div className="rounded-[16px] bg-white border border-[#E5E5E5] p-4 flex items-center gap-3">
              <Target size={24} className="text-[#141530] shrink-0" />
              <span className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
                Seu roteiro ficará disponível gratuitamente na Loja WAI.
              </span>
            </div>
          )}

          {/* error message moved up */}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Review ---------------- */

function ReviewScreen({
  tripName,
  coverImage,
  totalDays,
  totalActivities,
  totalCities,
  numericPrice,
  earning,
  description,
  tags,
  formatBRL,
  onPublish,
  isPublishing,
  onReviewTerms,
  seasons,
  dateType,
  duration,
  month,
  startDateState,
  endDateState,
  destinations,
}: {
  tripName?: string;
  coverImage?: string;
  totalDays?: number;
  totalActivities?: number;
  totalCities?: number;
  numericPrice: number;
  earning: number;
  description: string;
  tags: string[];
  formatBRL: (v: number) => string;
  onPublish: () => void;
  isPublishing?: boolean;
  onReviewTerms: () => void;
  seasons: string[];
  dateType?: 'FLEXIBLE' | 'SPECIFIC';
  duration?: string;
  month?: string;
  startDateState?: Date;
  endDateState?: Date;
  destinations?: string[];
}) {
  // Cover fallback
  const cover =
    coverImage ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

  const formatTripPeriod = (start?: Date, end?: Date): string => {
    if (!start || !end) return '';
    return `${format(start, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM", { locale: ptBR })}`;
  };

  let reviewDays = totalDays ?? 0;
  if (dateType === 'FLEXIBLE') {
    reviewDays = duration ? Number(duration) : (totalDays ?? 0);
  } else if (dateType === 'SPECIFIC' && startDateState && endDateState) {
    reviewDays = Math.round((endDateState.getTime() - startDateState.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-[#F3F3F3] overflow-hidden"
    >
      <div
        className="flex-1 overflow-y-auto min-h-0 px-4 pb-12"
        style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 72px)' }}
      >
        <PublishBreadcrumb step={5} />
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C]">
              Revise seu roteiro
            </h1>

            <div
              className="rounded-[16px] bg-transparent border border-[#B6B6B6] p-4 flex flex-row items-center gap-2"
              style={{ height: '62px' }}
            >
              <div className="w-4 h-4 bg-[#141530] flex items-center justify-center shrink-0">
                <Target size={12} className="text-white" />
              </div>
              <span className="font-['Urbanist'] font-medium text-[12px] leading-[14px] text-[rgba(26,28,64,0.66)]">
                Depois de publicar, o itinerário não poderá ser editado. Confira todos os detalhes antes de publicar.
              </span>
            </div>
          </div>

          {/* Trip summary card */}
          <div className="rounded-[16px] bg-white overflow-hidden flex flex-col items-center pb-6">
            {/* Cover image with price pill */}
            <div className="relative w-full h-[135px]">
              <img
                src={cover}
                alt={tripName || 'Roteiro'}
                className="w-full h-full object-cover rounded-t-[8px]"
              />
              <div className="absolute top-[15px] left-[16px] bg-[#141530] rounded-[16px] px-4 py-2 flex items-center gap-4">
                <span className="font-['Urbanist'] font-bold text-[14px] leading-[17px] text-[#FEFEFE] text-center">
                  {numericPrice > 0 ? formatBRL(numericPrice) : 'Grátis'}
                </span>
              </div>
            </div>

            <div className="w-full px-4 pt-4 pb-0 flex flex-col gap-6">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h3 className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                    {tripName || 'Meu roteiro'}
                  </h3>

                  <div className="flex flex-row items-center gap-2">
                    <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
                      {reviewDays} {reviewDays === 1 ? 'dia' : 'dias'}
                    </span>
                    <div className="w-[11px] h-0 border border-[#7F7F7F] -rotate-90" />
                    <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
                      {totalCities ?? 1} {(totalCities ?? 1) === 1 ? 'cidade' : 'cidades'}
                    </span>
                    <div className="w-[11px] h-0 border border-[#7F7F7F] -rotate-90" />
                    <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
                      {totalActivities ?? 0} atividades
                    </span>
                  </div>
                </div>

                {description && (
                  <p className="font-['Urbanist'] font-medium text-[14px] leading-[18px] text-[#7F7F7F]">
                    {description}
                  </p>
                )}
              </div>

              {/* List items */}
              <div className="flex flex-col gap-6 w-full">
                {/* Destinos */}
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex flex-row items-center gap-6 w-full">
                    <div className="flex flex-row items-start gap-3 w-full">
                      <Target size={24} className="text-[#141530] shrink-0" />
                      <div className="flex flex-col justify-center gap-2 w-full">
                        <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                          {destinations && destinations.length > 1 ? 'Destinos' : 'Destino'}
                        </span>
                        <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
                          {(destinations && destinations.length > 0) ? destinations.join(' | ') : 'Nenhum destino definido'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-0 border border-[#F2F2F2]" />
                </div>

                {/* Época recomendada */}
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex flex-row items-center gap-6 w-full">
                    <div className="flex flex-row items-start gap-3 w-full">
                      <Target size={24} className="text-[#141530] shrink-0" />
                      <div className="flex flex-col justify-center gap-2 w-full">
                        <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                          Época recomendada
                        </span>
                        <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
                          {seasons.length > 0 ? seasons.join(', ') : 'Nenhuma época definida'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-0 border border-[#F2F2F2]" />
                </div>

                {/* Período do roteiro */}
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex flex-row items-center gap-6 w-full">
                    <div className="flex flex-row items-start gap-3 w-full">
                      <Target size={24} className="text-[#141530] shrink-0" />
                      <div className="flex flex-col justify-center gap-2 w-full">
                        <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                          Período do roteiro
                        </span>
                        <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
                          {dateType === 'SPECIFIC' && startDateState && endDateState
                            ? formatTripPeriod(startDateState, endDateState)
                            : duration ? `${duration} dias${month ? ` (${month})` : ''}`
                              : 'Nenhum período definido'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-0 border border-[#F2F2F2]" />
                </div>

                {/* Características */}
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex flex-row items-center gap-6 w-full">
                    <div className="flex flex-row items-start gap-3 w-full">
                      <Target size={24} className="text-[#141530] shrink-0" />
                      <div className="flex flex-col justify-center gap-2 w-full">
                        <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                          Perfeito para
                        </span>
                        <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#7F7F7F]">
                          {tags.filter(t => t !== '_FLEXIBLE_DATES_').length > 0 
                            ? tags
                                .filter(t => t !== '_FLEXIBLE_DATES_')
                                .map(t => t.charAt(0).toUpperCase() + t.slice(1))
                                .join(' | ')
                            : 'Nenhuma característica definida'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Termos e condições agora rola com a página */}
          <span className="font-['Urbanist'] font-medium text-[14px] leading-[18px] text-[#646464]">
            Ao publicar, você concorda com os{' '}
            <button onClick={onReviewTerms} className="font-bold underline">
              Termos e condições.
            </button>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Description ---------------- */

function InfoScreen({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onNext,
  canAdvance,
}: {
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  const MAX = 500;
  const remaining = MAX - description.length;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [description]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-white overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div
          className="flex flex-col justify-start px-4 pb-6"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 72px)' }}
        >
          <PublishBreadcrumb step={1} />
          <h1 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] mb-2">
            O que os viajantes vão encontrar neste roteiro?
          </h1>
          <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F] mb-8">
            Dê uma ideia do que está no roteiro e do que eles podem esperar da viagem.
          </p>

          <div className="flex flex-col gap-4">
            {/* Input Name */}
            <div className="bg-field border border-transparent focus-within:border-primary transition-colors rounded-[16px] p-4 flex flex-col gap-1">
              <label className="font-['Urbanist'] text-[12px] font-medium text-[#7F7F7F]">
                Nome do roteiro
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="bg-transparent border-0 p-0 font-['Urbanist'] text-[16px] font-semibold text-[#141530] focus:ring-0 placeholder:text-[#141530]/30 w-full outline-none"
              />
            </div>

            {/* Input Description */}
            <div className="flex flex-col gap-1">
              <div className="bg-field border border-transparent focus-within:border-primary transition-colors rounded-[16px] p-4 flex flex-col gap-1">
                <label className="font-['Urbanist'] text-[12px] font-medium text-[#7F7F7F]">
                  Sobre o roteiro
                </label>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value.slice(0, MAX))}
                  placeholder="Conte sobre o seu roteiro..."
                  className="bg-transparent border-0 p-0 font-['Urbanist'] text-[14px] font-medium text-[#141530] focus:ring-0 placeholder:text-[#141530]/30 resize-none outline-none w-full"
                  style={{ minHeight: '120px' }}
                />
              </div>
              <div className="flex justify-start text-[12px] font-['Urbanist'] font-medium text-[#7F7F7F] px-1 mt-1">
                {description.length}/{MAX}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Tags ---------------- */

const TAG_CATEGORIES = [
  {
    title: 'Ambiente',
    tags: [
      { id: 'praia', label: 'Praia', emoji: '🏖️' },
      { id: 'montanha', label: 'Montanha', emoji: '⛰️' },
      { id: 'urbano', label: 'Urbano', emoji: '🏙️' },
      { id: 'natureza', label: 'Natureza', emoji: '🌿' },
      { id: 'neve', label: 'Neve', emoji: '❄️' },
    ]
  },
  {
    title: 'Estilo da viagem',
    tags: [
      { id: 'cultural', label: 'Cultural', emoji: '🏛️' },
      { id: 'gastronomia', label: 'Gastronomia', emoji: '🍽️' },
      { id: 'aventura', label: 'Aventura', emoji: '🧗' },
      { id: 'vida-noturna', label: 'Vida noturna', emoji: '🌃' },
      { id: 'relax', label: 'Relax', emoji: '🧘' },
      { id: 'romance', label: 'Romance', emoji: '💕' },
      { id: 'roadtrip', label: 'Roadtrip', emoji: '🚗' },
      { id: 'compras', label: 'Compras', emoji: '🛍️' },
      { id: 'bem-estar', label: 'Bem-estar', emoji: '💆' },
      { id: 'vinhos', label: 'Vinhos', emoji: '🍷' },
      { id: 'cafes', label: 'Cafés', emoji: '☕' },
      { id: 'festivais', label: 'Festivais', emoji: '🎪' },
    ]
  },
  {
    title: 'Perfil do viajante',
    tags: [
      { id: 'familia', label: 'Família', emoji: '👨‍👩‍👧‍👦' },
      { id: 'amigos', label: 'Amigos', emoji: '🍻' },
      { id: 'solo', label: 'Solo', emoji: '🚶' },
      { id: 'mochilao', label: 'Mochilão', emoji: '🎒' },
      { id: 'economico', label: 'Econômico', emoji: '💸' },
      { id: 'luxo', label: 'Luxo', emoji: '💎' },
      { id: 'criancas', label: 'Crianças', emoji: '🧒' },
      { id: 'pet-friendly', label: 'Pet friendly', emoji: '🐾' },
      { id: 'acessivel', label: 'Acessível', emoji: '♿' },
      { id: 'trabalho-remoto', label: 'Trabalho remoto', emoji: '💻' },
    ]
  },
  {
    title: 'Experiências',
    tags: [
      { id: 'fotogenico', label: 'Fotogênico', emoji: '📸' },
      { id: 'arquitetura', label: 'Arquitetura', emoji: '🏢' },
      { id: 'arte', label: 'Arte', emoji: '🎨' },
      { id: 'trilhas', label: 'Trilhas', emoji: '🥾' },
      { id: 'cachoeiras', label: 'Cachoeiras', emoji: '🌊' },
      { id: 'parques-nacionais', label: 'Parques nacionais', emoji: '🏞️' },
      { id: 'ilhas', label: 'Ilhas', emoji: '🏝️' },
      { id: 'mergulho', label: 'Mergulho', emoji: '🤿' },
    ]
  }
];

function TagsScreen({
  selected,
  onToggle,
  onNext,
  canAdvance,
}: {
  selected: string[];
  onToggle: (t: string) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  const limitReached = selected.length >= 5;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-white overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div
          className="flex flex-col justify-start px-4 pb-6"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 72px)' }}
        >
          <PublishBreadcrumb step={2} />
          <div className="flex flex-col gap-2 mb-10">
            <h1 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C]">
              O que combina com o seu roteiro?
            </h1>
            <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
              Escolha até 5 opções que melhor representam a experiência.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {TAG_CATEGORIES.map((cat) => (
              <div key={cat.title} className="flex flex-col gap-4">
                <h2 className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#171F2C]">
                  {cat.title}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {cat.tags.map((tag) => {
                    const isSelected = selected.includes(tag.id);
                    const disabled = !isSelected && limitReached;
                    return (
                      <button
                        key={tag.id}
                        onClick={() => onToggle(tag.id)}
                        disabled={disabled}
                        className={cn(
                          "box-border flex flex-row items-center justify-center px-4 py-2 gap-1 h-10 border rounded-[16px] transition-all font-['Urbanist'] shrink-0",
                          isSelected
                            ? "bg-[#141530] text-white border-[#141530]"
                            : "bg-white text-[#141530] border-[#141530]",
                          disabled && "opacity-40 cursor-not-allowed border-[#141530]/20 text-[#141530]/40"
                        )}
                      >
                        <div className="flex items-center justify-center w-6 h-6">
                          <span className="text-[16px] leading-none">{tag.emoji}</span>
                        </div>
                        <span className="font-medium text-[14px] leading-[17px] text-center">{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


    </motion.div>
  );
}

/* ---------------- Season ---------------- */

function SeasonScreen({
  seasons,
  onToggleSeason,
  dateType,
  setDateType,
  duration,
  setDuration,
  month,
  setMonth,
  onNext,
  canAdvance,
  startDateState,
  setStartDateState,
  endDateState,
  setEndDateState,
  formatDateRange,
}: {
  seasons: string[];
  onToggleSeason: (v: string) => void;
  dateType: 'FLEXIBLE' | 'SPECIFIC';
  setDateType: (v: 'FLEXIBLE' | 'SPECIFIC') => void;
  duration: string;
  setDuration: (v: string) => void;
  month: string;
  setMonth: (v: string) => void;
  onNext: () => void;
  canAdvance: boolean;
  startDateState: Date | undefined;
  setStartDateState: (d: Date | undefined) => void;
  endDateState: Date | undefined;
  setEndDateState: (d: Date | undefined) => void;
  formatDateRange: () => string;
}) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const SEASONS_LIST = [
    'Qualquer época do ano',
    'Verão',
    'Primavera',
    'Inverno',
    'Outono'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-white overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div
          className="flex flex-col justify-start px-4 pb-6"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 72px)' }}
        >
          <PublishBreadcrumb step={3} />
          <div className="flex flex-col gap-2 mb-10">
            <h1 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C]">
              O que combina com o seu roteiro?
            </h1>
            <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
              Escolha as opções que melhor representam a sua viagem.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {/* Period Section */}
            <div className="flex flex-col gap-4">
              <h2 className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#171F2C]">
                Período da viagem
              </h2>

              <div className="flex bg-[#F4F4F4] rounded-[32px] p-[3px]">
                <button
                  onClick={() => {
                    if (dateType !== 'FLEXIBLE') {
                      setDateType('FLEXIBLE');
                    }
                  }}
                  className={cn(
                    "flex-1 h-[44px] rounded-[32px] font-['Urbanist'] font-semibold text-[14px] transition-all",
                    dateType === 'FLEXIBLE' ? "bg-[#141530] text-white" : "bg-transparent text-[#141530]"
                  )}
                >
                  Data flexível
                </button>
                <button
                  onClick={() => {
                    if (dateType !== 'SPECIFIC') {
                      setDateType('SPECIFIC');
                    }
                  }}
                  className={cn(
                    "flex-1 h-[44px] rounded-[32px] font-['Urbanist'] font-semibold text-[14px] transition-all",
                    dateType === 'SPECIFIC' ? "bg-[#141530] text-white" : "bg-transparent text-[#141530]"
                  )}
                >
                  Data específica
                </button>
              </div>

              {dateType === 'FLEXIBLE' && (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#646464]" size={20} />
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className={cn(
                        "w-full h-[60px] bg-field rounded-[12px] pl-12 pr-14 font-['Urbanist'] text-[16px] text-[#171F2C] outline-none border border-transparent focus:border-primary transition-all",
                        duration.length > 0 ? "pt-4" : ""
                      )}
                    />
                    {duration.length === 0 && (
                      <div className="absolute left-12 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col justify-center">
                        <span className="font-['Urbanist'] text-[16px] text-[#646464] leading-none">Duração</span>
                      </div>
                    )}
                    {duration.length > 0 && (
                      <div className="absolute left-12 top-2 pointer-events-none">
                        <span className="font-['Urbanist'] font-medium text-[10px] text-[#646464]">Duração</span>
                      </div>
                    )}
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-['Urbanist'] font-medium text-[14px] text-[#646464] pointer-events-none">
                      dias
                    </span>
                  </div>

                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#646464]" size={20} />
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className={cn(
                        "w-full h-[60px] bg-[#F6F6F6] rounded-[12px] pl-12 pr-12 font-['Urbanist'] text-[16px] text-[#171F2C] appearance-none outline-none focus:ring-1 focus:ring-[#141530] transition-all",
                        month.length > 0 ? "pt-4" : ""
                      )}
                    >
                      <option value="" disabled className="hidden"></option>
                      <option value="Janeiro">Janeiro</option>
                      <option value="Fevereiro">Fevereiro</option>
                      <option value="Março">Março</option>
                      <option value="Abril">Abril</option>
                      <option value="Maio">Maio</option>
                      <option value="Junho">Junho</option>
                      <option value="Julho">Julho</option>
                      <option value="Agosto">Agosto</option>
                      <option value="Setembro">Setembro</option>
                      <option value="Outubro">Outubro</option>
                      <option value="Novembro">Novembro</option>
                      <option value="Dezembro">Dezembro</option>
                    </select>
                    {month.length === 0 && (
                      <div className="absolute left-12 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col justify-center">
                        <span className="font-['Urbanist'] text-[16px] text-[#646464] leading-none">Mês (Opcional)</span>
                      </div>
                    )}
                    {month.length > 0 && (
                      <div className="absolute left-12 top-2 pointer-events-none">
                        <span className="font-['Urbanist'] font-medium text-[10px] text-[#646464]">Mês (Opcional)</span>
                      </div>
                    )}
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#171F2C] pointer-events-none" size={20} />
                  </div>
                </div>
              )}

              {dateType === 'SPECIFIC' && (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#646464] pointer-events-none" size={20} />
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "w-full h-[60px] bg-field rounded-[12px] pl-12 pr-14 font-['Urbanist'] text-[16px] text-[#171F2C] outline-none border border-transparent focus:border-primary transition-all flex items-center justify-start text-left",
                            startDateState ? "pt-4" : ""
                          )}
                        >
                          {formatDateRange() || (
                            <span className="text-[#646464]">Data da viagem</span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100] bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl" align="start">
                        <CalendarUI
                          mode="range"
                          selected={{ from: startDateState, to: endDateState }}
                          onSelect={(range) => {
                            setStartDateState(range?.from);
                            setEndDateState(range?.to);
                            if (range?.from && range?.to) {
                              setIsCalendarOpen(false);
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    {startDateState && (
                      <div className="absolute left-12 top-2 pointer-events-none">
                        <span className="font-['Urbanist'] font-medium text-[10px] text-[#646464]">Data da viagem</span>
                      </div>
                    )}
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#171F2C] pointer-events-none" size={20} />
                  </div>
                </div>
              )}
            </div>

            <div className="w-full border-t border-[#F2F2F2]" />

            {/* When to recommend */}
            <div className="flex flex-col gap-4">
              <h2 className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#171F2C]">
                Quando você recomenda fazer essa viagem?
              </h2>

              <div className="flex flex-col gap-3">
                {SEASONS_LIST.map((s) => {
                  const isSelected = seasons.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => onToggleSeason(s)}
                      className="flex items-center justify-between w-full px-4 h-[68px] border border-[#EBEBEB] rounded-[16px] bg-white transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Target size={20} className={isSelected ? "text-[#141530]" : "text-[#141530]"} />
                        <span className="font-['Urbanist'] font-semibold text-[16px] text-[#1A1C40]">
                          {s}
                        </span>
                      </div>
                      <div className={cn(
                        "w-[20px] h-[20px] rounded-[4px] border flex items-center justify-center transition-all",
                        isSelected ? "bg-[#141530] border-[#141530]" : "border-[#9E9E9E]"
                      )}>
                        {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>


    </motion.div>
  );
}

