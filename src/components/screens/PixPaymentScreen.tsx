import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface PixPaymentScreenProps {
  total: number;
  onBack: () => void;
  onExpired: () => void;
  onPaymentConfirmed: () => void;
}

const PIX_CODE = '00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890520400005303986540555.005802BR5925WAITRAVEL LTDA6009SAO PAULO62140510abc12345676304A1B2';

const TOTAL_SECONDS = 5 * 60;

export function PixPaymentScreen({ total, onBack, onExpired, onPaymentConfirmed }: PixPaymentScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [copied, setCopied] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpired();
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onExpired]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = secondsLeft / TOTAL_SECONDS;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(PIX_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, []);

  const isUrgent = secondsLeft <= 60;

  const truncatedCode = PIX_CODE.slice(0, 36) + '...';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-5 pt-safe-top pb-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-48">
        {/* Title & subtitle */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Icon name="schedule" size={40} style={{ color: '#1A1C40' }} />
          </div>
          <h2 className="text-xl font-bold text-foreground my-0 mt-[24px] mb-2">Aguardando pagamento</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Copie o código abaixo e faça o pagamento no Pix no seu aplicativo de pagamentos
          </p>
        </div>

        {/* Pix code row */}
        <button
          onClick={handleCopy}
          className="w-full rounded-2xl p-4 flex items-center gap-2 mb-8 active:scale-[0.98] transition-all"
          style={{ background: '#F2F2F2' }}
        >
          <span className="text-sm font-mono text-foreground truncate flex-1 text-left">{truncatedCode}</span>
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
            style={{ background: copied ? '#9DCC36' : '#1A1C40' }}
          >
            <Icon
              name={copied ? 'check' : 'content_copy'}
              size={16}
              style={{ color: '#fff' }}
            />
          </span>
        </button>

        {/* Timer section */}
        <div className="mb-2">
          <p className="text-sm text-muted-foreground mb-2">Tempo para realizar o pagamento:</p>
          <p className="text-4xl font-bold tabular-nums mb-3" style={{ color: isUrgent ? 'hsl(var(--destructive))' : '#1A1C40' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-border overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${progress * 100}%`,
                background: isUrgent ? 'hsl(var(--destructive))' : '#1A1C40',
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Após esse tempo, o pedido será cancelado.</p>
        </div>

        {/* Amount */}
        <div className="text-center my-6 py-4 rounded-2xl" style={{ background: '#F2F2F2' }}>
          <p className="text-sm text-muted-foreground mb-1">Valor a pagar</p>
          <p className="text-2xl font-bold text-foreground">R$ {total.toFixed(2).replace('.', ',')}</p>
        </div>

        {/* How it works */}
        <button
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="w-full text-center py-3 active:scale-[0.98] transition-all"
        >
          <span className="text-sm font-semibold underline" style={{ color: '#1A1C40' }}>
            Como funciona?
          </span>
        </button>

        {showHowItWorks && (
          <div className="rounded-2xl p-4 mt-2" style={{ background: '#F8F8F8' }}>
            <div className="space-y-3">
              {[
                'Copie o código Pix abaixo',
                'Abra o app do seu banco',
                'Escolha pagar com Pix "Copia e Cola"',
                'Cole o código e confirme o pagamento',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: '#1A1C40', color: '#fff' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed footer */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background border-t border-border z-30 px-5 pt-4 space-y-3"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleCopy}
          className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: '#9DCC36', color: '#141530' }}
        >
          {copied ? 'Código copiado!' : 'Copiar código'}
        </button>
        <button
          onClick={onPaymentConfirmed}
          className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-2"
          style={{ borderColor: '#1A1C40', color: '#1A1C40', background: 'transparent' }}
        >
          Já fiz o pagamento
        </button>
      </div>
    </div>
  );
}
