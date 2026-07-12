import { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Source, Layer, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
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
  const mapRef = useRef<MapRef>(null);
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

  const [geoData, setGeoData] = useState<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [region, setRegion] = useState<Region>('Mundo');
  const [hoveredPolygon, setHoveredPolygon] = useState<any | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionCountry, setActionCountry] = useState<CountryInfo | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const canMarkCountries = !!onMarkVisited || !!onMarkWantToVisit;

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
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => {
        // Pre-process features to ensure a standard iso3 property
        data.features = data.features.map((f: any) => {
          const props = f.properties || {};
          const iso3 = props['ISO3166-1-Alpha-3'] || props.ISO_A3 || props.iso_a3 || f.id;
          return {
            ...f,
            properties: { ...props, iso3 }
          };
        });
        setGeoData(data);
      });
  }, []);

  const fillColorExpression = useMemo(() => {
    if (iso3ColorMap.size === 0) return 'rgba(255, 255, 255, 0)';
    const expr: any[] = ['match', ['get', 'iso3']];
    iso3ColorMap.forEach((color, iso3) => {
      expr.push(iso3, color);
    });
    expr.push('rgba(255, 255, 255, 0)'); // default
    return expr;
  }, [iso3ColorMap]);

  useEffect(() => {
    const target = regions.find(r => r.key === region);
    if (target && mapRef.current) {
      let targetZoom = 2;
      if (target.altitude >= 2.5) targetZoom = 1;
      else if (target.altitude >= 1.5) targetZoom = 2.5;
      else if (target.altitude >= 1.2) targetZoom = 3;
      else targetZoom = 3.5;

      mapRef.current.flyTo({
        center: [target.lng, target.lat],
        zoom: targetZoom,
        duration: 1200
      });
    }
  }, [region]);

  const handleMapClick = (e: any) => {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0];
    const props = feature.properties || {};
    const iso3 = props.iso3;
    const country = iso3ToCountryMap.get(iso3);
    const fallbackName = props.ADMIN || props.name || props.NAME || props.NAME_LONG || iso3 || 'País';
    const iso2Hint = props['ISO3166-1-Alpha-2'] || props.ISO_A2 || props.iso_a2;
    const ptInfo = getCountryInfo(iso3, fallbackName, iso2Hint);

    // Zoom and fly to clicked country
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [e.lngLat.lng, e.lngLat.lat],
        zoom: 4,
        duration: 1000
      });
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
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0a0a]">
      {/* Loading Overlay */}
      <div
        className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-1000 ease-in-out ${isMapLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="w-12 h-12 border-4 border-[#1A1C40] border-t-blue-500 rounded-full animate-spin"></div>
      </div>

      <style>{`
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-bottom-right { display: none !important; }
        .mapboxgl-ctrl-bottom-left { display: none !important; }
      `}</style>
      <div className="absolute inset-0 z-0">
        <MapGL
          ref={mapRef}
          attributionControl={false}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: 0,
            latitude: 20,
            zoom: 1
          }}
          mapStyle="mapbox://styles/mapbox/satellite-v9"
          projection={{ name: 'globe' } as any}
          interactiveLayerIds={['country-fills']}
          onClick={handleMapClick}
          onLoad={() => {
            setIsMapLoaded(true);
            if (mapRef.current) {
              mapRef.current.getMap().setFog({
                color: 'rgb(186, 210, 235)', // Lower atmosphere
                'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
                'horizon-blend': 0.02, // Atmosphere thickness
                'space-color': 'rgb(11, 11, 25)', // Background space
                'star-intensity': 0.6 // Background stars
              });
            }
          }}
        >
          {geoData && (
            <Source id="countries" type="geojson" data={geoData}>
              <Layer
                id="country-fills"
                type="fill"
                paint={{
                  'fill-color': fillColorExpression,
                  'fill-opacity': 1
                }}
              />
              <Layer
                id="country-borders"
                type="line"
                paint={{
                  'line-color': 'rgba(255, 255, 255, 0.4)',
                  'line-width': 1
                }}
              />
            </Source>
          )}
        </MapGL>
      </div>

      {/* Top Bar */}
      <div
        className="absolute top-0 left-0 z-10 px-4"
        style={{
          paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)'
        }}
      >
        <BackButton onClick={onBack} ariaLabel="Voltar" />
      </div>

      {/* Bottom Regions Bar */}
      <div
        className="absolute left-0 right-0 z-10"
        style={{
          bottom: onMarkVisited 
            ? 'calc(env(safe-area-inset-bottom, 0px) + 84px)' 
            : 'calc(env(safe-area-inset-bottom, 0px) + 24px)'
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
