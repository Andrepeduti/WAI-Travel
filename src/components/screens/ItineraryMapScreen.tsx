import { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@/components/ui/Icon';
import { ActivityDetailSheet } from '@/components/travel/ActivityDetailSheet';
import type { ItineraryPlace, ItineraryDay } from '@/data/itineraries';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/ui/BackButton';

// ─── Day colors (all places in the same day share the same color) ───────────

const dayColors = [
  '#E53935', // Day 1 – Red
  '#1E88E5', // Day 2 – Blue
  '#43A047', // Day 3 – Green
  '#FB8C00', // Day 4 – Orange
  '#8E24AA', // Day 5 – Purple
  '#00ACC1', // Day 6 – Cyan
  '#F4511E', // Day 7 – Deep Orange
  '#3949AB', // Day 8 – Indigo
  '#7CB342', // Day 9 – Light Green
  '#D81B60', // Day 10 – Pink
];

function getDayColor(day: number): string {
  return dayColors[(day - 1) % dayColors.length];
}

interface MapPlace extends ItineraryPlace {
  order?: number;
  startTime?: string;
  endTime?: string;
  openHours?: string;
  day?: number | null;
}

function createNumberedIcon(number: number, color: string, isActive: boolean = true) {
  const opacity = isActive ? 1 : 0.45;
  const scale = isActive ? 1 : 0.92;

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      background:${color};
      width:32px;height:32px;
      border-radius:999px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      opacity:${opacity};
      transform:scale(${scale});
      transition:all 0.2s ease;
      cursor:pointer;
      pointer-events:auto;
      touch-action:manipulation;
      border:2px solid white;
    ">
      <span style="
        color:white;font-weight:800;font-size:13px;
        font-family:var(--font-family-primary,system-ui);
        line-height:1;
      ">${number}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function MapLoadingSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Animated travel background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--background)) 50%, hsl(var(--accent) / 0.08) 100%)',
      }} />

      {/* Decorative route line */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 800" fill="none" style={{ opacity: 0.1 }}>
        <path
          d="M50,100 C150,150 100,300 200,350 S350,400 300,550 C250,650 100,600 150,750"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="8 6"
          className="animate-pulse"
        />
      </svg>

      {/* Floating travel icons */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Airplane */}
        <div className="absolute top-[15%] left-[20%] animate-bounce" style={{ animationDuration: '3s', animationDelay: '0s' }}>
          <span className="text-2xl opacity-20">✈️</span>
        </div>
        {/* Pin */}
        <div className="absolute top-[30%] right-[25%] animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
          <span className="text-xl opacity-20">📍</span>
        </div>
        {/* Compass */}
        <div className="absolute top-[55%] left-[15%] animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
          <span className="text-xl opacity-20">🧭</span>
        </div>
        {/* Camera */}
        <div className="absolute top-[70%] right-[20%] animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }}>
          <span className="text-xl opacity-15">📸</span>
        </div>
        {/* Globe */}
        <div className="absolute top-[45%] left-[60%] animate-bounce" style={{ animationDuration: '3.2s', animationDelay: '0.8s' }}>
          <span className="text-lg opacity-15">🌍</span>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 relative z-10">
        {/* Animated map pin with pulse rings */}
        <div className="relative">
          <div className="absolute inset-0 w-16 h-16 rounded-full animate-ping" style={{
            background: 'hsl(var(--primary) / 0.15)',
            animationDuration: '2s',
          }} />
          <div className="absolute inset-0 w-16 h-16 rounded-full animate-ping" style={{
            background: 'hsl(var(--primary) / 0.1)',
            animationDuration: '2s',
            animationDelay: '0.5s',
          }} />
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{
            background: 'hsl(var(--primary) / 0.15)',
            border: '2px solid hsl(var(--primary) / 0.3)',
          }}>
            <Icon name="map-pin" size={28} className="text-primary animate-bounce" style={{ animationDuration: '1.5s' }} />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[15px] font-semibold text-foreground">Preparando seu mapa</span>
          <span className="text-[13px] text-muted-foreground">Localizando seus destinos...</span>
        </div>

        {/* Animated dots progress */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              style={{
                animation: 'pulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ItineraryMapScreenProps {
  title: string;
  places: MapPlace[];
  days: ItineraryDay[];
  onMovePlaceToDay?: (placeId: number, sourceDay: number | null, targetDay: number | null) => void;
  onBack: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ItineraryMapScreen({ title, places, days, onMovePlaceToDay, onBack }: ItineraryMapScreenProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<ItineraryPlace | null>(null);
  const [detailActivity, setDetailActivity] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const markerClickTimerRef = useRef<number | null>(null);

  const filteredPlaces = useMemo(() => {
    if (selectedDay === null) return places;
    return places.filter(p => p.day === selectedDay);
  }, [places, selectedDay]);

  const availableDays = useMemo(() => {
    return days.map((day) => day.day).sort((a, b) => a - b);
  }, [days]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([48.8566, 2.3522], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

    mapRef.current = map;

    // Ensure proper size calculation and mark loaded
    map.whenReady(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
        setTimeout(() => {
          map.invalidateSize();
          setMapLoaded(true);
        }, 300);
      });
    });

    return () => {
      if (markerClickTimerRef.current !== null) {
        window.clearTimeout(markerClickTimerRef.current);
        markerClickTimerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers — recriado apenas quando o conjunto de places muda.
  // (Não depende de selectedPlace para evitar destruir o marker durante o
  // próprio handler de clique, o que fazia o evento vazar para o overlay
  // do bottom sheet recém-montado e fechá-lo no mesmo tick.)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const openPlaceDetails = (place: MapPlace) => {
      setSelectedPlace(place);
      if (markerClickTimerRef.current !== null) {
        window.clearTimeout(markerClickTimerRef.current);
      }
      markerClickTimerRef.current = window.setTimeout(() => {
        setDetailActivity({
          id: place.id,
          name: place.name,
          image: place.image,
          category: place.category,
          rating: place.rating,
          price: '',
          openHours: place.openHours ?? '',
          startTime: place.startTime ?? '',
          endTime: place.endTime ?? '',
          day: place.day ?? null,
        });
        markerClickTimerRef.current = null;
      }, 0);
    };

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (filteredPlaces.length === 0) return;

    filteredPlaces.forEach((place, index) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: createNumberedIcon(place.order ?? index + 1, getDayColor(place.day ?? 1), true),
      });

      marker.on('click', (e) => {
        // Impede que o clique do Leaflet propague até o overlay do sheet.
        L.DomEvent.stopPropagation(e);
        if (e.originalEvent) {
          e.originalEvent.preventDefault();
          L.DomEvent.stopPropagation(e.originalEvent);
        }
        openPlaceDetails(place);
      });
      marker.addTo(map);
      marker.getElement()?.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPlaceDetails(place);
      });
      markersRef.current.push(marker);
    });

    const bounds = L.latLngBounds(filteredPlaces.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [filteredPlaces]);

  // Atualiza apenas a opacidade dos markers existentes quando muda a seleção,
  // sem recriar o DOM (evita conflito com o evento de clique em andamento).
  useEffect(() => {
    markersRef.current.forEach((marker, index) => {
      const place = filteredPlaces[index];
      if (!place) return;
      const el = marker.getElement();
      if (!el) return;
      const child = el.firstElementChild as HTMLElement | null;
      if (!child) return;
      const isActive = selectedPlace === null || selectedPlace.id === place.id;
      child.style.opacity = isActive ? '1' : '0.45';
      child.style.transform = `scale(${isActive ? 1 : 0.92})`;
    });
  }, [selectedPlace, filteredPlaces]);

  // Day filter label helper
  const getDayLabel = (dayNum: number) => {
    const dayInfo = days.find(d => d.day === dayNum);
    if (dayInfo?.date) {
      const weekdayRaw = format(dayInfo.date, 'EEE', { locale: ptBR }).replace('.', '');
      const short = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1, 3);
      const dayOfMonth = format(dayInfo.date, 'd');
      return { weekday: short, dayOfMonth };
    }
    return { weekday: `Dia`, dayOfMonth: `${dayNum}` };
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 z-[2000]">
          <MapLoadingSkeleton />
        </div>
      )}

      {/* Header */}
 <header className="absolute top-0 left-0 right-0 z-[1000] px-4 pb-3">
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <div className="bg-white rounded-full px-4 py-2.5 shadow-lg flex-1">
            <h1 className="text-[15px] font-semibold text-foreground truncate">{title}</h1>
          </div>
        </div>
      </header>

      {/* Day filter tabs — calendar style */}
      <div className="absolute top-[72px] left-0 right-0 z-[1000] px-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedDay(null)}
            className={`flex flex-col items-center justify-center min-w-[52px] h-[52px] rounded-[22px] text-center shadow-md transition-all ${
              selectedDay === null
                ? 'bg-foreground text-background'
                : 'bg-white text-foreground'
            }`}
          >
            <span className="text-[12px] font-medium leading-tight">Todos</span>
          </button>
          {availableDays.map(day => {
            const { weekday, dayOfMonth } = getDayLabel(day);
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`flex flex-col items-center justify-center min-w-[52px] h-[52px] rounded-[22px] text-center shadow-md transition-all ${
                  isSelected
                    ? 'bg-foreground text-background'
                    : 'bg-white text-foreground'
                }`}
              >
                <span className={`text-[12px] font-medium leading-tight ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
                  {weekday}
                </span>
                <span className="text-[16px] font-semibold leading-tight">{dayOfMonth}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map — single persistent container */}
      <div className="flex-1">
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Empty state */}
      {mapLoaded && filteredPlaces.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div className="bg-white/90 rounded-2xl px-6 py-4 shadow-lg text-center">
            <Icon name="location_off" size={28} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-[14px] font-medium text-muted-foreground">Nenhum lugar neste dia</p>
          </div>
        </div>
      )}

      {/* Activity Detail Sheet */}
      <ActivityDetailSheet
        activity={detailActivity}
        onClose={() => {
          setDetailActivity(null);
          setSelectedPlace(null);
        }}
      />
    </div>
  );
}
