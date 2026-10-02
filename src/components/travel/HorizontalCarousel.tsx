import { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
interface HorizontalCarouselProps {
  children: ReactNode[];
  showDots?: boolean;
  className?: string;
  itemClassName?: string;
  dotsClassName?: string;
  /** Espaço entre os itens em px. Default 12. */
  gap?: number;
  /** Chamado quando o item mais próximo do centro do carrossel muda (inclui o inicial: 0). */
  onActiveIndexChange?: (index: number) => void;
}
export function HorizontalCarousel({
  children,
  showDots = true,
  className,
  itemClassName,
  dotsClassName,
  gap = 12,
  onActiveIndexChange
}: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const itemCount = children.length;
  /** Item cujo centro está mais próximo do centro visível do carrossel. */
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isDragging) return;
    const container = scrollRef.current;
    const viewportCenter = container.scrollLeft + container.clientWidth / 2;
    let closest = 0;
    let closestDistance = Infinity;
    Array.from(container.children).forEach((child, index) => {
      const el = child as HTMLElement;
      const distance = Math.abs(el.offsetLeft - container.offsetLeft + el.offsetWidth / 2 - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });
    setActiveIndex(Math.min(Math.max(0, closest), itemCount - 1));
  }, [itemCount, isDragging]);

  // Lista mudou (ex.: item removido): recalcula o item ativo.
  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  useEffect(() => {
    onActiveIndexChange?.(activeIndex);
  }, [activeIndex, onActiveIndexChange]);
  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const itemWidth = container.firstElementChild?.clientWidth || 280;
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
  return <div className="relative min-w-0 w-full overflow-hidden">
      {/* Scrollable Container - bleeds right */}
      <div ref={scrollRef} className={cn("w-full min-w-0 flex overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory cursor-grab", className)} style={{ WebkitOverflowScrolling: 'touch' } as any} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
        {children.map((child, index) => <div key={index} className={cn('snap-start flex-shrink-0', itemClassName)} style={{ marginRight: index < children.length - 1 ? gap : 16 }}>
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