import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { getInterestIcon } from '@/lib/interestIcons';
import type { SimilarTraveler } from '@/lib/similarTravelers';

const MAX_VISIBLE_INTERESTS = 3;

function OutlineTag({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <span className="h-6 px-3 rounded-[9px] border border-[#141530] inline-flex items-center gap-1 text-[12px] font-medium text-[#141530] whitespace-nowrap">
      {icon && <Icon name={icon} size={14} className="text-[#141530]" />}
      {children}
    </span>
  );
}

interface TravelerInterestTagsProps {
  traveler: Pick<SimilarTraveler, 'compatibility' | 'interests' | 'sharedInterests'>;
  className?: string;
}

/** "% match" + até 3 interesses (os em comum primeiro) + "+X". */
export function TravelerInterestTags({ traveler, className }: TravelerInterestTagsProps) {
  const shared = new Set(traveler.sharedInterests.map((i) => i.toLowerCase()));
  const interests = [
    ...traveler.sharedInterests,
    ...traveler.interests.filter((i) => !shared.has(i.toLowerCase())),
  ];
  const hidden = interests.length - MAX_VISIBLE_INTERESTS;

  if (traveler.compatibility <= 0 && interests.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {traveler.compatibility > 0 && <OutlineTag icon="auto_awesome">{traveler.compatibility}% match</OutlineTag>}
      {interests.slice(0, MAX_VISIBLE_INTERESTS).map((interest) => (
        <OutlineTag key={interest} icon={getInterestIcon(interest)}>{interest}</OutlineTag>
      ))}
      {hidden > 0 && <OutlineTag>+{hidden}</OutlineTag>}
    </div>
  );
}
