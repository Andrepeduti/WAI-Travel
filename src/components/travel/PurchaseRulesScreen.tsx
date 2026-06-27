import { motion } from 'framer-motion';
import { Infinity as InfinityIcon, Users, Gavel, CalendarRange } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';

interface PurchaseRulesScreenProps {
  onBack: () => void;
  onAccept: () => void;
}

const items = [
  {
    icon: InfinityIcon,
    title: 'Acesso vitalício',
    desc: 'O roteiro é seu para sempre.',
    color: '#E8F5D8',
  },
  {
    icon: CalendarRange,
    title: 'Personalize como quiser',
    desc: 'Edite datas e adicione novos lugares.',
    color: '#DDE7FB',
  },
  {
    icon: Users,
    title: '1 compartilhamento grátis',
    desc: 'Os próximos têm um custo adicional.',
    color: '#FCE7C8',
  },
  {
    icon: Gavel,
    title: 'Uso pessoal',
    desc: 'Proibido copiar, revender ou redistribuir.',
    color: '#F5D8E8',
  },
];

export function PurchaseRulesScreen({ onBack, onAccept }: PurchaseRulesScreenProps) {
  return (
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <BackButton onClick={onBack} />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col"
      >
        <div className="px-6 pt-6 pb-2">
          <h1
            className="text-[#0A0A0A] leading-[1.05] tracking-[-0.025em]"
            style={{ fontSize: '32px', fontWeight: 800 }}
          >
            Como funciona<br />o seu roteiro
          </h1>
          <p className="mt-3 text-[#6B6B6B] leading-snug max-w-[300px] text-[15px]">
            Confira o que está incluso antes de finalizar o pagamento.
          </p>
        </div>

        <div className="flex-1 px-6 pt-6 pb-36 overflow-y-auto">
          <div className="space-y-3">
            {items.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-[#0A0A0A]/5"
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
      </motion.div>

      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-6 pt-4 bg-gradient-to-t from-[#F2F2F2] via-[#F2F2F2] to-transparent"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onAccept}
          className="w-full h-14 rounded-2xl font-bold text-[15px] tracking-[-0.01em] bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)] transition-all"
        >
          Continuar para o pagamento
        </button>
      </div>
    </div>
  );
}
