import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, DollarSign, TrendingUp, Star, ShieldCheck, Sparkles, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export interface PublishItineraryResult {
  price: number;
  description: string;
  tags: string[];
  mainTag: string;
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
  initialMainTag?: string;
  onClose: () => void;
  onPublished?: (result: PublishItineraryResult) => void;
  onNavigateToSales?: () => void;
}

export const ITINERARY_TAG_OPTIONS = [
  'Praia', 'Natureza', 'Aventura', 'Gastronomia', 'Cultura', 'História',
  'Romance', 'Família', 'Mochilão', 'Luxo', 'Vida noturna', 'Compras',
  'Relaxamento', 'Esportes', 'Arquitetura', 'Arte', 'Festivais', 'Pet friendly',
];

const TOTAL_QUESTION_STEPS = 5; // Price, Description, Tags, MainTag, Review

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
  initialMainTag = '',
  onClose,
  onPublished,
  onNavigateToSales,
}: PublishItineraryFlowProps) {
  const [step, setStep] = useState(1);
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [mainTag, setMainTag] = useState<string>(initialMainTag);

  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!open) return null;

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

  const priceValid = isFree || (numericPrice >= 5 && numericPrice <= 999);
  const priceError = isFree
    ? null
    : touched && price.length > 0 && !priceValid
      ? 'O valor deve estar entre R$ 5,00 e R$ 999,00.'
      : touched && price.length === 0
        ? 'Defina um preço para o seu roteiro.'
        : null;

  const descriptionValid = description.trim().length >= 20;
  const tagsValid = tags.length >= 1 && tags.length <= 5;
  const mainTagValid = !!mainTag && tags.includes(mainTag);

  const LAST_STEP = 6;

  const next = () => {
    if (step < LAST_STEP) {
      setStep((s) => s + 1);
    } else {
      onPublished?.({
        price: numericPrice,
        description: description.trim(),
        tags,
        mainTag,
      });
      toast.success('Roteiro publicado!', {
        description: 'Agora ele está disponível no marketplace.',
      });
      handleClose();
      onNavigateToSales?.();
    }
  };

  const back = () => {
    if (step <= 1) {
      handleClose();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleClose = () => {
    setStep(1);
    setPrice('');
    setIsFree(false);
    setTouched(false);
    setDescription(initialDescription);
    setTags(initialTags);
    setMainTag(initialMainTag);
    onClose();
  };

  const toggleTag = (t: string) => {
    setTags((prev) => {
      if (prev.includes(t)) {
        return prev.filter((x) => x !== t);
      }
      if (prev.length >= 5) return prev;
      return [...prev, t];
    });
  };

  const canAdvance =
    step === 2 ? priceValid :
    step === 3 ? descriptionValid :
    step === 4 ? tagsValid :
    step === 5 ? mainTagValid :
    true;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#F2F2F2]">
      <div className="relative w-full h-full max-w-[430px] mx-auto overflow-hidden font-sans">
        {/* Top bar — only back button */}
        <div className={cn('absolute top-0 left-0 right-0 z-30', step <= 1 ? 'pt-[68px]' : 'pt-safe-top pb-3 bg-[#F2F2F2]')}>
          <div className={step <= 1 ? 'px-3' : 'px-7'}>
            <div className={cn('flex items-center', step <= 1 && 'w-full max-w-[396px] mx-auto px-7')}>
              <button
                onClick={back}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center transition-all bg-[#0A0A0A]/5 text-[#0A0A0A] hover:bg-[#0A0A0A]/10 shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && <IntroScreen key="intro" tripName={tripName} onNext={next} />}
          {step === 1 && <HowItWorksScreen key="how" onNext={next} />}
          {step === 2 && (
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
          {step === 3 && (
            <DescriptionScreen
              key="description"
              value={description}
              onChange={setDescription}
              onNext={next}
              canAdvance={canAdvance}
            />
          )}
          {step === 4 && (
            <TagsScreen
              key="tags"
              selected={tags}
              onToggle={toggleTag}
              onNext={next}
              canAdvance={canAdvance}
            />
          )}
          {step === 5 && (
            <MainTagScreen
              key="mainTag"
              tags={tags}
              mainTag={mainTag}
              onSetMainTag={setMainTag}
              onNext={next}
              canAdvance={canAdvance}
            />
          )}
          {step === 6 && (
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
              tags={tags}
              formatBRL={formatBRL}
              onPublish={next}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- Intro ---------------- */

function IntroScreen({ tripName, onNext }: { tripName?: string; onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2] px-3 pt-12 pb-3"
    >
      <div
        className="relative w-full h-full max-w-[396px] rounded-[30px] overflow-hidden flex flex-col"
        style={{ background: '#E8F1D4' }}
      >
        <div className="px-6 pt-24 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em]"
            style={{ fontSize: '34px', fontWeight: 800 }}
          >
            Torne-se um<br />criador de<br />roteiros
          </h1>
          <p className="mt-3 text-[#6B6B6B] leading-snug max-w-[280px] text-base">
            Publique{tripName ? ` "${tripName}"` : ' seu roteiro'} no marketplace
            e ganhe dinheiro com sua experiência de viagem.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="relative w-full max-w-[280px] aspect-square">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 rounded-full bg-[#9DCC36]/30 blur-2xl"
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-6 rounded-[28px] bg-white shadow-[0_20px_50px_-15px_rgba(10,10,10,0.25)] flex flex-col items-center justify-center gap-3 p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#9DCC36] flex items-center justify-center">
                <Sparkles size={32} strokeWidth={2.2} className="text-[#0A0A0A]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#6B6B6B] uppercase tracking-wide">Programa</p>
                <p className="text-[20px] font-extrabold text-[#0A0A0A] leading-tight">Criador WaiTravel</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onNext}
            className="h-14 px-7 rounded-full bg-[#9DCC36] text-[#0A0A0A] font-bold text-[15px] shadow-[0_12px_32px_-10px_rgba(157,204,54,0.7)] flex items-center gap-2"
          >
            Começar
            <span className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center">
              →
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorksScreen({ onNext }: { onNext: () => void }) {
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
          <p className="mt-3 text-[#6B6B6B] leading-snug max-w-[280px] text-[15px]">
            Quatro princípios que tornam a publicação simples e justa.
          </p>
        </div>

        <div className="flex-1 px-6 pt-6 pb-28 overflow-y-auto">
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

        <div className="absolute left-0 right-0 bottom-0 px-6 pb-6 pt-4 bg-gradient-to-t from-white via-white to-transparent">
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
      <div className="flex-1" />
      <div className="px-7 pb-32">
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

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
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
}) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const receiptId = `#${Math.floor(100000 + Math.random() * 900000)}`;
  const platformFee = numericPrice - earning;

  // Cover fallback
  const cover =
    coverImage ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 overflow-y-auto bg-[#F2F2F2]"
    >
      <div className="px-7 pt-20 pb-0">
        <StepDots current={3} total={TOTAL_QUESTION_STEPS} />
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
                    {tags.map((t) => (
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

        <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-[#9DCC36]/10">
          <Check size={16} strokeWidth={2.5} className="text-[#9DCC36] mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-[#1A1C40] leading-snug">
            Ao publicar você concorda com os termos do programa de criadores.
            Você pode despublicar a qualquer momento.
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 px-6 pb-8 pt-4 mt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent">
        <button
          onClick={onPublish}
          className="w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)] transition-all"
        >
          Publicar roteiro
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
      className="absolute inset-0 flex flex-col bg-[#F2F2F2] overflow-y-auto"
    >
      <div className="flex-1 min-h-0" />
      <div className="px-7 pb-40">
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

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------- Tags ---------------- */

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
  const [customInput, setCustomInput] = useState('');
  const limitReached = selected.length >= 5;

  const customSelected = selected.filter((t) => !ITINERARY_TAG_OPTIONS.includes(t));

  const addCustom = () => {
    const value = customInput.trim().slice(0, 24);
    if (!value) return;
    if (limitReached) {
      toast.error('Você já atingiu o limite de 5 tags.');
      return;
    }
    if (selected.some((t) => t.toLowerCase() === value.toLowerCase())) {
      toast.error('Essa tag já foi adicionada.');
      return;
    }
    onToggle(value);
    setCustomInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-[#F2F2F2]"
    >
      <div className="flex-1" />
      <div className="px-7 pb-40">
        <StepDots current={2} total={TOTAL_QUESTION_STEPS} />
        <h1
          className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
          style={{ fontSize: '28px', fontWeight: 800 }}
        >
          Sobre o que é<br />seu roteiro?
        </h1>
        <p className="mt-2 text-[#6B6B6B] text-[13px] leading-snug max-w-[320px]">
          Selecione até 5 tags que descrevam a experiência.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {ITINERARY_TAG_OPTIONS.map((t) => {
            const isSelected = selected.includes(t);
            const disabled = !isSelected && limitReached;
            return (
              <button
                key={t}
                onClick={() => onToggle(t)}
                disabled={disabled}
                className={cn(
                  'px-4 h-10 rounded-full text-[13px] font-semibold transition-all border',
                  isSelected
                    ? 'bg-[#1A1C40] text-white border-[#1A1C40]'
                    : disabled
                      ? 'bg-white text-[#0A0A0A]/30 border-[#0A0A0A]/5 cursor-not-allowed'
                      : 'bg-white text-[#1A1C40] border-[#0A0A0A]/8 hover:border-[#9DCC36]'
                )}
              >
                {t}
              </button>
            );
          })}
          {customSelected.map((t) => (
            <button
              key={t}
              onClick={() => onToggle(t)}
              className="px-4 h-10 rounded-full text-[13px] font-semibold transition-all border bg-[#1A1C40] text-white border-[#1A1C40]"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Adicionar tag personalizada */}
        <div className="mt-4 flex items-center gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.slice(0, 24))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Criar tag personalizada"
            disabled={limitReached}
            className="rounded-full bg-white border-0 h-10 px-4 text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus-visible:ring-2 focus-visible:ring-[#9DCC36]"
            style={{ fontSize: '16px' }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim() || limitReached}
            className={cn(
              'h-10 px-4 rounded-full text-[13px] font-semibold transition-all shrink-0',
              !customInput.trim() || limitReached
                ? 'bg-[#E5E7DD] text-[#0A0A0A]/30 cursor-not-allowed'
                : 'bg-[#1A1C40] text-white active:scale-[0.98]'
            )}
          >
            Adicionar
          </button>
        </div>

        <p className="mt-4 text-[12px] text-[#6B6B6B]">
          {selected.length}/5 selecionadas
        </p>
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------- MainTag ---------------- */

function MainTagScreen({
  tags,
  mainTag,
  onSetMainTag,
  onNext,
  canAdvance,
}: {
  tags: string[];
  mainTag: string;
  onSetMainTag: (t: string) => void;
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
      <div className="flex-1" />
      <div className="px-7 pb-40">
        <StepDots current={3} total={TOTAL_QUESTION_STEPS} />
        <h1
          className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
          style={{ fontSize: '28px', fontWeight: 800 }}
        >
          Qual é a tag<br />principal?
        </h1>
        <p className="mt-2 text-[#6B6B6B] text-[13px] leading-snug max-w-[320px]">
          Escolha a tag que melhor resume a experiência do seu roteiro.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => {
            const isMain = mainTag === t;
            return (
              <button
                key={t}
                onClick={() => onSetMainTag(t)}
                className={cn(
                  'px-4 h-10 rounded-full text-[13px] font-semibold transition-all border inline-flex items-center gap-1.5',
                  isMain
                    ? 'bg-[#9DCC36] text-[#0A0A0A] border-[#9DCC36]'
                    : 'bg-white text-[#1A1C40] border-[#0A0A0A]/8 hover:border-[#9DCC36]'
                )}
              >
                <span>{t}</span>
                {isMain && <Check size={14} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all',
            !canAdvance
              ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
              : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
          )}
        >
          Próximo
        </button>
      </div>
    </motion.div>
  );
}
