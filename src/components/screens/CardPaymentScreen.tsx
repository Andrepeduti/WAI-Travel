import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

export interface SavedCard {
  number: string;
  name: string;
  expiry: string;
  brand: string | null;
  type: 'credit' | 'debit';
  last4: string;
}

interface CardPaymentScreenProps {
  onBack: () => void;
  onSave: (card: SavedCard) => void;
  onDelete?: () => void;
  initialData?: SavedCard;
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function getCardBrand(number: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(digits)) return 'Elo';
  return null;
}

export function CardPaymentScreen({ onBack, onSave, onDelete, initialData }: CardPaymentScreenProps) {
  const [cardNumber, setCardNumber] = useState(initialData?.number || '');
  const [cardName, setCardName] = useState(initialData?.name || '');
  const [expiry, setExpiry] = useState(initialData?.expiry || '');
  const [cvv, setCvv] = useState('');
  const [cardType, setCardType] = useState<'credit' | 'debit'>(initialData?.type || 'credit');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  const brand = getCardBrand(cardNumber);
  const hasCardNumber = cardNumber.replace(/\D/g, '').length >= 4;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13) newErrors.cardNumber = 'Número do cartão inválido';
    if (cardName.trim().length < 3) newErrors.cardName = 'Nome obrigatório';
    const expiryDigits = expiry.replace(/\D/g, '');
    if (expiryDigits.length < 4) {
      newErrors.expiry = 'Data inválida';
    } else {
      const month = parseInt(expiryDigits.slice(0, 2));
      if (month < 1 || month > 12) newErrors.expiry = 'Mês inválido';
    }
    if (cvv.length < 3) newErrors.cvv = 'CVV inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setIsSaving(true);
    const digits = cardNumber.replace(/\D/g, '');
    setTimeout(() => {
      setIsSaving(false);
      onSave({
        number: cardNumber,
        name: cardName,
        expiry,
        brand,
        type: cardType,
        last4: digits.slice(-4),
      });
    }, 800);
  };

  const handleCardNumberChange = (val: string) => {
    const formatted = formatCardNumber(val);
    setCardNumber(formatted);
    if (val.replace(/\D/g, '').length >= 16) nameRef.current?.focus();
  };

  const handleExpiryChange = (val: string) => {
    setExpiry(formatExpiry(val));
    if (val.replace(/\D/g, '').length >= 4) cvvRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton onClick={onBack} />
            <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">{initialData ? 'Editar cartão' : 'Adicionar cartão'}</h1>
          </div>
          {initialData && onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
              style={{ background: '#FEE2E2' }}
            >
              <Icon name="delete" size={20} style={{ color: '#DC2626' }} />
            </button>
          )}
        </div>
      </header>

      {/* Card form */}
      <div className="flex-1 overflow-y-auto pb-32 px-5 pt-5">
        {/* Card visual */}
        <div
          className="w-full rounded-2xl p-5 mb-6 relative overflow-hidden transition-all duration-500"
          style={{
            background: hasCardNumber
              ? 'linear-gradient(135deg, #1A1C40 0%, #2D3065 100%)'
              : 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
            minHeight: 180,
          }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-6 rounded transition-colors duration-500"
                style={{ background: hasCardNumber ? 'rgba(252, 211, 77, 0.8)' : 'rgba(255,255,255,0.25)' }}
              />
              <div
                className="w-5 h-5 rounded-full transition-colors duration-500"
                style={{ background: hasCardNumber ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)' }}
              />
            </div>
            <span
              className="text-xs font-medium uppercase tracking-wider transition-colors duration-500"
              style={{ color: hasCardNumber ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)' }}
            >
              {cardType === 'credit' ? 'Crédito' : 'Débito'}
            </span>
          </div>
          <p
            className="text-lg font-mono tracking-[0.2em] mb-6 transition-colors duration-500"
            style={{ color: hasCardNumber ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}
          >
            {cardNumber || '•••• •••• •••• ••••'}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase mb-0.5" style={{ color: hasCardNumber ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)' }}>Titular</p>
              <p className="text-sm font-medium truncate max-w-[200px] transition-colors duration-500" style={{ color: hasCardNumber ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}>
                {cardName || 'Seu nome aqui'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase mb-0.5" style={{ color: hasCardNumber ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)' }}>Validade</p>
              <p className="text-sm font-medium transition-colors duration-500" style={{ color: hasCardNumber ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}>{expiry || 'MM/AA'}</p>
            </div>
          </div>
          {brand && (
            <div className="absolute top-5 right-5">
              <span className="text-white/80 text-xs font-bold">{brand}</span>
            </div>
          )}
        </div>

        {/* Card type selector */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo do cartão</label>
          <div className="flex gap-2">
            {(['credit', 'debit'] as const).map((t) => {
              const isActive = cardType === t;
              return (
                <button
                  key={t}
                  onClick={() => setCardType(t)}
                  className="flex-1 h-12 rounded-xl font-semibold text-[14px] transition-all active:scale-[0.98]"
                  style={{
                    border: isActive ? '2px solid #9DCC36' : '2px solid #E5E7EB',
                    background: isActive ? 'rgba(157, 204, 54, 0.06)' : 'transparent',
                    color: isActive ? '#1A1C40' : '#6B7280',
                  }}
                >
                  {t === 'credit' ? 'Crédito' : 'Débito'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Card number */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Número do cartão</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              maxLength={19}
              className="w-full h-12 px-4 rounded-xl border-2 text-[15px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all"
              style={{ borderColor: errors.cardNumber ? '#EF4444' : '#E5E7EB', background: 'transparent' }}
              onFocus={(e) => (e.target.style.borderColor = '#9DCC36')}
              onBlur={(e) => { if (!errors.cardNumber) e.target.style.borderColor = '#E5E7EB'; }}
            />
            {errors.cardNumber && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.cardNumber}</p>}
          </div>

          {/* Card holder name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nome no cartão</label>
            <input
              ref={nameRef}
              type="text"
              placeholder="Como aparece no cartão"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              maxLength={50}
              className="w-full h-12 px-4 rounded-xl border-2 text-[15px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all uppercase"
              style={{ borderColor: errors.cardName ? '#EF4444' : '#E5E7EB', background: 'transparent' }}
              onFocus={(e) => (e.target.style.borderColor = '#9DCC36')}
              onBlur={(e) => { if (!errors.cardName) e.target.style.borderColor = '#E5E7EB'; }}
            />
            {errors.cardName && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.cardName}</p>}
          </div>

          {/* Expiry + CVV row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Validade</label>
              <input
                ref={expiryRef}
                type="tel"
                inputMode="numeric"
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => handleExpiryChange(e.target.value)}
                maxLength={5}
                className="w-full h-12 px-4 rounded-xl border-2 text-[15px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all"
                style={{ borderColor: errors.expiry ? '#EF4444' : '#E5E7EB', background: 'transparent' }}
                onFocus={(e) => (e.target.style.borderColor = '#9DCC36')}
                onBlur={(e) => { if (!errors.expiry) e.target.style.borderColor = '#E5E7EB'; }}
              />
              {errors.expiry && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.expiry}</p>}
            </div>
            <div className="w-[120px]">
              <label className="text-sm font-medium text-foreground mb-1.5 block">CVV</label>
              <input
                ref={cvvRef}
                type="tel"
                inputMode="numeric"
                placeholder="•••"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full h-12 px-4 rounded-xl border-2 text-[15px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all"
                style={{ borderColor: errors.cvv ? '#EF4444' : '#E5E7EB', background: 'transparent' }}
                onFocus={(e) => (e.target.style.borderColor = '#9DCC36')}
                onBlur={(e) => { if (!errors.cvv) e.target.style.borderColor = '#E5E7EB'; }}
              />
              {errors.cvv && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.cvv}</p>}
            </div>
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-center gap-2 mt-5 px-1">
          <Icon name="lock" size={14} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Seus dados são protegidos com criptografia de ponta a ponta</p>
        </div>
      </div>

      {/* Fixed footer */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-30 px-5 pt-4"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          style={{ background: '#9DCC36', color: '#141530' }}
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-[#141530]/30 border-t-[#141530] rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar cartão'
          )}
        </button>
      </div>

      {/* Delete confirmation bottom sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 pt-2">
              <h3 className="text-lg font-bold text-foreground">Excluir cartão</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-8 h-8 flex items-center justify-center"
              >
                <Icon name="close" size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl mb-4" style={{ background: '#FEF2F2' }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#FEE2E2' }}
                >
                  <Icon name="delete" size={22} style={{ color: '#DC2626' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Cartão final {initialData?.last4}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-2" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  toast.success('Cartão excluído com sucesso', {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="10" fill="#9DCC36" />
                        <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ),
                    style: { background: '#F4FAE6', border: 'none' },
                  });
                  onDelete?.();
                }}
                className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: '#9DCC36', color: '#141530' }}
              >
                Excluir cartão
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full h-12 text-muted-foreground text-xs font-medium transition-all active:scale-95 mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
