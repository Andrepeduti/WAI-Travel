import { useState, useEffect, useRef } from 'react';
import { CountryVisit } from '@/data/visitedCountries';

interface PassportStampsProps {
  countries: CountryVisit[];
  onCountryClick: (country: CountryVisit) => void;
}

const stampColors = [
  'hsl(var(--capri-normal))',
  'hsl(var(--florida-normal))',
  'hsl(var(--violet-normal))',
  'hsl(var(--cyan-dark))',
  'hsl(var(--sun-dark))',
  'hsl(var(--sicilia-dark))',
];

function getStampStyle(index: number) {
  const rotations = [-4, 3, -2, 5, -3, 2, -5, 1, -1, 4];
  return {
    rotation: rotations[index % rotations.length],
    color: stampColors[index % stampColors.length],
  };
}

const STAMPS_PER_PAGE = 9;

export function PassportStamps({ countries, onCountryClick }: PassportStampsProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [animState, setAnimState] = useState<'idle' | 'flipping-out' | 'flipping-in'>('idle');
  const [displayPage, setDisplayPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const totalPages = Math.max(1, Math.ceil(countries.length / STAMPS_PER_PAGE));
  const pageCountries = countries.slice(
    displayPage * STAMPS_PER_PAGE,
    (displayPage + 1) * STAMPS_PER_PAGE
  );

  const goToPage = (page: number) => {
    if (page < 0 || page >= totalPages || page === currentPage || animState !== 'idle') return;
    setFlipDirection(page > currentPage ? 'next' : 'prev');
    setAnimState('flipping-out');
    setCurrentPage(page);
  };

  useEffect(() => {
    if (animState === 'flipping-out') {
      const timer = setTimeout(() => {
        setDisplayPage(currentPage);
        setAnimState('flipping-in');
      }, 150);
      return () => clearTimeout(timer);
    }
    if (animState === 'flipping-in') {
      const timer = setTimeout(() => {
        setAnimState('idle');
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [animState, currentPage]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    }
  };

  // Page flip animation styles
  const getPageStyle = (): React.CSSProperties => {
    if (animState === 'flipping-out') {
      const rotateY = flipDirection === 'next' ? '-95deg' : '95deg';
      return {
        transform: `perspective(1200px) rotateY(${rotateY})`,
        opacity: 0.3,
        transition: 'transform 0.15s cubic-bezier(0.4, 0, 1, 0.6), opacity 0.12s ease',
        transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
      };
    }
    if (animState === 'flipping-in') {
      return {
        transform: 'perspective(1200px) rotateY(0deg)',
        opacity: 1,
        transition: 'transform 0.22s cubic-bezier(0.2, 0.85, 0.3, 1), opacity 0.18s ease 0.03s',
        transformOrigin: flipDirection === 'next' ? 'right center' : 'left center',
      };
    }
    return {
      transform: 'perspective(1200px) rotateY(0deg)',
      opacity: 1,
      transition: 'none',
    };
  };

  // Initial entrance for stamps
  const getInitialPageStyle = (): React.CSSProperties => {
    if (animState === 'flipping-in') {
      return {};
    }
    return {};
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Passport book */}
      <div
        className="relative rounded-xl w-full"
        style={{
          background: 'linear-gradient(170deg, hsl(32 22% 93%) 0%, hsl(28 18% 87%) 50%, hsl(25 15% 83%) 100%)',
          boxShadow: '0 2px 8px hsla(30, 15%, 30%, 0.12), 0 8px 24px hsla(30, 10%, 20%, 0.08), inset 0 1px 0 hsla(40, 30%, 95%, 0.6)',
          overflow: 'hidden',
          touchAction: 'pan-x',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'auto' as any,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle paper texture */}
        <div className="absolute inset-0 rounded-xl pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 21px, hsl(25 20% 45%) 21.5px)',
        }} />

        {/* Spine shadow left */}
        <div className="absolute left-0 top-0 bottom-0 w-5 rounded-l-xl pointer-events-none" style={{
          background: 'linear-gradient(90deg, hsla(30, 12%, 45%, 0.1) 0%, transparent 100%)',
        }} />

        {/* Page edge tabs on right */}
        <div className="absolute right-0 top-6 bottom-6 flex flex-col justify-center gap-1 pointer-events-none pr-[1px]">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className="rounded-l-sm"
              style={{
                width: '2.5px',
                height: i === displayPage ? '14px' : '8px',
                background: i === displayPage
                  ? 'hsl(var(--foreground) / 0.18)'
                  : 'hsl(var(--foreground) / 0.06)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Passport header */}
        <div className="text-center pt-4 pb-1 relative">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-[0.5px]" style={{ background: 'hsl(var(--foreground) / 0.15)' }} />
            <span
              className="uppercase tracking-[0.3em]"
              style={{
                fontSize: '7.5px',
                fontWeight: 'var(--font-weight-bold)',
                color: 'hsl(var(--foreground) / 0.3)',
              }}
            >
              Passaporte Digital
            </span>
            <div className="w-5 h-[0.5px]" style={{ background: 'hsl(var(--foreground) / 0.15)' }} />
          </div>
        </div>

        {/* Flippable page content */}
        <div className="overflow-hidden rounded-b-xl" style={{ touchAction: 'pan-x', overscrollBehavior: 'none' }}>
          <div style={getPageStyle()}>
            {/* Stamps grid */}
            <div className="px-4 pb-5 pt-2" style={{ overflow: 'hidden', touchAction: 'manipulation' }}>
              <div className="grid grid-cols-3 gap-1">
                {pageCountries.map((country, index) => {
                  const globalIndex = displayPage * STAMPS_PER_PAGE + index;
                  const style = getStampStyle(globalIndex);
                  return (
                    <div key={country.code} className="flex items-center justify-center" style={{ padding: '6px 4px' }}>
                    <button
                      onClick={() => onCountryClick(country)}
                      className="relative flex flex-col items-center justify-center rounded-lg active:scale-95 w-full"
                      style={{
                        transform: `rotate(${style.rotation}deg)`,
                        border: `2px solid ${style.color}`,
                        aspectRatio: '1',
                        padding: '8px 4px',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      {/* Dashed inner border */}
                      <div
                        className="absolute inset-[3px] rounded-md pointer-events-none"
                        style={{ border: `1.5px dashed ${style.color}`, opacity: 0.3 }}
                      />

                      <span style={{ fontSize: '22px', lineHeight: 1 }}>{country.flag}</span>
                      <span
                        className="mt-1 uppercase tracking-wider"
                        style={{
                          fontSize: '9px',
                          fontWeight: 'var(--font-weight-bold)',
                          color: style.color,
                          letterSpacing: '0.08em',
                        }}
                      >
                        {country.name}
                      </span>
                      <span
                        style={{
                          fontSize: '8px',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: style.color,
                          opacity: 0.75,
                        }}
                      >
                        {country.year}
                      </span>

                      {/* Ink smudge */}
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full pointer-events-none"
                        style={{
                          background: style.color,
                          opacity: 0.05,
                          filter: 'blur(4px)',
                        }}
                      />
                    </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination — outside the book */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-1">
          {/* Page dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentPage ? '18px' : '6px',
                  height: '6px',
                  background: i === currentPage
                    ? 'hsl(var(--capri-normal))'
                    : 'hsl(var(--foreground) / 0.12)',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
