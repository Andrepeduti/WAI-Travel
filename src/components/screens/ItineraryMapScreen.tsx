import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ActivityDetailSheet } from '@/components/travel/ActivityDetailSheet';
import type { ItineraryPlace, ItineraryDay } from '@/data/itineraries';
import { format } from 'date-fns';
import { Calendar, ChevronDown, Check, MoreHorizontal, MapPin } from 'lucide-react';
import { getCityCoordinates, resolveDestinationCoordinates, LatLng } from '@/lib/cityCoordinates';

interface MapPlace extends ItineraryPlace {
  order?: number;
  startTime?: string;
  endTime?: string;
  openHours?: string;
  day?: number | null;
  category?: string;
  city?: string;
  dateStr?: string;
  uid?: string;
}

interface ItineraryMapScreenProps {
  title: string;
  places: MapPlace[];
  days: ItineraryDay[];
  destinations?: string[];
  onMovePlaceToDay?: (placeId: number, sourceDay: number | null, targetDay: number | null) => void;
  onBack: () => void;
  onSwitchToItinerary?: () => void;
}

// Cores elegantes e distintas para cada dia do roteiro
const DAY_COLORS = [
  '#1D4ED8', // Dia 1: Azul vibrante
  '#7C3AED', // Dia 2: Roxo
  '#059669', // Dia 3: Esmeralda
  '#D97706', // Dia 4: Âmbar
  '#E11D48', // Dia 5: Rosa / Carmesim
  '#0891B2', // Dia 6: Ciano
  '#4F46E5', // Dia 7: Índigo
  '#EA580C', // Dia 8: Laranja
  '#0D9488', // Dia 9: Verde petróleo
  '#9333EA', // Dia 10: Violeta
];

export function getDayColor(dayNumber: number): string {
  const idx = Math.max(0, (dayNumber - 1) % DAY_COLORS.length);
  return DAY_COLORS[idx];
}

function createMapPinIcon(number: number, isSelected: boolean, baseColor: string = '#1D4ED8') {
  const scale = isSelected ? '1.35' : '1';
  const zIndex = isSelected ? 1000 : 1;
  const shadow = isSelected
    ? '0 6px 20px rgba(0,0,0,0.45)'
    : '0 4px 12px rgba(0,0,0,0.30)';
  const border = isSelected ? '3px solid #FFFFFF' : '2.5px solid #FFFFFF';

  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${baseColor};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg) scale(${scale});
      box-shadow: ${shadow};
      border: ${border};
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      cursor: pointer;
      z-index: ${zIndex};
    ">
      <span style="
        color: #FFFFFF;
        font-weight: 800;
        font-size: ${isSelected ? '14px' : '13px'};
        transform: rotate(45deg);
        line-height: 1;
        font-family: 'Urbanist', system-ui, -apple-system, sans-serif;
      ">${number}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

