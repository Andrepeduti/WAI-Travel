import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { Icon } from '@/components/ui/Icon';
import { loadPlannerData } from '@/lib/plannerApi';
import { recordImpressions } from '@/lib/homeModulesApi';
import type { CompletedTrip } from '@/lib/homeModules';
import type { UserItinerary } from '@/lib/itinerariesApi';
import { formatDays, formatTripRange, tripCover, tripLength } from '@/lib/tripDisplay';
import { HomeSectionHeader } from './HomeSectionHeader';
import { TripCoverHeader } from './TripCoverHeader';
import { TripFeedbackSheet } from './TripFeedbackSheet';

/** Locais/experiências no "Resumo da sua viagem". */
const MAX_SUMMARY_ITEMS = 10;

interface CompletedTripSectionProps {
  trips: CompletedTrip[];
  onItineraryClick?: (itinerary: UserItinerary) => void;
}

function TripSummary({ itinerary }: { itinerary: UserItinerary }) {
  const { data: planner } = useQuery({
    queryKey: ['planner-data', itinerary.id],
    queryFn: () => loadPlannerData(itinerary.id),
  });

  const places = Object.keys(planner?.activities ?? {})
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((day) => planner!.activities[day].filter((a) => a.type !== 'note'))
    .slice(0, MAX_SUMMARY_ITEMS);

  if (places.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[18px] font-semibold text-[#141530]">Resumo da sua viagem</h4>
      <HorizontalCarousel showDots={false} itemClassName="w-[88px]">
        {places.map((place) => (
          <div key={place.id} className="w-[88px] flex flex-col gap-1.5">
            <div className="w-[88px] h-[88px] rounded-[12px] overflow-hidden bg-[#F2F2F2]">
              {place.image && <img src={place.image} alt={place.name} className="w-full h-full object-cover" />}
            </div>
            <span className="text-[12px] font-medium text-[#141530] truncate">{place.name}</span>
          </div>
        ))}
      </HorizontalCarousel>
    </div>
  );
}

/**
 * Módulo "Viagem concluída" — só roteiros comprados, sempre com pedido de feedback
 * (prioridade 2; feedback rebaixado vai para o fim da fila).
 */
export function CompletedTripSection({ trips, onItineraryClick }: CompletedTripSectionProps) {
  const [feedbackFor, setFeedbackFor] = useState<{ itineraryId: string; liked: boolean } | null>(null);

  // "Primeira exibição": registra quando o card aparece pela primeira vez (inicia os prazos).
  const firstShownIds = trips.filter((t) => t.firstShown).map((t) => t.itinerary.id).join(',');
  useEffect(() => {
    if (firstShownIds) void recordImpressions('completedTrip', firstShownIds.split(','));
  }, [firstShownIds]);

  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Sua viagem concluída" />
      <HorizontalCarousel showDots={false} itemClassName="w-[356px]">
        {trips.map(({ itinerary }) => (
          <article key={itinerary.id} className="w-[356px] bg-white rounded-[16px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.05)] flex flex-col">
            <TripCoverHeader
              image={tripCover(itinerary)}
              title={itinerary.title}
              subtitle={`${formatTripRange(itinerary)} · ${formatDays(tripLength(itinerary))}`}
              tag={{ label: 'Concluído', className: 'bg-[#9DCC36] text-[#141530]' }}
              onClick={() => onItineraryClick?.(itinerary)}
            />
            <div className="px-6 py-5 flex flex-col gap-5">
              <TripSummary itinerary={itinerary} />
              <div className="flex flex-col gap-3">
                <h4 className="text-[16px] font-semibold text-[#141530]">Como foi sua experiência?</h4>
                <div className="flex gap-4">
                  {([false, true] as const).map((liked) => (
                    <button
                      key={String(liked)}
                      type="button"
                      onClick={() => setFeedbackFor({ itineraryId: itinerary.id, liked })}
                      className="flex-1 h-12 rounded-[16px] border border-[#141530] inline-flex items-center justify-center gap-2 text-[16px] font-bold text-[#141530] active:scale-[0.98] transition-transform"
                    >
                      {liked ? 'Gostei' : 'Não gostei'}
                      <Icon name={liked ? 'thumb_up' : 'thumb_down'} size={22} className="text-[#141530]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </HorizontalCarousel>

      <TripFeedbackSheet
        open={!!feedbackFor}
        itineraryId={feedbackFor?.itineraryId ?? null}
        initialLiked={feedbackFor?.liked ?? null}
        onClose={() => setFeedbackFor(null)}
      />
    </section>
  );
}
