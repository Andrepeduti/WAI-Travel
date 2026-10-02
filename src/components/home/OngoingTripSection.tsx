import { useQuery } from '@tanstack/react-query';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { loadPlannerData } from '@/lib/plannerApi';
import type { UserItinerary } from '@/lib/itinerariesApi';
import { currentTripDay, tripCover, tripLength } from '@/lib/tripDisplay';
import { HomeSectionHeader } from './HomeSectionHeader';
import { TripCoverHeader } from './TripCoverHeader';

/** Atividades do dia exibidas no card; o restante fica no "Ver mais". */
const MAX_TODAY_ACTIVITIES = 3;

interface OngoingTripSectionProps {
  itineraries: UserItinerary[];
  /** Abre o roteiro no dia informado (programação completa do dia). */
  onOpenDay?: (itinerary: UserItinerary, day: number) => void;
}

function OngoingTripCard({ itinerary, onOpenDay }: { itinerary: UserItinerary; onOpenDay?: OngoingTripSectionProps['onOpenDay'] }) {
  const today = currentTripDay(itinerary);
  const total = tripLength(itinerary);

  const { data: planner, isLoading } = useQuery({
    queryKey: ['planner-data', itinerary.id],
    queryFn: () => loadPlannerData(itinerary.id),
  });

  // Ordem definida no roteiro; notas não são atividades.
  const activities = (planner?.activities[today] ?? []).filter((a) => a.type !== 'note');
  const openToday = () => onOpenDay?.(itinerary, today);

  return (
    <article className="w-full bg-white rounded-[16px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.05)] flex flex-col">
      <TripCoverHeader
        image={tripCover(itinerary)}
        title={itinerary.title}
        subtitle={`Dia ${today} de ${total}`}
        tag={{ label: 'Em andamento', className: 'bg-[#2865B6] text-white' }}
        onClick={openToday}
      />

      <div className="px-6 py-5 flex flex-col gap-4">
        <h4 className="text-[18px] font-semibold text-[#141530]">Programação de hoje</h4>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-3/4 rounded" />)}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-[14px] text-[#646464]">Nenhuma atividade planejada para hoje.</p>
        ) : (
          <ol className="relative flex flex-col gap-5 pl-8">
            {/* Linha da timeline */}
            <span className="absolute left-[5px] top-2 bottom-2 w-px bg-[#D9D9D9]" aria-hidden />
            {activities.slice(0, MAX_TODAY_ACTIVITIES).map((activity) => (
              <li key={activity.id} className="relative text-[16px] text-[#141530]">
                <span className="absolute -left-8 top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-[#B6B6B6]" aria-hidden />
                <span className="block truncate">{activity.name}</span>
              </li>
            ))}
          </ol>
        )}

        {activities.length > MAX_TODAY_ACTIVITIES && (
          <button type="button" onClick={openToday} className="self-start inline-flex items-center gap-2 text-[16px] font-bold text-[#141530]">
            Ver mais
            <Icon name="chevron_right" size={20} className="text-[#141530]" />
          </button>
        )}
      </div>
    </article>
  );
}

/** Módulo "Sua viagem em andamento" (prioridade 1). */
export function OngoingTripSection({ itineraries, onOpenDay }: OngoingTripSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Sua viagem em andamento" />
      {itineraries.length === 1 ? (
        // Card único: ocupa a largura toda, com 16px de margem lateral (o <main> só tem padding esquerdo).
        <div className="pr-4">
          <OngoingTripCard itinerary={itineraries[0]} onOpenDay={onOpenDay} />
        </div>
      ) : (
        // Vários cards: cada um ocupa a largura menos a margem, deixando o próximo "espiar".
        <HorizontalCarousel showDots={false} itemClassName="w-[calc(100%-16px)]">
          {itineraries.map((it) => <OngoingTripCard key={it.id} itinerary={it} onOpenDay={onOpenDay} />)}
        </HorizontalCarousel>
      )}
    </section>
  );
}
