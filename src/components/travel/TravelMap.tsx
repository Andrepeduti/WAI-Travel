import { CountryVisit } from '@/data/visitedCountries';

interface TravelMapProps {
  countries: CountryVisit[];
  onCountryClick: (country: CountryVisit) => void;
}

// Convert lat/lng to percentage position on a simple equirectangular projection
function latLngToPercent(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

export function TravelMap({ countries, onCountryClick }: TravelMapProps) {
  return (
    <div
      className="w-full relative rounded-xl overflow-hidden"
      style={{
        height: '260px',
        background: 'linear-gradient(180deg, hsl(220 25% 14%) 0%, hsl(225 30% 18%) 100%)',
      }}
    >
      {/* Simplified world map SVG as background */}
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.15 }}
      >
        {/* Simplified continent outlines */}
        {/* North America */}
        <path d="M150,80 L200,60 L260,70 L280,100 L270,140 L250,170 L220,200 L200,210 L170,190 L140,160 L120,130 L130,100Z" fill="hsl(var(--primary))" />
        {/* South America */}
        <path d="M220,230 L250,220 L270,250 L280,300 L270,350 L250,390 L230,410 L210,380 L200,340 L210,290 L215,260Z" fill="hsl(var(--primary))" />
        {/* Europe */}
        <path d="M460,70 L500,60 L540,70 L550,90 L540,120 L520,140 L490,150 L470,140 L450,120 L440,100 L445,80Z" fill="hsl(var(--primary))" />
        {/* Africa */}
        <path d="M470,170 L510,160 L540,180 L550,220 L540,280 L520,330 L500,360 L480,340 L460,300 L450,250 L455,200Z" fill="hsl(var(--primary))" />
        {/* Asia */}
        <path d="M560,60 L650,50 L740,70 L780,100 L770,140 L740,170 L700,190 L650,200 L600,180 L570,150 L550,120 L545,90Z" fill="hsl(var(--primary))" />
        {/* Australia */}
        <path d="M750,300 L800,290 L840,310 L850,340 L830,370 L800,380 L770,360 L750,330Z" fill="hsl(var(--primary))" />
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line key={`h${i}`} x1="0" y1={i * 125} x2="1000" y2={i * 125} stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.1" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <line key={`v${i}`} x1={i * 143} y1="0" x2={i * 143} y2="500" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.1" />
        ))}
      </svg>

      {/* Country markers */}
      {countries.map((country) => {
        const pos = latLngToPercent(country.lat, country.lng);
        return (
          <button
            key={country.code}
            onClick={() => onCountryClick(country)}
            className="absolute flex flex-col items-center group"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            {/* Pulse ring */}
            <div
              className="absolute w-8 h-8 rounded-full animate-ping"
              style={{
                background: 'hsl(var(--primary))',
                opacity: 0.15,
                animationDuration: '3s',
              }}
            />
            {/* Flag button */}
            <div
              className="relative w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-125 group-active:scale-95"
              style={{
                background: 'hsl(var(--primary) / 0.2)',
                border: '2px solid hsl(var(--primary))',
                backdropFilter: 'blur(4px)',
              }}
            >
              <span style={{ fontSize: '14px' }}>{country.flag}</span>
            </div>
            {/* Label */}
            <span
              className="mt-1 px-1.5 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'hsla(0,0%,0%,0.7)',
                fontSize: '9px',
                color: 'white',
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              {country.code}
            </span>
          </button>
        );
      })}

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(to top, hsl(225 30% 18%), transparent)' }}
      />
    </div>
  );
}
