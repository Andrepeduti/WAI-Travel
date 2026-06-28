import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Users, MapPin, Compass, Sparkles, DollarSign, TrendingUp, Star, Landmark, Palette, Theater, PartyPopper, ShoppingBag, Waves, Mountain, Footprints, Beer, Music, Tent, UtensilsCrossed, BedDouble, Luggage, ListChecks, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import scanImage from '@/assets/onboarding-scan-image.png';
import mapImage from '@/assets/onboarding-map.png';
import partnersImage from '@/assets/onboarding-partners.jpg';
import createImage from '@/assets/onboarding-create.jpg';
import monetizeImage from '@/assets/onboarding-monetize.jpg';
import walletImage from '@/assets/onboarding-wallet.png';
import notificationImage from '@/assets/onboarding-notification.png';
import people1 from '@/assets/onboarding-people-1.png';
import people2 from '@/assets/onboarding-people-2.png';
import people3 from '@/assets/onboarding-people-3.png';

interface OnboardingFlowProps {
  onComplete: (data: { name: string; username: string; city: string; birthdate: string; interests: string[]; goals: string[] }) => void;
  initialStep?: number;
  initialData?: Partial<{ name: string; username: string; city: string; birthdate: string; interests: string[]; goals: string[] }>;
  usernameError?: string | null;
}

export const GOAL_OPTIONS: { id: string; emoji: string; title: string; description: string }[] = [
  {
    id: 'organize',
    emoji: '🧳',
    title: 'Organizar minhas viagens',
    description: 'Planejar roteiros, organizar reservas e acompanhar tudo em um só lugar.',
  },
  {
    id: 'discover',
    emoji: '📍',
    title: 'Encontrar roteiros prontos',
    description: 'Descobrir e comprar roteiros criados por outros viajantes.',
  },
  {
    id: 'sell',
    emoji: '💰',
    title: 'Publicar e vender meus roteiros',
    description: 'Compartilhar minhas viagens e ganhar dinheiro com os roteiros que eu criar.',
  },
];

const INTERESTS: { label: string; emoji: string }[] = [
  { label: 'História', emoji: '🏛️' },
  { label: 'Arte', emoji: '🎨' },
  { label: 'Balada', emoji: '🎧' },
  { label: 'Shopping', emoji: '🛍️' },
  { label: 'Andar', emoji: '🚶' },
  { label: 'Montanhas', emoji: '⛰️' },
  { label: 'Escalada', emoji: '🧗' },
  { label: 'Bares', emoji: '🍸' },
  { label: 'Música', emoji: '🎵' },
  { label: 'Ar livre', emoji: '🌿' },
  { label: 'Agitado', emoji: '🎢' },
  { label: 'Praia', emoji: '🏖️' },
  { label: 'Gastronomia', emoji: '🍽️' },
];

const TOTAL_STEPS = 11;

// Cidades brasileiras populares para autocomplete
const CITIES = [
  'São Paulo, São Paulo',
  'Rio de Janeiro, Rio de Janeiro',
  'Belo Horizonte, Minas Gerais',
  'Brasília, Distrito Federal',
  'Salvador, Bahia',
  'Fortaleza, Ceará',
  'Curitiba, Paraná',
  'Porto Alegre, Rio Grande do Sul',
  'Recife, Pernambuco',
  'Manaus, Amazonas',
  'Uberlândia, Minas Gerais',
  'Campinas, São Paulo',
  'Florianópolis, Santa Catarina',
  'Goiânia, Goiás',
  'Vitória, Espírito Santo',
  'Natal, Rio Grande do Norte',
  'João Pessoa, Paraíba',
  'Maceió, Alagoas',
  'Aracaju, Sergipe',
  'Belém, Pará',
  'São Luís, Maranhão',
  'Teresina, Piauí',
  'Cuiabá, Mato Grosso',
  'Campo Grande, Mato Grosso do Sul',
  'Londrina, Paraná',
  'Ribeirão Preto, São Paulo',
  'Sorocaba, São Paulo',
  'Santos, São Paulo',
  'Niterói, Rio de Janeiro',
  'Juiz de Fora, Minas Gerais',
];

