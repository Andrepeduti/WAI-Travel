import { Icon } from '@/components/ui/Icon';
import { Sparkles } from 'lucide-react';

interface PlanLimitReachedSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  /** How many itineraries the user already has */
  currentCount?: number;
  /** Plan limit (default 3) */
  limit?: number;
}

/**
 * Bottom sheet shown when a free-plan user tries to create
 * an itinerary beyond the allowed limit (default: 3).
 * CTA leads to the subscription / upgrade screen.
 */
export function PlanLimitReachedSheet({
  isOpen,
  onClose,
  onUpgrade,
  currentCount = 3,
  limit = 3,
}: PlanLimitReachedSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full w-full bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-5 pt-1">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
            aria-label="Fechar"
          >
            <Icon name="close" size={18} className="text-foreground" />
          </button>
        </div>

        <div className="px-6 pb-8 pt-2 text-center">
          {/* Icon */}
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #9DCC36 0%, #7FB02E 100%)',
            }}
          >
            <Sparkles size={28} className="text-white" strokeWidth={2.2} />
          </div>

          {/* Title */}
          <h2 className="text-[20px] font-bold text-foreground mb-2">
            Limite de roteiros atingido
          </h2>

          {/* Description */}
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
            Você já criou {currentCount} de {limit} roteiros disponíveis no plano gratuito.
            Faça upgrade para criar roteiros ilimitados e desbloquear todos os recursos premium.
          </p>

          {/* Benefits */}
          <div className="bg-muted/40 rounded-2xl p-4 mb-6 text-left space-y-3">
            {[
              'Roteiros ilimitados',
              'Recursos exclusivos do Planner',
              'Suporte prioritário',
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#9DCC36' }}
                >
                  <Icon name="check" size={13} className="text-white" />
                </div>
                <span className="text-[13px] text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <button
            onClick={onUpgrade}
            className="w-full h-[48px] rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center active:scale-[0.98] transition-transform mb-3"
          >
            Ver planos
          </button>
          <button
            onClick={onClose}
            className="w-full h-[44px] text-[14px] font-medium text-secondary-dark"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
