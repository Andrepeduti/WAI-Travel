import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { resolveCoverImage } from '@/lib/coverImageResolver';
import type { PublicItinerarySearchRow } from '@/lib/itinerariesApi';
import { HomeSectionHeader } from './HomeSectionHeader';

const formatPrice = (cents: number | null | undefined) => `R$ ${((cents ?? 0) / 100).toFixed(2).replace('.', ',')}`;

interface RecentlyViewedSectionProps {
  itineraries: PublicItinerarySearchRow[];
  onItineraryClick: (itinerary: PublicItinerarySearchRow) => void;
}

/** Módulo "Continue explorando" (Vistos recentemente — prioridade 6). */
export function RecentlyViewedSection({ itineraries, onItineraryClick }: RecentlyViewedSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Continue explorando" />
      <HorizontalCarousel showDots={false} itemClassName="w-[110px]">
        {itineraries.map((it) => {
          const cover = it.images?.[0] && !it.images[0].includes('placeholder')
            ? it.images[0]
            : resolveCoverImage(it.destinations).url;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onItineraryClick(it)}
              className="w-[110px] flex flex-col gap-2 text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-[110px] h-[97px] rounded-[16px] overflow-hidden bg-[#F2F2F2]">
                <img src={cover} alt={it.title} className="w-full h-full object-cover" />
              </div>
              <div className="w-full flex flex-col">
                <span className="text-[16px] font-medium text-[#141530] truncate">{it.title}</span>
                {(it.priceCents ?? 0) > 0 && (
                  <span className="text-[16px] text-[#7F7F7F]">{formatPrice(it.priceCents)}</span>
                )}
              </div>
            </button>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}
