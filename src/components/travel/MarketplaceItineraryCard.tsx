import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import type { ItineraryBadge } from '@/lib/itineraryBadge';

export interface MarketplaceItineraryCardData {
  title: string;
  image: string;
  rating: number;
  places: number;
  days: number;
  author: string;
  authorImage: string;
  price: number;
  badge: ItineraryBadge | null;
}

interface MarketplaceItineraryCardProps {
  itinerary: MarketplaceItineraryCardData;
  onClick?: () => void;
  className?: string;
}

const BADGE_STYLES: Record<ItineraryBadge, { label: string; className: string }> = {
  destaque: { label: 'Destaque', className: 'bg-[#9DCC36] text-[#080B43]' },
  novo: { label: 'Novo roteiro', className: 'bg-[#2865B6] text-[#FEFEFE]' },
};

const formatDecimal = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

/**
 * Card de roteiro à venda (Home "Roteiros para você", listagens do marketplace).
 * O coração é só visual até a tela de Favoritos existir.
 */
export function MarketplaceItineraryCard({ itinerary, onClick, className }: MarketplaceItineraryCardProps) {
  const badge = itinerary.badge ? BADGE_STYLES[itinerary.badge] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('relative w-[305px] flex flex-col text-left active:scale-[0.99] transition-transform', className)}
    >
      <div className="relative w-full h-[135px] rounded-t-[8px] overflow-hidden bg-muted">
        <img src={itinerary.image} alt={itinerary.title} className="w-full h-full object-cover" />
      </div>

      {badge && (
        <span className={cn('absolute left-3 top-[15px] h-6 px-3 rounded-[9px] inline-flex items-center text-[12px] font-medium', badge.className)}>
          {badge.label}
        </span>
      )}

      <span
        aria-hidden
        className="absolute right-[17px] top-[10px] w-[33px] h-[33px] rounded-full bg-[#FEFEFE] flex items-center justify-center shadow-[0_3.3px_16.5px_rgba(0,0,0,0.1)]"
      >
        <Icon name="favorite" size={20} className="text-[#141530]" />
      </span>

      <div className="w-full bg-white rounded-b-[16px] p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-black truncate">{itinerary.title}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Icon name="star" filled size={17} className="text-[#FDAC2A]" />
              <span className="text-[14px] font-semibold text-[#141530]">
                {itinerary.rating > 0 ? formatDecimal(itinerary.rating, 1) : '-'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {itinerary.places > 0 && (
              <div className="flex items-center gap-1">
                <Icon name="location_on" size={16} className="text-[#646464]" />
                <span className="text-[14px] text-[#646464]">{itinerary.places} locais</span>
              </div>
            )}
            {itinerary.days > 0 && (
              <div className="flex items-center gap-1">
                <Icon name="calendar_today" size={16} className="text-[#646464]" />
                <span className="text-[14px] text-[#646464]">{itinerary.days} {itinerary.days === 1 ? 'dia' : 'dias'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar src={itinerary.authorImage} alt={itinerary.author} size={22} />
            <span className="text-[14px] font-medium text-[#141530] truncate">{itinerary.author}</span>
          </div>
          {itinerary.price > 0 && (
            <span className="text-[16px] font-bold text-[#141530] flex-shrink-0">R$ {formatDecimal(itinerary.price, 2)}</span>
          )}
        </div>
      </div>
    </button>
  );
}
