import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@/components/ui/Icon';
import { CountryDetailSheet } from '@/components/travel/CountryDetailSheet';
import { CountryActionSheet } from '@/components/travel/CountryActionSheet';
import { AddVisitedCountriesSheet } from '@/components/travel/AddVisitedCountriesSheet';
import { CountryVisit } from '@/data/visitedCountries';
import { CountryInfo, getCountryInfo, ALL_COUNTRIES } from '@/data/countriesCatalog';
import { BackButton } from '@/components/ui/BackButton';

// Map ISO-2 → ISO-3 para casar com o GeoJSON. Construído a partir do
// catálogo completo de países para que QUALQUER país marcado como visitado
// seja colorido no mapa (não apenas alguns hardcoded).
const ISO2_TO_ISO3: Record<string, string> = ALL_COUNTRIES.reduce((acc, c) => {
  if (c.code && c.iso3) acc[c.code.toUpperCase()] = c.iso3;
  return acc;
}, {} as Record<string, string>);

// Stamp-style colors (matching PassportStamps)
const STAMP_COLORS = [
  'hsl(200 85% 50%)', // capri (azul)
  'hsl(330 75% 55%)', // florida (rosa)
  'hsl(265 70% 55%)', // violet (roxo)
  'hsl(190 80% 40%)', // cyan dark
  'hsl(40 90% 50%)',  // sun (amarelo)
  'hsl(15 75% 50%)',  // sicilia (laranja)
  'hsl(140 60% 45%)', // verde
  'hsl(280 60% 50%)', // magenta
  'hsl(220 70% 55%)', // azul royal
  'hsl(0 70% 55%)',   // vermelho
];

const STAMP_ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 1, -1, 4];

interface VisitedCountriesMapScreenProps {
  countries: CountryVisit[];
  userName?: string;
  onBack: () => void;
  /** When provided, clicking on a not-yet-visited country opens the action sheet. */
  onMarkVisited?: (country: CountryInfo, year: number) => void;
  onMarkWantToVisit?: (country: CountryInfo) => void;
  /** When provided, allows removing a visited country from the passport. */
  onDeleteCountry?: (countryCode: string) => void;
  /** ISO-2 codes already on the user's "want to visit" list — disables the CTA when matched. */
  wantedCountryCodes?: string[];
}

type Region = 'Mundo' | 'Europa' | 'Ásia' | 'América do Norte' | 'América Central' | 'América do Sul' | 'África' | 'Oceania';

const regions: { key: Region; label: string; bounds?: [[number, number], [number, number]] }[] = [
  { key: 'Mundo', label: 'Mundo' },
  { key: 'Europa', label: 'Europa', bounds: [[34, -12], [71, 45]] },
  { key: 'Ásia', label: 'Ásia', bounds: [[5, 40], [55, 145]] },
  { key: 'América do Norte', label: 'América do Norte', bounds: [[15, -170], [72, -50]] },
  { key: 'América Central', label: 'América Central', bounds: [[7, -118], [33, -59]] },
  { key: 'América do Sul', label: 'América do Sul', bounds: [[-56, -82], [13, -34]] },
  { key: 'África', label: 'África', bounds: [[-35, -20], [37, 52]] },
  { key: 'Oceania', label: 'Oceania', bounds: [[-50, 110], [0, 180]] },
];

// Map continent strings from data → Region groups for the filter
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