export function OnboardingFlow({ onComplete, initialStep = 0, initialData, usernameError }: OnboardingFlowProps) {
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState(initialData?.name ?? '');
  const [username, setUsername] = useState(initialData?.username ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [birthdate, setBirthdate] = useState(initialData?.birthdate ?? '');
  const [interests, setInterests] = useState<string[]>(initialData?.interests ?? []);
  const [goals, setGoals] = useState<string[]>(initialData?.goals ?? []);

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete({
        name: name.trim() || 'Viajante',
        username: username.trim().toLowerCase(),
        city: city.trim(),
        birthdate: birthdate.trim(),
        interests,
        goals,
      });
    }
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isValidBirthdate = (v: string) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return false;
    const [d, m, y] = v.split('/').map(Number);
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900 || y > new Date().getFullYear()) return false;
    const date = new Date(y, m - 1, d);
    return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y;
  };

  const isValidUsername = (v: string) => /^[a-z0-9_.]{3,20}$/.test(v.trim().toLowerCase());

  const canAdvance =
    step === 5 ? name.trim().length > 0 :
    step === 6 ? isValidUsername(username) :
    step === 7 ? city.trim().length > 0 :
    step === 8 ? isValidBirthdate(birthdate) :
    step === 9 ? interests.length > 0 :
    step === 10 ? goals.length > 0 :
    true;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F2F2F2] font-sans">
      {/* Top bar: back + progress dots + skip */}
      <div className={cn('absolute top-0 left-0 right-0 z-30', step <= 4 ? 'pt-12' : 'pt-4')}>
        <div className={step <= 4 ? 'px-3' : 'px-7'}>
          <div className={cn('flex items-center gap-3', step <= 4 && 'w-full max-w-[396px] mx-auto px-7')}>
            {/* Back button on the left for question screens */}
            {step > 4 && (
              <button
                onClick={back}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center transition-all bg-[#0A0A0A]/5 text-[#0A0A0A] hover:bg-[#0A0A0A]/10 shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            {step <= 4 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500',
                      i === step
                        ? 'w-5 bg-[#0A0A0A]'
                        : 'w-1.5 bg-[#0A0A0A]/20'
                    )}
                  />
                ))}
              </div>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {step <= 4 && (
                <button
                  onClick={() => setStep(5)}
                  className="h-10 px-3 rounded-full font-semibold transition-colors text-sm text-[#0A0A0A] bg-transparent hover:bg-[#0A0A0A]/5"
                >
                  Pular
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && <HeroScreen key="hero" onNext={next} />}
        {step === 1 && <TripOverviewScreen key="trip" onNext={next} onBack={back} />}
        {step === 2 && <PartnersScreen key="partners" onNext={next} onBack={back} />}
        {step === 3 && <AIItineraryScreen key="ai" onNext={next} onBack={back} />}
        {step === 4 && <MonetizeScreen key="monetize" onNext={next} onBack={back} />}
        {step === 5 && (
          <NameScreen
            key="name"
            value={name}
            onChange={setName}
            onNext={next}
            canAdvance={canAdvance}
          />
        )}
        {step === 6 && (
          <UsernameScreen
            key="username"
            value={username}
            onChange={setUsername}
            onNext={next}
            canAdvance={canAdvance}
            externalError={usernameError ?? null}
          />
        )}
        {step === 7 && (
          <CityScreen
            key="city"
            value={city}
            onChange={setCity}
            onNext={next}
            canAdvance={canAdvance}
          />
        )}
        {step === 8 && (
          <BirthdateScreen
            key="birthdate"
            value={birthdate}
            onChange={setBirthdate}
            onNext={next}
            canAdvance={canAdvance}
          />
        )}
        {step === 9 && (
          <InterestsScreen
            key="interests"
            selected={interests}
            onToggle={toggleInterest}
            onNext={next}
            canAdvance={canAdvance}
          />
        )}
        {step === 10 && (
          <GoalsScreen
            key="goals"
            selected={goals}
            onToggle={toggleGoal}
            onNext={next}
            canAdvance={canAdvance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Screens ---------------- */

function HeroScreen({ onNext }: { onNext: () => void }) {
  const [count, setCount] = useState(0);
  const [showTag, setShowTag] = useState(false);
  const [firstPassDone, setFirstPassDone] = useState(false);
  const [loopKey, setLoopKey] = useState(1);
  const TARGET = 14;

  const startCounter = () => {
    const duration = 900;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * TARGET));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const scanned = count >= TARGET;

  // Show tag on first scanner pass, then loop counter every cycle
  useEffect(() => {
    if (!firstPassDone) {
      const t = setTimeout(() => {
        setShowTag(true);
        startCounter();
        setFirstPassDone(true);
      }, 2601); // first descent (2.2s) + small buffer
      return () => clearTimeout(t);
    }

    // Loop counter every full scanner cycle (down + up)
    const interval = setInterval(() => {
      setLoopKey((k) => k + 1); // force pill re-animate
      setCount(0);
      startCounter();
    }, 6800); // 2.2 down + 1.2 delay + 2.2 up + 1.2 delay
    return () => clearInterval(interval);
  }, [firstPassDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2] px-3 pt-8 pb-2"
    >
      {/* Blue rounded card */}
      <div
        className="relative w-full h-full max-w-[396px] rounded-[30px] overflow-hidden flex flex-col"
        style={{ background: '#CDE3F3' }}
      >
        {/* Title block */}
        <div className="px-6 pt-24 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em] font-bold text-3xl"
            style={{ fontSize: '26px', fontWeight: 800 }}
          >
            Cole qualquer link e nós encontramos os lugares
          </h1>
          <p className="mt-2 text-[#6B6B6B] leading-snug text-[15px] font-medium">
            Extraímos os pontos do vídeo para você salvar, organizar e adicionar ao seu roteiro

          </p>
        </div>

        {/* Media container with scanner + floating emojis */}
        {/* pb-28 reserva ~112px para a fileira de FAB (56px) + bottom-4 + folga */}
        <div className="flex-1 relative px-6 flex flex-col items-center justify-center pb-28">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative w-[240px] aspect-[3/4] rounded-[22px] shadow-[0_18px_44px_-18px_rgba(10,10,10,0.3)]"
          >
            <img
              src={scanImage}
              alt="Travel itinerary preview"
              className="w-full h-full object-cover rounded-[22px]"
              draggable={false}
            />
            {/* Darkening overlay that fills as the scanner reads */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: firstPassDone ? 0.45 : 0.18 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 rounded-[22px] pointer-events-none bg-black"
            />
            {/* Scanner bar — loops down then up forever */}
            <motion.div
              initial={{ top: '-2%' }}
              animate={{ top: 'calc(100% - 3px)' }}
              transition={{
                duration: 2.2,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'reverse',
                repeatDelay: 1.2,
              }}
              className="absolute -left-3 -right-3 h-[3px] pointer-events-none"
              style={{
                background: '#7ED957',
                boxShadow:
                  '0 1px 6px rgba(126,217,87,0.9), 1px 0 6px rgba(126,217,87,0.55)',
              }}
            />
          </motion.div>

          {/* Floating emoji circles — closer to the image */}
          <FloatingEmoji emoji="🏛️" className="left-10 top-1/4" delay={0.35} float={6} />
          <FloatingEmoji emoji="🗺️" className="right-10 top-[18%]" delay={0.55} float={-7} />
          <FloatingEmoji emoji="📍" className="right-11 bottom-[40%]" delay={0.75} float={5} />

          {/* Result pill — loops after each scan pass */}
          {showTag && (
            <motion.div
              key={loopKey}
              initial={{ opacity: 1, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 inline-flex items-center justify-center h-10 px-5 rounded-full border-solid bg-[#c2e4ff] border border-cyan-600"
            >
              <span className="font-semibold tabular-nums text-violet-dark text-sm">
                +{count} lugares extraídos
              </span>
            </motion.div>
          )}
        </div>

        {/* CTA FAB inside the blue card */}
        <div className="absolute bottom-4 right-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onNext}
            className="w-14 h-14 rounded-full bg-[#9DCC36] shadow-[0_12px_28px_-10px_rgba(10,10,10,0.4)] flex items-center justify-center text-[#0A0A0A]"
            aria-label="Avançar"
          >
            <ArrowRight size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function TripOverviewScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const cards: { icon: LucideIcon; label: string; value: string; iconBg: string; iconColor: string }[] = [
    { icon: MapPin, label: 'Lugares', value: '45', iconBg: '#E8EEFF', iconColor: '#3B5BDB' },
    { icon: BedDouble, label: 'Reservas', value: '04', iconBg: '#FFE8D6', iconColor: '#D9480F' },
    { icon: DollarSign, label: 'Custo total', value: 'R$ 15k', iconBg: '#E6F4EA', iconColor: '#2F9E44' },
    { icon: ListChecks, label: 'Checklist', value: '50/90', iconBg: '#F3E8FF', iconColor: '#7048E8' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2] px-3 pt-8 pb-2"
    >
      <div
        className="relative w-full h-full max-w-[396px] rounded-[30px] overflow-hidden flex flex-col"
        style={{ background: '#EBE1C5' }}
      >
        {/* Title block */}
        <div className="px-6 pt-24 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em] font-bold"
            style={{ fontSize: '26px', fontWeight: 800 }}
          >
            Crie roteiros e planeje toda a sua viagem
          </h1>
          <p className="mt-2 text-[#6B6B6B] leading-snug text-[15px] font-medium">
            Monte, personalize e acompanhe tudo em um só app
          </p>
        </div>

        {/* Map + cards (cards overlap map at the bottom) */}
        {/* pb-32 reserva espaço para os cards que descem -bottom-10 + os FABs (56px + 16px) */}
        <div className="flex-1 relative flex flex-col items-center justify-center pb-32">
          <div className="relative">
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="w-[240px] aspect-[3/4] rounded-[22px] overflow-hidden shadow-[0_18px_44px_-18px_rgba(10,10,10,0.3)]"
            >
              <img
                src={mapImage}
                alt="Mapa do roteiro em Manhattan"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </motion.div>

            {/* Cards overlapping bottom of the map */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 z-10 w-screen max-w-[396px]">
              <SummaryCardsCarousel cards={cards} />
            </div>
          </div>
        </div>

        {/* CTAs — back (outline) + forward (primary) */}
        <div className="absolute bottom-4 left-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="w-14 h-14 rounded-full bg-transparent border border-[#0A0A0A]/35 flex items-center justify-center text-[#0A0A0A]"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
        <div className="absolute bottom-4 right-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onNext}
            className="w-14 h-14 rounded-full bg-[#9DCC36] shadow-[0_12px_28px_-10px_rgba(10,10,10,0.4)] flex items-center justify-center text-[#0A0A0A]"
            aria-label="Avançar"
          >
            <ArrowRight size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryCardsCarousel({
  cards,
}: {
  cards: { icon: LucideIcon; label: string; value: string; iconBg: string; iconColor: string }[];
}) {
  // Duplicate the list so the marquee can loop seamlessly
  const loop = [...cards, ...cards];

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
      className="w-full overflow-hidden"
    >
      <div className="pl-6">
        <motion.div
          className="flex gap-3 w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
        >
          {loop.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={`${c.label}-${idx}`}
                className="shrink-0 w-[108px] h-[108px] bg-white rounded-2xl shadow-[0_8px_22px_-10px_rgba(10,10,10,0.22)] px-3 py-3 flex flex-col justify-between"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: c.iconBg, color: c.iconColor }}
                >
                  <Icon size={16} strokeWidth={2.4} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="text-[#6B6B6B] text-[12px] font-medium leading-tight">
                    {c.label}
                  </div>
                  <div className="text-[#0A0A0A] text-[18px] font-extrabold tracking-[-0.01em] tabular-nums leading-none">
                    {c.value}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}


function PartnersScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const photos = [people1, people2, people3];
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(22000);

  // Carousel auto-rotation
  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % photos.length);
    }, 2200);
    return () => clearInterval(id);
  }, [photos.length]);

  // Live counter (rolling numbers)
  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 4) + 1);
    }, 800);
    return () => clearInterval(id);
  }, []);

  // Position offsets per slot relative to active: 0 = center, -1 = left, +1 = right
  const slotFor = (i: number) => {
    const diff = (i - active + photos.length) % photos.length;
    if (diff === 0) return 0;
    if (diff === 1) return 1;
    return -1;
  };

  const formatNumber = (n: number) =>
    n.toLocaleString('pt-BR').replace(/,/g, '.');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2] px-3 pt-8 pb-2"
    >
      <div
        className="relative w-full h-full max-w-[396px] rounded-[30px] overflow-hidden flex flex-col"
        style={{ background: '#D3ECCD' }}
      >
        {/* Title block */}
        <div className="px-6 pt-24 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em] font-bold"
            style={{ fontSize: '26px', fontWeight: 800 }}
          >
            Conheça pessoas para viajar junto
          </h1>
          <p className="mt-2 text-[#6B6B6B] leading-snug text-[15px] font-medium">
            Conecte-se com viajantes antes mesmo da próxima aventura começar
          </p>
        </div>

        {/* Photo stack carousel */}
        <div className="flex-1 relative flex flex-col items-center justify-center pb-28">
          <div className="relative w-[280px] h-[280px] flex items-center justify-center">
            {photos.map((src, i) => {
              const slot = slotFor(i);
              const isCenter = slot === 0;
              const baseRotate = i === 0 ? -6 : i === 1 ? 4 : -3;
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    x: slot * 80,
                    scale: isCenter ? 1 : 0.82,
                    rotate: isCenter ? baseRotate : slot * 8,
                    zIndex: isCenter ? 30 : 10,
                    opacity: isCenter ? 1 : 0.85,
                  }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute w-[200px] h-[270px] rounded-[18px] overflow-hidden shadow-[0_18px_44px_-18px_rgba(10,10,10,0.45)]"
                >
                  <img
                    src={src}
                    alt="Travel partners"
                    draggable={false}
                    className="w-full h-full object-cover rounded-[14px] select-none pointer-events-none"
                  />
                </motion.div>
              );
            })}

            {/* Floating emoji badges */}
            <FloatingEmoji emoji="👥" className="-left-2 bottom-12" delay={0.3} float={6} />
            <FloatingEmoji emoji="🍦" className="-right-2 -top-2" delay={0.5} float={-6} />
          </div>

          {/* Live counter pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 inline-flex items-center justify-center h-10 px-5 rounded-full bg-white border border-[#0A0A0A]/10 shadow-[0_6px_16px_-8px_rgba(10,10,10,0.18)]"
          >
            <span className="font-semibold tabular-nums text-[#0A0A0A] text-sm">
              +{formatNumber(count)} viajantes ativos
            </span>
          </motion.div>
        </div>

        {/* CTAs */}
        <div className="absolute bottom-4 left-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="w-14 h-14 rounded-full bg-transparent border border-[#0A0A0A]/35 flex items-center justify-center text-[#0A0A0A]"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
        <div className="absolute bottom-4 right-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onNext}
            className="w-14 h-14 rounded-full bg-[#9DCC36] shadow-[0_12px_28px_-10px_rgba(10,10,10,0.4)] flex items-center justify-center text-[#0A0A0A]"
            aria-label="Avançar"
          >
            <ArrowRight size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}


function AIItineraryScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  type Phase = 'idle' | 'clicking' | 'loading' | 'done';
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('clicking'), 700);
    const t2 = setTimeout(() => setPhase('loading'), 1500);
    const t3 = setTimeout(() => setPhase('done'), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const activities = [
    {
      time: '09:00',
      timeEnd: '10:30',
      number: 1,
      title: 'Casa de Anne Frank',
      tag: 'Museu',
      thumb: 'https://images.unsplash.com/photo-1558551649-e44c8f992010?auto=format&fit=crop&w=200&q=70',
      tagBg: '#FFF4D6',
    },
    {
      time: '11:00',
      timeEnd: '12:00',
      number: 2,
      title: 'Bloemenmarkt',
      tag: 'Mercado',
      thumb: 'https://images.unsplash.com/photo-1534351590666-13e3e96c5017?auto=format&fit=crop&w=200&q=70',
      tagBg: '#E8F1E8',
    },
    {
      time: '13:45',
      timeEnd: '15:15',
      number: 3,
      title: 'Heineken Experience',
      tag: 'Experiência',
      thumb: 'https://images.unsplash.com/photo-1558642891-54be180ea339?auto=format&fit=crop&w=200&q=70',
      tagBg: '#FFF4D6',
    },
  ];

  const isLoading = phase === 'loading';
  const isDone = phase === 'done';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2] px-3 pt-8 pb-2"
    >
      <div
        className="relative w-full h-full max-w-[396px] rounded-[30px] overflow-hidden flex flex-col"
        style={{ background: '#D0DAFF' }}
      >
        {/* Title block */}
        <div className="px-6 pt-24 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em] font-bold"
            style={{ fontSize: '26px', fontWeight: 800 }}
          >
            A IA monta. Você só ajusta.
          </h1>
          <p className="mt-2 text-[#6B6B6B] leading-snug text-[15px] font-medium">
            Crie roteiros inteligentes com horários, distâncias e paradas otimizadas.
          </p>
        </div>

        {/* Itinerary card area */}
        <div className="flex-1 relative flex flex-col items-center justify-center pb-28 px-6">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="w-full bg-[#F5F4EE] rounded-[20px] shadow-[0_18px_44px_-18px_rgba(10,10,10,0.25)] p-4"
          >
            {/* Day header */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[#0A0A0A] font-extrabold text-[15px] tracking-[-0.01em]">
                Qua 18/03
              </span>
              <span className="text-[#6B6B6B] text-[15px] font-medium">Dia 5</span>
            </div>

            {/* "Criar com IA" button (with animated cursor before loading) */}
            <div className="relative inline-flex mb-3">
              <motion.div
                animate={
                  phase === 'clicking'
                    ? { scale: [1, 0.94, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-gradient-to-r from-[#3B5BDB] to-[#7048E8] shadow-[0_4px_12px_-4px_rgba(59,91,219,0.5)]"
              >
                <Sparkles size={11} className="text-white" strokeWidth={2.6} />
                <span className="text-white text-[11px] font-semibold tracking-tight">
                  Otimizar rota
                </span>
              </motion.div>

              {/* Animated cursor pointer */}
              {(phase === 'idle' || phase === 'clicking') && (
                <motion.div
                  initial={{ opacity: 0, x: 30, y: 18 }}
                  animate={{
                    opacity: 1,
                    x: phase === 'clicking' ? 8 : 18,
                    y: phase === 'clicking' ? 4 : 12,
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 bottom-0 z-10 pointer-events-none"
                  style={{ translateX: '85%', translateY: '60%' }}
                >
                  <CursorIcon />
                  {phase === 'clicking' && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0.6 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="absolute -top-1 -left-1 w-5 h-5 rounded-full border-2 border-[#3B5BDB]"
                    />
                  )}
                </motion.div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!isDone ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isLoading ? 1 : 0.4 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-3"
                >
                  {[0, 1].map((i) => (
                    <ItinerarySkeleton key={i} delay={i * 0.15} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col relative"
                >
                  {activities.slice(0, 2).map((a, idx) => (
                    <motion.div
                      key={a.number}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex flex-col w-[42px] shrink-0">
                          <span className="text-[#0A0A0A] font-bold text-[12px] leading-tight">
                            {a.time}
                          </span>
                          <span className="text-[#9CA3AF] text-[11px] leading-tight">
                            {a.timeEnd}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0 bg-white rounded-xl shadow-[0_4px_14px_-6px_rgba(10,10,10,0.12)] pl-2 pr-2 py-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[#0A0A0A] text-[10px] font-bold"
                            style={{ background: a.tagBg }}
                          >
                            {a.number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[#0A0A0A] text-[12px] font-semibold leading-tight truncate">
                              {a.title}
                            </div>
                            <div className="mt-1 inline-flex items-center px-1.5 h-4 rounded-md bg-[#F2F2F2]">
                              <span className="text-[#8E8E93] text-[9px] font-medium">
                                {a.tag}
                              </span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#F2F2F2]">
                            <img
                              src={a.thumb}
                              alt={a.title}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pl-[54px] py-1">
                        <div className="w-3 h-3 rounded-full bg-[#F2F2F2] flex items-center justify-center">
                          <Footprints size={7} className="text-[#9CA3AF]" />
                        </div>
                        <span className="text-[#9CA3AF] text-[10px] font-medium">
                          0 min · 0 km
                        </span>
                        <ArrowRight size={9} className="text-[#9CA3AF]" />
                      </div>
                    </motion.div>
                  ))}

                  {/* Peek of the 3rd activity — fades out under a gradient */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="relative max-h-[28px] overflow-hidden mt-1"
                  >
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex flex-col w-[42px] shrink-0">
                        <span className="text-[#0A0A0A] font-bold text-[12px] leading-tight">
                          {activities[2].time}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-2 min-w-0 bg-white rounded-xl shadow-[0_4px_14px_-6px_rgba(10,10,10,0.12)] pl-2 pr-2 py-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[#0A0A0A] text-[10px] font-bold"
                          style={{ background: activities[2].tagBg }}
                        >
                          {activities[2].number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#0A0A0A] text-[12px] font-semibold leading-tight truncate">
                            {activities[2].title}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F5F4EE] pointer-events-none" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Status pill */}
          <motion.div
            key={isDone ? 'done' : 'gen'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-5 inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-[#0A0A0A]/15 bg-white/40"
          >
            <Sparkles size={12} className="text-[#0A0A0A]" strokeWidth={2.4} />
            <span className="text-[#0A0A0A] text-[13px] font-semibold">
              {isDone ? '5 segundos com IA' : 'Gerando...'}
            </span>
          </motion.div>
        </div>

        {/* CTAs */}
        <div className="absolute bottom-4 left-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="w-14 h-14 rounded-full bg-transparent border border-[#0A0A0A]/35 flex items-center justify-center text-[#0A0A0A]"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
        <div className="absolute bottom-4 right-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onNext}
            className="w-14 h-14 rounded-full bg-[#9DCC36] shadow-[0_12px_28px_-10px_rgba(10,10,10,0.4)] flex items-center justify-center text-[#0A0A0A]"
            aria-label="Avançar"
          >
            <ArrowRight size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function CursorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 2L3 14.5L6.5 11.5L8.8 16.5L11 15.5L8.8 10.7L13 10.5L3 2Z"
        fill="#0A0A0A"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonetizeScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  // Notification stack (each one slides up, older items shift up)
  const [notifs, setNotifs] = useState<number[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    let alive = true;

    const spawn = () => {
      if (!alive) return;
      const id = ++idRef.current;
      setNotifs((prev) => [...prev.slice(-2), id]); // keep max 3 visible
      // Remove after ~2.4s so the stack flows
      setTimeout(() => {
        if (!alive) return;
        setNotifs((prev) => prev.filter((n) => n !== id));
      }, 2400);
    };

    // Initial delay then spawn at intervals
    const initial = setTimeout(spawn, 600);
    const interval = setInterval(spawn, 1300);

    return () => {
      alive = false;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2] px-3 pt-8 pb-2"
    >
      <div
        className="relative w-full h-full max-w-[396px] rounded-[30px] overflow-hidden flex flex-col"
        style={{ background: '#D9D9D9' }}
      >
        {/* Title block */}
        <div className="px-6 pt-24 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em] font-bold"
            style={{ fontSize: '26px', fontWeight: 800 }}
          >
            Faça renda extra com a venda dos seus roteiros
          </h1>
          <p className="mt-2 text-[#6B6B6B] leading-snug text-[15px] font-medium">
            Monte, personalize e acompanhe tudo em um só app
          </p>
        </div>

        {/* Wallet visual area (image rendered as-is, no overlays) */}
        <div className="flex-1 relative flex flex-col items-center justify-end pb-28">
          <motion.img
            src={walletImage}
            alt="Roteiro guardado em uma carteira"
            draggable={false}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="w-[280px] max-w-[80%] h-auto select-none pointer-events-none"
          />

          {/* Notifications stack — overlaps wallet slightly */}
          <div className="absolute left-0 right-0 bottom-28 flex flex-col items-center pointer-events-none">
            <AnimatePresence initial={false}>
              {notifs.map((id, idx) => {
                const reverseIdx = notifs.length - 1 - idx; // 0 = newest at bottom
                return (
                  <motion.img
                    key={id}
                    src={notificationImage}
                    alt="Notificação de venda de roteiro"
                    draggable={false}
                    initial={{ y: 40, opacity: 0, scale: 0.96 }}
                    animate={{
                      y: -reverseIdx * 14,
                      opacity: 1 - reverseIdx * 0.18,
                      scale: 1 - reverseIdx * 0.04,
                    }}
                    exit={{ y: -60, opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ zIndex: 10 - reverseIdx }}
                    className="absolute bottom-0 w-[78%] max-w-[300px] h-auto rounded-xl shadow-[0_10px_30px_-12px_rgba(10,10,10,0.35)] select-none"
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* CTAs */}
        <div className="absolute bottom-4 left-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="w-14 h-14 rounded-full bg-transparent border border-[#0A0A0A]/35 flex items-center justify-center text-[#0A0A0A]"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
        <div className="absolute bottom-4 right-6 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onNext}
            className="w-14 h-14 rounded-full bg-[#9DCC36] shadow-[0_12px_28px_-10px_rgba(10,10,10,0.4)] flex items-center justify-center text-[#0A0A0A]"
            aria-label="Avançar"
          >
            <ArrowRight size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function ItinerarySkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex flex-col gap-1 w-[42px] shrink-0">
        <ShimmerBlock className="h-2.5 w-8 rounded" delay={delay} />
        <ShimmerBlock className="h-2 w-7 rounded" delay={delay + 0.05} />
      </div>
      <div className="flex-1 flex items-center gap-2 bg-white rounded-xl shadow-[0_4px_14px_-6px_rgba(10,10,10,0.12)] pl-2 pr-2 py-2">
        <ShimmerBlock className="w-5 h-5 rounded-full shrink-0" delay={delay} />
        <div className="flex-1 flex flex-col gap-1.5">
          <ShimmerBlock className="h-3 w-3/4 rounded" delay={delay + 0.05} />
          <ShimmerBlock className="h-2.5 w-1/3 rounded" delay={delay + 0.1} />
        </div>
        <ShimmerBlock className="w-10 h-10 rounded-lg shrink-0" delay={delay} />
      </div>
    </div>
  );
}

function ShimmerBlock({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div className={cn('relative overflow-hidden bg-[#EEF0F4]', className)}>
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.2, ease: 'linear', repeat: Infinity, delay }}
      />
    </div>
  );
}

function UsernameScreen({
  value,
  onChange,
  onNext,
  canAdvance,
  externalError = null,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  canAdvance: boolean;
  externalError?: string | null;
}) {
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim().toLowerCase();
  const formatValid = /^[a-z0-9_.]{3,20}$/.test(trimmed);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');

  useEffect(() => {
    if (!formatValid) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('profiles_public')
          .select('username')
          .eq('username', trimmed)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setAvailability('error');
        } else {
          setAvailability(data ? 'taken' : 'available');
        }
      } catch {
        if (!cancelled) setAvailability('error');
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed, formatValid]);

  const error =
    touched && trimmed.length === 0
      ? 'Por favor, escolha um nome de usuário.'
      : trimmed.length > 0 && !formatValid && touched
        ? 'Use 3 a 20 caracteres: letras minúsculas, números, "." ou "_".'
        : availability === 'taken'
          ? `O @${trimmed} já está em uso. Tente outro.`
          : externalError;

  const showAvailable = formatValid && availability === 'available';

  return (
    <QuestionLayout>
      <QuestionHeader
        step={1}
        title={<>Escolha seu nome<br />de usuário</>}
        subtitle="Outros viajantes poderão encontrar e marcar você"
      />
      <div className="mt-6">
        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#0A0A0A]/45 font-medium pointer-events-none" style={{ fontSize: '16px' }}>
            @
          </span>
          <Input
            value={value}
            onChange={(e) => {
              const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);
              onChange(cleaned);
              if (touched) setTouched(false);
            }}
            onBlur={() => setTouched(true)}
            placeholder="seunome"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={cn(
              'rounded-2xl bg-white pl-10 pr-12 text-[#0A0A0A] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-offset-0 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)]',
              error
                ? 'border border-[#E5484D] focus-visible:ring-[#E5484D]'
                : showAvailable
                  ? 'border border-[#9DCC36] focus-visible:ring-[#9DCC36]'
                  : 'border-0 focus-visible:ring-[#9DCC36]'
            )}
            style={{ fontSize: '16px', height: '56px' }}
          />
          {formatValid && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              {availability === 'checking' && (
                <span className="block w-4 h-4 rounded-full border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A]/60 animate-spin" />
              )}
              {availability === 'available' && (
                <Check size={18} className="text-[#5BA800]" strokeWidth={3} />
              )}
            </span>
          )}
        </div>
        <FieldError message={error} />
        {showAvailable && (
          <p className="mt-2 text-[15px] font-medium text-[#5BA800]">@{trimmed} está disponível</p>
        )}
      </div>
      <FooterPrimary onClick={onNext} disabled={!canAdvance || availability === 'taken' || availability === 'checking'}>
        Próximo
      </FooterPrimary>
    </QuestionLayout>
  );
}


function FloatingEmoji({
  emoji,
  className,
  delay = 0,
  float = 6,
}: {
  emoji: string;
  className?: string;
  delay?: number;
  float?: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: [0, -float, 0],
      }}
      transition={{
        scale: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.4, delay },
        y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.4 },
      }}
      className={cn(
        'absolute w-10 h-10 rounded-full bg-white shadow-[0_8px_20px_-6px_rgba(10,10,10,0.25)] flex items-center justify-center text-[18px] z-10',
        className
      )}
    >
      {emoji}
    </motion.div>
  );
}

function FeatureScreen({
  bg,
  title,
  subtitle,
  image,
  imageAlt,
  bullets,
  onNext,
}: {
  bg: string;
  title: string;
  subtitle: string;
  image?: string;
  imageAlt?: string;
  bullets?: { icon: LucideIcon; text: string }[];
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col"
      style={{ background: bg }}
    >
      <div className="flex-1 overflow-y-auto pt-24 pb-32">
        <div className="px-7">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em]"
            style={{ fontSize: '26px', fontWeight: 800 }}
          >
            {title}
          </h1>
          <p className="mt-3 text-[#0A0A0A]/70 text-[15px] leading-snug max-w-[320px]">
            {subtitle}
          </p>
        </div>

        {image && (
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 px-7"
          >
            <div className="relative w-full rounded-[22px] overflow-hidden shadow-[0_18px_40px_-18px_rgba(10,10,10,0.35)] aspect-[4/3]">
              <img
                src={image}
                alt={imageAlt ?? ''}
                loading="lazy"
                width={704}
                height={528}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        )}

        {bullets && bullets.length > 0 && (
          <div className="mt-6 px-7 space-y-2.5">
            {bullets.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                  className="flex items-center gap-3 bg-white/55 backdrop-blur-sm rounded-2xl px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#0A0A0A] flex-shrink-0 shadow-[0_4px_12px_-4px_rgba(10,10,10,0.15)]">
                    <Icon size={17} strokeWidth={2.2} />
                  </div>
                  <span className="text-[#0A0A0A] text-[13.5px] font-medium leading-snug">
                    {b.text}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <NextFab onClick={onNext} />
    </motion.div>
  );
}

function NameScreen({
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
  const [touched, setTouched] = useState(false);
  const error = touched && value.trim().length === 0 ? 'Por favor, digite seu nome.' : null;

  return (
    <QuestionLayout>
      <QuestionHeader
        step={0}
        title={<>Qual será seu nome<br />no perfil?</>}
        subtitle="É como seu nome aparecerá para outras pessoas."
      />
      <div className="mt-6">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (touched) setTouched(false);
          }}
          onBlur={() => setTouched(true)}
          placeholder="Digite seu nome"
          autoFocus
          autoCapitalize="words"
          className={cn(
            'rounded-2xl bg-white px-5 text-[#0A0A0A] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-offset-0 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)]',
            error
              ? 'border border-[#E5484D] focus-visible:ring-[#E5484D]'
              : 'border-0 focus-visible:ring-[#9DCC36]'
          )}
          style={{ fontSize: '16px', height: '56px' }}
        />
        <FieldError message={error} />
      </div>
      <FooterPrimary onClick={onNext} disabled={!canAdvance}>
        Próximo
      </FooterPrimary>
    </QuestionLayout>
  );
}

function CityScreen({
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
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedFromList, setSelectedFromList] = useState(false);

  // Geolocation and auto-detection states
  const [detecting, setDetecting] = useState(true);
  const [detectedCity, setDetectedCity] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    // If we already have a city value from parent (e.g. user went back/forward), don't auto-detect
    if (value) {
      setDetecting(false);
      setShowManualInput(true);
      setSelectedFromList(true);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada no seu navegador.');
      setDetecting(false);
      setShowManualInput(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Fetch reverse geocoding from OpenStreetMap Nominatim
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1&accept-language=pt-BR`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'waitravel-app-agent',
            },
          });
          const data = await res.json();
          const address = data.address || {};
          
          const cityName = address.city || address.town || address.village || address.municipality || address.suburb;
          const stateName = address.state || address.region;
          const countryName = address.country || '';

          if (cityName) {
            let formatted = cityName;
            if (stateName) {
              formatted += `, ${stateName}`;
            } else if (countryName) {
              formatted += `, ${countryName}`;
            }
            setDetectedCity(formatted);
          } else {
            // Geocoding succeeded but couldn't resolve a clear city name
            setShowManualInput(true);
          }
        } catch (err) {
          console.error('Erro na engenharia reversa de geolocalização:', err);
          setShowManualInput(true);
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.warn('Erro ao obter geolocalização:', error);
        setDetecting(false);
        setShowManualInput(true);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 }
    );
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    
    const query = value.trim();
    if (query.length < 2 || selectedFromList) {
      if (!selectedFromList) {
        setSuggestions([]);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`;
        const res = await fetch(url);
        const data = await res.json();
        const features = data.features || [];

        const cityTypes = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'municipality']);
        const results: string[] = [];
        const seen = new Set<string>();

        for (const f of features) {
          const props = f.properties || {};
          const osmKey = props.osm_key || '';
          const osmValue = props.osm_value || '';
          
          const isPlace = osmKey === 'place' && cityTypes.has(osmValue);
          
          if (isPlace && props.name) {
            const cityName = props.name;
            const state = props.state || '';
            const country = props.country || '';
            
            let formatted = cityName;
            if (state && state !== cityName) {
              formatted += `, ${state}`;
            }
            if (country) {
              formatted += `, ${country}`;
            }

            if (!seen.has(formatted.toLowerCase())) {
              seen.add(formatted.toLowerCase());
              results.push(formatted);
            }
          }
        }
        
        setSuggestions(results.slice(0, 5));
      } catch (err) {
        console.error('Erro ao buscar cidades na API do Photon:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [value, selectedFromList]);

  const showSuggestions = focused && suggestions.length > 0 && value !== '';

  const trimmed = value.trim();
  const error =
    touched && !focused && trimmed.length > 0 && !selectedFromList
      ? 'Selecione uma cidade da lista.'
      : touched && trimmed.length === 0 && showManualInput
        ? 'Por favor, informe sua cidade.'
        : null;

  return (
    <QuestionLayout>
      <QuestionHeader
        step={2}
        title={<>Em qual cidade<br />você vive?</>}
        subtitle="Usamos isso para mostrar pessoas e experiências perto de você."
      />
      <div className="mt-6">
        {detecting ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4 bg-white rounded-2xl p-6 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)] border border-[#0A0A0A]/5">
            <div className="w-8 h-8 border-3 border-[#9DCC36] border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] font-medium text-[#0A0A0A]/70 animate-pulse">Detectando sua localização atual...</p>
          </div>
        ) : detectedCity && !showManualInput ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col bg-white rounded-2xl p-6 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)] border border-[#0A0A0A]/5 gap-5"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MapPin className="text-[#9DCC36] flex-shrink-0" size={20} />
                <p className="text-[12px] font-bold text-[#0A0A0A]/40 uppercase tracking-wider">Localização Detectada</p>
              </div>
              <p className="text-[18px] font-bold text-[#0A0A0A] ml-7">{detectedCity}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  onChange(detectedCity);
                  setSelectedFromList(true);
                  setTimeout(() => onNext(), 100);
                }}
                className="w-full h-12 rounded-xl bg-[#9DCC36] text-[#0A0A0A] font-bold text-[14px] hover:brightness-105 transition-all shadow-[0_4px_12px_-4px_rgba(157,204,54,0.4)]"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setShowManualInput(true);
                }}
                className="w-full h-12 rounded-xl bg-[#F4F5F7] text-[#0A0A0A]/70 font-semibold text-[13px] hover:bg-[#0A0A0A]/5 transition-all"
              >
                Não é minha cidade (digitar)
              </button>
            </div>
          </motion.div>
        ) : (
          <div>
            <div className="relative">
              <Input
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setSelectedFromList(false);
                  if (touched) setTouched(false);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setTimeout(() => setFocused(false), 200);
                  setTouched(true);
                }}
                placeholder="Buscar sua cidade"
                autoFocus
                className={cn(
                  'rounded-2xl bg-white px-5 pr-10 text-[#0A0A0A] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-offset-0 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)]',
                  error
                    ? 'border border-[#E5484D] focus-visible:ring-[#E5484D]'
                    : 'border-0 focus-visible:ring-[#9DCC36]'
                )}
                style={{ fontSize: '16px', height: '56px' }}
              />
              {isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#9DCC36] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <FieldError message={error} />
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="mt-2 bg-white rounded-2xl shadow-[0_12px_28px_-8px_rgba(10,10,10,0.18)] overflow-hidden"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(s);
                        setSelectedFromList(true);
                        setFocused(false);
                        setTouched(false);
                      }}
                      className="w-full text-left px-5 py-3.5 text-[14px] text-[#0A0A0A] hover:bg-[#F5F5F1] transition-colors flex items-center gap-2.5 border-b border-[#0A0A0A]/5 last:border-0"
                    >
                      <MapPin size={15} className="text-[#9DCC36] flex-shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <FooterPrimary onClick={onNext} disabled={!canAdvance}>
              Próximo
            </FooterPrimary>
          </div>
        )}
      </div>
    </QuestionLayout>
  );
}


function BirthdateScreen({
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
  const [touched, setTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    onChange(formatted);
    if (touched) setTouched(false);
  };

  const validate = (v: string): string | null => {
    if (v.trim().length === 0) return 'Por favor, informe sua data de nascimento.';
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return 'Use o formato DD/MM/AAAA.';
    const [d, m, y] = v.split('/').map(Number);
    if (m < 1 || m > 12) return 'Mês inválido.';
    if (d < 1 || d > 31) return 'Dia inválido.';
    const currentYear = new Date().getFullYear();
    if (y < 1900 || y > currentYear) return `Ano deve estar entre 1900 e ${currentYear}.`;
    const date = new Date(y, m - 1, d);
    if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) {
      return 'Data inválida.';
    }
    return null;
  };

  const error = touched ? validate(value) : null;

  return (
    <QuestionLayout>
      <QuestionHeader
        step={3}
        title={<>Qual a sua data<br />de nascimento?</>}
      />
      <div className="mt-6">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder="DD / MM / AAAA"
          autoFocus
          inputMode="numeric"
          className={cn(
            'rounded-2xl bg-white px-5 text-[#0A0A0A] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-offset-0 shadow-[0_2px_8px_-2px_rgba(10,10,10,0.06)] tracking-[0.05em]',
            error
              ? 'border border-[#E5484D] focus-visible:ring-[#E5484D]'
              : 'border-0 focus-visible:ring-[#9DCC36]'
          )}
          style={{ fontSize: '16px', height: '56px' }}
        />
        <FieldError message={error} />
      </div>
      <FooterPrimary onClick={onNext} disabled={!canAdvance}>
        Próximo
      </FooterPrimary>
    </QuestionLayout>
  );
}

function FieldError({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="mt-2 text-[13px] text-[#E5484D] font-medium"
          role="alert"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}


function InterestsScreen({
  selected,
  onToggle,
  onNext,
  canAdvance,
}: {
  selected: string[];
  onToggle: (i: string) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  return (
    <QuestionLayout>
      <QuestionHeader
        step={4}
        title={<>O que mais combina<br />com você?</>}
        subtitle="Usamos isso para recomendar pessoas, lugares e roteiros."
      />
      <div className="mt-6 flex flex-wrap gap-2">
        {INTERESTS.map(({ label, emoji }) => {
          const active = selected.includes(label);
          return (
            <motion.button
              key={label}
              whileTap={{ scale: 0.94 }}
              onClick={() => onToggle(label)}
              className={cn(
                'h-9 px-3.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5',
                active
                  ? 'bg-[#1A1C40] text-white shadow-[0_4px_12px_-4px_rgba(26,28,64,0.4)]'
                  : 'bg-white text-[#0A0A0A] border border-[#0A0A0A]/8'
              )}
            >
              <span className="text-[14px] leading-none">{emoji}</span>
              {label}
            </motion.button>
          );
        })}
      </div>
      <FooterPrimary onClick={onNext} disabled={!canAdvance}>
        Próximo
      </FooterPrimary>
    </QuestionLayout>
  );
}

function GoalsScreen({
  selected,
  onToggle,
  onNext,
  canAdvance,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  canAdvance: boolean;
}) {
  return (
    <QuestionLayout>
      <QuestionHeader
        step={5}
        title={<>O que você pretende<br />fazer no WAI?</>}
        subtitle="Escolha a opção que mais combina com você. Você poderá alterar isso depois nas configurações."
      />
      <div className="mt-6 flex flex-col gap-2.5">
        {GOAL_OPTIONS.map(({ id, emoji, title, description }) => {
          const active = selected.includes(id);
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggle(id)}
              className={cn(
                'w-full text-left rounded-2xl p-4 flex items-start gap-3 transition-all',
                active
                  ? 'bg-[#1A1C40] shadow-[0_8px_22px_-10px_rgba(26,28,64,0.45)]'
                  : 'bg-white border border-[#0A0A0A]/8'
              )}
            >
              <span className="text-[22px] leading-none mt-0.5 shrink-0">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-[15px] font-bold leading-tight',
                    active ? 'text-white' : 'text-[#0A0A0A]'
                  )}
                >
                  {title}
                </p>
                <p
                  className={cn(
                    'mt-1 text-[13px] leading-snug',
                    active ? 'text-white/75' : 'text-[#6B6B6B]'
                  )}
                >
                  {description}
                </p>
              </div>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  active
                    ? 'bg-[#9DCC36] border-[#9DCC36]'
                    : 'border-[#0A0A0A]/20 bg-transparent'
                )}
              >
                {active && <Check size={12} strokeWidth={3} className="text-[#0A0A0A]" />}
              </div>
            </motion.button>
          );
        })}
      </div>
      <FooterPrimary onClick={onNext} disabled={!canAdvance}>
        Concluir
      </FooterPrimary>
    </QuestionLayout>
  );
}

/* ---------------- Question screens layout ---------------- */


function QuestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col bg-[#F2F2F2]"
    >
      {/* Empty top space (thumb zone — content lives in lower half) */}
      <div className="flex-1" />
      {/* Content — bottom half */}
      <div className="px-7 pb-32">
        {children}
      </div>
    </motion.div>
  );
}

