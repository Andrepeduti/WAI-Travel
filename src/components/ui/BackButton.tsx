import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Standard back button used across the entire app.
 * - White circle (40px) with subtle shadow
 * - Bold-feeling chevron_left icon
 * - Active scale + opacity feedback
 *
 * Use this in every screen header to keep navigation consistent.
 */
export function BackButton({ onClick, className, ariaLabel = 'Voltar' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 active:opacity-80 transition-all flex-shrink-0',
        className,
      )}
    >
      <Icon name="chevron_left" size={22} className="text-foreground [&>svg]:stroke-[2.5]" />
    </button>
  );
}
