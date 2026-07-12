import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { Icon } from '@/components/ui/Icon';
import { CountryDetailSheet } from '@/components/travel/CountryDetailSheet';
import { CountryActionSheet } from '@/components/travel/CountryActionSheet';
import { AddVisitedCountriesSheet } from '@/components/travel/AddVisitedCountriesSheet';
import { CountryVisit } from '@/data/visitedCountries';
import { CountryInfo, getCountryInfo, ALL_COUNTRIES } from '@/data/countriesCatalog';
import { BackButton } from '@/components/ui/BackButton';

const ISO2_TO_ISO3: Record<string, string> = ALL_COUNTRIES.reduce((acc, c) => {
  if (c.code && c.iso3) acc[c.code.toUpperCase()] = c.iso3;
  return acc;
}, {} as Record<string, string>);

const STAMP_COLORS = [
  'hsl(200, 85%, 50%)',
  'hsl(330, 75%, 55%)',
  'hsl(265, 70%, 55%)',
  'hsl(190, 80%, 40%)',
  'hsl(40, 90%, 50%)',
  'hsl(15, 75%, 50%)',
  'hsl(140, 60%, 45%)',
  'hsl(280, 60%, 50%)',
  'hsl(220, 70%, 55%)',
  'hsl(0, 70%, 55%)',
];

interface VisitedCountriesMapScreenProps {
  countries: CountryVisit[];
  userName?: string;
  onBack: () => void;
  onMarkVisited?: (country: CountryInfo, year: number) => void;
  onMarkWantToVisit?: (country: CountryInfo) => void;
  onDeleteCountry?: (countryCode: string) => void;
  wantedCountryCodes?: string[];
}

type Region = 'Mundo' | 'Europa' | 'Ásia' | 'América do Norte' | 'América Central' | 'América do Sul' | 'África' | 'Oceania';

const regions: { key: Region; label: string; lat: number; lng: number; altitude: number }[] = [
  { key: 'Mundo', label: 'Mundo', lat: 20, lng: 0, altitude: 2.5 },
  { key: 'Europa', label: 'Europa', lat: 50, lng: 10, altitude: 1.2 },
  { key: 'Ásia', label: 'Ásia', lat: 34, lng: 100, altitude: 1.5 },
  { key: 'América do Norte', label: 'América do Norte', lat: 45, lng: -100, altitude: 1.5 },
  { key: 'América Central', label: 'América Central', lat: 15, lng: -85, altitude: 1.2 },
  { key: 'América do Sul', label: 'América do Sul', lat: -15, lng: -60, altitude: 1.5 },
  { key: 'África', label: 'África', lat: 0, lng: 20, altitude: 1.6 },
  { key: 'Oceania', label: 'Oceania', lat: -25, lng: 135, altitude: 1.4 },
];

function continentToRegion(continent: string): Region | null {
  if (continent === 'Europa') return 'Europa';
  if (continent === 'Ásia') return 'Ásia';
  if (continent === 'América do Norte') return 'América do Norte';
  if (continent === 'América Central') return 'América Central';
  if (continent === 'América do Sul') return 'América do Sul';
  if (continent === 'África') return 'África';
  if (continent === 'Oceania') return 'Oceania';
  return null;
}

