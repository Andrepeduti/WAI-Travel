import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Place {
  id: number;
  name: string;
  subtitle: string;
  image: string;
  rating: number;
  description?: string;
  reviewCount?: number;
  avgTime?: string;
  hours?: string;
}

interface PostcardStackProps {
  places: Place[];
  savedPlaces: Set<number>;
  flippedCards: Set<number>;
  onToggleSave: (id: number) => void;
  onToggleFlip: (id: number) => void;
}

export function PostcardStack({ places, savedPlaces, flippedCards, onToggleSave, onToggleFlip }: PostcardStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const CARD_HEIGHT = 260;
  const STACK_OFFSET = 18; // vertical offset per card behind — more visible
  const SCALE_STEP = 0.05; // scale reduction per card behind
  const MAX_VISIBLE = 3; // max cards visible in stack

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setDragX(0);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    setDragX(clientX - startX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 60;
    if (dragX < -threshold && activeIndex < places.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else if (dragX > threshold && activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
    setDragX(0);
  };

  return (
    <div className="relative w-full">
      {/* Stack container */}
      <div
        className="relative w-full cursor-grab active:cursor-grabbing"
        style={{ height: CARD_HEIGHT + STACK_OFFSET * (MAX_VISIBLE - 1) + 8 }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => { if (isDragging) { e.preventDefault(); handleMove(e.clientX); } }}
        onMouseUp={handleEnd}
        onMouseLeave={() => isDragging && handleEnd()}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {places.map((place, index) => {
          const diff = index - activeIndex;
          // Only render cards at or after active
          if (diff < 0 || diff >= MAX_VISIBLE) return null;

          const isTop = diff === 0;
          const isFlipped = flippedCards.has(place.id);
          const yOffset = diff * STACK_OFFSET;
          const scale = 1 - diff * SCALE_STEP;
          const xShift = isTop ? dragX * 0.6 : 0;
          const rotation = isTop ? dragX * 0.03 : 0;

          return (
            <div
              key={place.id}
              className="absolute left-0 right-0"
              style={{
                zIndex: MAX_VISIBLE - diff,
                transform: `translateY(${yOffset}px) translateX(${xShift}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: diff === MAX_VISIBLE - 1 ? 0.6 : 1,
              }}
            >
              <div
                style={{ perspective: 1200 }}
                onClick={() => !isDragging && isTop && onToggleFlip(place.id)}
              >
                <div
                  className="relative w-full"
                  style={{
                    height: CARD_HEIGHT,
                    transformStyle: 'preserve-3d',
                    transform: isFlipped && isTop ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Front — Postcard */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl overflow-hidden bg-card border-[3px] border-card",
                      isTop
                        ? 'shadow-[0_8px_30px_-4px_hsl(var(--foreground)/0.15)]'
                        : 'shadow-[0_4px_16px_-2px_hsl(var(--foreground)/0.10)]'
                    )}
                    style={{ backfaceVisibility: 'hidden', padding: 5 }}
                  >
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <img src={place.image} alt={place.name} className="w-full h-full object-cover" draggable={false} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 bg-white/70 backdrop-blur-sm rounded-full text-[12px] font-medium text-foreground">
                          {place.subtitle}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-[18px] font-bold text-white leading-tight">{place.name}</h3>
                      </div>
                      {/* Rating Badge - consistent with Home */}
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full px-2 py-1">
                        <Icon name="star" size={14} filled className="text-[#F2B90C]" />
                        <span className="text-xs font-bold text-foreground">{place.rating}</span>
                      </div>
                      {isTop && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-60">
                          <Icon name="swipe" size={14} className="text-white" />
                          <span className="text-[10px] text-white font-medium">arraste para navegar</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back — Details */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl overflow-hidden bg-card border-[3px] border-card p-5 flex flex-col",
                      isTop
                        ? 'shadow-[0_8px_30px_-4px_hsl(var(--foreground)/0.15)]'
                        : 'shadow-[0_4px_16px_-2px_hsl(var(--foreground)/0.10)]'
                    )}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <img src={place.image} alt={place.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" draggable={false} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-foreground leading-tight">{place.name}</h3>
                        <span className="text-[11px] text-muted-foreground">{place.subtitle}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5 flex-shrink-0">
                        <Icon name="star" size={11} filled className="text-sun" />
                        <span className="text-[11px] font-bold text-foreground">{place.rating}</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                      {place.description || 'Um dos locais mais fascinantes deste guia.'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Icon name="schedule" size={13} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">{place.avgTime || '30 min'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="door_front" size={13} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">{place.hours || '9h–18h'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="chat_bubble" size={13} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">{place.reviewCount || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleSave(place.id); }}
                        className={`flex-1 py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          savedPlaces.has(place.id) ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-foreground border border-border/60'
                        }`}
                      >
                        <Icon name="bookmark" size={14} filled={savedPlaces.has(place.id)} />
                        {savedPlaces.has(place.id) ? 'Salvo' : 'Salvar'}
                      </button>
                      <button onClick={(e) => e.stopPropagation()} className="flex-1 py-2 bg-primary rounded-lg text-[12px] font-semibold text-primary-foreground flex items-center justify-center gap-1.5">
                        <Icon name="add" size={14} />
                        Roteiro
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      {places.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {places.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'rounded-full transition-all duration-300',
                index === activeIndex
                  ? 'w-5 h-1.5 bg-primary rounded-[3px]'
                  : 'w-1.5 h-1.5 bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
