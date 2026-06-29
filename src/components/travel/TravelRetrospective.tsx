import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CountryVisit } from '@/data/visitedCountries';

interface TravelRetrospectiveProps {
  countries: CountryVisit[];
  open: boolean;
  onClose: () => void;
}

const slideGradients = [
  'linear-gradient(135deg, hsl(240 30% 10%) 0%, hsl(204 60% 18%) 50%, hsl(74 40% 20%) 100%)',
  'linear-gradient(135deg, hsl(260 30% 12%) 0%, hsl(240 30% 15%) 50%, hsl(204 50% 20%) 100%)',
  'linear-gradient(135deg, hsl(204 50% 12%) 0%, hsl(180 40% 15%) 50%, hsl(74 50% 18%) 100%)',
  'linear-gradient(135deg, hsl(240 25% 10%) 0%, hsl(260 30% 16%) 50%, hsl(204 60% 22%) 100%)',
];

export function TravelRetrospective({ countries, open, onClose }: TravelRetrospectiveProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!open) return null;

  const totalCities = countries.reduce((acc, c) => acc + c.cities.length, 0);
  const totalDays = countries.reduce((acc, c) => acc + c.days, 0);
  const topPhotos = countries.flatMap(c => c.photos).slice(0, 5);
  const continents = [...new Set(countries.map(c => c.continent))];
  const topDestination = [...countries].sort((a, b) => b.cities.length - a.cities.length)[0];

  const slides = [
    // Slide 1 — Stats
    <div key="s1" className="flex flex-col items-center justify-center h-full px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'linear-gradient(135deg, hsl(74 66% 51%), hsl(204 95% 54%))' }}
      >
        <Icon name="flight" size={28} style={{ color: 'white' }} />
      </div>
      <span
        className="uppercase tracking-[0.25em] mb-1"
        style={{ fontSize: '10px', fontWeight: 'var(--font-weight-bold)', color: 'hsl(74 66% 51%)' }}
      >
        WaiTravel Wrapped
      </span>
      <h1 className="text-white text-center" style={{ fontSize: '26px', fontWeight: 'var(--font-weight-bold)', lineHeight: 1.2 }}>
        Sua Jornada em 2024
      </h1>

      <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-xs">
        {[
          { value: countries.length, label: 'Países', icon: 'public' },
          { value: totalCities, label: 'Cidades', icon: 'location_city' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 flex flex-col items-center"
            style={{ background: 'hsla(0,0%,100%,0.08)', backdropFilter: 'blur(12px)', border: '1px solid hsla(0,0%,100%,0.06)' }}
          >
            <Icon name={stat.icon} size={20} style={{ color: 'hsl(74 66% 51%)' }} />
            <span className="text-white mt-2" style={{ fontSize: '32px', fontWeight: 'var(--font-weight-bold)' }}>
              {stat.value}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 'var(--font-weight-medium)', color: 'hsla(0,0%,100%,0.5)' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-4 flex items-center gap-4 mt-3 w-full max-w-xs"
        style={{ background: 'hsla(0,0%,100%,0.08)', backdropFilter: 'blur(12px)', border: '1px solid hsla(0,0%,100%,0.06)' }}
      >
        <Icon name="calendar_today" size={20} style={{ color: 'hsl(74 66% 51%)' }} />
        <div className="flex flex-col">
          <span className="text-white" style={{ fontSize: '28px', fontWeight: 'var(--font-weight-bold)' }}>
            {totalDays}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 'var(--font-weight-medium)', color: 'hsla(0,0%,100%,0.5)' }}>
            Dias viajando
          </span>
        </div>
        <div className="flex-1" />
        <Icon name="flight_takeoff" size={24} style={{ color: 'hsla(0,0%,100%,0.15)' }} />
      </div>
    </div>,

    // Slide 2 — Countries & Continents
    <div key="s2" className="flex flex-col items-center justify-center h-full px-6">
      <span style={{ fontSize: '11px', fontWeight: 'var(--font-weight-bold)', color: 'hsl(74 66% 51%)', letterSpacing: '0.2em' }} className="uppercase mb-2">
        Você explorou
      </span>
      <h1 className="text-white" style={{ fontSize: '52px', fontWeight: 'var(--font-weight-bold)', lineHeight: 1 }}>
        {continents.length}
      </h1>
      <p className="text-white mb-6" style={{ fontSize: '18px', fontWeight: 'var(--font-weight-semibold)' }}>
        continentes
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-xs">
        {countries.map((c) => (
          <div
            key={c.code}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'hsla(0,0%,100%,0.1)', backdropFilter: 'blur(8px)' }}
          >
            <span style={{ fontSize: '16px' }}>{c.flag}</span>
            <span className="text-white" style={{ fontSize: '12px', fontWeight: 'var(--font-weight-medium)' }}>
              {c.name}
            </span>
          </div>
        ))}
      </div>

      {topDestination && (
        <div
          className="rounded-2xl overflow-hidden w-full max-w-xs"
          style={{ border: '1px solid hsla(0,0%,100%,0.08)' }}
        >
          {topDestination.photos[0] && (
            <img src={topDestination.photos[0]} alt="" className="w-full h-28 object-cover" loading="lazy" />
          )}
          <div className="p-3" style={{ background: 'hsla(0,0%,100%,0.06)' }}>
            <span style={{ fontSize: '10px', fontWeight: 'var(--font-weight-bold)', color: 'hsl(74 66% 51%)', letterSpacing: '0.15em' }} className="uppercase">
              Top Destino
            </span>
            <p className="text-white mt-0.5" style={{ fontSize: '15px', fontWeight: 'var(--font-weight-semibold)' }}>
              {topDestination.flag} {topDestination.name}
            </p>
            <p style={{ fontSize: '11px', color: 'hsla(0,0%,100%,0.5)' }}>
              {topDestination.cities.length} cidades · {topDestination.days} dias
            </p>
          </div>
        </div>
      )}
    </div>,

    // Slide 3 — Best Moments (Asymmetric photo grid)
    <div key="s3" className="flex flex-col items-center justify-center h-full px-6">
      <span style={{ fontSize: '10px', fontWeight: 'var(--font-weight-bold)', color: 'hsl(74 66% 51%)', letterSpacing: '0.2em' }} className="uppercase mb-1">
        WaiTravel Wrapped 2024
      </span>
      <h2 className="text-white mb-6 text-center" style={{ fontSize: '22px', fontWeight: 'var(--font-weight-bold)' }}>
        Seus Melhores Momentos
      </h2>
      <div className="grid grid-cols-3 gap-2 w-full max-w-sm" style={{ gridAutoRows: '1fr' }}>
        {topPhotos.map((photo, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{
              gridColumn: i === 0 ? 'span 2' : undefined,
              gridRow: i === 0 ? 'span 2' : undefined,
            }}
          >
            <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      <p className="text-center mt-4" style={{ fontSize: '12px', color: 'hsla(0,0%,100%,0.4)', fontStyle: 'italic' }}>
        Memórias em {countries.length} países
      </p>
    </div>,

    // Slide 4 — Final Summary
    <div key="s4" className="flex flex-col items-center justify-center h-full text-center px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, hsl(74 66% 51%), hsl(180 85% 44%))' }}
      >
        <Icon name="public" size={26} style={{ color: 'white' }} />
      </div>
      <h2 className="text-white" style={{ fontSize: '24px', fontWeight: 'var(--font-weight-bold)', lineHeight: 1.3 }}>
        Exploradora do Mundo
      </h2>
      <p className="mt-1 mb-6" style={{ fontSize: '13px', color: 'hsla(0,0%,100%,0.5)' }}>
        Suas conquistas de 2024
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {[
          { icon: 'location_city', text: `Visitou ${totalCities} cidades diferentes` },
          { icon: 'calendar_today', text: `Passou ${totalDays} dias viajando` },
          { icon: 'public', text: `Conheceu ${continents.length} continentes` },
          { icon: 'photo_camera', text: `Memórias em ${countries.length} países` },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-left"
            style={{ background: 'hsla(0,0%,100%,0.08)', backdropFilter: 'blur(8px)', border: '1px solid hsla(0,0%,100%,0.04)' }}
          >
            <Icon name={item.icon} size={20} style={{ color: 'hsl(74 66% 51%)' }} />
            <span className="text-white" style={{ fontSize: '14px', fontWeight: 'var(--font-weight-medium)' }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6" style={{ fontSize: '11px', fontWeight: 'var(--font-weight-bold)', color: 'hsl(74 66% 51%)', letterSpacing: '0.1em' }}>
        #WaiTravelWrapped
      </p>
    </div>,
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
  };
  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Minha Retrospectiva WaiTravel',
        text: `Visitei ${countries.length} países, ${totalCities} cidades e viajei ${totalDays} dias! ✈️🌍 #WaiTravelWrapped`,
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: slideGradients[currentSlide % slideGradients.length] }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe-top pb-2 relative z-10">
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'hsla(0,0%,100%,0.1)' }}>
          <Icon name="close" size={20} style={{ color: 'white' }} />
        </button>
        {/* Progress bars */}
        <div className="flex-1 flex gap-1 mx-4">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'hsla(0,0%,100%,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: i <= currentSlide ? '100%' : '0%',
                  background: 'hsl(74 66% 51%)',
                  opacity: i <= currentSlide ? 1 : 0,
                }}
              />
            </div>
          ))}
        </div>
        <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'hsla(0,0%,100%,0.1)' }}>
          <Icon name="share" size={18} style={{ color: 'white' }} />
        </button>
      </div>

      {/* Title */}
      <div className="text-center relative z-10 pb-2">
        <span className="uppercase tracking-[0.2em]" style={{ fontSize: '9px', fontWeight: 'var(--font-weight-bold)', color: 'hsla(0,0%,100%,0.35)' }}>
          WaiTravel Wrapped 2024
        </span>
      </div>

      {/* Slide content */}
      <div className="flex-1 relative">
        {slides[currentSlide]}
      </div>

      {/* Navigation areas (tap left/right) */}
      <div className="absolute inset-0 flex z-[5]" style={{ top: '80px' }}>
        <button className="w-1/3 h-full" onClick={handlePrev} aria-label="Anterior" />
        <div className="w-1/3" />
        <button className="w-1/3 h-full" onClick={handleNext} aria-label="Próximo" />
      </div>

      {/* Bottom */}
      <div className="px-6 pb-8 relative z-10">
        {currentSlide === slides.length - 1 ? (
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2"
            style={{
              background: 'hsl(74 66% 51%)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'hsl(240 30% 10%)',
            }}
          >
            <Icon name="share" size={18} />
            Compartilhar Retrospectiva
          </button>
        ) : (
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === currentSlide ? 'hsl(74 66% 51%)' : 'hsla(0,0%,100%,0.2)',
                  transform: i === currentSlide ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