export function ItineraryMapScreen({
  title,
  places,
  days,
  destinations = [],
  onBack,
  onSwitchToItinerary,
}: ItineraryMapScreenProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [detailActivity, setDetailActivity] = useState<any>(null);
  const [asyncDestCoords, setAsyncDestCoords] = useState<LatLng[]>([]);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const carouselRef = useRef<HTMLDivElement>(null);

  // 1. Resolve coordenadas dos destinos escolhidos para o roteiro
  const knownDestCoords = useMemo(() => {
    if (!destinations || destinations.length === 0) return [];
    return destinations
      .map((d) => getCityCoordinates(d))
      .filter((c): c is LatLng => c !== null);
  }, [destinations]);

  // Se algum destino não estiver no dicionário estático, busca assincronamente
  useEffect(() => {
    if (!destinations || destinations.length === 0) return;
    let isCancelled = false;

    async function resolveAllDestinations() {
      const results: LatLng[] = [];
      for (const dest of destinations) {
        const coord = await resolveDestinationCoordinates(dest);
        if (coord && !isCancelled) {
          results.push(coord);
        }
      }
      if (!isCancelled && results.length > 0) {
        setAsyncDestCoords(results);
      }
    }

    void resolveAllDestinations();
    return () => {
      isCancelled = true;
    };
  }, [destinations]);

  const effectiveDestCoords = useMemo(() => {
    if (knownDestCoords.length > 0) return knownDestCoords;
    if (asyncDestCoords.length > 0) return asyncDestCoords;
    return [];
  }, [knownDestCoords, asyncDestCoords]);

  // Normaliza os lugares mapeados com dia, ordem e UID único individual
  const orderedPlaces = useMemo(() => {
    const defaultCityCoord = effectiveDestCoords.length > 0
      ? effectiveDestCoords[0]
      : { lat: -23.5505, lng: -46.6333 };

    return places.map((p, idx) => {
      const dayNum = p.day ?? 1;
      const dayInfo = days.find((d) => d.day === dayNum);
      const dateStr = dayInfo?.date
        ? `Dia ${String(dayNum).padStart(2, '0')} (${format(dayInfo.date, 'dd/MM')})`
        : `Dia ${String(dayNum).padStart(2, '0')}`;

      const angle = (idx * 137.5 * Math.PI) / 180;
      const distance = 0.005 + (idx * 0.002);
      const fallbackLat = defaultCityCoord.lat + Math.sin(angle) * distance;
      const fallbackLng = defaultCityCoord.lng + Math.cos(angle) * distance;

      return {
        ...p,
        day: dayNum,
        uid: p.uid || `place-${p.id}-${dayNum}-${idx}`,
        lat: (typeof p.lat === 'number' && Number.isFinite(p.lat) && p.lat !== 0) ? p.lat : fallbackLat,
        lng: (typeof p.lng === 'number' && Number.isFinite(p.lng) && p.lng !== 0) ? p.lng : fallbackLng,
        dateStr,
        dayColor: getDayColor(dayNum),
      };
    });
  }, [places, days, effectiveDestCoords]);

  // Filtra por dia e atribui numeração sequencial 1, 2, 3... individual a cada card/pin
  const filteredPlaces = useMemo(() => {
    const rawList = selectedDay === null
      ? orderedPlaces
      : orderedPlaces.filter((p) => p.day === selectedDay);

    return rawList.map((p, index) => ({
      ...p,
      displayOrder: index + 1,
    }));
  }, [orderedPlaces, selectedDay]);

  // Inicializa o Mapa Leaflet uma única vez no mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Determina o centro inicial baseado nos destinos da viagem ou nos lugares
    let initialCenter: [number, number] = [-23.5505, -46.6333];
    let initialZoom = 12;

    if (effectiveDestCoords.length === 1) {
      initialCenter = [effectiveDestCoords[0].lat, effectiveDestCoords[0].lng];
      initialZoom = 12;
    } else if (effectiveDestCoords.length > 1) {
      const avgLat = effectiveDestCoords.reduce((acc, c) => acc + c.lat, 0) / effectiveDestCoords.length;
      const avgLng = effectiveDestCoords.reduce((acc, c) => acc + c.lng, 0) / effectiveDestCoords.length;
      initialCenter = [avgLat, avgLng];
      initialZoom = 6; // Visão de mais em cima para múltiplos destinos
    } else if (orderedPlaces.length > 0 && Number.isFinite(orderedPlaces[0].lat) && Number.isFinite(orderedPlaces[0].lng)) {
      initialCenter = [orderedPlaces[0].lat, orderedPlaces[0].lng];
      initialZoom = 13;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(initialCenter as L.LatLngExpression, initialZoom);

    L.tileLayer('https://mt0.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}', {
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    map.whenReady(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 200);

        // Se múltiplos destinos e nenhum lugar específico, ajusta o bounds cobrindo todas as cidades
        if (orderedPlaces.length === 0 && effectiveDestCoords.length > 1) {
          const destBounds = L.latLngBounds(effectiveDestCoords.map((c) => [c.lat, c.lng]));
          if (destBounds.isValid()) {
            map.fitBounds(destBounds, { padding: [70, 70] });
          }
        }
      });
    });

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
      markersMapRef.current.clear();
    };
  }, []); // Executa apenas no mount

  // Atualiza markers e enquadramento do mapa sempre que filteredPlaces ou destinos mudam
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersMapRef.current.forEach((m) => m.remove());
    markersMapRef.current.clear();

    const validCoords = filteredPlaces.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0));

    if (validCoords.length > 0) {
      // 1. Há locais para exibir: adiciona marcadores
      validCoords.forEach((place) => {
        const isSelected = selectedUid === place.uid;
        const marker = L.marker([place.lat, place.lng], {
          icon: createMapPinIcon(place.displayOrder, isSelected, place.dayColor),
          zIndexOffset: isSelected ? 1000 : 0,
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          handleSelectPlace(place.uid, true);
        });

        marker.addTo(map);
        markersMapRef.current.set(place.uid, marker);
      });

      // Enquadra os locais visíveis
      if (validCoords.length === 1) {
        map.flyTo([validCoords[0].lat, validCoords[0].lng], 14, { duration: 0.5 });
      } else {
        const bounds = L.latLngBounds(validCoords.map((p) => [p.lat, p.lng] as [number, number]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
        }
      }
    } else {
      // 2. Não há locais cadastrados ainda: enquadra na(s) cidade(s) de destino do roteiro
      if (effectiveDestCoords.length > 1) {
        // Múltiplos destinos: abre numa visão panorâmica mais alta mostrando todas as cidades
        const bounds = L.latLngBounds(effectiveDestCoords.map((c) => [c.lat, c.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [70, 70] });
        }
      } else if (effectiveDestCoords.length === 1) {
        // Destino único: centraliza diretamente na cidade escolhida (zoom 12)
        map.flyTo([effectiveDestCoords[0].lat, effectiveDestCoords[0].lng], 12, { duration: 0.5 });
      }
    }
  }, [filteredPlaces, effectiveDestCoords]);

  // Atualiza estilo visual individualmente quando selectedUid muda
  useEffect(() => {
    markersMapRef.current.forEach((marker, uid) => {
      const place = filteredPlaces.find((p) => p.uid === uid);
      if (place) {
        const isSelected = selectedUid === uid;
        marker.setIcon(createMapPinIcon(place.displayOrder, isSelected, place.dayColor));
        marker.setZIndexOffset(isSelected ? 1000 : 0);
      }
    });
  }, [selectedUid, filteredPlaces]);

  // Mantém um local selecionado por padrão para destacar no carrossel e mapa
  useEffect(() => {
    if (filteredPlaces.length > 0) {
      if (!selectedUid || !filteredPlaces.some((p) => p.uid === selectedUid)) {
        setSelectedUid(filteredPlaces[0].uid);
      }
    } else {
      setSelectedUid(null);
    }
  }, [filteredPlaces]);

  // Seleciona um local específico pelo UID único e centraliza no mapa e carrossel
  const handleSelectPlace = (placeUid: string, fromMap: boolean = false) => {
    setSelectedUid(placeUid);
    const targetPlace = filteredPlaces.find((p) => p.uid === placeUid);

    if (targetPlace && mapRef.current) {
      mapRef.current.panTo([targetPlace.lat, targetPlace.lng], {
        animate: true,
        duration: 0.5,
      });
    }

    if (carouselRef.current) {
      const cardEl = carouselRef.current.querySelector(`[data-place-uid="${placeUid}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const handleCardClick = (place: (typeof filteredPlaces)[0], openDetails: boolean = false) => {
    const wasSelected = selectedUid === place.uid;
    handleSelectPlace(place.uid, false);
    if (openDetails || wasSelected) {
      setDetailActivity({
        id: place.id,
        name: place.name,
        image: place.image,
        category: place.category || 'Ponto Turístico',
        rating: place.rating ?? 0,
        price: (place as any).price || '',
        openHours: place.openHours || '',
        startTime: place.startTime || '09:00',
        endTime: place.endTime || '10:30',
        day: place.day ?? 1,
      });
    }
  };

  const selectedDayLabel = selectedDay === null
    ? 'Todos os dias'
    : `Dia ${String(selectedDay).padStart(2, '0')}`;

  return (
    <div className="h-screen w-full relative bg-white font-sans overflow-hidden select-none">
      {/* 1. Map Background Container (Layer 0 com stacking context isolado) */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0, isolation: 'isolate' }}
      >
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 0 }} />
      </div>

      {/* 2. Top Controls Overlay (Layer 1200 - Garante que fica ACIMA do Leaflet) */}
      <div
        className="absolute top-0 inset-x-0 p-4 pt-6 flex items-center justify-between gap-2 pointer-events-none"
        style={{ zIndex: 1200 }}
      >
        {/* Toggle [ Roteiro | Mapa ] - Navegação direta sem setinha */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white rounded-full p-1 shadow-lg flex items-center gap-1 border border-black/5">
            <button
              type="button"
              onClick={onSwitchToItinerary || onBack}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#1A1C40] hover:bg-black/5 transition-all font-['Urbanist',sans-serif]"
            >
              Roteiro
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-full text-[13px] font-bold bg-[#1A1C40] text-white shadow-xs font-['Urbanist',sans-serif]"
            >
              Mapa
            </button>
          </div>
        </div>

        {/* Day Dropdown Selector */}
        <div className="relative pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
            className="bg-white rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 border border-black/5 text-[13px] font-bold text-[#1A1C40] active:scale-95 transition-all font-['Urbanist',sans-serif]"
          >
            <Calendar className="w-4 h-4 text-[#1A1C40]" />
            <span>{selectedDayLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#1A1C40]" />
          </button>

          {isDayDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#E5E5E7] rounded-2xl shadow-2xl py-1.5 max-h-60 overflow-y-auto divide-y divide-[#F4F4F5] font-['Urbanist',sans-serif]"
              style={{ zIndex: 1300 }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(null);
                  setIsDayDropdownOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center justify-between transition-colors ${
                  selectedDay === null ? 'bg-[#F5F3FF] text-[#1D4ED8] font-bold' : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
                }`}
              >
                <span>Todos os dias</span>
                {selectedDay === null && <Check className="w-4 h-4 text-[#1D4ED8]" />}
              </button>

              {days.map((d, dIdx) => (
                <button
                  key={`day-filter-${d.day}-${dIdx}`}
                  type="button"
                  onClick={() => {
                    setSelectedDay(d.day);
                    setIsDayDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center justify-between transition-colors ${
                    selectedDay === d.day ? 'bg-[#F5F3FF] text-[#1D4ED8] font-bold' : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getDayColor(d.day) }}
                    />
                    <span>
                      Dia {String(d.day).padStart(2, '0')} {d.date ? `(${format(d.date, 'dd/MM')})` : ''}
                    </span>
                  </div>
                  {selectedDay === d.day && <Check className="w-4 h-4 text-[#1D4ED8]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Cards Carousel (Layer 1200 - Garante que fica ACIMA do Leaflet) */}
      <div
        className="absolute bottom-6 inset-x-0 pointer-events-none"
        style={{ zIndex: 1200 }}
      >
        {filteredPlaces.length === 0 ? (
          <div className="mx-6 p-4 bg-white rounded-2xl shadow-xl border border-black/5 pointer-events-auto flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#1D4ED8] shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1A1C40]">Nenhum local neste dia</p>
                <p className="text-[12px] text-[#8E8E93]">
                  {destinations.length > 0
                    ? `Destino: ${destinations.join(', ')}`
                    : 'Escolha outro dia ou veja todos os dias.'}
                </p>
              </div>
            </div>
            {selectedDay !== null && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#1A1C40] text-white shrink-0 active:scale-95"
              >
                Ver todos
              </button>
            )}
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-5 py-3 pointer-events-auto snap-x snap-mandatory items-center justify-start"
            style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {filteredPlaces.map((place) => {
              const isSelected = selectedUid === place.uid;

              return (
                <div
                  key={place.uid}
                  data-place-uid={place.uid}
                  onClick={() => handleCardClick(place)}
                  className={`w-[calc(100vw-40px)] min-w-[calc(100vw-40px)] max-w-[370px] sm:min-w-[370px] bg-white rounded-[22px] overflow-hidden border transition-all duration-300 cursor-pointer snap-center flex-shrink-0 active:scale-[0.98] ${
                    isSelected
                      ? 'scale-100 opacity-100 z-10 shadow-[0_12px_36px_rgba(0,0,0,0.22)] border-black/10'
                      : 'scale-[0.93] opacity-70 shadow-md border-black/5 hover:opacity-90'
                  }`}
                >
                  {/* Photo with Day Color Number Badge */}
                  <div className="relative h-[130px] w-full bg-muted overflow-hidden">
                    <img
                      src={place.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600'}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Badge em formato de Pin com a cor do dia e número */}
                    <div
                      className="absolute top-3 left-3 flex items-center justify-center shadow-md border-2 border-white"
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50% 50% 50% 0',
                        transform: 'rotate(-45deg)',
                        backgroundColor: place.dayColor,
                      }}
                    >
                      <span
                        className="text-white text-[12px] font-extrabold font-['Urbanist',sans-serif] leading-none"
                        style={{ transform: 'rotate(45deg)' }}
                      >
                        {place.displayOrder}
                      </span>
                    </div>

                    {/* Tag sutil do dia na foto */}
                    {selectedDay === null && (
                      <div
                        className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow-md backdrop-blur-md"
                        style={{ backgroundColor: `${place.dayColor}E6` }}
                      >
                        Dia {String(place.day).padStart(2, '0')}
                      </div>
                    )}
                  </div>

                  {/* Info Content */}
                  <div className="p-4 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[15px] font-bold text-[#141530] truncate font-['Urbanist',sans-serif]">
                        {place.name}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(place, true);
                        }}
                        className="p-1.5 -mr-1 text-[#8E8E93] hover:text-[#1A1C40] rounded-full hover:bg-black/5 transition-colors"
                        title="Ver detalhes"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[12px] font-medium text-[#555555] mt-1 truncate font-['Urbanist',sans-serif]">
                      {place.dateStr} | {place.category || 'Atração'} | {place.city || (destinations[0] ? destinations[0].split(',')[0].trim() : 'Destino')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Detail Sheet (Layer 2000) */}
      <ActivityDetailSheet
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
      />
    </div>
  );
}
