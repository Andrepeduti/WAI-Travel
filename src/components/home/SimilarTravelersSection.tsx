import { useEffect, useState } from 'react';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { TravelerInterestTags } from '@/components/travel/TravelerInterestTags';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { fetchSimilarTravelers, type SimilarTraveler } from '@/lib/similarTravelers';
import { HomeSectionHeader } from './HomeSectionHeader';

interface SimilarTravelersSectionProps {
  onTravelerClick?: (traveler: SimilarTraveler) => void;
  onSeeAll?: () => void;
}

export function SimilarTravelersSection({ onTravelerClick, onSeeAll }: SimilarTravelersSectionProps) {
  const [travelers, setTravelers] = useState<SimilarTraveler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSimilarTravelers(6)
      .then((list) => { if (!cancelled) setTravelers(list); })
      .catch((err) => console.error('[SimilarTravelersSection] failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!loading && travelers.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Viajantes com o mesmo interesse" onClick={onSeeAll} />
      <HorizontalCarousel showDots={false} itemClassName="w-[277px]">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="w-[277px] h-[146px] bg-white rounded-[16px] p-4 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-[38px] h-[38px] rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-full rounded-[9px]" />
            </div>
          ))
          : travelers.map((traveler) => (
            <button
              key={traveler.userId}
              type="button"
              onClick={() => onTravelerClick?.(traveler)}
              className="w-[277px] h-[146px] bg-white rounded-[16px] p-4 flex flex-col justify-between text-left overflow-hidden"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar src={traveler.avatar} alt={traveler.name} size={38} />
                <div className="flex flex-col gap-[3px] min-w-0">
                  <p className="text-[16px] font-semibold text-[#141530] truncate">{traveler.name}</p>
                  {traveler.username && <p className="text-[12px] text-[#646464] truncate">@{traveler.username}</p>}
                </div>
              </div>
              <TravelerInterestTags traveler={traveler} className="gap-3 max-h-[60px] overflow-hidden" />
            </button>
          ))}
      </HorizontalCarousel>
    </section>
  );
}
