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
    initialDestination || destinations[0] || 'Lisboa, Portugal'
  );
  const [selectedCategory, setSelectedCategory] = useState('Tudo');
  const [places, setPlaces] = useState<CityPlace[]>([]);
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());

  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);

  // Fetch places when destination changes
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
        setSelectedCategory('Tudo');
        // Simulate minimum loading time for smooth transition
        setTimeout(() => {
          if (isMounted) setIsLoading(false);
        }, 1200);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedDestination]);

  // Dynamically extract categories present in the loaded places for this search
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['Tudo', ...Array.from(set)];
  }, [places]);

  const currentDayData = daysData.find((d) => d.day === selectedDay);
  const formattedDate = currentDayData?.date ? format(currentDayData.date, 'dd/MM', { locale: ptBR }) : '';
  const cityName = selectedDestination.split(',')[0].trim();

  // Filter places based on selected category
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === 'Tudo') return places;
    return places.filter(
      (place) => (place.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );
  }, [places, selectedCategory]);

  // Lock body scroll while screen is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Render Loading Screen (matching image 2)
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col font-sans overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-border/20">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-[17px] font-bold text-foreground leading-tight">Recomendações da IA</h2>
            <p className="text-[12px] text-muted-foreground">
              {cityName} · Dia {selectedDay}{formattedDate ? ` · ${formattedDate}` : ''}
            </p>
          </div>
        </div>

        {/* Center Loading Graphic & Messages */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {/* Sparkle spinner graphic */}
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#7C3AED]/15 blur-xl animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-100 border-t-[#7C3AED] animate-spin" />
            <div className="w-20 h-20 rounded-full bg-purple-50/90 flex items-center justify-center relative shadow-inner">
              <Sparkles className="w-8 h-8 text-[#7C3AED] animate-pulse" />
              <span className="absolute top-1 right-2 text-[#7C3AED]/70 text-xs animate-ping">✦</span>
              <span className="absolute bottom-2 left-2 text-[#7C3AED]/70 text-xs animate-bounce">✦</span>
            </div>
          </div>

          <h3 className="text-[20px] font-bold text-foreground leading-snug max-w-xs mb-3">
            A IA está buscando as melhores{' '}
            <span className="text-[#7C3AED]">recomendações</span>
          </h3>

          <p className="text-[14px] text-muted-foreground leading-relaxed max-w-xs mb-6">
            Analisando atrações, restaurantes e experiências da região para você.
          </p>

          {/* Subtitle badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-50 text-[#7C3AED] text-[13px] font-medium border border-purple-100">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            <span>Isso pode levar alguns segundos.</span>
          </div>
        </div>

        {/* Cancel button at bottom */}
        <div className="p-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] bg-background">
          <button
            onClick={onBack}
            className="w-full h-13 rounded-full border border-[#7C3AED]/30 text-[#7C3AED] font-semibold text-[15px] hover:bg-purple-50 active:scale-[0.98] transition-all flex items-center justify-center py-3.5"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Render Recommendations Screen (matching image 1)
  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F6] flex flex-col font-sans overflow-hidden animate-fade-in">
      {/* Top Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-border/30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all shrink-0"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-[18px] font-bold text-foreground leading-tight">Recomendações da IA</h2>

            {/* Day Selector Button */}
            <button
              onClick={() => {
                setIsDayDropdownOpen(true);
                setIsDestDropdownOpen(false);
              }}
              className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground font-medium transition-colors mt-0.5"
            >
              <span>Adicionar ao</span>
              <span className="font-bold text-foreground">
                Dia {selectedDay}{formattedDate ? ` · ${formattedDate}` : ''}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Filter Bar - Horizontal Carousel of Dynamic Category Tags */}
        <div
          className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5"
          style={{ overscrollBehaviorX: 'contain' }}
        >
          {/* Destination Selector Pill */}
          <button
            onClick={() => {
              setIsDestDropdownOpen(true);
              setIsDayDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-border/80 text-[13px] font-medium text-foreground shadow-xs active:scale-95 transition-all shrink-0"
          >
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{cityName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {/* Dynamic Category Chips mapped directly from active search results */}
          {availableCategories.map((cat) => {
            const active = cat === selectedCategory;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[13px] transition-all shrink-0 active:scale-95 ${
                  active
                    ? 'bg-[#7C3AED] text-white font-bold shadow-xs'
                    : 'bg-white border border-border/80 text-foreground font-medium hover:bg-secondary/60 shadow-2xs'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Places Cards List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-muted-foreground">
              Nenhuma recomendação encontrada para a categoria &quot;{selectedCategory}&quot;.
            </p>
            <button
              onClick={() => setSelectedCategory('Tudo')}
              className="mt-3 px-4 py-2 rounded-full bg-primary/10 text-primary text-[13px] font-semibold hover:bg-primary/20 transition-colors"
            >
              Ver todas as recomendações
            </button>
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const isAdded = addedPlaceIds.has(place.name.toLowerCase());
            return (
              <div
                key={place.id || place.name}
                className="p-3 bg-white rounded-3xl border border-border/40 shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-muted flex-shrink-0 relative">
                  <img
                    src={place.image}
                    alt={place.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=300';
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-bold text-foreground leading-snug line-clamp-1">
                    {place.name}
                  </h4>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#6B7280] text-[11px] font-medium">
                    {place.category}
                  </span>
                </div>

                {/* Add button - Lime Green '+' */}
                <button
                  onClick={() => {
                    onAddPlace(selectedDay, {
                      name: place.name,
                      category: place.category,
                      categoryColor: place.categoryColor || '#10B981',
                      image: place.image,
                      openHours: place.openHours,
                      rating: place.rating,
                      price: place.price,
                      lat: place.lat,
                      lng: place.lng,
                      city: place.city || cityName,
                    });
                    setAddedPlaceIds((prev) => new Set(prev).add(place.name.toLowerCase()));
                    toast.success(`${place.name} adicionado ao Dia ${selectedDay}`);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${
                    isAdded
                      ? 'bg-[#84CC16] text-white shadow-sm'
                      : 'bg-[#84CC16] hover:bg-[#65A30D] text-white shadow-xs'
                  }`}
                  title="Adicionar ao roteiro"
                >
                  {isAdded ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Destination Selection Bottom Sheet */}
      {isDestDropdownOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setIsDestDropdownOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
          <div
            className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-5 pt-3 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[60vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-muted mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[17px] font-bold text-foreground">Selecionar Destino</h3>
              <button
                onClick={() => setIsDestDropdownOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {destinations.map((dest) => {
                const name = dest.split(',')[0].trim();
                const active = dest === selectedDestination;
                return (
                  <button
                    key={dest}
                    onClick={() => {
                      setSelectedDestination(dest);
                      setIsDestDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-[14px] flex items-center justify-between transition-all ${
                      active
                        ? 'font-bold text-[#7C3AED] bg-purple-50 border border-purple-100'
                        : 'text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <span>{name}</span>
                    {active && <Check className="w-4.5 h-4.5 text-[#7C3AED]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day Selection Bottom Sheet */}
      {isDayDropdownOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setIsDayDropdownOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
          <div
            className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-5 pt-3 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[60vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-muted mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[17px] font-bold text-foreground">Adicionar ao Dia</h3>
              <button
                onClick={() => setIsDayDropdownOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {daysData.map((d) => {
                const dateStr = d.date ? format(d.date, 'dd/MM', { locale: ptBR }) : '';
                const active = d.day === selectedDay;
                return (
                  <button
                    key={d.day}
                    onClick={() => {
                      setSelectedDay(d.day);
                      setIsDayDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-[14px] flex items-center justify-between transition-all ${
                      active
                        ? 'font-bold text-[#7C3AED] bg-purple-50 border border-purple-100'
                        : 'text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <span>Dia {d.day} {dateStr ? `· ${dateStr}` : ''}</span>
                    {active && <Check className="w-4.5 h-4.5 text-[#7C3AED]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
