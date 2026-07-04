import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { searchGooglePlacesText } from '@/lib/googlePlacesApi';

interface PlaceMapPlace {
  id: number;
  name: string;
  category?: string;
  address?: string;
  image?: string;
  rating?: number;
  reviewCount?: string;
  lat: number;
  lng: number;
}

interface PlaceMapScreenProps {
  place: PlaceMapPlace;
  onBack: () => void;
}

function createPinIcon(color: string = '#9DCC36') {
  return L.divIcon({
    className: 'place-map-pin',
    html: `
      <div style="position:relative;width:44px;height:54px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35));">
        <div style="
          position:absolute;top:0;left:0;
          width:44px;height:44px;border-radius:999px;
          background:${color};
          border:3px solid white;
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C7.589 2 4 5.589 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.411-3.589-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" fill="white"/>
          </svg>
        </div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:8px solid transparent;
          border-right:8px solid transparent;
          border-top:12px solid ${color};
        "></div>
      </div>
    `,
    iconSize: [44, 54],
    iconAnchor: [22, 54],
  });
}

async function geocodePlace(name: string, address?: string): Promise<{ lat: number; lng: number } | null> {
  const query = [name, address].filter(Boolean).join(', ');
  if (!query) return null;
  try {
    const results = await searchGooglePlacesText(query);
    if (results && results.length > 0) {
      return { lat: results[0].lat, lng: results[0].lng };
    }
  } catch {
    // ignore
  }
  return null;
}

export function PlaceMapScreen({ place, onBack }: PlaceMapScreenProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const hasInitialCoords = !(place.lat === 0 && place.lng === 0) && Number.isFinite(place.lat) && Number.isFinite(place.lng);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    hasInitialCoords ? { lat: place.lat, lng: place.lng } : null
  );
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  // Geocode if needed
  useEffect(() => {
    if (coords || geocodeFailed) return;
    let cancelled = false;
    geocodePlace(place.name, place.address).then(result => {
      if (cancelled) return;
      if (result) setCoords(result);
      else setGeocodeFailed(true);
    });
    return () => { cancelled = true; };
  }, [coords, geocodeFailed, place.name, place.address]);

  // Initialize map once coords are available
  useEffect(() => {
    if (!coords || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 16,
      minZoom: 2,
      zoomControl: false,
      attributionControl: true,
      maxBounds: L.latLngBounds([-85, -180], [85, 180]),
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://mt0.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      minZoom: 2,
      noWrap: true,
      bounds: L.latLngBounds([-85, -180], [85, 180]),
      attribution: '© Google',
    }).addTo(map);

    const fitMinZoom = () => {
      const b = L.latLngBounds([-85, -180], [85, 180]);
      const z = map.getBoundsZoom(b, true);
      map.setMinZoom(z);
    };
    fitMinZoom();
    map.on('resize', fitMinZoom);

    L.marker([coords.lat, coords.lng], { icon: createPinIcon() }).addTo(map);

    mapInstance.current = map;

    map.whenReady(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 300);
        setTimeout(() => map.invalidateSize(), 800);
      });
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [coords]);

  return (
    <div className="fixed inset-0 z-50 bg-white" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Map */}
      <div ref={mapRef} className="absolute inset-0 bg-[#e8eef2]" style={{ zIndex: 0 }} />

      {/* Loading / fallback overlay while we don't have coordinates */}
      {!coords && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-white/85">
          {geocodeFailed ? (
            <>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                <Icon name="map" size={24} style={{ color: '#999' }} />
              </div>
              <h3 className="text-[15px] font-bold mt-4" style={{ color: '#1A1C40' }}>
                Não conseguimos localizar este lugar
              </h3>
              <p className="text-[13px] mt-1 max-w-[260px] text-center" style={{ color: '#8A8A8A' }}>
                Tente adicionar um endereço mais específico.
              </p>
            </>
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: '#E5E7EB', borderTopColor: '#9DCC36' }}
              />
              <p className="text-[13px] mt-3" style={{ color: '#6B7280' }}>
                Carregando mapa…
              </p>
            </>
          )}
        </div>
      )}

      {/* Top bar — back only */}
      <header className="relative z-10 px-5 pt-5 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
        </div>
      </header>

      {/* Bottom info card */}
      <div className="absolute left-0 right-0 bottom-0 z-10 px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
        >
          <div className="flex gap-3 p-3">
            {place.image && (
              <div
                className="w-20 h-20 rounded-xl bg-center bg-cover flex-shrink-0"
                style={{ backgroundImage: `url(${place.image})` }}
              />
            )}
            <div className="flex-1 min-w-0">
              {place.category && (
                <span
                  className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1"
                  style={{ background: '#f0f0f0', color: '#555' }}
                >
                  {place.category}
                </span>
              )}
              <h3 className="text-[15px] font-bold leading-tight truncate" style={{ color: '#1A1C40' }}>
                {place.name}
              </h3>
              {place.rating != null && place.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Icon name="star" size={13} style={{ color: '#F5B400' }} />
                  <span className="text-[12px] font-medium" style={{ color: '#1A1C40' }}>
                    {place.rating.toFixed(1)}
                  </span>
                  {place.reviewCount && place.reviewCount !== '—' && place.reviewCount !== '–' && (
                    <span className="text-[12px]" style={{ color: '#8A8A8A' }}>
                      ({place.reviewCount})
                    </span>
                  )}
                </div>
              )}
              {place.address && (
                <p className="text-[12px] mt-1 line-clamp-2" style={{ color: '#8A8A8A' }}>
                  {place.address}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
