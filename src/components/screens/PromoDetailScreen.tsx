import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface PromoDetailScreenProps {
  onBack: () => void;
}

export function PromoDetailScreen({ onBack }: PromoDetailScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-5 pt-safe-top pb-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Promoção</h1>
        </div>
      </header>

      <div className="flex-1 px-5 pb-8">
        <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden mb-5">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"
            alt="Promoção de viagem"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(53, 135, 242, 0.12)' }}>
              <Icon name="local_offer" size={18} style={{ color: '#3587F2' }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3587F2' }}>Oferta especial</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground leading-tight">
            30% de desconto em roteiros premium
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Aproveite nossa promoção exclusiva! Por tempo limitado, todos os roteiros premium estão com 30% de desconto. 
            Explore destinos incríveis com guias detalhados, dicas locais e itinerários otimizados pela nossa IA.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            A oferta é válida até 15 de março de 2026. Não perca essa oportunidade de planejar sua próxima aventura!
          </p>

          <div className="pt-4">
            <button className="w-full h-12 rounded-xl font-semibold text-white text-base active:scale-[0.98] transition-transform" style={{ background: '#3587F2' }}>
              Aproveitar promoção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}