import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_AVATAR_URL } from '@/components/ui/UserAvatar';
import type { TopCreator } from '@/hooks/use-top-creators';
import waiBalloon from '@/assets/home/wai-balloon.svg';
import { HomeSectionHeader } from './HomeSectionHeader';

interface TopCreatorsSectionProps {
  creators: TopCreator[];
  loading: boolean;
  onCreatorClick?: (creator: TopCreator) => void;
  onSeeAll?: () => void;
}

function creatorSubtitle(creator: TopCreator): string {
  if (creator.salesCount > 0) {
    return `${creator.salesCount} ${creator.salesCount === 1 ? 'roteiro vendido' : 'roteiros vendidos'}`;
  }
  return `${creator.publishedCount} ${creator.publishedCount === 1 ? 'roteiro' : 'roteiros'}`;
}

export function TopCreatorsSection({ creators, loading, onCreatorClick, onSeeAll }: TopCreatorsSectionProps) {
  if (!loading && creators.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <HomeSectionHeader title="Criadores em alta" onClick={onSeeAll} />
      <HorizontalCarousel showDots={false} itemClassName="w-[165px]">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-[165px] h-[225px] rounded-[16px]" />
          ))
          : creators.map((creator) => (
            <button
              key={creator.userId}
              type="button"
              onClick={() => onCreatorClick?.(creator)}
              className="w-[165px] h-[225px] bg-[#0A0E59] rounded-[16px] overflow-hidden flex flex-col text-left active:scale-[0.98] transition-transform"
            >
              {/* Sem foto: mesma imagem padrão do avatar, ocupando a área inteira e cortada igual a uma foto */}
              <div className="h-[120px] w-full flex-shrink-0 bg-[#E2EECE]">
                <img
                  src={creator.avatar || DEFAULT_AVATAR_URL}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative h-[105px] w-full">
                <img
                  src={waiBalloon}
                  alt=""
                  width={102}
                  height={102}
                  className="absolute left-[-35px] top-[7px] w-[102px] h-[102px] -rotate-[6.35deg] pointer-events-none"
                />
                <div className="relative px-3 py-4 flex flex-col items-center gap-3">
                  <div className="w-full flex flex-col items-center gap-1">
                    <p className="max-w-full text-[16px] font-bold text-[#FEFEFE] truncate">{creator.name}</p>
                    <p className="text-[12px] font-medium text-[#FEFEFE]/60">{creatorSubtitle(creator)}</p>
                  </div>
                  {creator.badge && (
                    <span className="h-6 px-3 rounded-[9px] bg-[#2865B6] inline-flex items-center text-[12px] font-medium text-[#FEFEFE] whitespace-nowrap">
                      {creator.badge}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
      </HorizontalCarousel>
    </section>
  );
}
