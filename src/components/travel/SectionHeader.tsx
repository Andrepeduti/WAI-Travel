import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  className?: string;
}

export function SectionHeader({ title, subtitle, onSeeAll, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {onSeeAll ? (
        <button 
          onClick={onSeeAll}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <h2 className="section-title">{title}</h2>
          <Icon name="chevron_right" size={16} className="text-foreground" />
        </button>
      ) : (
        <h2 className="section-title">{title}</h2>
      )}
      {subtitle && <p className="section-subtitle mt-0.5">{subtitle}</p>}
    </div>
  );
}
