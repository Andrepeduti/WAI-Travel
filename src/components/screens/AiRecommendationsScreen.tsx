import React, { useState, useEffect, useMemo } from 'react';
import { useBackHandler } from '@/lib/backStack';
import { ChevronLeft, ChevronDown, Sparkles, Plus, Check, MapPin, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchPlacesForCity } from '@/lib/placesApi';
import { getPlacesForDestinations, type CityPlace } from '@/data/cityRecommendations';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  // Arrastar da borda esquerda executa o mesmo que a seta de voltar.
  useBackHandler(onBack);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [selectedDestination, setSelectedDestination] = useState(
    initialDestination || destinations[0] || 'Paris, França'
  );
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [places, setPlaces] = useState<CityPlace[]>([]);
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());

  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const { profile } = useCurrentUser();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      const cityName = selectedDestination.split(',')[0].trim();
      let fetched: CityPlace[] = [];

      try {
        fetched = await fetchPlacesForCity(selectedDestination, profile?.interests || []);
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
        }, 500);
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
    <div className="fixed inset-0 z-50 bg-[#FFFFFF] flex flex-col font-['Urbanist',sans-serif] overflow-hidden animate-in fade-in duration-200">
      {/* Top Header & Filters Section */}
      <div className="bg-[#FFFFFF] px-6 pt-4 pb-4 flex flex-col gap-4 border-b border-[#F2F2F2]">
        
        {/* Title Bar */}
        <div className="flex items-center gap-4 min-h-[38px]">
          <button
            onClick={onBack}
            className="w-[22px] h-[22px] flex items-center justify-center text-[#171F2C] hover:opacity-75 active:scale-95 transition-all flex-shrink-0"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5 text-[#171F2C]" strokeWidth={2.2} />
          </button>
          <h1 className="text-[20px] font-bold leading-[24px] text-[#171F2C] tracking-tight">
            Recomendações do Walter
          </h1>
        </div>

        {/* Walter Banner (Figma: Frame 1321316279) */}
        <div className="bg-[#F6F5F5] rounded-[16px] p-4 flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-[#7447CE]">
            <Sparkles className="w-5 h-5 text-[#7447CE]" strokeWidth={1.8} />
          </div>
          <p className="text-[12px] font-medium leading-[14px] text-[#1A1C40]/70 flex-1">
            Walter encontrou recomendações personalizadas que combinam com o seu roteiro.
          </p>
        </div>

        {/* Filter Chips Bar (Figma: Frame 1321316344) */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {/* Day Selector Chip */}
          <Popover 
            open={isDayDropdownOpen} 
            onOpenChange={(open) => {
              if (open) {
                setIsDestinationDropdownOpen(false);
                setIsCategoryDropdownOpen(false);
              }
              setIsDayDropdownOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-[41px] px-3 bg-[#FFFFFF] border border-[#E0E0E0] rounded-[8px] flex items-center gap-2 text-[14px] font-semibold leading-[28px] text-[#1A1C40] active:scale-95 transition-all ${
                  isDayDropdownOpen ? 'border-[#9DCC36] ring-1 ring-[#9DCC36]' : ''
                }`}
              >
                <Calendar className="w-4 h-4 text-[#141530] shrink-0" strokeWidth={1.8} />
                <span className="whitespace-nowrap">Adicionar: {formattedDayStr}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#141530] shrink-0 transition-transform ${
                    isDayDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-60 p-0 rounded-[12px] shadow-xl border-[#E5E5E7] overflow-y-auto max-h-56 divide-y divide-[#F4F4F5] z-[250]">
              {daysData.map((d) => {
                const dStr = d.date
                  ? `Dia ${String(d.day).padStart(2, '0')} (${format(d.date, 'dd/MM', { locale: ptBR })})`
                  : `Dia ${String(d.day).padStart(2, '0')}`;
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => {
                      setSelectedDay(d.day);
                      setIsDayDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors flex items-center justify-between ${
                      selectedDay === d.day
                        ? 'bg-[#9DCC36]/20 text-[#141530] font-bold'
                        : 'text-[#1A1C40] hover:bg-[#F4F4F5] font-medium'
                    }`}
                  >
                    <span>{dStr}</span>
                    {selectedDay === d.day && <Check className="w-4 h-4 text-[#4E7B06]" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Destination Selector Chip */}
          <Popover 
            open={isDestinationDropdownOpen} 
            onOpenChange={(open) => {
              if (open) {
                setIsDayDropdownOpen(false);
                setIsCategoryDropdownOpen(false);
              }
              setIsDestinationDropdownOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-[41px] px-3 bg-[#FFFFFF] border border-[#E0E0E0] rounded-[8px] flex items-center gap-2 text-[14px] font-semibold leading-[28px] text-[#1A1C40] active:scale-95 transition-all ${
                  isDestinationDropdownOpen ? 'border-[#9DCC36] ring-1 ring-[#9DCC36]' : ''
                }`}
              >
                <MapPin className="w-4 h-4 text-[#141530] shrink-0" strokeWidth={1.8} />
                <span className="whitespace-nowrap">{cityName}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#141530] shrink-0 transition-transform ${
                    isDestinationDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-48 p-0 rounded-[12px] shadow-xl border-[#E5E5E7] overflow-y-auto max-h-56 divide-y divide-[#F4F4F5] z-[250]">
              {destinations.map((dest) => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => {
                    setSelectedDestination(dest);
                    setIsDestinationDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors flex items-center justify-between ${
                    selectedDestination === dest
                      ? 'bg-[#9DCC36]/20 text-[#141530] font-bold'
                      : 'text-[#1A1C40] hover:bg-[#F4F4F5] font-medium'
                  }`}
                >
                  <span>{dest.split(',')[0].trim()}</span>
                  {selectedDestination === dest && <Check className="w-4 h-4 text-[#4E7B06]" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Category Selector Chip */}
          <Popover 
            open={isCategoryDropdownOpen} 
            onOpenChange={(open) => {
              if (open) {
                setIsDayDropdownOpen(false);
                setIsDestinationDropdownOpen(false);
              }
              setIsCategoryDropdownOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-[41px] px-3 bg-[#FFFFFF] border border-[#E0E0E0] rounded-[8px] flex items-center gap-2 text-[14px] font-semibold leading-[28px] text-[#1A1C40] active:scale-95 transition-all ${
                  isCategoryDropdownOpen ? 'border-[#9DCC36] ring-1 ring-[#9DCC36]' : ''
                }`}
              >
                <Tag className="w-4 h-4 text-[#141530] shrink-0" strokeWidth={1.8} />
                <span className="whitespace-nowrap">{selectedCategory}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#141530] shrink-0 transition-transform ${
                    isCategoryDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-48 p-0 rounded-[12px] shadow-xl border-[#E5E5E7] overflow-y-auto max-h-56 divide-y divide-[#F4F4F5] z-[250]">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors flex items-center justify-between ${
                    selectedCategory === cat
                      ? 'bg-[#9DCC36]/20 text-[#141530] font-bold'
                      : 'text-[#1A1C40] hover:bg-[#F4F4F5] font-medium'
                  }`}
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && <Check className="w-4 h-4 text-[#4E7B06]" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Places List Container (Figma: Content / Frame 2087325150) */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3 animate-pulse border-b border-[#F2F2F2]">
                <div className="w-[93px] h-[94px] rounded-[8px] bg-[#F4F4F5] flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-[#F4F4F5] rounded-md w-3/4" />
                  <div className="h-3 bg-[#F4F4F5] rounded-md w-1/2" />
                  <div className="h-3 bg-[#F4F4F5] rounded-md w-5/6" />
                </div>
                <div className="w-8 h-8 rounded-full bg-[#F4F4F5] shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] font-semibold text-[#1A1C40]">Nenhum local encontrado</p>
            <p className="text-[13px] text-[#7F7F7F] mt-1">Tente trocar a categoria selecionada.</p>
          </div>
        ) : (
          <div className="flex flex-col pb-10">
            {filteredPlaces.map((place, idx) => {
              const placeKey = `${place.name}-${selectedDay}`;
              const isAdded = addedPlaceIds.has(placeKey);

              return (
                <React.Fragment key={`${place.name}-${idx}`}>
                  <div className="flex items-center gap-4 py-3.5">
                    {/* Place Image (image 698: 93px x 94px, rounded 8px) */}
                    <div className="w-[93px] h-[94px] rounded-[8px] overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={place.image}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Middle Text Details (Frame 1321316314) */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      {/* Name */}
                      <h3 className="text-[16px] font-semibold leading-[19px] text-[#1A1C40] truncate">
                        {place.name}
                      </h3>

                      {/* Category | City (Frame 1321316364) */}
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] font-semibold leading-[14px] text-[#080B43]">
                          {place.category}
                        </span>
                        <span className="text-[11px] font-medium leading-[13px] text-[#7F7F7F]">
                          |
                        </span>
                        <span className="text-[12px] font-semibold leading-[14px] text-[#080B43]">
                          {cityName}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[12px] font-medium leading-[14px] text-[#7F7F7F] line-clamp-2 mt-0.5">
                        {place.description || 'Ícone da cidade e um dos lugares mais famosos do mundo.'}
                      </p>
                    </div>

                    {/* Add Button (Button_Icon: 32x32 rounded-full) */}
                    <button
                      type="button"
                      onClick={() => handleAdd(place)}
                      disabled={isAdded}
                      className={`w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all ${
                        isAdded
                          ? 'bg-[#E5E5E7] text-[#8E8E93] cursor-default'
                          : 'bg-[#9DCC36] text-[#141530] hover:brightness-95 shadow-xs'
                      }`}
                      aria-label={`Adicionar ${place.name}`}
                    >
                      {isAdded ? (
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-[#141530]" strokeWidth={2.5} />
                      )}
                    </button>
                  </div>

                  {/* Divider Line (Line 17: border 1px solid #F2F2F2) */}
                  {idx < filteredPlaces.length - 1 && (
                    <div className="border-b border-[#F2F2F2] w-full" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

