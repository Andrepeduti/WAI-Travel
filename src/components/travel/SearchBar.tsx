import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  className?: string;
  showLocation?: boolean;
  location?: string;
}

export function SearchBar({ 
  placeholder = "Para onde você quer ir?",
  value,
  onChange,
  onFocus,
  className,
  showLocation = false,
  location = "São Paulo, BR"
}: SearchBarProps) {
  return (
    <div 
      className={cn("flex items-center gap-3 p-4 bg-secondary rounded-2xl cursor-text", className)}
      onClick={onFocus}
    >
      <Icon name="search" size={20} className="text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] font-medium placeholder:text-muted-foreground focus:outline-none"
        />
        {showLocation && (
          <div className="flex items-center gap-1 mt-0.5">
            <Icon name="location_on" size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{location}</span>
          </div>
        )}
      </div>
    </div>
  );
}
