import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { searchGooglePlacesText } from '@/lib/googlePlacesApi';

interface MapPlace {
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

interface CollectionMapScreenProps {
  title: string;
  places: MapPlace[];
  onBack: () => void;
}

function createPinIcon(color: string = '#9DCC36', selected = false) {
  const size = selected ? 50 : 40;
  const pinHeight = selected ? 60 : 50;
  return L.divIcon({
    className: 'collection-map-pin',
    html: `
      <div style="position:relative;width:${size}px;height:${pinHeight}px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35));">
        <div style="
          position:absolute;top:0;left:0;
          width:${size}px;height:${size}px;border-radius:999px;
          background:${color};
          border:3px solid white;
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C7.589 2 4 5.589 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.411-3.589-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" fill="white"/>
          </svg>
        </div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:${size * 0.18}px solid transparent;
          border-right:${size * 0.18}px solid transparent;
          border-top:${pinHeight - size}px solid ${color};
        "></div>
      </div>
    `,
    iconSize: [size, pinHeight],
    iconAnchor: [size / 2, pinHeight],
  });
}

async function geocode(name: string, address?: string): Promise<{ lat: number; lng: number } | null> {
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

export function CollectionMapScreen({ title, places, onBack }: CollectionMapScreenProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  const [resolved, setResolved] = useState<MapPlace[]>(() =>
    places.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0))
  );
  const [loading, setLoading] = useState(
    places.some(p => !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || (p.lat === 0 && p.lng === 0))
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Geocode missing places (sequential w/ small delay to be polite with APIs)
  useEffect(() => {
    let cancelled = false;
    const missing = places.filter(
      p => !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || (p.lat === 0 && p.lng === 0)
    );
    if (missing.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      for (const place of missing) {
        if (cancelled) return;
        const coords = await geocode(place.name, place.address);
        if (cancelled) return;
        if (coords) {
          setResolved(prev => {
            if (prev.some(r => r.id === place.id)) return prev;
            return [...prev, { ...place, lat: coords.lat, lng: coords.lng }];
          });
        }
        await new Promise(r => setTimeout(r, 350));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 2,
      minZoom: 2,
      zoomControl: false,
      attributionControl: true,
      maxBounds: L.latLngBounds([-85, -180], [85, 180]),
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 2,
      subdomains: 'abc',
      noWrap: true,
      bounds: L.latLngBounds([-85, -180], [85, 180]),
      attribution: '© OpenStreetMap',
    }).addTo(map);

    mapInstance.current = map;

    map.whenReady(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 300);
      });
    });

    return () => {
      map.remove();
      mapInstance.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Sync markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Remove markers no longer present
    const currentIds = new Set(resolved.map(p => p.id));
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add/update markers
    for (const place of resolved) {
      const existing = markersRef.current.get(place.id);
      if (existing) {
        existing.setIcon(createPinIcon('#9DCC36', selectedId === place.id));
        continue;
      }
      const marker = L.marker([place.lat, place.lng], {
        icon: createPinIcon('#9DCC36', selectedId === place.id),
      }).addTo(map);
      marker.on('click', () => {
        setSelectedId(place.id);
        map.panTo([place.lat, place.lng], { animate: true });
      });
      markersRef.current.set(place.id, marker);
    }

    // Fit bounds first time we have markers
    if (resolved.length > 0 && selectedId === null) {
      const bounds = L.latLngBounds(resolved.map(p => [p.lat, p.lng] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: false });
      }
    }
  }, [resolved, selectedId]);

  const selectedPlace = selectedId != null ? resolved.find(p => p.id === selectedId) ?? null : null;
  const hasAnyResolved = resolved.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-white" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div ref={mapRef} className="absolute inset-0 bg-[#e8eef2]" style={{ zIndex: 0 }} />

      {!hasAnyResolved && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-white/85">
          {loading ? (
            <>
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: '#E5E7EB', borderTopColor: '#9DCC36' }}
              />
              <p className="text-[13px] mt-3" style={{ color: '#6B7280' }}>
                Carregando mapa…
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                <Icon name="map" size={24} style={{ color: '#999' }} />
              </div>
              <h3 className="text-[15px] font-bold mt-4" style={{ color: '#1A1C40' }}>
                Não conseguimos localizar os lugares
              </h3>
              <p className="text-[13px] mt-1 max-w-[260px] text-center" style={{ color: '#8A8A8A' }}>
                Adicione endereços mais específicos aos lugares desta coleção.
              </p>
            </>
          )}
        </div>
      )}

      {/* Top Controls */}
      <div
        className="absolute top-0 left-0 right-0 z-20 px-5 pointer-events-none"
        style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}
      >
        <div className="relative flex justify-center mt-1">
          {/* Back button wrapper - absolutely positioned to the left */}
          <div className="absolute left-0 top-0 pointer-events-auto">
            <BackButton onClick={onBack} />
          </div>

          {/* Centered content */}
          <div className="flex justify-center pointer-events-none max-w-[68%] shrink-0">
            <div
              className="pointer-events-auto bg-white rounded-full px-5 py-2.5 flex items-center gap-2 shadow-lg max-w-full"
            >
              <h1 className="text-[15px] font-semibold text-foreground truncate">{title}</h1>
              {hasAnyResolved && (
                <>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Icon name="place" size={14} className="text-primary" />
                    <span className="text-[13px] font-semibold text-foreground">
                      {resolved.length} {resolved.length === 1 ? 'lugar' : 'lugares'}
                      {loading && resolved.length < places.length ? ` de ${places.length}` : ''}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected place info card */}
      {selectedPlace && (
        <div
          className="absolute left-0 right-0 bottom-0 z-10 px-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          >
            <div className="flex gap-3 p-3">
              {selectedPlace.image && (
                <div
                  className="w-20 h-20 rounded-xl bg-center bg-cover flex-shrink-0"
                  style={{ backgroundImage: `url(${selectedPlace.image})` }}
                />
              )}
              <div className="flex-1 min-w-0">
                {selectedPlace.category && (
                  <span
                    className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1"
                    style={{ background: '#f0f0f0', color: '#555' }}
                  >
                    {selectedPlace.category}
                  </span>
                )}
                <h3 className="text-[15px] font-bold leading-tight truncate" style={{ color: '#1A1C40' }}>
                  {selectedPlace.name}
                </h3>
                {selectedPlace.rating != null && selectedPlace.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Icon name="star" size={13} style={{ color: '#F5B400' }} />
                    <span className="text-[12px] font-medium" style={{ color: '#1A1C40' }}>
                      {selectedPlace.rating.toFixed(1)}
                    </span>
                    {selectedPlace.reviewCount && selectedPlace.reviewCount !== '—' && selectedPlace.reviewCount !== '–' && (
                      <span className="text-[12px]" style={{ color: '#8A8A8A' }}>
                        ({selectedPlace.reviewCount})
                      </span>
                    )}
                  </div>
                )}
                {selectedPlace.address && (
                  <p className="text-[12px] mt-1 line-clamp-2" style={{ color: '#8A8A8A' }}>
                    {selectedPlace.address}
                  </p>
                )}
                <button
                  onClick={() => {
                    const query = encodeURIComponent(`${selectedPlace.name} ${selectedPlace.address || selectedPlace.category || ''}`);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                  }}
                  className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted active:scale-95 transition-transform w-fit"
                >
                  <Icon name="directions" size={14} className="text-primary" />
                  <span className="text-[12px] font-semibold text-foreground">Como chegar</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 self-start"
                style={{ background: '#F2F2F2' }}
                aria-label="Fechar"
              >
                <Icon name="close" size={16} style={{ color: '#1A1C40' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
