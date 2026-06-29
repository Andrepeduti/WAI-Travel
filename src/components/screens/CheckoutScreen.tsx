import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PixPaymentScreen } from '@/components/screens/PixPaymentScreen';
import { CardPaymentScreen, type SavedCard } from '@/components/screens/CardPaymentScreen';
import { ManageCardsScreen } from '@/components/screens/ManageCardsScreen';
import { BackButton } from '@/components/ui/BackButton';
import { useSavedCards } from '@/hooks/useSavedCards';


export interface CheckoutItinerary {
  title: string;
  image: string;
  author: string;
  authorImage: string;
  duration: string;
  cities: number;
  places: number;
  price: number;
}

interface CheckoutScreenProps {
  itinerary: CheckoutItinerary;
  onBack: () => void;
  onConfirm: () => void;
  onSaveForLater?: () => void;
}

const pixMethod = { id: 'pix', label: 'Pix', icon: 'pix', description: 'Aprovação instantânea' };

export function CheckoutScreen({ itinerary, onBack, onConfirm, onSaveForLater }: CheckoutScreenProps) {
  const [savedForLater, setSavedForLater] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPixScreen, setShowPixScreen] = useState(false);
  const [showCardScreen, setShowCardScreen] = useState(false);
  const [showManageCards, setShowManageCards] = useState(false);
  const { cards: savedCards, addCard, updateCard, removeCard } = useSavedCards();
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [installments, setInstallments] = useState(1);

  const total = itinerary.price;

  // Check if selected method is a credit card
  const selectedCard = savedCards.find((c) => `card-${c.last4}` === selectedMethod);
  const isCreditSelected = selectedCard?.type === 'credit';

  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const value = total / n;
    return { n, label: n === 1 ? `1x de R$ ${total.toFixed(2).replace('.', ',')} (sem juros)` : `${n}x de R$ ${value.toFixed(2).replace('.', ',')} (sem juros)` };
  });

  const proceedWithPayment = () => {
    if (selectedMethod === 'pix') {
      setShowPixScreen(true);
      return;
    }
    // Card payment
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirm();
    }, 1800);
  };

  const handleConfirm = () => {
    proceedWithPayment();
  };

  const handleSaveCard = (card: SavedCard) => {
    if (editingCardIndex !== null) {
      updateCard(editingCardIndex, card);
      setEditingCardIndex(null);
    } else {
      addCard(card);
    }
    setSelectedMethod(`card-${card.last4}`);
    setShowCardScreen(false);
  };

  const handleDeleteCard = (index: number) => {
    const card = savedCards[index];
    const cardId = `card-${card.last4}`;
    removeCard(index);
    if (selectedMethod === cardId) setSelectedMethod('pix');
  };

  const handleEditCard = (index: number) => {
    setEditingCardIndex(index);
    setShowCardScreen(true);
  };


  if (showManageCards) {
    if (showCardScreen) {
      const editCard = editingCardIndex !== null ? savedCards[editingCardIndex] : undefined;
      return (
        <CardPaymentScreen
          onBack={() => { setShowCardScreen(false); setEditingCardIndex(null); }}
          onSave={(card) => { handleSaveCard(card); setShowManageCards(true); }}
          onDelete={editingCardIndex !== null ? () => {
            handleDeleteCard(editingCardIndex);
            setShowCardScreen(false);
            setEditingCardIndex(null);
          } : undefined}
          initialData={editCard}
        />
      );
    }
    return (
      <ManageCardsScreen
        cards={savedCards}
        onBack={() => setShowManageCards(false)}
        onEdit={(index) => { setEditingCardIndex(index); setShowCardScreen(true); }}
        onDelete={handleDeleteCard}
        onAddCard={() => { setEditingCardIndex(null); setShowCardScreen(true); }}
      />
    );
  }

  if (showCardScreen) {
    return (
      <CardPaymentScreen
        onBack={() => { setShowCardScreen(false); setEditingCardIndex(null); }}
        onSave={handleSaveCard}
      />
    );
  }

  if (showPixScreen) {
    return (
      <PixPaymentScreen
        total={total}
        onBack={() => setShowPixScreen(false)}
        onExpired={() => setShowPixScreen(false)}
        onPaymentConfirmed={onConfirm}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-5 pt-safe-top pb-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Finalizar compra</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Itinerary summary */}
        <div className="px-5 pt-5 pb-5">
          <div className="flex gap-3 p-3 rounded-2xl" style={{ background: '#F8F8F8' }}>
            <img
              src={itinerary.image}
              alt={itinerary.title}
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-bold text-[15px] text-foreground leading-tight mb-1 truncate">{itinerary.title}</h3>
              <div className="flex items-center gap-2 mb-2">
                <img src={itinerary.authorImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-xs text-muted-foreground">{itinerary.author}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{itinerary.duration}</span>
                <span>•</span>
                <span>{itinerary.cities} cidades</span>
                <span>•</span>
                <span>{itinerary.places} locais</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Método de pagamento</h3>
            {savedCards.length > 0 && (
              <button
                onClick={() => setShowManageCards(true)}
                className="text-sm font-medium underline transition-all active:scale-95"
                style={{ color: '#1A1C40' }}
              >
                Gerenciar cartões
              </button>
            )}
          </div>
          <div className="space-y-2">
            {/* Pix option */}
            <button
              onClick={() => setSelectedMethod('pix')}
              disabled={isProcessing}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                border: selectedMethod === 'pix' ? '2px solid #9DCC36' : '2px solid #E5E7EB',
                background: selectedMethod === 'pix' ? 'rgba(157, 204, 54, 0.06)' : 'transparent',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: selectedMethod === 'pix' ? 'rgba(157, 204, 54, 0.12)' : '#F2F2F2',
                }}
              >
                <Icon name="pix" size={20} style={{ color: selectedMethod === 'pix' ? '#1A1C40' : '#6B7280' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] text-foreground">Pix</p>
                <p className="text-xs text-muted-foreground">Aprovação instantânea</p>
              </div>
              <div
                className="w-[22px] h-[22px] rounded-full flex-shrink-0 transition-all"
                style={{
                  border: selectedMethod === 'pix' ? '6px solid #9DCC36' : '2px solid #D1D5DB',
                  background: 'transparent',
                }}
              />
            </button>

            {/* Saved cards */}
            {savedCards.map((card, index) => {
              const cardId = `card-${card.last4}`;
              const isSelected = selectedMethod === cardId;
              const showInstallments = isSelected && card.type === 'credit';
              return (
                <div
                  key={cardId}
                  className="rounded-2xl transition-all overflow-hidden"
                  style={{
                    border: isSelected ? '2px solid #9DCC36' : '2px solid #E5E7EB',
                    background: isSelected ? 'rgba(157, 204, 54, 0.06)' : 'transparent',
                  }}
                >
                  <button
                    onClick={() => setSelectedMethod(cardId)}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-3 p-4 text-left transition-all active:scale-[0.98]"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isSelected ? 'rgba(157, 204, 54, 0.12)' : '#F2F2F2',
                      }}
                    >
                      <Icon name="credit_card" size={20} style={{ color: isSelected ? '#1A1C40' : '#6B7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] text-foreground">
                        {card.brand || 'Cartão'} •••• {card.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {card.type === 'credit' ? 'Crédito' : 'Débito'} • {card.expiry}
                      </p>
                    </div>
                    <div
                      className="w-[22px] h-[22px] rounded-full flex-shrink-0 transition-all"
                      style={{
                        border: isSelected ? '6px solid #9DCC36' : '2px solid #D1D5DB',
                        background: 'transparent',
                      }}
                    />
                  </button>
                  {showInstallments && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="border-t border-border/50 pt-3">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Parcelamento</label>
                        <div className="relative">
                          <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className="w-full h-10 px-3 rounded-lg border text-[14px] text-foreground outline-none transition-all bg-transparent cursor-pointer"
                            style={{ borderColor: '#E5E7EB', WebkitAppearance: 'none', appearance: 'none' }}
                            onFocus={(e) => (e.target.style.borderColor = '#9DCC36')}
                            onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                          >
                            {installmentOptions.map((opt) => (
                              <option key={opt.n} value={opt.n}>{opt.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Icon name="expand_more" size={18} className="text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add card button */}
            <button
              onClick={() => setShowCardScreen(true)}
              disabled={isProcessing}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{ border: '2px dashed #D1D5DB', background: 'transparent' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#F2F2F2' }}
              >
                <Icon name="add" size={22} style={{ color: '#6B7280' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] text-foreground">Adicionar cartão</p>
                <p className="text-xs text-muted-foreground">Crédito ou débito</p>
              </div>
              <Icon name="chevron_right" size={18} style={{ color: '#141530' }} />
            </button>
          </div>

        </div>

        {/* Price breakdown */}
        <div className="px-5 pb-5">
          <div className="rounded-2xl p-4" style={{ background: '#F8F8F8' }}>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-xl font-bold" style={{ color: '#1A1C40' }}>
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed footer */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card z-30 px-5 pt-4"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full h-12 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 px-3"
            style={{ background: '#9DCC36', color: '#141530' }}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-[#141530]/30 border-t-[#141530] rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>Confirmar pagamento</>
            )}
          </button>
          {onSaveForLater && (
            <button
              onClick={() => {
                if (savedForLater) return;
                onSaveForLater();
                setSavedForLater(true);
              }}
              disabled={isProcessing || savedForLater}
              className="w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-60 px-3"
              style={{ background: 'transparent', color: '#1A1C40', border: '2px solid #1A1C40' }}
            >
              {savedForLater ? 'Salvo no carrinho' : 'Salvar pra depois'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}