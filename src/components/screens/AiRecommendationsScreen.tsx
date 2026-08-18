import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronDown, Sparkles, Plus, Check, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchPlacesForCity } from '@/lib/placesApi';
import { getPlacesForDestinations, type CityPlace } from '@/data/cityRecommendations';
import { toast } from 'sonner';

export interface AiRecommendationsScreenProps {
  destinations: string[];
  daysData: Array<{ day: number; title?: string; date: Date }>;
  initialDay?: number;
  initialDestination?: string;
  onBack: () => void;
  onAddPlace: (
    day: number,
    place: {
      name: string;
      category: string;
      categoryColor: string;
      image: string;
      openHours?: string;
      rating?: number;
      price?: string;
      lat?: number;
      lng?: number;
      city?: string;
      observation?: string;
    }
  ) => void;
}

export function AiRecommendationsScreen({
  destinations,
  daysData,
  initialDay = 1,
  initialDestination,
  onBack,
  onAddPlace,
}: AiRecommendationsScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [selectedDestination, setSelectedDestination] = useState(
    initialDestination || destinations[0] || 'Paris, França'
  );
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [places, setPlaces] = useState<CityPlace[]>([]);
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());

  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      const cityName = selectedDestination.split(',')[0].trim();
      let fetched: CityPlace[] = [];

      try {
        fetched = await fetchPlacesForCity(selectedDestination);
      } catch (e) {
        console.error('Error fetching places:', e);
      }

      if (!fetched || fetched.length === 0) {
        fetched = getPlacesForDestinations([cityName]);
      }

      if (isMounted) {
        setPlaces(fetched);
        setSelectedCategory('Todos');
        setTimeout(() => {
          if (isMounted) setIsLoading(false);
        }, 600);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedDestination]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['Todos', ...Array.from(set)];
  }, [places]);

  const currentDayData = daysData.find((d) => d.day === selectedDay);
  const formattedDayStr = currentDayData?.date
    ? `Dia ${String(selectedDay).padStart(2, '0')} (${format(currentDayData.date, 'dd/MM', { locale: ptBR })})`
    : `Dia ${String(selectedDay).padStart(2, '0')}`;

  const cityName = selectedDestination.split(',')[0].trim();

  const filteredPlaces = useMemo(() => {
    if (selectedCategory === 'Todos') return places;
    return places.filter(
      (place) => (place.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );
  }, [places, selectedCategory]);

  const handleAdd = (place: CityPlace) => {
    const placeKey = `${place.name}-${selectedDay}`;
    onAddPlace(selectedDay, {
      name: place.name,
      category: place.category,
      categoryColor: '#3B82F6',
      image: place.image,
      openHours: place.openHours || 'Aberto durante o dia',
      rating: place.rating || 4.8,
      price: place.price || 'Grátis',
      lat: place.lat,
      lng: place.lng,
      city: cityName,
      observation: place.description || 'Ponto turístico recomendado pelo Walter.',
    });

    setAddedPlaceIds((prev) => new Set(prev).add(placeKey));
    toast.success(`"${place.name}" adicionado ao Dia ${selectedDay}!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F9FB] flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="px-5 pt-5 pb-3 bg-white border-b border-[#F0F0F0] flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#1A1C40] hover:bg-[#ECECED] active:scale-95 transition-all flex-shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1A1C40] tracking-tight">
          Recomendações do Walter
        </h1>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Banner Walter */}
        <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/15 flex items-center justify-center text-[#7C3AED] flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-[13px] font-medium text-[#4C1D95] leading-relaxed">
            Walter encontrou recomendações que combinam com o seu perfil.
          </p>
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center gap-3 relative">
          {/* Day Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsDayDropdownOpen(!isDayDropdownOpen);
                setIsCategoryDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E7] text-[13px] font-semibold text-[#1A1C40] shadow-xs active:scale-95 transition-all"
            >
              <span className="text-[14px]">📅</span>
              <span>Adicionar: {formattedDayStr}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93]" />
            </button>

            {isDayDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-[#E5E5E7] rounded-xl shadow-xl z-30 py-1.5 max-h-56 overflow-y-auto divide-y divide-[#F4F4F5]">
                {daysData.map((d) => {
                  const dStr = d.date
                    ? `Dia ${String(d.day).padStart(2, '0')} (${format(d.date, 'dd/MM', { locale: ptBR })})`
                    : `Dia ${String(d.day).padStart(2, '0')}`;
                  return (
                    <button
                      key={d.day}
                      onClick={() => {
                        setSelectedDay(d.day);
                        setIsDayDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-[13px] transition-colors flex items-center justify-between ${
                        selectedDay === d.day
                          ? 'bg-[#F5F3FF] text-[#7C3AED] font-bold'
                          : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
                      }`}
                    >
                      <span>{dStr}</span>
                      {selectedDay === d.day && <Check className="w-4 h-4 text-[#7C3AED]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                setIsDayDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E7] text-[13px] font-semibold text-[#1A1C40] shadow-xs active:scale-95 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span>{selectedCategory}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93]" />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-[#E5E5E7] rounded-xl shadow-xl z-30 py-1.5 max-h-56 overflow-y-auto divide-y divide-[#F4F4F5]">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-[13px] transition-colors flex items-center justify-between ${
                      selectedCategory === cat
                        ? 'bg-[#F5F3FF] text-[#7C3AED] font-bold'
                        : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check className="w-4 h-4 text-[#7C3AED]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Places List */}
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-[#F0F0F0] flex gap-3 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-[#F4F4F5] flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-[#F4F4F5] rounded-md w-3/4" />
                  <div className="h-3 bg-[#F4F4F5] rounded-md w-1/2" />
                  <div className="h-3 bg-[#F4F4F5] rounded-md w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] font-semibold text-[#1A1C40]">Nenhum local encontrado</p>
            <p className="text-[12px] text-[#8E8E93] mt-1">Tente trocar a categoria selecionada.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {filteredPlaces.map((place, idx) => {
              const placeKey = `${place.name}-${selectedDay}`;
              const isAdded = addedPlaceIds.has(placeKey);

              return (
                <div
                  key={`${place.name}-${idx}`}
                  className="bg-white rounded-2xl p-3 border border-[#F0F0F0] shadow-xs flex items-center gap-3"
                >
                  {/* Photo */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={place.image}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="text-[15px] font-bold text-[#1A1C40] leading-snug truncate">
                      {place.name}
                    </h3>
                    <p className="text-[12px] font-medium text-[#8E8E93] mt-0.5 truncate">
                      {place.category} | {cityName}
                    </p>
                    <p className="text-[12px] text-[#6B7280] mt-1 line-clamp-2 leading-tight">
                      {place.description || 'Ícone da cidade e um dos lugares mais famosos.'}
                    </p>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => handleAdd(place)}
                    disabled={isAdded}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                      isAdded
                        ? 'bg-[#E5E5E7] text-[#8E8E93] cursor-default'
                        : 'bg-[#9ecc3b] text-[#1A1C40] hover:opacity-95 shadow-sm'
                    }`}
                    aria-label={`Adicionar ${place.name}`}
                  >
                    {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
