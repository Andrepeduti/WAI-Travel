import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoProcessingLoaderProps {
  /** Optional override for the rotating phrases */
  phrases?: string[];
}

const DEFAULT_PHRASES = [
  'Assistindo seu vídeo...',
  'Identificando lugares mencionados...',
  'Procurando restaurantes e cafés...',
  'Mapeando pontos turísticos...',
  'Buscando praias e paisagens...',
  'Descobrindo trilhas e montanhas...',
  'Organizando os melhores lugares...',
  'Quase lá, finalizando os detalhes...',
];

// Ilustrações vetoriais leves (emoji-style) - cada uma representa um tipo de lugar.
// Mantemos como SVG inline para evitar carregar imagens externas.
const ILLUSTRATIONS: Array<{ key: string; label: string; node: JSX.Element }> = [
  {
    key: 'restaurant',
    label: 'Restaurante',
    node: (
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="58" fill="#FFF4E6" />
        <path d="M40 30v30c0 6 4 10 10 10v22" stroke="#1A1C40" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 30v18M44 30v18" stroke="#1A1C40" strokeWidth="3" strokeLinecap="round" />
        <path d="M78 30c-6 0-10 8-10 18s4 14 10 14v30" stroke="#9DCC36" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'landmark',
    label: 'Ponto turístico',
    node: (
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="58" fill="#E8F0FF" />
        <path d="M60 22l4 10h-8l4-10z" fill="#1A1C40" />
        <path d="M50 40h20l-4 14H54l-4-14z" fill="#1A1C40" />
        <path d="M44 58h32l-6 36H50l-6-36z" stroke="#1A1C40" strokeWidth="3" />
        <path d="M52 70v18M60 70v18M68 70v18" stroke="#1A1C40" strokeWidth="2" />
        <path d="M38 94h44" stroke="#1A1C40" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'beach',
    label: 'Praia',
    node: (
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="58" fill="#CDE3F3" />
        <circle cx="86" cy="38" r="10" fill="#FFD66E" />
        <path d="M40 56c-6-4-14-2-18 2 4 0 8 2 10 6" stroke="#1A1C40" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 56c-2-8 2-16 10-18-4 4-4 10-2 14" stroke="#1A1C40" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 56l8 36" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 92c8-4 16-4 24 0s16 4 24 0 16-4 24 0" stroke="#1A1C40" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'mountain',
    label: 'Montanha',
    node: (
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="58" fill="#E6F4DC" />
        <path d="M18 88l22-36 14 22 12-18 22 32H18z" fill="#9DCC36" stroke="#1A1C40" strokeWidth="3" strokeLinejoin="round" />
        <path d="M34 64l6 6 6-8M62 60l4 4 6-6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="84" cy="34" r="6" fill="#FFD66E" />
      </svg>
    ),
  },
  {
    key: 'cafe',
    label: 'Café',
    node: (
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="58" fill="#F4E6D8" />
        <path d="M36 50h44v22a14 14 0 01-14 14H50a14 14 0 01-14-14V50z" stroke="#1A1C40" strokeWidth="3" />
        <path d="M80 56h6a8 8 0 010 16h-6" stroke="#1A1C40" strokeWidth="3" />
        <path d="M50 38c0-4 4-4 4-8M60 38c0-4 4-4 4-8M70 38c0-4 4-4 4-8" stroke="#1A1C40" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'museum',
    label: 'Museu',
    node: (
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="58" fill="#F0E6FF" />
        <path d="M28 50l32-18 32 18H28z" fill="#1A1C40" />
        <path d="M34 50v36M50 50v36M70 50v36M86 50v36" stroke="#1A1C40" strokeWidth="3" />
        <path d="M26 90h68" stroke="#1A1C40" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'park',
    label: 'Parque',
    node: (
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="58" fill="#E6F4DC" />
        <circle cx="60" cy="50" r="22" fill="#9DCC36" stroke="#1A1C40" strokeWidth="3" />
        <path d="M60 70v22" stroke="#8B5E3C" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 94h60" stroke="#1A1C40" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function VideoProcessingLoader({ phrases = DEFAULT_PHRASES }: VideoProcessingLoaderProps) {
  const [illIndex, setIllIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Troca ilustração a cada 2.4s (mais lento)
  useEffect(() => {
    const t = setInterval(() => {
      setIllIndex((i) => (i + 1) % ILLUSTRATIONS.length);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  // Troca frase a cada 3.2s (mais lento)
  useEffect(() => {
    const t = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 3200);
    return () => clearInterval(t);
  }, [phrases.length]);

  // Barra de progresso simulada: avança rápido no começo e desacelera perto do fim,
  // nunca chegando a 100% (a conclusão real fecha o loader).
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return 95;
        // Quanto mais perto de 95, menor o incremento
        const remaining = 95 - p;
        const step = Math.max(0.4, remaining * 0.04);
        return Math.min(95, p + step);
      });
    }, 220);
    return () => clearInterval(t);
  }, []);

  const current = ILLUSTRATIONS[illIndex];
  const phrase = phrases[phraseIndex];

  return (
    <div className="w-full flex flex-col items-center justify-center py-10 px-6">
      {/* Card com a ilustração */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Glow sutil */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at center, rgba(157,204,54,0.18) 0%, rgba(157,204,54,0) 65%)',
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, scale: 0.88, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative w-32 h-32"
          >
            {current.node}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Barra de progresso */}
      <div className="w-full max-w-[260px] mt-7">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-1.5 text-right">
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Frase rotativa */}
      <div className="mt-3 min-h-[44px] text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phrase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-[15px] font-semibold text-foreground"
            style={{ letterSpacing: '-0.01em' }}
          >
            {phrase}
          </motion.p>
        </AnimatePresence>
        <p className="text-xs text-muted-foreground mt-1.5">
          Isso pode levar alguns segundos
        </p>
      </div>
    </div>
  );
}
