import { Icon } from '@/components/ui/Icon';
import { type SavedCard } from '@/components/screens/CardPaymentScreen';
import { BackButton } from '@/components/ui/BackButton';

interface ManageCardsScreenProps {
  cards: SavedCard[];
  onBack: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onAddCard: () => void;
}

export function ManageCardsScreen({ cards, onBack, onEdit, onAddCard }: ManageCardsScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-5 pt-safe-top pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Gerenciar cartões</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-32">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#F2F2F2' }}>
              <Icon name="credit_card" size={28} style={{ color: '#9CA3AF' }} />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Nenhum cartão cadastrado</p>
            <p className="text-sm text-muted-foreground text-center">Adicione um cartão para facilitar seus pagamentos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card, index) => {
              const hasNumber = card.number.replace(/\D/g, '').length >= 4;
              return (
                <button
                  key={`${card.last4}-${index}`}
                  onClick={() => onEdit(index)}
                  className="w-full rounded-2xl p-5 relative overflow-hidden text-left transition-all active:scale-[0.98]"
                  style={{
                    background: hasNumber
                      ? 'linear-gradient(135deg, #1A1C40 0%, #2D3065 100%)'
                      : 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
                    minHeight: 160,
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-6 rounded" style={{ background: 'rgba(252, 211, 77, 0.8)' }} />
                      <div className="w-5 h-5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {card.type === 'credit' ? 'Crédito' : 'Débito'}
                    </span>
                  </div>
                  <p className="text-white text-lg font-mono tracking-[0.2em] mb-5">
                    •••• •••• •••• {card.last4}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Titular</p>
                      <p className="text-white text-sm font-medium truncate max-w-[200px]">{card.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Validade</p>
                      <p className="text-white text-sm font-medium">{card.expiry}</p>
                    </div>
                  </div>
                  {card.brand && (
                    <div className="absolute top-5 right-5">
                      <span className="text-white/80 text-xs font-bold">{card.brand}</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Icon name="edit" size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                    <span className="text-[10px] font-medium">Editar</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-30 px-5 pt-4"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onAddCard}
          className="w-full h-14 rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: '#9DCC36', color: '#141530' }}
        >
          <Icon name="add" size={20} style={{ color: '#141530' }} />
          Adicionar cartão
        </button>
      </div>
    </div>
  );
}