import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ItineraryPlace, ItineraryDay } from '@/data/itineraries';
import { format } from 'date-fns';
import { Calendar, ChevronDown, Check, MoreHorizontal, MapPin, Loader2, ChevronLeft, Copy } from 'lucide-react';
import { getCityCoordinates, resolveDestinationCoordinates, LatLng } from '@/lib/cityCoordinates';
import { openGoogleMapsDirections } from '@/lib/navigationMaps';
import { resolveCountryFromText } from '@/lib/countryResolver';

export interface MapPlace extends ItineraryPlace {
  order?: number;
  startTime?: string;
  endTime?: string;
  openHours?: string;
  day?: number | null;
  category?: string;
  city?: string;
  dateStr?: string;
  uid?: string;
  address?: string;
  location?: string;
}

export interface ItineraryMapScreenProps {
  title: string;
  places: MapPlace[];
  days: ItineraryDay[];
  destinations?: string[];
  focusedPlace?: MapPlace | null;
  onMovePlaceToDay?: (placeId: number, sourceDay: number | null, targetDay: number | null) => void;
  onBack: () => void;
  onSwitchToItinerary?: () => void;
  onSelectPlaceDetails?: (place: MapPlace) => void;
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
  focusedPlace = null,
  onBack,
  onSwitchToItinerary,
  onSelectPlaceDetails,
}: ItineraryMapScreenProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [asyncDestCoords, setAsyncDestCoords] = useState<LatLng[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isFocusedMode = Boolean(focusedPlace);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const carouselRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // 1. Resolve coordenadas dos destinos escolhidos para o roteiro
  const knownDestCoords = useMemo(() => {
    if (!destinations || destinations.length === 0) return [];
    return destinations
      .map((d) => getCityCoordinates(d))
      .filter((c): c is LatLng => c !== null);
  }, [destinations]);

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

  // Normaliza os lugares mapeados com dia, ordem e UID único
  const orderedPlaces = useMemo(() => {
    const defaultCityCoord = effectiveDestCoords.length > 0
      ? effectiveDestCoords[0]
      : { lat: -23.5505, lng: -46.6333 };

    // Se temos um lugar focado que não está na lista, insere-o
    let baseList = [...places];
    if (focusedPlace && !baseList.some((p) => p.name.toLowerCase() === focusedPlace.name.toLowerCase() || p.id === focusedPlace.id)) {
      baseList = [focusedPlace, ...baseList];
    }

    return baseList.map((p, idx) => {
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
  }, [places, days, effectiveDestCoords, focusedPlace]);

  // Filtra por dia ou modo focado
  const filteredPlaces = useMemo(() => {
    if (isFocusedMode && focusedPlace) {
      const match = orderedPlaces.find(
        (p) => p.name.toLowerCase() === focusedPlace.name.toLowerCase() || p.id === focusedPlace.id
      );
      if (match) {
        return [{ ...match, ...focusedPlace, displayOrder: 1 }];
      }
      return [{
        ...focusedPlace,
        uid: focusedPlace.uid || 'focused-place',
        displayOrder: 1,
        dayColor: '#1D4ED8',
        lat: focusedPlace.lat || 0,
        lng: focusedPlace.lng || 0,
      }];
    }

    const rawList = selectedDay === null
      ? orderedPlaces
      : orderedPlaces.filter((p) => p.day === selectedDay);

    return rawList.map((p, index) => ({
      ...p,
      displayOrder: index + 1,
    }));
  }, [orderedPlaces, selectedDay, isFocusedMode, focusedPlace]);

  const isFirstBoundsFit = useRef(true);

  // Inicializa o Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const validPlaces = (focusedPlace ? [focusedPlace] : orderedPlaces).filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0)
    );

    let initialCenter: [number, number] = [-23.5505, -46.6333];
    let initialZoom = 12;

    if (focusedPlace && Number.isFinite(focusedPlace.lat) && Number.isFinite(focusedPlace.lng)) {
      initialCenter = [focusedPlace.lat!, focusedPlace.lng!];
      initialZoom = 16;
    } else if (validPlaces.length > 0) {
      const avgLat = validPlaces.reduce((acc, c) => acc + (c.lat || 0), 0) / validPlaces.length;
      const avgLng = validPlaces.reduce((acc, c) => acc + (c.lng || 0), 0) / validPlaces.length;
      initialCenter = [avgLat, avgLng];
      initialZoom = validPlaces.length === 1 ? 15 : 13;
    } else if (effectiveDestCoords.length > 0) {
      const avgLat = effectiveDestCoords.reduce((acc, c) => acc + c.lat, 0) / effectiveDestCoords.length;
      const avgLng = effectiveDestCoords.reduce((acc, c) => acc + c.lng, 0) / effectiveDestCoords.length;
      initialCenter = [avgLat, avgLng];
      initialZoom = effectiveDestCoords.length === 1 ? 13 : 7;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    }).setView(initialCenter as L.LatLngExpression, initialZoom);

    L.tileLayer('https://mt0.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}', {
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    map.whenReady(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
        setTimeout(() => {
          map.invalidateSize();
          setIsMapReady(true);
        }, 220);
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
      isFirstBoundsFit.current = true;
    };
  }, []);

  // Atualiza markers e bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersMapRef.current.forEach((m) => m.remove());
    markersMapRef.current.clear();

    const validCoords = filteredPlaces.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0)
    );

    if (validCoords.length > 0) {
      validCoords.forEach((place) => {
        const isSelected = selectedUid === place.uid || isFocusedMode;
        const marker = L.marker([place.lat, place.lng], {
          icon: createMapPinIcon(place.displayOrder, isSelected, place.dayColor || '#1D4ED8'),
          zIndexOffset: isSelected ? 1000 : 0,
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          handleSelectPlace(place.uid);
        });

        marker.addTo(map);
        markersMapRef.current.set(place.uid, marker);
      });

      if (isFirstBoundsFit.current) {
        // No primeiro render, ajusta de imediato sem conflito de animação
        isFirstBoundsFit.current = false;
        if (isFocusedMode && validCoords[0]) {
          map.setView([validCoords[0].lat, validCoords[0].lng], 16, { animate: false });
        } else if (validCoords.length === 1) {
          map.setView([validCoords[0].lat, validCoords[0].lng], 15, { animate: false });
        } else {
          const bounds = L.latLngBounds(validCoords.map((p) => [p.lat, p.lng] as [number, number]));
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: false });
          }
        }
      } else {
        // Nas interações seguintes (troca de dia, foco), utiliza transição suave
        if (isFocusedMode && validCoords[0]) {
          map.flyTo([validCoords[0].lat, validCoords[0].lng], 16, { duration: 0.4 });
        } else if (validCoords.length === 1) {
          map.flyTo([validCoords[0].lat, validCoords[0].lng], 15, { duration: 0.4 });
        } else {
          const bounds = L.latLngBounds(validCoords.map((p) => [p.lat, p.lng] as [number, number]));
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true, duration: 0.4 });
          }
        }
      }
    }
  }, [filteredPlaces, isFocusedMode]);

  // Sincroniza ícones dos marcadores conforme selectedUid
  useEffect(() => {
    filteredPlaces.forEach((place) => {
      const marker = markersMapRef.current.get(place.uid);
      if (marker) {
        const isSelected = selectedUid === place.uid || isFocusedMode;
        marker.setIcon(createMapPinIcon(place.displayOrder, isSelected, place.dayColor || '#1D4ED8'));
        marker.setZIndexOffset(isSelected ? 1000 : 0);
      }
    });
  }, [selectedUid, filteredPlaces, isFocusedMode]);

  // Mantém seleção inicial
  useEffect(() => {
    if (filteredPlaces.length > 0) {
      if (!selectedUid || !filteredPlaces.some((p) => p.uid === selectedUid)) {
        setSelectedUid(filteredPlaces[0].uid);
      }
    }
  }, [filteredPlaces]);

  const handleSelectPlace = (placeUid: string) => {
    setSelectedUid(placeUid);
    const targetPlace = filteredPlaces.find((p) => p.uid === placeUid);

    if (targetPlace && mapRef.current) {
      mapRef.current.flyTo([targetPlace.lat, targetPlace.lng], 16, {
        duration: 0.45,
      });
    }

    if (carouselRef.current) {
      const cardEl = carouselRef.current.querySelector(`[data-place-uid="${placeUid}"]`);
      if (cardEl) {
        isProgrammaticScroll.current = true;
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        window.setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 500);
      }
    }
  };

  const handleCarouselScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!carouselRef.current) return;
      const container = carouselRef.current;
      const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-place-uid]'));
      if (cards.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestPlaceUid: string | null = null;
      let minDistance = Infinity;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - containerCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestPlaceUid = card.getAttribute('data-place-uid');
        }
      });

      if (closestPlaceUid && closestPlaceUid !== selectedUid) {
        setSelectedUid(closestPlaceUid);
        const targetPlace = filteredPlaces.find((p) => p.uid === closestPlaceUid);
        if (targetPlace && mapRef.current) {
          mapRef.current.flyTo([targetPlace.lat, targetPlace.lng], 16, {
            duration: 0.45,
          });
        }
      }
    }, 120);
  };

  const selectedPlace = useMemo(() => {
    if (isFocusedMode && focusedPlace) return focusedPlace;
    return filteredPlaces.find((p) => p.uid === selectedUid) || filteredPlaces[0] || null;
  }, [isFocusedMode, focusedPlace, filteredPlaces, selectedUid]);

  const selectedDayLabel = selectedDay === null
    ? 'Todos os dias'
    : `Dia ${String(selectedDay).padStart(2, '0')}`;

  const currentAddress = selectedPlace?.location || selectedPlace?.address || selectedPlace?.city || 'Localização';

  const handleCopyAddress = () => {
    const textToCopy = currentAddress !== 'Localização' ? currentAddress : (selectedPlace?.name || '');
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="h-screen w-full relative bg-[#E8EEF2] font-sans overflow-hidden select-none">
      {/* 1. Map Background */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0, isolation: 'isolate' }}>
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 0 }} />
      </div>

      {/* Loading Overlay com transição suave (fade out) */}
      <div
        className={`absolute inset-0 z-[1100] flex flex-col items-center justify-center bg-white transition-opacity duration-300 pointer-events-none ${isMapReady ? 'opacity-0' : 'opacity-100'
          }`}
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#1D4ED8]" />
        <p className="text-[13px] font-semibold text-[#1A1C40] mt-3 font-['Urbanist',sans-serif]">
          Carregando mapa…
        </p>
      </div>

      {/* 2. Top Controls Overlay */}
      <div
        className="absolute top-0 inset-x-0 p-4 flex items-center justify-between gap-2 pointer-events-none"
        style={{
          zIndex: 1200,
          paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 8px)',
        }}
      >
        {isFocusedMode ? (
          /* MODO FOCADO (EXATO À IMAGEM 2): Botão Voltar Circular Branco */
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#1A1C40] active:scale-95 transition-all border border-black/5"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-6 h-6 text-[#1A1C40]" />
            </button>
          </div>
        ) : (
          /* MODO GERAL DO ROTEIRO: Toggle [ Roteiro | Mapa ] e Filtro de Dias */
          <>
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
                    className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center justify-between transition-colors ${selectedDay === null ? 'bg-[#F5F3FF] text-[#1D4ED8] font-bold' : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
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
                      className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center justify-between transition-colors ${selectedDay === d.day ? 'bg-[#F5F3FF] text-[#1D4ED8] font-bold' : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
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
          </>
        )}
      </div>

      {/* 3. Bottom Card / Carousel (Layer 1200) */}
      {isFocusedMode && selectedPlace ? (
        /* MODO FOCADO (CSS Frame 1321315995): CARD BRANCO COM ENDEREÇO, BOTÃO COPIAR E BOTÃO GOOGLE MAPS */
        <div
          className="absolute bottom-6 inset-x-0 px-4 z-[1200] pointer-events-auto"
          style={{
            paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="w-full bg-[#FFFFFF] border border-[#F2F2F2] rounded-[16px] px-4 py-6 flex flex-col items-start gap-6 shadow-xl">
            {/* Linha do Endereço com Botão de Copiar */}
            <div className="w-full flex items-center justify-between gap-3 min-w-0">
              <p className="text-[14px] font-medium text-[#171F2C] leading-[18px] font-['Urbanist',sans-serif] line-clamp-2 min-w-0 flex-1 my-0 text-left">
                {currentAddress}
              </p>

              <button
                type="button"
                onClick={handleCopyAddress}
                className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[#141530] hover:bg-black/5 active:scale-95 transition-all flex-shrink-0"
                title="Copiar endereço"
                aria-label="Copiar endereço"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-[#516D12]" strokeWidth={2.5} />
                ) : (
                  <Copy className="w-4 h-4 text-[#141530]" strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Botão Verde Lima: "Exibir no Google Maps" */}
            <button
              type="button"
              onClick={() => {
                openGoogleMapsDirections({
                  name: selectedPlace.name,
                  lat: selectedPlace.lat,
                  lng: selectedPlace.lng,
                  address: selectedPlace.location || selectedPlace.address,
                  city: selectedPlace.city,
                });
              }}
              className="w-full h-[48px] rounded-[16px] bg-[#9DCC36] hover:bg-[#8EC028] active:scale-[0.99] transition-all flex items-center justify-center font-bold text-[#141530] text-[16px] leading-[19px] font-['Urbanist',sans-serif] shadow-none"
            >
              Exibir no Google Maps
            </button>
          </div>
        </div>
      ) : (
        /* MODO GERAL: Carrossel com Cards de Lugares */
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{ zIndex: 1200, bottom: 'calc(max(24px, env(safe-area-inset-bottom, 0px) + 12px))' }}
        >
          {filteredPlaces.length === 0 ? (
            <div className="px-4 w-full max-w-md mx-auto pointer-events-auto">
              <div className="p-4 bg-white rounded-2xl shadow-xl border border-black/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#1D4ED8] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#1A1C40] truncate">Nenhum local neste dia</p>
                    <p className="text-[12px] text-[#8E8E93] truncate">
                      {destinations.length > 0
                        ? `Destino: ${destinations.join(', ')}`
                        : 'Escolha outro dia ou veja todos os dias.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-1 pointer-events-auto snap-x snap-mandatory items-center justify-start"
              style={{
                paddingLeft: 'calc((100vw - min(320px, calc(100vw - 72px))) / 2)',
                paddingRight: 'calc((100vw - min(320px, calc(100vw - 72px))) / 2)',
                overscrollBehaviorX: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {filteredPlaces.map((place) => {
                const isSelected = selectedUid === place.uid;
                const placeCountry = resolveCountryFromText(place.city || (destinations[0] ? destinations[0] : ''));
                const locationLabel = placeCountry || place.city || (destinations[0] ? destinations[0].split(',')[0].trim() : '');

                return (
                  <div
                    key={place.uid}
                    data-place-uid={place.uid}
                    onClick={() => {
                      handleSelectPlace(place.uid);
                      if (onSelectPlaceDetails) {
                        onSelectPlaceDetails(place);
                      }
                    }}
                    className={`w-[calc(100vw-72px)] min-w-[calc(100vw-72px)] max-w-[320px] sm:min-w-[320px] bg-white rounded-[22px] overflow-hidden border border-[#E5E5E7] transition-all duration-300 cursor-pointer snap-center flex-shrink-0 active:scale-[0.98] ${isSelected
                        ? 'scale-100 opacity-100 z-10'
                        : 'scale-[0.95] opacity-80 hover:opacity-100'
                      }`}
                  >
                    {/* Photo with Day Color Number Badge */}
                    <div className="relative h-[120px] w-full bg-muted overflow-hidden">
                      <img
                        src={place.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600'}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Badge Pin */}
                      <div
                        className="absolute top-2.5 left-2.5 flex items-center justify-center shadow-xs border-2 border-white"
                        style={{
                          width: '28px',
                          height: '28px',
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
                    </div>

                    {/* Info Content */}
                    <div className="p-3.5 pt-3">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-[15px] font-bold text-[#141530] truncate font-['Urbanist',sans-serif] leading-snug">
                          {place.name}
                        </h4>
                      </div>
                      <p className="text-[12px] font-medium text-[#666666] mt-0.5 truncate font-['Urbanist',sans-serif]">
                        {place.category || 'Atração'}{locationLabel ? ` | ${locationLabel}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