export function VisitedCountriesMapScreen({
  countries,
  userName,
  onBack,
  onMarkVisited,
  onMarkWantToVisit,
  onDeleteCountry,
  wantedCountryCodes = [],
}: VisitedCountriesMapScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  
  const [dimensions, setDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 0, 
    height: typeof window !== 'undefined' ? window.innerHeight : 0 
  });
  
  const [geoData, setGeoData] = useState<any[]>([]);
  const [region, setRegion] = useState<Region>('Mundo');
  const [hoveredPolygon, setHoveredPolygon] = useState<any | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionCountry, setActionCountry] = useState<CountryInfo | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const canMarkCountries = !!onMarkVisited || !!onMarkWantToVisit;

  const [isMaximized, setIsMaximized] = useState(false);

  const regionCounts = useMemo(() => {
    const counts = new Map<Region, number>();
    countries.forEach(c => {
      const r = continentToRegion(c.continent);
      if (r) counts.set(r, (counts.get(r) || 0) + 1);
    });
    counts.set('Mundo', countries.length);
    return counts;
  }, [countries]);

  const countryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach((c, i) => {
      map.set(c.code, STAMP_COLORS[i % STAMP_COLORS.length]);
    });
    return map;
  }, [countries]);

  const iso3ColorMap = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach(c => {
      const iso3 = ISO2_TO_ISO3[c.code];
      if (iso3) {
        map.set(iso3, countryColorMap.get(c.code) || STAMP_COLORS[0]);
      }
    });
    return map;
  }, [countries, countryColorMap]);

  const iso3ToCountryMap = useMemo(() => {
    const map = new Map<string, CountryVisit>();
    countries.forEach(c => {
      const iso3 = ISO2_TO_ISO3[c.code];
      if (iso3) map.set(iso3, c);
    });
    return map;
  }, [countries]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    // Trigger once on mount just in case
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoData(data.features);
      });
  }, []);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (globeRef.current && dimensions.width > 0 && !initializedRef.current) {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);
      initializedRef.current = true;
    }
  }, [dimensions]);

  useEffect(() => {
    const target = regions.find(r => r.key === region);
    if (target && globeRef.current) {
      globeRef.current.pointOfView({ lat: target.lat, lng: target.lng, altitude: target.altitude }, 800);
    }
  }, [region]);

  const getPolygonCentroid = (polygon: any) => {
    if (!polygon || !polygon.geometry || !polygon.geometry.coordinates) return [0, 0];
    let latSum = 0, lngSum = 0, pts = 0;
    const processCoords = (coords: any) => {
      if (typeof coords[0] === 'number') {
        lngSum += coords[0];
        latSum += coords[1];
        pts++;
      } else {
        coords.forEach(processCoords);
      }
    };
    processCoords(polygon.geometry.coordinates);
    return pts > 0 ? [latSum / pts, lngSum / pts] : [0, 0];
  };

  const handlePolygonClick = (polygon: any) => {
    const props = polygon.properties || {};
    const iso3 = props['ISO3166-1-Alpha-3'] || props.ISO_A3 || props.iso_a3 || polygon.id;
    const country = iso3ToCountryMap.get(iso3);
    const fallbackName = props.ADMIN || props.name || props.NAME || props.NAME_LONG || iso3 || 'País';
    const iso2Hint = props['ISO3166-1-Alpha-2'] || props.ISO_A2 || props.iso_a2;
    const ptInfo = getCountryInfo(iso3, fallbackName, iso2Hint);

    // Zoom and fly to the clicked country
    if (globeRef.current) {
      const [lat, lng] = getPolygonCentroid(polygon);
      globeRef.current.pointOfView({ lat, lng, altitude: 0.6 }, 800); // 0.6 altitude is close enough to see small countries clearly
    }

    if (country) {
      setSelectedCountry(country);
      setSheetOpen(true);
    } else if (canMarkCountries) {
      setActionCountry(ptInfo);
      setActionSheetOpen(true);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#EAECEF]" ref={containerRef}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundColor="#EAECEF"
            showAtmosphere={true}
            atmosphereColor="#c5ced9"
            atmosphereAltitude={0.15}
            polygonsData={geoData}
            polygonAltitude={() => 0.01}
            polygonCapColor={d => {
              const props = d.properties || {};
              const iso3 = props['ISO3166-1-Alpha-3'] || props.ISO_A3 || props.iso_a3 || d.id;
              const color = iso3ColorMap.get(iso3);
              if (color) return color;
              return 'rgba(255, 255, 255, 0.01)';
            }}
            polygonSideColor={() => 'rgba(200, 200, 200, 0.1)'}
            polygonStrokeColor={() => 'rgba(255, 255, 255, 0.3)'}
            onPolygonClick={handlePolygonClick}
            polygonsTransitionDuration={300}
          />
        </div>
      )}

      {/* Top Bar - Hidden when maximized */}
      <div 
        className="absolute top-0 left-0 z-10 px-4 transition-opacity duration-300" 
        style={{ 
          paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)',
          opacity: isMaximized ? 0 : 1,
          pointerEvents: isMaximized ? 'none' : 'auto'
        }}
      >
        <BackButton onClick={onBack} ariaLabel="Voltar" />
      </div>

      {/* Maximize Toggle Button */}
      <div 
        className="absolute z-10"
        style={{ 
          top: 'calc(max(16px, env(safe-area-inset-top)) + 12px)',
          right: 16
        }}
      >
        <button
          onClick={() => setIsMaximized(!isMaximized)}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg transition-transform active:scale-95"
          aria-label={isMaximized ? "Restaurar mapa" : "Maximizar mapa"}
        >
          {isMaximized ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1C40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1C40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          )}
        </button>
      </div>

      {/* Bottom Regions Bar - Hidden when maximized */}
      <div 
        className="absolute left-0 right-0 z-10 transition-transform duration-500 ease-in-out" 
        style={{ 
          bottom: onMarkVisited ? 84 : 24,
          transform: isMaximized ? 'translateY(150%)' : 'translateY(0)'
        }}
      >
        <div className="px-4 overflow-x-auto no-scrollbar">
          <div className="inline-flex gap-2 pb-1">
            {regions.map(r => {
              const isActive = region === r.key;
              const count = regionCounts.get(r.key) || 0;
              return (
                <button
                  key={r.key}
                  onClick={() => setRegion(r.key)}
                  className="h-9 px-4 rounded-full whitespace-nowrap transition-colors inline-flex items-center gap-1.5"
                  style={{
                    background: isActive ? '#1A1C40' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#1A1C40',
                    fontSize: 12,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  }}
                >
                  <span>{r.label}</span>
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 700,
                      background: isActive ? 'rgba(255,255,255,0.18)' : '#F2F2F2',
                      color: isActive ? '#FFFFFF' : '#1A1C40',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {onMarkVisited && (
        <div
          className="absolute left-0 right-0 bottom-0 z-10 px-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: 12 }}
        >
          <button
            onClick={() => setAddSheetOpen(true)}
            className="w-full h-12 rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: '#9DCC36', boxShadow: '0 4px 14px rgba(157,204,54,0.40)' }}
            aria-label="Adicionar países visitados"
          >
            <Icon name="add" size={20} style={{ color: '#1A1C40' }} />
            <span style={{ color: '#1A1C40', fontSize: 14, fontWeight: 700 }}>
              Adicionar países visitados
            </span>
          </button>
        </div>
      )}

      <CountryDetailSheet
        country={selectedCountry}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDeleteCountry={onDeleteCountry ? (code) => { onDeleteCountry(code); setSelectedCountry(null); } : undefined}
      />

      <CountryActionSheet
        country={actionCountry}
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        alreadyWanted={!!actionCountry && wantedCountryCodes.includes(actionCountry.code)}
        onMarkVisited={(c, year) => onMarkVisited?.(c, year)}
        onMarkWantToVisit={(c) => onMarkWantToVisit?.(c)}
      />

      {onMarkVisited && (
        <AddVisitedCountriesSheet
          open={addSheetOpen}
          onOpenChange={setAddSheetOpen}
          visitedCodes={countries.map(c => c.code)}
          onConfirm={(chosen) => {
            const y = new Date().getFullYear();
            chosen.forEach(c => onMarkVisited(c, y));
          }}
        />
      )}
    </div>
  );
}
