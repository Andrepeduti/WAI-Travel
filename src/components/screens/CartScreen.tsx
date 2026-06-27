import { Icon } from '@/components/ui/Icon';
import { useCart } from '@/contexts/CartContext';
import { BackButton } from '@/components/ui/BackButton';

interface CartScreenProps {
  onBack: () => void;
  onResumeCheckout: (itineraryId: number) => void;
}

export function CartScreen({ onBack, onResumeCheckout }: CartScreenProps) {
  const { items, removeFromCart } = useCart();

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 py-4">
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Carrinho
          </h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
              <Icon name="shopping_cart" size={28} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold" style={{ fontSize: 'var(--text-base)' }}>
              Seu carrinho está vazio
            </p>
            <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-sm)' }}>
              Roteiros adicionados durante o checkout aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
              {items.length} {items.length === 1 ? 'roteiro pendente' : 'roteiros pendentes'}
            </p>

            {items.map(item => (
              <div
                key={item.itineraryId}
                className="rounded-2xl overflow-hidden bg-card"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {/* Image section */}
                <div className="relative h-[140px]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-sm font-bold" style={{ color: '#1A1C40' }}>
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromCart(item.itineraryId)}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Icon name="close" size={16} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Info section */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={item.authorImage} alt={item.author} className="w-5 h-5 rounded-full object-cover" />
                    <span className="text-xs text-muted-foreground">{item.author}</span>
                  </div>
                  <h4 className="font-bold text-[15px] mb-1 leading-tight text-foreground">{item.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Icon name="schedule" size={14} className="text-muted-foreground" />
                      <span>{item.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="location_on" size={14} className="text-muted-foreground" />
                      <span>{item.cities} cidades</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="location_on" size={14} className="text-muted-foreground" />
                      <span>{item.places} lugares</span>
                    </div>
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={() => onResumeCheckout(item.itineraryId)}
                    className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    style={{ background: '#9DCC36', color: '#141530' }}
                  >
                    Finalizar compra
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
