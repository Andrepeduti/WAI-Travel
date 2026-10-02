import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { resolveTripThumbnailImages } from '@/lib/coverImageResolver';
import { parseLocalDate } from '@/lib/localDate';
import type { UserItinerary } from '@/lib/itinerariesApi';
import { HomeSectionHeader } from './HomeSectionHeader';

const MONTH_ABBR_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MS_PER_DAY = 86_400_000;

const formatDays = (days: number) => `${days} ${days === 1 ? 'dia' : 'dias'}`;
const formatDay = (date: Date) => `${date.getDate()} ${MONTH_ABBR_PT[date.getMonth()]}`;

/** "24 Mai - 23 Jun (15 dias)"; datas flexíveis mostram só a duração ("15 dias"). */
function formatTripPeriod(it: UserItinerary, start?: Date, end?: Date): string {
  if (!start) return it.durationDays ? formatDays(it.durationDays) : '';
  const last = end ?? start;
  const days = Math.round((last.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return `${formatDay(start)} - ${formatDay(last)} (${formatDays(days)})`;
}

function tripStatusLabel(start?: Date, end?: Date): string {
  if (!start) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = end ? new Date(end) : s; e.setHours(0, 0, 0, 0);
  if (today >= s && today <= e) return 'Em viagem';
  const diff = Math.round((s.getTime() - today.getTime()) / MS_PER_DAY);
  if (diff === 1) return 'Amanhã';
  if (diff > 1) return `Em ${diff} dias`;
  return '';
}

interface ContinuePlanningSectionProps {
  /** Já filtrados e ordenados pelas regras dos módulos (`resolveHomeModules`). */
  itineraries: UserItinerary[];
  onItineraryClick?: (itinerary: UserItinerary) => void;
}

export function ContinuePlanningSection({ itineraries, onItineraryClick }: ContinuePlanningSectionProps) {
  if (itineraries.length === 0) return null;

  const trips = itineraries.map((it) => {
    const start = it.isFlexible ? undefined : parseLocalDate(it.startDate) ?? undefined;
    const end = parseLocalDate(it.endDate) ?? start;
    return { it, start, end };
  });

  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Continue planejando" />
      <HorizontalCarousel showDots={false} itemClassName="w-[310px]">
        {trips.map(({ it, start, end }) => {
          const cover = resolveTripThumbnailImages(
            it.destinations,
            it.images?.find((image) => image && !image.startsWith('blob:')),
          )[0];
          const period = formatTripPeriod(it, start, end);
          const status = tripStatusLabel(start, end);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onItineraryClick?.(it)}
              className="w-[310px] h-[131px] flex gap-4 bg-white rounded-[16px] p-4 text-left drop-shadow-[0_6px_8px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-transform"
            >
              <div className="relative w-[81px] h-full rounded-[12px] overflow-hidden flex-shrink-0 bg-muted">
                {cover && <img src={cover} alt={it.title} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <div className="flex flex-col gap-2 text-[14px]">
                  <h3 className="font-semibold text-[#141530] line-clamp-2">{it.title}</h3>
                  {period && <span className="font-medium text-[#7F7F7F] truncate">{period}</span>}
                </div>
                {status && (
                  <span className="self-start h-6 px-3 rounded-[9px] border border-[#C9E0FF] inline-flex items-center text-[12px] font-medium text-[#2865B6] whitespace-nowrap">
                    {status}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}