function QuestionHeader({
  title,
  subtitle,
  step,
}: {
  title: React.ReactNode;
  subtitle?: string;
  step?: number;
}) {
  return (
    <>
      {typeof step === 'number' && (
        <div className="flex items-center gap-1.5 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500',
                i === step
                  ? 'w-5 bg-[#0A0A0A]'
                  : 'w-1.5 bg-[#0A0A0A]/20'
              )}
            />
          ))}
        </div>
      )}
      <h1
        className="text-[#0A0A0A] leading-[1.1] tracking-[-0.02em]"
        style={{ fontSize: '28px', fontWeight: 800 }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[#6B6B6B] text-[15px] leading-snug max-w-[320px]">
          {subtitle}
        </p>
      )}
    </>
  );
}

function FooterPrimary({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="absolute left-0 right-0 bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(
          'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all',
          disabled
            ? 'bg-[#E5E7DD] text-[#0A0A0A]/25 cursor-not-allowed opacity-60 pointer-events-none shadow-none'
            : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
        )}
      >
        {children}
      </button>
    </div>
  );
}

/* ---------------- Shared controls ---------------- */

function NextFab({ onClick }: { onClick: () => void }) {
  return (
    <div className="absolute bottom-8 right-7 z-20">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className="w-14 h-14 rounded-full bg-white shadow-[0_12px_32px_-10px_rgba(10,10,10,0.35)] flex items-center justify-center text-[#0A0A0A] border border-[#0A0A0A]/8"
        aria-label="Avançar"
      >
        <ArrowRight size={22} strokeWidth={2.2} />
      </motion.button>
    </div>
  );
}

function PrimaryFooterButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="px-6 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all active:scale-[0.99]',
          disabled
            ? 'bg-[#F4F5F7] text-[#0A0A0A]/35 cursor-not-allowed'
            : 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
        )}
      >
        {children}
      </button>
    </div>
  );
}
