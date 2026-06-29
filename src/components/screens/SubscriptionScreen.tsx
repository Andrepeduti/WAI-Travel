import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { BackButton } from '@/components/ui/BackButton';

interface SubscriptionScreenProps {
  onBack: () => void;
}

type PlanKey = 'free' | 'pro' | 'creator';
type Billing = 'monthly' | 'yearly';
type PaymentMethod = 'pix' | 'card';

interface Plan {
  key: PlanKey;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  features: string[];
  badge?: string;
  ctaLabel: string;
  // Visual
  gradient: string;
  textColor: string;
  pillBg: string;
  iconColor: string;
  ctaBg: string;
  ctaText: string;
}

const plans: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    description: 'Para explorar e testar',
    monthly: 0,
    yearly: 0,
    features: [
      'Acessar roteiros gratuitos',
      'Visualizar destinos',
      'Salvar favoritos (limitado)',
    ],
    ctaLabel: 'Plano atual',
    gradient: 'linear-gradient(160deg, #F7F7F7 0%, #E8E8EC 100%)',
    textColor: '#1A1C40',
    pillBg: 'rgba(26, 28, 64, 0.06)',
    iconColor: '#1A1C40',
    ctaBg: 'rgba(26, 28, 64, 0.08)',
    ctaText: '#1A1C40',
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Para planejar melhor suas viagens',
    monthly: 19.90,
    yearly: 191.04, // 20% off
    badge: 'Mais popular',
    features: [
      'Acesso a roteiros premium',
      'Criar roteiros ilimitados',
      'Download offline',
      'Organização avançada',
    ],
    ctaLabel: 'Assinar Pro',
    gradient: 'linear-gradient(160deg, #B8E04F 0%, #9DCC36 60%, #7FB31E 100%)',
    textColor: '#1A1C40',
    pillBg: 'rgba(255, 255, 255, 0.35)',
    iconColor: '#1A1C40',
    ctaBg: '#1A1C40',
    ctaText: '#FFFFFF',
  },
  {
    key: 'creator',
    name: 'Criador',
    description: 'Para criar e monetizar roteiros',
    monthly: 39.90,
    yearly: 383.04,
    features: [
      'Publicar roteiros',
      'Monetizar conteúdo',
      'Insights de desempenho',
      'Destaque no perfil',
    ],
    ctaLabel: 'Começar como Criador',
    gradient: 'linear-gradient(160deg, #2A2D5C 0%, #1A1C40 55%, #0F1130 100%)',
    textColor: '#FFFFFF',
    pillBg: 'rgba(255, 255, 255, 0.10)',
    iconColor: '#9DCC36',
    ctaBg: '#9DCC36',
    ctaText: '#1A1C40',
  },
];

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SubscriptionScreen({ onBack }: SubscriptionScreenProps) {
  const [currentPlan] = useState<PlanKey>('free');
  const [billing, setBilling] = useState<Billing>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [showPayment, setShowPayment] = useState(false);
  const [hasCpfSaved] = useState(false);
  const [cpf, setCpf] = useState('');

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const isCpfValid = hasCpfSaved || cpf.replace(/\D/g, '').length === 11;

  const handleSelectPlan = (key: PlanKey) => {
    if (key === currentPlan) return;
    setSelectedPlan(key);
    setShowPayment(true);
  };

  const handleConfirm = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  const selectedPlanData = plans.find(p => p.key === selectedPlan);
  const selectedPriceLabel = selectedPlanData
    ? billing === 'monthly'
      ? `${formatBRL(selectedPlanData.monthly)}/mês`
      : `${formatBRL(selectedPlanData.yearly)}/ano`
    : '';

  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pb-3">
        <BackButton onClick={onBack} />
        <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
          Planos
        </h1>
      </div>

      {/* Subtitle */}
      <div className="px-5 mt-2 mb-5">
        <p className="text-muted-foreground" style={{ fontSize: '14px', lineHeight: 1.4 }}>
          Desbloqueie recursos para planejar, explorar e compartilhar roteiros
        </p>
      </div>

      {/* Billing toggle */}
      <div className="px-5 mb-6 flex justify-center">
        <div
          className="inline-flex items-center p-1 rounded-full"
          style={{ background: 'rgba(26, 28, 64, 0.06)' }}
        >
          <button
            onClick={() => setBilling('monthly')}
            className="h-8 px-4 rounded-full transition-all"
            style={{
              background: billing === 'monthly' ? '#FFFFFF' : 'transparent',
              boxShadow: billing === 'monthly' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1A1C40',
            }}
          >
            Mensal
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className="h-8 px-4 rounded-full transition-all inline-flex items-center gap-1.5"
            style={{
              background: billing === 'yearly' ? '#FFFFFF' : 'transparent',
              boxShadow: billing === 'yearly' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1A1C40',
            }}
          >
            Anual
            <span
              className="inline-flex items-center h-5 rounded-full px-1.5"
              style={{ background: '#9DCC36', color: '#1A1C40', fontSize: '9px', fontWeight: 700 }}
            >
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans carousel */}
      <div className="pl-5">
        <HorizontalCarousel showDots itemClassName="w-[300px]">
          {plans.map(plan => {
            const isCurrent = plan.key === currentPlan;
            const price = billing === 'monthly' ? plan.monthly : plan.yearly;
            const priceUnit = billing === 'monthly' ? '/mês' : '/ano';
            return (
              <div
                key={plan.key}
                className="relative w-full rounded-3xl p-6 flex flex-col"
                style={{
                  background: plan.gradient,
                  minHeight: '470px',
                  boxShadow: '0 8px 24px rgba(26, 28, 64, 0.12)',
                  color: plan.textColor,
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <span
                    className="absolute top-4 right-4 inline-flex items-center h-6 rounded-full px-2.5"
                    style={{
                      background: '#1A1C40',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                    }}
                  >
                    {plan.badge}
                  </span>
                )}

                {/* Plan name */}
                <span style={{ fontSize: '22px', fontWeight: 800, color: plan.textColor }}>
                  {plan.name}
                </span>
                <span
                  className="mt-1 mb-5"
                  style={{ fontSize: '13px', opacity: 0.75, color: plan.textColor }}
                >
                  {plan.description}
                </span>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  {price === 0 ? (
                    <span style={{ fontSize: '36px', fontWeight: 800, color: plan.textColor }}>
                      R$ 0
                    </span>
                  ) : (
                    <>
                      <span style={{ fontSize: '36px', fontWeight: 800, color: plan.textColor, lineHeight: 1 }}>
                        {formatBRL(price).replace('R$', 'R$ ')}
                      </span>
                      <span style={{ fontSize: '13px', opacity: 0.7, color: plan.textColor }}>
                        {priceUnit}
                      </span>
                    </>
                  )}
                </div>

                {/* Features */}
                <div className="flex flex-col gap-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-2"
                      style={{ background: plan.pillBg }}
                    >
                      <Icon name="check_circle" size={14} filled style={{ color: plan.iconColor }} />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: plan.textColor }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isCurrent}
                  className="w-full h-12 rounded-2xl flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: plan.ctaBg,
                    color: plan.ctaText,
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  {isCurrent ? 'Plano atual' : plan.ctaLabel}
                </button>
              </div>
            );
          })}
        </HorizontalCarousel>
      </div>

      {/* Footer note */}
      <div className="px-5 mt-6 text-center">
        <p className="text-muted-foreground" style={{ fontSize: '11px', lineHeight: 1.5 }}>
          Cancele quando quiser. Renovação automática.
        </p>
      </div>

      {/* Payment Bottom Sheet */}
      {showPayment && selectedPlanData && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPayment(false)} />
          <div className="relative w-full max-w-[430px] bg-background rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />
            <h3 className="text-foreground text-center mb-1" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Assinar plano {selectedPlanData.name}
            </h3>
            <p className="text-center mb-5" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', color: '#1A1C40' }}>
              {selectedPriceLabel}
            </p>

            {/* Payment method */}
            <span className="text-foreground block mb-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Forma de pagamento
            </span>
            <div className="space-y-2 mb-5">
              {([
                { key: 'pix' as PaymentMethod, label: 'Pix', icon: 'pix' },
                { key: 'card' as PaymentMethod, label: 'Cartão de crédito/débito', icon: 'credit_card' },
              ]).map(method => (
                <button
                  key={method.key}
                  onClick={() => setPaymentMethod(method.key)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: paymentMethod === method.key ? '#1A1C40' : 'hsl(var(--divider))',
                    background: paymentMethod === method.key ? 'rgba(26,28,64,0.04)' : 'transparent',
                  }}
                >
                  <Icon name={method.icon} size={20} className="text-muted-foreground" />
                  <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    {method.label}
                  </span>
                  <div
                    className="ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: paymentMethod === method.key ? '#1A1C40' : 'hsl(var(--muted-foreground) / 0.3)' }}
                  >
                    {paymentMethod === method.key && (
                      <div className="w-3 h-3 rounded-full" style={{ background: '#1A1C40' }} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {!hasCpfSaved && (
              <div className="mb-5">
                <label className="text-foreground block mb-2" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                  CPF
                </label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full rounded-xl border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
                  style={{ fontSize: '16px', borderColor: 'hsl(var(--divider))' }}
                  inputMode="numeric"
                />
                <span className="text-muted-foreground mt-1 block" style={{ fontSize: 'var(--text-xs)' }}>
                  Obrigatório para transações financeiras
                </span>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!isCpfValid}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', padding: '14px' }}
            >
              Confirmar assinatura
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
