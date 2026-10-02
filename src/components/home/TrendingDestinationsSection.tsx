import { Skeleton } from '@/components/ui/skeleton';
import type { TrendingDestination } from '@/hooks/use-trending-destinations';
import waiMascot from '@/assets/home/wai-mascot.svg';

interface TrendingDestinationsSectionProps {
  destinations: TrendingDestination[];
  loading: boolean;
  onDestinationClick: (destination: TrendingDestination) => void;
}

/** Bloco escuro "Destinos em alta" com carrossel de países. Sangra à direita. */
export function TrendingDestinationsSection({ destinations, loading, onDestinationClick }: TrendingDestinationsSectionProps) {
  if (!loading && destinations.length === 0) return null;

  return (
    <section className="bg-[#141530] rounded-l-[16px] overflow-hidden">
      <div className="flex items-center gap-3 p-4 overflow-x-auto scrollbar-hide">
        <div className="w-[135px] flex-shrink-0 flex flex-col gap-2 justify-center">
          <img src={waiMascot} alt="" width={58} height={86} className="w-[58px] h-[86px]" />
          <div className="flex flex-col gap-2 text-white">
            <h2 className="text-[22px] font-semibold leading-tight w-[109px]">Destinos em alta</h2>
            <p className="text-[12px] font-medium">Os lugares que todo mundo quer conhecer</p>
          </div>
        </div>

        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="w-[176px] h-[231px] rounded-[16px] flex-shrink-0 bg-white/10" />
          ))
          : destinations.map((destination) => (
            <button
              key={destination.country}
              type="button"
              onClick={() => onDestinationClick(destination)}
              className="relative w-[176px] h-[231px] rounded-[16px] overflow-hidden flex-shrink-0 text-left active:scale-[0.98] transition-transform"
            >
              <img src={destination.image} alt={destination.country} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1 text-white">
                <p className="text-[18px] font-bold truncate">{destination.country}</p>
                <p className="text-[12px] font-medium opacity-90 truncate">
                  {destination.itineraryCount} {destination.itineraryCount === 1 ? 'roteiro' : 'roteiros'}
                </p>
              </div>
            </button>
          ))}
      </div>
    </section>
  );
}
