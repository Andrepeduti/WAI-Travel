import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface PlaceCardData {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
  location?: string;
}

interface PlaceCardProps {
  place: PlaceCardData;
  onClick?: () => void;
  className?: string;
}

export function PlaceCard({ place, onClick, className }: PlaceCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
  };

  return (
    <button
      onClick={onClick}
      className={cn("card-elevated overflow-hidden text-left group", className)}
    >
      <div className="relative h-32">
        <img src={place.image} alt={place.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <button onClick={handleSave} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90">
          <Icon name="bookmark" size={16} filled={isSaved} className={isSaved ? 'text-florida-normal' : ''} />
        </button>
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-sm mb-1 truncate">{place.name}</h4>
        <div className="mb-2">
          <span className="badge-primary text-[10px] py-0.5 px-2">{place.category}</span>
        </div>
        <div className="flex items-center gap-1">
          <Icon name="star" size={12} filled className="text-[#F2B90C]" />
          <span className="text-xs font-semibold">{place.rating}</span>
        </div>
      </div>
    </button>
  );
}
