import { cn } from '@/lib/utils';

export interface CreatorCardData {
  id: number;
  name: string;
  username: string;
  image: string;
  itineraryCount: number;
  followerCount: number;
  specialty?: string;
}

interface CreatorCardProps {
  creator: CreatorCardData;
  onClick?: () => void;
  className?: string;
}

export function CreatorCard({ creator, onClick, className }: CreatorCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center p-4 card-elevated text-center min-w-[140px]",
        className
      )}
    >
      <img
        src={creator.image}
        alt={creator.name}
        className="w-16 h-16 rounded-full object-cover mb-3 ring-2 ring-primary/20"
      />
      <h4 className="font-semibold text-sm mb-0.5 truncate w-full">{creator.name}</h4>
      <p className="text-xs text-muted-foreground mb-2 truncate w-full">@{creator.username}</p>
      
      {creator.specialty && (
        <span className="badge-muted text-[10px] mb-2">{creator.specialty}</span>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span><strong className="text-foreground">{creator.itineraryCount}</strong> roteiros</span>
        <span><strong className="text-foreground">{(creator.followerCount / 1000).toFixed(1)}k</strong> seg.</span>
      </div>
    </button>
  );
}