function createStampMarker(country: CountryVisit, color: string, rotation: number) {
  const size = 64;
  return L.divIcon({
    className: 'visited-country-stamp',
    html: `<div style="
      position:relative;
      transform: rotate(${rotation}deg);
      width:${size}px;height:${size}px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      border:2px solid ${color};
      border-radius:8px;
      background: rgba(255,255,255,0.92);
      padding:4px 2px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    ">
      <div style="position:absolute;inset:3px;border:1.5px dashed ${color};opacity:0.35;border-radius:5px;pointer-events:none;"></div>
      <span style="font-size:20px;line-height:1;">${country.flag}</span>
      <span style="margin-top:2px;font-size:7.5px;font-weight:800;color:${color};letter-spacing:0.06em;text-transform:uppercase;text-align:center;line-height:1.05;max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${country.name}</span>
      <span style="font-size:7px;font-weight:700;color:${color};opacity:0.75;">${country.year}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const [region, setRegion] = useState<Region>('Mundo');
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

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      maxBounds: L.latLngBounds([-85, -180], [85, 180]),
      maxBoundsViscosity: 1.0,
    });

    // Sem tile layer: usamos apenas os polígonos do GeoJSON de países para
    // garantir que apenas as fronteiras nacionais sejam exibidas (sem
    // delimitações de estados/regiões/cidades vindas do basemap).
    map.getContainer().style.background = '#EAECEF';

    // Recalcula o zoom mínimo para garantir que o mapa sempre preencha o container,
    // independentemente do tamanho da viewport.
    const fitMinZoom = () => {
      const bounds = L.latLngBounds([-85, -180], [85, 180]);
      const z = map.getBoundsZoom(bounds, true);
      map.setMinZoom(z);
      if (map.getZoom() < z) map.setZoom(z);
    };
    fitMinZoom();
    map.on('resize', fitMinZoom);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build country → color mapping (stable by index in dataset)
  const countryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach((c, i) => {
      map.set(c.code, STAMP_COLORS[i % STAMP_COLORS.length]);
    });
    return map;
  }, [countries]);

  // Markers removed — only colored country regions are shown on the map

  // Load & color visited country regions via GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then((geojson: any) => {
        if (cancelled || !mapRef.current) return;

        const iso3ColorMap = new Map<string, string>();
        const iso3ToCountry = new Map<string, CountryVisit>();
        countries.forEach(c => {
          const iso3 = ISO2_TO_ISO3[c.code];
          if (iso3) {
            iso3ColorMap.set(iso3, countryColorMap.get(c.code) || STAMP_COLORS[0]);
            iso3ToCountry.set(iso3, c);
          }
        });

        if (geoLayerRef.current) {
          geoLayerRef.current.remove();
          geoLayerRef.current = null;
        }

        const layer = L.geoJSON(geojson, {
          style: (feature: any) => {
            const props = feature?.properties || {};
            const iso3 = props['ISO3166-1-Alpha-3'] || props.ISO_A3 || props.iso_a3 || feature?.id;
            const color = iso3ColorMap.get(iso3);
            if (color) {
              return {
                fillColor: color,
                fillOpacity: 0.55,
                color,
                weight: 1.5,
                opacity: 1,
              };
            }
            // País não visitado: sem preenchimento para mostrar o basemap
            // (ruas, bairros, limites) por baixo. Mantemos só uma fronteira
            // sutil e tornamos clicável quando o usuário pode marcar países.
            // País não visitado: preenchimento neutro para que o mapa pareça
            // uma silhueta limpa do mundo, apenas com fronteiras de países.
            return {
              fillColor: '#FFFFFF',
              fillOpacity: 1,
              color: '#B8BEC7',
              weight: 0.6,
              opacity: 1,
              interactive: canMarkCountries,
            } as L.PathOptions;
          },
          onEachFeature: (feature: any, lyr: L.Layer) => {
            const props = feature?.properties || {};
            const iso3 = props['ISO3166-1-Alpha-3'] || props.ISO_A3 || props.iso_a3 || feature?.id;
            const country = iso3ToCountry.get(iso3);
            const fallbackName =
              props.ADMIN || props.name || props.NAME || props.NAME_LONG || iso3 || 'País';
            const iso2Hint = props['ISO3166-1-Alpha-2'] || props.ISO_A2 || props.iso_a2;
            // Sempre resolve o nome em português via catálogo, caindo para o
            // nome do GeoJSON (inglês) só se o país não estiver no catálogo.
            const ptInfo = getCountryInfo(iso3, fallbackName, iso2Hint);
            const labelName = country?.name || ptInfo.name || fallbackName;
            const isVisited = !!country;
            // Tooltip permanente, mas controlado via zoom (ver listener abaixo).
            // Em zoom baixo, removemos do DOM (closeTooltip) para manter o mapa limpo.
            (lyr as L.Path).bindTooltip(labelName, {
              permanent: true,
              direction: 'center',
              className: isVisited
                ? 'visited-country-label'
                : 'visited-country-label unvisited',
            });
            // Tag a camada para o listener de zoom decidir o que mostrar.
            (lyr as any)._isVisited = isVisited;
            if (country) {
              lyr.on('click', () => {
                setSelectedCountry(country);
                setSheetOpen(true);
              });
              return;
            }
            // Unvisited country — only attach a handler if the screen is editable.
            if (!canMarkCountries) return;
            lyr.on('click', () => {
              setActionCountry(ptInfo);
              setActionSheetOpen(true);
            });
          },
        });

        layer.addTo(map);
        if ((layer as any).bringToBack) (layer as any).bringToBack();
        geoLayerRef.current = layer;

        // Controla a exibição dos rótulos por nível de zoom:
        //  - zoom < 4  → nenhum label (mapa limpo)
        //  - zoom 4-5 → apenas países visitados
        //  - zoom ≥ 6 → todos os países
        const updateLabelsByZoom = () => {
          const z = map.getZoom();
          layer.eachLayer((lyr: any) => {
            const tooltip = lyr.getTooltip?.();
            if (!tooltip) return;
            const showAll = z >= 6;
            const showVisitedOnly = z >= 4 && z < 6;
            const shouldShow =
              showAll || (showVisitedOnly && lyr._isVisited);
            if (shouldShow) {
              lyr.openTooltip?.();
            } else {
              lyr.closeTooltip?.();
            }
          });
        };
        updateLabelsByZoom();
        map.on('zoomend', updateLabelsByZoom);
        (layer as any)._zoomHandler = updateLabelsByZoom;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      const map = mapRef.current;
      const layer = geoLayerRef.current as any;
      if (map && layer?._zoomHandler) {
        map.off('zoomend', layer._zoomHandler);
      }
    };
  }, [countries, countryColorMap, canMarkCountries]);

  // Fit bounds when region changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const target = regions.find(r => r.key === region);
    if (target?.bounds) {
      map.flyToBounds(target.bounds, { duration: 0.6, padding: [40, 40] });
    } else {
      // Mundo → fit visited countries if any, otherwise world view
      if (countries.length > 0) {
        const latlngs = countries.map(c => L.latLng(c.lat, c.lng));
        const bounds = L.latLngBounds(latlngs).pad(0.4);
        map.flyToBounds(bounds, { duration: 0.6, padding: [40, 40], maxZoom: 4 });
      } else {
        map.flyTo([20, 0], 2, { duration: 0.6 });
      }
    }
  }, [region, countries]);

  // Invalidate size after mount/region change to avoid grey tiles
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [region]);


  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#EAECEF]">
      {/* Map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Floating back button */}
      <div className="absolute top-0 left-0 z-10 px-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
        <BackButton onClick={onBack} ariaLabel="Voltar" />
      </div>

      {/* Region chips */}
      <div className="absolute left-0 right-0 z-10" style={{ bottom: onMarkVisited ? 84 : 24 }}>
        <div className="px-4 overflow-x-auto no-scrollbar">
          <div className="inline-flex gap-2 pb-1">
            {regions.map(r => {
              const isActive = region === r.key;
              const count = regionCounts.get(r.key) || 0;
              const hasAny = r.key === 'Mundo' || count > 0;
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

      {/* Bottom add button (replaces the previous bottom sheet) */}
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
