import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, DollarSign, TrendingUp, Star, ShieldCheck, Sparkles, Users, Check, Copy, Loader2, HelpCircle, Flower, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export interface PublishItineraryResult {
  price: number;
  description: string;
  tags: string[];
  mainTag?: string;
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
  onClose: () => void;
  onPublished?: (result: PublishItineraryResult) => void | Promise<void>;
  onNavigateToSales?: () => void;
  onNavigateToFAQ?: () => void;
  startDate?: Date;
  endDate?: Date;
  initialMainTag?: string;
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

export function PublishItineraryFlow({
  open,
  tripName,
  coverImage,
  totalDays,
  totalActivities,
  totalCities,
  initialDescription = '',
  initialTags = [],
  onClose,
  onPublished,
  onNavigateToSales,
  onNavigateToFAQ,
  startDate,
  endDate,
  initialMainTag,
}: PublishItineraryFlowProps) {
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wai_hide_publish_onboarding') === 'true' ? 1 : 0;
    }
    return 0;
  });
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [season, setSeason] = useState<string>('');
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isReviewingTerms, setIsReviewingTerms] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const descriptionValid = description.trim().length >= 20;
  const tagsValid = tags.length >= 1 && tags.length <= 5;
  const seasonValid = !!season;

  const LAST_STEP = 5;

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
          price: numericPrice,
          description: description.trim(),
          tags: Array.from(new Set([season, ...tags.filter(t => t !== ''), ...initialTags.filter(t => t === '_FLEXIBLE_DATES_')])),
        });
        toast.success('Roteiro publicado com sucesso!', {
          description: 'Agora ele está disponível no marketplace.',
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
      setStep(5);
      return;
    }
    if (step <= 1 && !isReviewingTerms) {
      handleClose();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleClose = () => {
    setStep(localStorage.getItem('wai_hide_publish_onboarding') === 'true' ? 1 : 0);
    setPrice('');
    setIsFree(false);
    setTouched(false);
    setDescription(initialDescription);
    setSeason('');
    setTags(initialTags);
    setIsReviewingTerms(false);
    setShowFAQ(false);
    onClose();
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
    step === 1 ? priceValid :
      step === 2 ? descriptionValid :
        step === 3 ? seasonValid :
          step === 4 ? tagsValid :
            true;

  return (
    <div className="fixed inset-0 z-[200] bg-[#F2F2F2]">
      <div
        className="absolute inset-x-0 top-0 overflow-hidden font-sans mx-auto transition-all duration-75 ease-out"
        style={{ bottom: keyboardHeight }}
      >
        {/* Top bar — only back button */}
        <div className={cn('absolute top-0 left-0 right-0 z-30', step <= 0 ? 'pt-[68px]' : 'pt-safe-top pb-3 bg-[#F2F2F2]')}>
          <div className={step <= 0 ? 'px-3' : 'px-7'}>
            <div className={cn('flex items-center justify-between', step <= 0 && 'w-full max-w-[396px] mx-auto px-7')}>
              <button
                onClick={back}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center transition-all bg-[#0A0A0A]/5 text-[#0A0A0A] hover:bg-[#0A0A0A]/10 shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => setShowFAQ(true)}
                className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center transition-all bg-[#0A0A0A]/5 text-[#0A0A0A] hover:bg-[#0A0A0A]/10 shrink-0"
                aria-label="Ajuda"
              >
                <HelpCircle size={18} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && <HowItWorksScreen key="how" onNext={next} hideCheckbox={isReviewingTerms} />}
          {step === 1 && (
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
          {step === 2 && (
            <DescriptionScreen
              key="description"
              value={description}
              onChange={setDescription}
              onNext={next}
              canAdvance={canAdvance}
            />
          )}
          {step === 3 && (
            <SeasonScreen
              key="season"
              value={season}
              onSelect={setSeason}
              onNext={next}
              canAdvance={canAdvance}
            />
          )}
          {step === 4 && (
            <TagsScreen
              key="tags"
              selected={displayTags}
              onToggle={toggleTag}
              onNext={next}
              canAdvance={canAdvance}
            />
          )}
          {step === 5 && (
            <ReviewScreen
              key="review"
              tripName={tripName}
              coverImage={coverImage}
              totalDays={totalDays}
              totalActivities={totalActivities}
              totalCities={totalCities}
              numericPrice={numericPrice}
              earning={earning}
              description={description}
              tags={season ? [...tags, season] : tags}
              formatBRL={formatBRL}
              onPublish={next}
              isPublishing={isPublishing}
              onReviewTerms={() => {
                setIsReviewingTerms(true);
                setStep(0);
              }}
              season={season}
              startDate={startDate}
              endDate={endDate}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorksScreen({ onNext, hideCheckbox }: { onNext: () => void; hideCheckbox?: boolean }) {
  const items: { icon: typeof Users; title: string; desc: string; color: string }[] = [
    {
      icon: Users,
      title: 'Alcance milhares de viajantes',
      desc: 'Seu roteiro fica visível no marketplace para toda a comunidade.',
      color: '#CDE3F3',
    },
    {
      icon: DollarSign,
      title: 'Receba 90% de cada venda',
      desc: 'Cobramos apenas 10% de taxa de serviço. O resto é seu.',
      color: '#E8F1D4',
    },
    {
      icon: Copy,
      title: 'Cópia independente',
      desc: 'A versão à venda é independente do seu roteiro privado.',
      color: '#E0E7FF',
    },
    {
      icon: ShieldCheck,
      title: 'Pagamentos seguros',
      desc: 'Saques via Pix com valor mínimo de R$ 30,00.',
      color: '#FCE7C8',
    },
    {
      icon: Star,
      title: 'Construa sua reputação',
      desc: 'Receba avaliações e suba no ranking de Top Criadores.',
      color: '#F5D8E8',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2] px-3 pt-12 pb-3"
    >
      <div className="relative w-full h-full max-w-[396px] rounded-[30px] overflow-hidden flex flex-col bg-white">
        <div className="px-6 pt-24 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em]"
            style={{ fontSize: '32px', fontWeight: 800 }}
          >
            Como funciona<br />a venda
          </h1>

        </div>

        <div className="flex-1 px-6 pt-6 pb-36 overflow-y-auto">
          <div className="space-y-3">
            {items.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#0A0A0A]/5"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: color }}
                >
                  <Icon size={20} strokeWidth={2.2} className="text-[#0A0A0A]" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[14px] font-bold text-[#0A0A0A] leading-tight">{title}</p>
                  <p className="text-[12.5px] text-[#6B6B6B] leading-snug mt-1">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="absolute left-0 right-0 bottom-0 px-6 pb-6 pt-2 bg-white flex flex-col gap-4">
          <div className="absolute left-0 right-0 h-8 -top-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          {!hideCheckbox && (
            <label className="flex items-center gap-2 cursor-pointer self-center">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[#0A0A0A]/20 text-[#9DCC36] focus:ring-[#9DCC36]"
                onChange={(e) => {
                  if (e.target.checked) {
                    localStorage.setItem('wai_hide_publish_onboarding', 'true');
                  } else {
                    localStorage.removeItem('wai_hide_publish_onboarding');
                  }
                }}
              />
              <span className="text-[13px] font-medium text-[#6B6B6B]">Não mostrar novamente</span>
            </label>
          )}
          <button
            onClick={onNext}
            className="w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)] transition-all"
          >
            Entendi, vamos lá
          </button>
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
      className="absolute inset-0 flex flex-col bg-[#F2F2F2]"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col justify-end min-h-full px-7 pt-20 pb-32">
          <StepDots current={0} total={TOTAL_QUESTION_STEPS} />
          <h1
            className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
            style={{ fontSize: '28px', fontWeight: 800 }}
          >
            Quanto deseja<br />cobrar?
          </h1>
          <p className="mt-2 text-[#6B6B6B] text-[13px] leading-snug max-w-[300px]">
            Defina o preço de venda do seu roteiro no marketplace.
          </p>

          <div className="mt-6 relative">
            <div
              className={cn(
                "flex items-center rounded-2xl bg-white px-5 transition-all shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)] overflow-hidden",
                error ? "ring-1 ring-[#E5484D] border border-[#E5484D]" : "border border-transparent focus-within:ring-2 focus-within:ring-[#9DCC36]",
                isFree && "opacity-50"
              )}
              style={{ height: '64px' }}
            >
              <span className={cn(
                "font-semibold text-[20px] mr-2 shrink-0 select-none",
                isFree ? "text-[#0A0A0A]/20" : "text-[#0A0A0A]/40"
              )}>
                R$
              </span>
              <input
                value={isFree ? '' : displayValue}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={isFree ? 'Grátis' : '0,00'}
                inputMode="numeric"
                autoFocus={!isFree}
                disabled={isFree}
                className="flex-1 w-full h-full bg-transparent text-[#0A0A0A] font-semibold placeholder:text-[#0A0A0A]/25 outline-none"
                style={{ fontSize: '20px' }}
              />
            </div>
            <AnimatePresence>
              {error && !isFree && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="mt-2 text-[13px] text-[#E5484D] font-medium"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Free toggle */}
          <button
            type="button"
            onClick={() => onToggleFree(!isFree)}
            className="mt-3 inline-flex items-center gap-2.5 px-1 py-1.5 active:opacity-70 transition-opacity text-left"
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors border-2',
                isFree ? 'bg-[#9DCC36] border-[#9DCC36]' : 'border-[#0A0A0A]/25 bg-transparent'
              )}
            >
              {isFree && <div className="w-2 h-2 rounded-full bg-[#0A0A0A]" />}
            </div>
            <span className="text-[14px] font-semibold text-[#0A0A0A] leading-tight">
              Quero disponibilizar de graça
            </span>
          </button>

          <AnimatePresence>
            {!isFree && numericPrice > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mt-4 rounded-2xl bg-white p-4 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)]"
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Preço de venda</span>
                  <span className="font-semibold text-[#0A0A0A]">{formatBRL(numericPrice)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Taxa de serviço (10%)</span>
                  <span className="font-semibold text-[#E5484D]">− {formatBRL(platformFee)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#0A0A0A]/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[#0A0A0A] leading-tight">Você recebe</span>
                    <span className="text-[11px] text-[#6B6B6B] leading-tight mt-0.5">por roteiro vendido</span>
                  </div>
                  <span className="text-[15px] font-bold text-[#0A0A0A]">{formatBRL(earning)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#0A0A0A]/5 flex items-center gap-2 text-[12px] text-[#6B6B6B]">
                  <TrendingUp size={14} className="text-[#9DCC36] shrink-0" />
                  <span>Cobramos uma taxa de serviço de 10% apenas sobre cada venda realizada.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent pointer-events-none z-10">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all pointer-events-auto',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
      </div>
    </motion.div >
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
  season,
  startDate,
  endDate,
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
  season?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const platformFee = numericPrice - earning;

  // Cover fallback
  const cover =
    coverImage ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

  const formatTripPeriod = (start?: Date, end?: Date): string => {
    if (!start || !end) return '';
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleDateString('pt-BR', { month: 'long' }).toLowerCase();
    const endMonth = end.toLocaleDateString('pt-BR', { month: 'long' }).toLowerCase();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear !== endYear) {
      return `${startDay} de ${startMonth} de ${startYear} a ${endDay} de ${endMonth} de ${endYear}`;
    }
    if (startMonth !== endMonth) {
      return `${startDay} de ${startMonth} a ${endDay} de ${endMonth} de ${endYear}`;
    }
    return `${startDay} a ${endDay} de ${endMonth} de ${endYear}`;
  };

  const selectedSeasonOption = SEASONS_OPTIONS.find(s => s.id === season);
  const seasonLabel = selectedSeasonOption ? selectedSeasonOption.label : 'O ano todo';

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 overflow-y-auto bg-[#F2F2F2]"
    >
      <div className="px-7 pt-20 pb-0">
        <StepDots current={4} total={TOTAL_QUESTION_STEPS} />
        <h1
          className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
          style={{ fontSize: '28px', fontWeight: 800 }}
        >
          Revise as<br />informações<br />do seu roteiro
        </h1>
        <p className="mt-2 text-[#6B6B6B] text-[13px] leading-snug max-w-[300px]">
          Confira os detalhes antes de publicar no marketplace.
        </p>

        {/* Trip summary card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(10,10,10,0.15)] overflow-hidden"
        >
          {/* Cover image with title */}
          <div className="relative">
            <img
              src={cover}
              alt={tripName || 'Roteiro'}
              className="w-full h-[160px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="text-white font-extrabold text-[18px] leading-tight tracking-tight line-clamp-2">
                {tripName || 'Meu roteiro'}
              </h3>
            </div>
          </div>

          {/* Stats */}
          <div className="px-5 pt-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#F2F2F2] py-3 px-2 text-center">
                <p className="text-[16px] font-extrabold text-[#1A1C40] leading-none">{totalDays ?? 0}</p>
                <p className="mt-1 text-[10.5px] text-[#6B6B6B] font-medium">
                  {(totalDays ?? 0) === 1 ? 'Dia' : 'Dias'}
                </p>
              </div>
              <div className="rounded-xl bg-[#F2F2F2] py-3 px-2 text-center">
                <p className="text-[16px] font-extrabold text-[#1A1C40] leading-none">{totalActivities ?? 0}</p>
                <p className="mt-1 text-[10.5px] text-[#6B6B6B] font-medium">
                  {(totalActivities ?? 0) === 1 ? 'Atividade' : 'Atividades'}
                </p>
              </div>
              <div className="rounded-xl bg-[#F2F2F2] py-3 px-2 text-center">
                <p className="text-[16px] font-extrabold text-[#1A1C40] leading-none">{totalCities ?? 1}</p>
                <p className="mt-1 text-[10.5px] text-[#6B6B6B] font-medium">
                  {(totalCities ?? 1) === 1 ? 'Cidade' : 'Cidades'}
                </p>
              </div>
            </div>
          </div>

          {/* Melhor época & Período da viagem metadata list */}
          <div className="mx-5 mt-4 pt-4 border-t border-[#0A0A0A]/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#FDF2F8] text-[#DB2777]">
                <Flower className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#0A0A0A] leading-tight">Melhor época</p>
                <p className="text-[12px] text-[#6B6B6B] mt-0.5 leading-none">{seasonLabel}</p>
              </div>
            </div>

            {!tags.includes('_FLEXIBLE_DATES_') && startDate && endDate && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#EFF6FF] text-[#2563EB]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#0A0A0A] leading-tight">Período da viagem</p>
                  <p className="text-[12px] text-[#6B6B6B] mt-0.5 leading-none">
                    {formatTripPeriod(startDate, endDate)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description + tags */}
          {(description || tags.length > 0) && (
            <div className="mx-5 mt-4 pt-4 border-t border-[#0A0A0A]/8 space-y-3">
              {description && (
                <div>
                  <p className="text-[11px] text-[#6B6B6B] font-semibold uppercase tracking-wide mb-1.5">Descrição</p>
                  <p className="text-[13px] text-[#1A1C40] leading-snug line-clamp-3">{description}</p>
                </div>
              )}
              {tags.length > 0 && (
                <div>
                  <p className="text-[11px] text-[#6B6B6B] font-semibold uppercase tracking-wide mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.filter(t => t !== '_FLEXIBLE_DATES_').map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#E7E7EE] text-[#1A1C40]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pb-5" />
        </motion.div>
      </div>

      <div className="sticky bottom-0 px-6 pb-8 pt-4 mt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent">
        <div className="flex items-start gap-2.5 px-1 pb-4">
          <Info size={16} strokeWidth={2} className="text-[#6B6B6B] shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#6B6B6B] leading-normal flex-1">
            Ao publicar este roteiro, você concorda com os nossos{' '}
            <button
              onClick={onReviewTerms}
              className="text-[#6B6B6B] font-semibold underline decoration-[#6B6B6B]/40 hover:decoration-[#6B6B6B] transition-colors"
            >
              Termos de Uso para Criadores
            </button>
            .
          </p>
        </div>

        <button
          onClick={onPublish}
          disabled={isPublishing}
          className="w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:active:scale-100 shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)] transition-all flex items-center justify-center gap-2"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Publicando...
            </>
          ) : (
            'Publicar roteiro'
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------- Description ---------------- */

function DescriptionScreen({
  value,
  onChange,
  onNext,
  canAdvance,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  const MAX = 500;
  const remaining = MAX - value.length;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-[#F2F2F2]"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col justify-end min-h-full px-7 pt-20 pb-40">
          <StepDots current={1} total={TOTAL_QUESTION_STEPS} />
          <h1
            className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
            style={{ fontSize: '28px', fontWeight: 800 }}
          >
            Adicione uma<br />descrição
          </h1>
          <p className="mt-2 text-[#6B6B6B] text-[13px] leading-snug max-w-[320px]">
            Conte aos viajantes o que torna esse roteiro especial. Você pode editar essa descrição depois.
          </p>

          <div className="mt-6">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, MAX))}
              placeholder="Ex: Um roteiro de 5 dias por Lisboa com os melhores miradouros, restaurantes locais e dicas para fugir das multidões..."
              autoFocus
              className="rounded-2xl bg-white border-0 text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus-visible:ring-2 focus-visible:ring-[#9DCC36] focus-visible:ring-offset-0 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)] resize-none p-5"
              style={{ fontSize: '16px', minHeight: '180px', lineHeight: '1.5', overflow: 'hidden' }}
            />
            <div className="mt-2 flex justify-between text-[12px] text-[#6B6B6B]">
              <span>Mínimo 20 caracteres</span>
              <span>{remaining} restantes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent pointer-events-none z-10">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all pointer-events-auto',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
      </div>
    </motion.div >
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
      className="absolute inset-0 flex flex-col bg-[#F2F2F2]"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col min-h-full px-7 pt-20 pb-40">
          <div className="mt-auto">
            <StepDots current={3} total={TOTAL_QUESTION_STEPS} />
            <h1
              className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
              style={{ fontSize: '28px', fontWeight: 800 }}
            >
              Sobre o que é<br />seu roteiro?
            </h1>
            <p className="mt-2 text-[#6B6B6B] text-[13px] leading-snug max-w-[320px]">
              Selecione até 5 tags que descrevam a experiência.
            </p>

            <div className="mt-8 flex flex-col gap-6">
              {TAG_CATEGORIES.map((category) => (
                <div key={category.title}>
                  <h3 className="text-[15px] font-semibold text-[#0A0A0A] mb-3">
                    {category.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((t) => {
                      const isSelected = selected.includes(t.label);
                      const disabled = !isSelected && limitReached;
                      return (
                        <button
                          key={t.id}
                          onClick={() => onToggle(t.label)}
                          disabled={disabled}
                          className={cn(
                            'px-4 h-10 rounded-full text-[13px] font-semibold transition-all border flex items-center gap-1.5',
                            isSelected
                              ? 'bg-[#1A1C40] text-white border-[#1A1C40]'
                              : disabled
                                ? 'bg-white text-[#0A0A0A]/30 border-[#0A0A0A]/5 cursor-not-allowed'
                                : 'bg-white text-[#1A1C40] border-[#0A0A0A]/8 hover:border-[#9DCC36]'
                          )}
                        >
                          <span>{t.emoji}</span>
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-[12px] text-[#6B6B6B]">
              {selected.length}/5 selecionadas
            </p>
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent pointer-events-none z-10">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all pointer-events-auto',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
      </div>
    </motion.div >
  );
}

/* ---------------- Season ---------------- */

function SeasonScreen({
  value,
  onSelect,
  onNext,
  canAdvance,
}: {
  value: string;
  onSelect: (v: string) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-[#F2F2F2]"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col justify-end min-h-full px-7 pt-20 pb-40">
          <StepDots current={2} total={TOTAL_QUESTION_STEPS} />
          <h1
            className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
            style={{ fontSize: '28px', fontWeight: 800 }}
          >
            Esse roteiro é ideal para qual época do ano?
          </h1>
          <p className="mt-2 text-[#6B6B6B] text-[13px] leading-snug max-w-[320px]">
            Selecione a estação mais indicada para fazer esta viagem
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            {SEASONS_OPTIONS.map((s) => {
              const isSelected = value === s.label;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.label)}
                  className={cn(
                    'h-14 rounded-2xl px-5 flex items-center gap-3 transition-all border-2 text-[15px] font-semibold text-left',
                    isSelected
                      ? 'border-[#9DCC36] bg-[#9DCC36]/10 text-[#0A0A0A]'
                      : 'border-transparent bg-white text-[#0A0A0A] hover:border-[#0A0A0A]/10 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.04)]'
                  )}
                >
                  <span className="text-[18px]">{s.emoji}</span>
                  <span className="flex-1">{s.label}</span>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors border-2',
                      isSelected ? 'bg-[#9DCC36] border-[#9DCC36]' : 'border-[#0A0A0A]/25 bg-transparent'
                    )}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#0A0A0A]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent pointer-events-none z-10">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all pointer-events-auto',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
      </div>
    </motion.div >
  );
}

