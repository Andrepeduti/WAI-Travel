import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface CheckoutItinerary {
  title: string;
  image: string;
  author: string;
  authorImage: string;
  duration: string;
  cities: number;
  places: number;
  price: number;
}

interface CheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  itinerary: CheckoutItinerary;
  onConfirm: () => void;
}

const paymentMethods = [
  { id: 'pix', label: 'Pix', icon: 'pix', description: 'Aprovação instantânea' },
  { id: 'credit', label: 'Cartão de crédito', icon: 'credit_card', description: 'Visa, Master, Elo' },
  { id: 'debit', label: 'Cartão de débito', icon: 'credit_card', description: 'Débito online' },
];

export function CheckoutSheet({ open, onClose, itinerary, onConfirm }: CheckoutSheetProps) {
  const [selectedMethod, setSelectedMethod] = useState('pix');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirm();
    }, 1800);
  };

  const serviceFee = itinerary.price * 0.1;
  const total = itinerary.price + serviceFee;

  const footer = (
    <button
      onClick={handleConfirm}
      disabled={isProcessing}
      className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
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
  );

  return (
    <BottomSheet
      open={open}
      onClose={isProcessing ? () => {} : onClose}
      title="Finalizar compra"
      maxHeight="90vh"
      zIndex={50}
      dismissOnBackdrop={!isProcessing}
      footer={footer}
    >
      {/* Itinerary summary */}
      <div className="pb-5">
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
      <div className="pb-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Método de pagamento</h3>
        <div className="space-y-2">
          {paymentMethods.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                disabled={isProcessing}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                style={{
                  border: isSelected ? '2px solid #9DCC36' : '2px solid #E5E7EB',
                  background: isSelected ? 'rgba(157, 204, 54, 0.06)' : 'transparent',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isSelected ? 'rgba(157, 204, 54, 0.12)' : '#F2F2F2',
                  }}
                >
                  <Icon name={method.icon} size={20} style={{ color: isSelected ? '#1A1C40' : '#6B7280' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                <div
                  className="w-[22px] h-[22px] rounded-full flex-shrink-0 transition-all"
                  style={{
                    border: isSelected ? '6px solid #9DCC36' : '2px solid #D1D5DB',
                    background: 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="pb-2">
        <div className="rounded-2xl p-4" style={{ background: '#F8F8F8' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Roteiro</span>
            <span className="text-sm text-foreground">R$ {itinerary.price.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted-foreground">Taxa de serviço (10%)</span>
            <span className="text-sm text-foreground">R$ {serviceFee.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-xl font-bold" style={{ color: '#1A1C40' }}>
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
