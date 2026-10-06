import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { MarketplaceItineraryCard } from '@/components/travel/MarketplaceItineraryCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getItineraryBadge } from '@/lib/itineraryBadge';
import type { RecommendedItinerary } from '@/hooks/use-recommended-itineraries';
import { HomeSectionHeader } from './HomeSectionHeader';

interface RecommendedItinerariesSectionProps {
  itineraries: RecommendedItinerary[];
  loading: boolean;
  onItineraryClick: (item: RecommendedItinerary) => void;
  onSeeAll?: () => void;
}

export function RecommendedItinerariesSection({ itineraries, loading, onItineraryClick, onSeeAll }: RecommendedItinerariesSectionProps) {
  if (!loading && itineraries.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Roteiros para você" onClick={onSeeAll} />
      <HorizontalCarousel showDots={false} gap={16} itemClassName="w-[305px]">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="w-[305px] flex flex-col">
              <Skeleton className="w-full h-[135px] rounded-t-[8px] rounded-b-none" />
              <div className="bg-white rounded-b-[16px] p-4 flex flex-col gap-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-full" />
              </div>
            </div>
          ))
          : itineraries.map((item) => (
            <MarketplaceItineraryCard
              key={item.itineraryId}
              itinerary={{ ...item, badge: getItineraryBadge(item) }}
              onClick={() => onItineraryClick(item)}
            />
          ))}
      </HorizontalCarousel>
    </section>
  );
}
