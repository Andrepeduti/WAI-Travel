import { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
interface HorizontalCarouselProps {
  children: ReactNode[];
  showDots?: boolean;
  className?: string;
  itemClassName?: string;
  dotsClassName?: string;
}
export function HorizontalCarousel({
  children,
  showDots = true,
  className,
  itemClassName,
  dotsClassName
}: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const itemCount = children.length;
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isDragging) return;
    const container = scrollRef.current;
    const currentScrollLeft = container.scrollLeft;
    const itemWidth = container.firstElementChild?.clientWidth || 280;
    const gap = 12; // gap-3 = 12px

    const index = Math.round(currentScrollLeft / (itemWidth + gap));
    setActiveIndex(Math.min(Math.max(0, index), itemCount - 1));
  }, [itemCount, isDragging]);
  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const itemWidth = container.firstElementChild?.clientWidth || 280;
    const gap = 12;
    container.scrollTo({
      left: index * (itemWidth + gap),
      behavior: 'smooth'
    });
    setActiveIndex(index);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };
  const handleMouseUp = () => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
    // Update active index after drag
    handleScroll();
  };
  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  return <div className="relative min-w-0 w-full">
      {/* Scrollable Container - bleeds right */}
      <div ref={scrollRef} className={cn("w-full min-w-0 flex overflow-x-auto scrollbar-hide snap-x snap-mandatory cursor-grab", className)} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
        {children.map((child, index) => <div key={index} className={cn('snap-start flex-shrink-0', itemClassName)} style={{ marginRight: index < children.length - 1 ? 12 : 16 }}>
            {child}
          </div>)}
      </div>

      {/* Pagination Dots - Dash for active, Circle for inactive */}
      {showDots && itemCount > 1 && <div className={cn('flex items-center justify-center gap-1.5 mt-3', dotsClassName)}>
          {children.map((_, index) => <button key={index} onClick={() => scrollToIndex(index)} className={cn('rounded-full transition-all duration-200', index === activeIndex ? 'w-4 h-1.5 bg-primary rounded-[3px]' // Dash (tracinho)
      : 'w-1.5 h-1.5 bg-muted-foreground/40' // Circle (bolinha)
      )} aria-label={`Ir para item ${index + 1}`} />)}
        </div>}
    </div>;
}