import { useQuery } from '@tanstack/react-query';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { Icon } from '@/components/ui/Icon';
import { getAverageRatings } from '@/lib/marketplaceApi';
import { dismissCheckoutSession } from '@/lib/homeModulesApi';
import { resolveCoverImage } from '@/lib/coverImageResolver';
import type { PublicItinerarySearchRow } from '@/lib/itinerariesApi';
import { formatDays, tripLength } from '@/lib/tripDisplay';
import { HomeSectionHeader } from './HomeSectionHeader';

const formatPrice = (cents: number | null | undefined) => `R$ ${((cents ?? 0) / 100).toFixed(2).replace('.', ',')}`;

interface ContinueShoppingSectionProps {
  itineraries: PublicItinerarySearchRow[];
  /** Retoma o checkout do roteiro. */
  onResume: (itinerary: PublicItinerarySearchRow) => void;
  onSeeAll?: () => void;
}

/** Módulo "Finalize sua compra" (Continue comprando — prioridade 5). */
export function ContinueShoppingSection({ itineraries, onResume, onSeeAll }: ContinueShoppingSectionProps) {
  const ids = itineraries.map((it) => it.id);
  const { data: ratings } = useQuery({
    queryKey: ['itinerary-ratings', ids],
    queryFn: () => getAverageRatings(ids),
    enabled: ids.length > 0,
  });

  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Finalize sua compra" onClick={onSeeAll} />
      <HorizontalCarousel showDots={false} itemClassName="w-[358px]">
        {itineraries.map((it) => {
          const cover = it.images?.[0] && !it.images[0].includes('placeholder')
            ? it.images[0]
            : resolveCoverImage(it.destinations).url;
          const rating = ratings?.[it.id] ?? 0;
          const days = tripLength(it);
          return (
            <article key={it.id} className="w-[358px] bg-white rounded-[16px] px-4 py-6 flex flex-col gap-3 shadow-[0_6px_16px_rgba(0,0,0,0.03)]">
              <div className="flex gap-4">
                <div className="w-[71px] h-[80px] rounded-[12px] overflow-hidden flex-shrink-0 bg-[#F2F2F2]">
                  <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 text-[18px] leading-snug font-semibold text-[#141530] line-clamp-2">{it.title}</h3>
                    <button
                      type="button"
                      onClick={() => void dismissCheckoutSession(it.id)}
                      aria-label="Dispensar"
                      className="flex-shrink-0 active:scale-90 transition-transform"
                    >
                      <Icon name="close" size={22} className="text-[#141530]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[14px] text-[#646464]">
                    {rating > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="star" filled size={18} className="text-[#FDAC2A]" />
                        {rating.toFixed(1).replace('.', ',')}
                      </span>
                    )}
                    {it.places > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="location_on" size={18} className="text-[#646464]" />
                        {it.places} locais
                      </span>
                    )}
                    {days > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="calendar_today" size={18} className="text-[#646464]" />
                        {formatDays(days)}
                      </span>
                    )}
                  </div>
                  <span className="text-[16px] font-semibold text-[#3F8F2F]">{formatPrice(it.priceCents)}</span>
                </div>
              </div>
              <div className="h-px bg-[#E8E8E8]" />
              <button
                type="button"
                onClick={() => onResume(it)}
                className="w-full h-12 rounded-full bg-[#9DCC36] text-[16px] font-semibold text-[#141530] active:scale-[0.99] transition-transform"
              >
                Finalizar compra
              </button>
            </article>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}
