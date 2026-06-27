import { cn } from '@/lib/utils';

interface CategoryChipProps {
  iconName?: string;
  emoji?: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CategoryChip({ 
  iconName,
  emoji,
  label, 
  isActive = false, 
  onClick,
  className 
}: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 flex-shrink-0",
        isActive 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "bg-secondary text-foreground hover:bg-secondary/80",
        className
      )}
    >
      {emoji && <span className="text-base">{emoji}</span>}
      <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
    </button>
  );
}
