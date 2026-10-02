import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { Icon } from '@/components/ui/Icon';
import type { UserItinerary } from '@/lib/itinerariesApi';
import { daysBetween, formatTripRange, getTripRange, tripCover } from '@/lib/tripDisplay';
import { HomeSectionHeader } from './HomeSectionHeader';

interface NextTripSectionProps {
  itineraries: UserItinerary[];
  onItineraryClick?: (itinerary: UserItinerary) => void;
}

function countdownLabel(it: UserItinerary): string {
  const range = getTripRange(it);
  if (!range) return '';
  const days = daysBetween(new Date(), range.start);
  return days <= 1 ? 'Amanhã' : `Em ${days} dias`;
}

/** Módulo "Sua próxima viagem" (prioridade 3). */
export function NextTripSection({ itineraries, onItineraryClick }: NextTripSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Sua próxima viagem" />
      <HorizontalCarousel showDots={false} itemClassName="w-[calc(100%-16px)]">
        {itineraries.map((it) => {
          const cover = tripCover(it);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onItineraryClick?.(it)}
              className="relative block w-full h-[177px] rounded-[20px] overflow-hidden text-left bg-[#141530] active:scale-[0.99] transition-transform"
            >
              {cover && <img src={cover} alt={it.title} className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
              <span className="absolute left-4 top-4 h-8 px-4 rounded-[9px] bg-[#F2B90C] inline-flex items-center text-[16px] font-medium text-[#141530]">
                {countdownLabel(it)}
              </span>
              <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 text-white">
                <h3 className="text-[22px] leading-tight font-bold truncate">{it.title}</h3>
                <span className="inline-flex items-center gap-2 text-[16px]">
                  <Icon name="calendar_today" size={20} className="text-white" />
                  {formatTripRange(it)}
                </span>
              </div>
            </button>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}
