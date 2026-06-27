import { useState, useRef, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Place {
  id: number;
  name: string;
  subtitle: string;
  image: string;
  rating: number;
  description?: string;
  tags?: string[];
}

interface SwipeablePlaceCardsProps {
  places: Place[];
  onComplete: (saved: Place[], skipped: Place[]) => void;
}

type SwipeDirection = 'left' | 'right' | null;

export function SwipeablePlaceCards({ places, onComplete }: SwipeablePlaceCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [skippedPlaces, setSkippedPlaces] = useState<Place[]>([]);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<SwipeDirection>(null);
  const [showReview, setShowReview] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;
  const isFinished = currentIndex >= places.length;
  const currentPlace = places[currentIndex];

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (!currentPlace || exitDirection) return;
    setExitDirection(direction);
    setIsFlipped(false);

    setTimeout(() => {
      if (direction === 'right') {
        setSavedPlaces(prev => [...prev, currentPlace]);
      } else {
        setSkippedPlaces(prev => [...prev, currentPlace]);
      }
      setCurrentIndex(prev => prev + 1);
      setExitDirection(null);
      setDragX(0);
    }, 350);
  }, [currentPlace, exitDirection]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isFlipped) return;
    setIsDragging(true);
    isHorizontalRef.current = null;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Determine gesture direction on first significant movement
    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontalRef.current) return;
    setDragX(dx);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const wasDragging = Math.abs(dragX) > 5;
    setIsDragging(false);

    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      handleSwipe(dragX > 0 ? 'right' : 'left');
    } else if (!wasDragging) {
      // It was a tap
      setIsFlipped(prev => !prev);
      setDragX(0);
    } else {
      setDragX(0);
    }
  };

  const getSwipeOpacity = () => Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  const getCardStyle = () => {
    if (exitDirection) {
      return {
        transform: `translateX(${exitDirection === 'right' ? 400 : -400}px) rotate(${exitDirection === 'right' ? 15 : -15}deg)`,
        opacity: 0,
        transition: 'transform 0.35s ease-out, opacity 0.35s ease-out',
      };
    }
    const rotate = dragX * 0.08;
    return {
      transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    };
  };

  if (showReview) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-foreground">Suas escolhas</h2>
          <button
            onClick={() => setShowReview(false)}
            className="text-[13px] text-primary font-medium"
          >
            Voltar
          </button>
        </div>

        {savedPlaces.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Icon name="check_circle" size={16} className="text-primary" />
              <span className="text-[13px] font-semibold text-foreground">
                Salvos no roteiro ({savedPlaces.length})
              </span>
            </div>
            <div className="space-y-2">
              {savedPlaces.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 bg-primary/5 rounded-lg border border-primary/15">
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-foreground truncate block">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground">{p.subtitle}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="star" size={12} filled className="text-sun" />
                    <span className="text-[11px] font-bold text-foreground">{p.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {skippedPlaces.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Icon name="close" size={16} className="text-muted-foreground" />
              <span className="text-[13px] font-semibold text-muted-foreground">
                Pulados ({skippedPlaces.length})
              </span>
            </div>
            <div className="space-y-2">
              {skippedPlaces.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover opacity-60" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-muted-foreground truncate block">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground/70">{p.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="animate-fade-in text-center py-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icon name="check_circle" size={32} className="text-primary" />
        </div>
        <h2 className="text-[18px] font-bold text-foreground mb-1">Pronto!</h2>
        <p className="text-[14px] text-muted-foreground mb-5">
          Você salvou <span className="font-semibold text-primary">{savedPlaces.length}</span> de {places.length} locais
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowReview(true)}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-[13px] font-semibold"
          >
            Ver escolhas
          </button>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setSavedPlaces([]);
              setSkippedPlaces([]);
            }}
            className="px-5 py-2.5 bg-muted text-foreground rounded-lg text-[13px] font-medium"
          >
            Refazer
          </button>
        </div>
      </div>
    );
  }

  const nextPlace = places[currentIndex + 1];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-foreground">Locais neste guia</h2>
        <button
          onClick={() => setShowReview(true)}
          className="text-[12px] text-primary font-medium"
          disabled={savedPlaces.length === 0 && skippedPlaces.length === 0}
        >
          Ver escolhas
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex) / places.length) * 100}%` }}
          />
        </div>
        <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
          {currentIndex + 1}/{places.length}
        </span>
      </div>

      {/* Swipe hints */}
      <div className="flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-1 text-muted-foreground/50">
          <Icon name="chevron_left" size={14} />
          <span className="text-[11px] font-medium">Pular</span>
        </div>
        <span className="text-[11px] text-muted-foreground/40">toque para virar</span>
        <div className="flex items-center gap-1 text-primary/50">
          <span className="text-[11px] font-medium">Salvar</span>
          <Icon name="chevron_right" size={14} />
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative w-full" style={{ height: 340, perspective: 1200 }}>
        {/* Background card (next card preview) */}
        {nextPlace && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-[calc(100%-24px)] rounded-xl overflow-hidden border border-border/40 shadow-sm"
              style={{ height: 310, transform: 'scale(0.95)', opacity: 0.5 }}
            >
              <img src={nextPlace.image} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Active card */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 10 }}
        >
          <div
            ref={cardRef}
            className="w-full cursor-grab active:cursor-grabbing select-none touch-pan-y"
            style={{
              ...getCardStyle(),
              transformStyle: 'preserve-3d',
              height: 310,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Swipe feedback overlays */}
            <div
              className="absolute inset-0 rounded-xl bg-primary/20 border-2 border-primary flex items-center justify-center z-20 pointer-events-none"
              style={{
                opacity: dragX > 20 ? getSwipeOpacity() : 0,
                transition: isDragging ? 'none' : 'opacity 0.2s',
              }}
            >
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-[14px]">
                SALVAR ✓
              </div>
            </div>
            <div
              className="absolute inset-0 rounded-xl bg-destructive/15 border-2 border-destructive/50 flex items-center justify-center z-20 pointer-events-none"
              style={{
                opacity: dragX < -20 ? getSwipeOpacity() : 0,
                transition: isDragging ? 'none' : 'opacity 0.2s',
              }}
            >
              <div className="bg-destructive/90 text-white px-4 py-2 rounded-lg font-bold text-[14px]">
                PULAR ✗
              </div>
            </div>

            {/* Card inner (handles flip) */}
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.5s ease-in-out',
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/30"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <img
                  src={currentPlace.image}
                  alt={currentPlace.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-[20px] font-bold text-white leading-tight mb-1">
                    {currentPlace.name}
                  </h3>
                  <p className="text-[14px] text-white/80">{currentPlace.subtitle}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Icon name="star" size={16} filled className="text-sun" />
                    <span className="text-[14px] font-bold text-white">{currentPlace.rating}</span>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-border/30 bg-card p-5 flex flex-col"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={currentPlace.image}
                    alt={currentPlace.name}
                    className="w-14 h-14 rounded-lg object-cover"
                    draggable={false}
                  />
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">{currentPlace.name}</h3>
                    <p className="text-[12px] text-muted-foreground">{currentPlace.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-4">
                  <Icon name="star" size={16} filled className="text-sun" />
                  <span className="text-[14px] font-bold text-foreground">{currentPlace.rating}</span>
                  <span className="text-[12px] text-muted-foreground">/5.0</span>
                </div>

                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                  {currentPlace.description || `Um dos locais mais fascinantes deste guia. ${currentPlace.subtitle} com experiências únicas e autênticas para descobrir.`}
                </p>

                <div className="flex gap-2 mt-4 flex-wrap">
                  {(currentPlace.tags || [currentPlace.subtitle, 'Popular', 'Recomendado']).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-muted rounded-lg text-[11px] font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSwipe('left'); }}
                    className="flex-1 py-2.5 bg-muted rounded-lg text-[13px] font-semibold text-foreground"
                  >
                    Pular
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSwipe('right'); }}
                    className="flex-1 py-2.5 bg-primary rounded-lg text-[13px] font-semibold text-primary-foreground"
                  >
                    Salvar no roteiro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 mt-5">
        <button
          onClick={() => handleSwipe('left')}
          className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center shadow-sm hover:bg-muted/80 transition-colors active:scale-95"
        >
          <Icon name="close" size={24} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => setIsFlipped(prev => !prev)}
          className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted/50 transition-colors active:scale-95"
        >
          <Icon name="info" size={20} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors active:scale-95"
        >
          <Icon name="favorite" size={24} className="text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}
