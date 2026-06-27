import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import planeImg from '@/assets/onboarding-plane.png';

interface OnboardingLoadingProps {
  onComplete: () => void;
}

type Phase = 0 | 1 | 2;

const PHASES: Array<{
  bg: string;
  title: string;
  subtitle?: string;
  duration: number;
}> = [
  {
    bg: '#CDE3F3',
    title: 'Estamos criando sua conta...',
    duration: 1400,
  },
  {
    bg: 'linear-gradient(90deg, #CDE3F3 0%, #CAED79 100%)',
    title: 'Personalizando sua experiência...',
    duration: 1400,
  },
  {
    bg: '#9DCC36',
    title: 'Tudo pronto!',
    subtitle: 'Seu app está pronto para começar',
    duration: 1100,
  },
];

export function OnboardingLoading({ onComplete }: OnboardingLoadingProps) {
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    const current = PHASES[phase];
    const t = setTimeout(() => {
      if (phase < 2) {
        setPhase((p) => (p + 1) as Phase);
      } else {
        onComplete();
      }
    }, current.duration);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const current = PHASES[phase];

  // Animação do avião por fase: aumenta sutilmente na transição, estabiliza no final
  const planeAnimation = (() => {
    if (phase === 2) {
      // Settle / chegada: leve bounce e estabiliza
      return {
        x: [0, 0],
        y: [-2, 0],
        rotate: [0, 0],
        transition: {
          duration: 0.6,
          ease: 'easeOut' as const,
        },
      };
    }
    const intensity = phase === 1 ? 1.15 : 1;
    return {
      x: [-6 * intensity, 6 * intensity, -6 * intensity],
      y: [0, -4 * intensity, 0],
      rotate: [-1.5, 1.5, -1.5],
      transition: {
        duration: phase === 1 ? 2.6 : 3.2,
        ease: 'easeInOut' as const,
        repeat: Infinity,
      },
    };
  })();

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Tela full-bleed */}
      <motion.div
        className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center"
        animate={{ background: current.bg }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{
          background: current.bg,
          fontFamily: 'Urbanist, system-ui, sans-serif',
        }}
      >
        {/* Glow sutil na fase final */}
        {phase === 2 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)',
            }}
          />
        )}

        {/* Avião */}
        <motion.div
          className="relative z-10"
          animate={planeAnimation}
        >
          <img
            src={planeImg}
            alt="Avião"
            className="w-[180px] h-auto select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>

        {/* Texto */}
        <div className="relative z-10 mt-8 px-8 text-center min-h-[64px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <p
                className="text-[#1A1C40] text-[17px] leading-snug"
                style={{ fontWeight: 600, letterSpacing: '-0.01em' }}
              >
                {current.title}
              </p>
              {current.subtitle && (
                <p
                  className="mt-2 text-[#1A1C40]/70 text-[13px]"
                  style={{ fontWeight: 500 }}
                >
                  {current.subtitle}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
