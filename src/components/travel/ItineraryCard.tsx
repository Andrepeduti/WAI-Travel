import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export interface ItineraryCardData {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  rating: number;
  reviewCount: number;
  price: number;
  author: string;
  authorImage: string;
  duration: string;
  cities: number;
}

interface ItineraryCardProps {
  itinerary: ItineraryCardData;
  onClick?: () => void;
  variant?: 'default' | 'featured' | 'compact';
  className?: string;
}

export function ItineraryCard({ itinerary, onClick, variant = 'default', className }: ItineraryCardProps) {
  if (variant === 'featured') {
    return (
      <button onClick={onClick} className={cn("relative w-full h-[280px] rounded-2xl overflow-hidden text-left group", className)}>
        <img src={itinerary.image} alt={itinerary.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 image-overlay" />
        <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
          <div className="flex items-center gap-2 mb-3">
            <img src={itinerary.authorImage} alt={itinerary.author} className="w-7 h-7 rounded-full object-cover border-2 border-white/30" />
            <span className="text-sm font-medium text-white/90">{itinerary.author}</span>
          </div>
          <h3 className="text-xl font-bold mb-2 leading-tight">{itinerary.title}</h3>
          <div className="flex items-center gap-3 text-sm text-white/80 mb-3">
            <div className="flex items-center gap-1">
              <Icon name="schedule" size={16} className="text-white/80" />
              <span>{itinerary.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="location_on" size={16} className="text-white/80" />
              <span>{itinerary.cities} cidades</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Icon name="star" size={16} filled className="text-[#F2B90C]" />
              <span className="font-semibold">{itinerary.rating}</span>
              <span className="text-white/70">({itinerary.reviewCount})</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
              <span className="font-bold">R$ {itinerary.price.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button onClick={onClick} className={cn("flex gap-3 p-3 card-elevated text-left w-full group", className)}>
        <img src={itinerary.image} alt={itinerary.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0 py-0.5">
          <h4 className="font-semibold text-[15px] mb-1 truncate">{itinerary.title}</h4>
          <p className="text-sm text-muted-foreground mb-2">{itinerary.subtitle}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Icon name="star" size={14} filled className="text-[#F2B90C]" />
              <span className="text-sm font-semibold">{itinerary.rating}</span>
            </div>
            <span className="text-primary font-bold text-sm">R$ {itinerary.price.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button onClick={onClick} className={cn("w-[260px] flex-shrink-0 card-elevated overflow-hidden text-left group", className)}>
      <div className="relative h-[128px]">
        <img src={itinerary.image} alt={itinerary.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {itinerary.rating >= 4.7 && (
          <div className="absolute top-2.5 left-2.5 inline-flex items-center h-5 rounded-2xl px-2.5" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
            <span className="font-medium" style={{ fontSize: '10px', color: '#1A1C40' }}>Recomendado</span>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5">
          <span className="text-[12px] font-bold text-primary">R$ {itinerary.price.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <img src={itinerary.authorImage} alt={itinerary.author} className="w-4 h-4 rounded-full object-cover" />
          <span className="text-[11px] text-muted-foreground truncate">{itinerary.author}</span>
        </div>
        <h4 className="font-bold text-[14px] leading-tight mb-0.5 line-clamp-1">{itinerary.title}</h4>
        <p className="text-[11px] text-muted-foreground mb-2 truncate">{itinerary.subtitle}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Icon name="star" size={12} filled className="text-[#F2B90C]" />
            <span className="text-[12px] font-semibold">{itinerary.rating}</span>
            <span className="text-[11px] text-muted-foreground">({itinerary.reviewCount})</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{itinerary.duration}</span>
        </div>
      </div>
    </button>
  );
}
