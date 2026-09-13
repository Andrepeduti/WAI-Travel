import { useState, useMemo, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DaySelector } from './DaySelector';
import { getDestinationForDay, type CityPlace } from '@/data/cityRecommendations';
import { searchPlaces } from '@/data/cityRecommendations';
import { fetchPlacesForCity, mergePlaces } from '@/lib/placesApi';
export interface PlaceResult {
  id: number;
  name: string;
  category: string;
  categoryColor: string;
  image: string;
  rating?: number;
  price?: string;
  openHours?: string;
  lat: number;
  lng: number;
  city: string;
  description?: string;
  address?: string;
}


export function cityPlaceToResult(p: CityPlace): PlaceResult {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    categoryColor: p.categoryColor,
    image: p.image,
    rating: p.rating,
    price: p.price,
    openHours: p.openHours ? `Aberto das ${p.openHours}` : '',
    lat: p.lat,
    lng: p.lng,
    city: p.city,
    description: p.description,
    address: p.address,
  };
}

interface AddPlacesScreenProps {
  open: boolean;
  onClose: () => void;
  onSelect: (placeOrPlaces: PlaceResult | PlaceResult[], day: number) => void;
  dayNumber: number;
  totalDays: number;
  startDate?: Date;
  destinations?: string[];
  existingActivityNames?: string[];
}

export function AddPlacesScreen({
  open,
  onClose,
  onSelect,
  dayNumber,
  totalDays,
  startDate,
  destinations = [],
  existingActivityNames = [],
}: AddPlacesScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayNumber);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedPlacesMap, setSelectedPlacesMap] = useState<Map<number, PlaceResult>>(new Map());


  // Search is only triggered on form submit (enter key)
  const [submittedSearch, setSubmittedSearch] = useState('');

  // Reset state when screen opens and lock body scroll
  useEffect(() => {
    if (open) {
      setSelectedDay(dayNumber);
      setSelectedIds(new Set());
      setSelectedPlacesMap(new Map());
      setSearch('');
      setSubmittedSearch('');
      setGoogleResults([]);
      setApiResults([]);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, dayNumber]);

  const dayDestination = useMemo(() => {
    if (destinations.length <= 1) return destinations[0] || '';
    return getDestinationForDay(destinations, selectedDay, totalDays);
  }, [destinations, selectedDay, totalDays]);

  const dayCity = dayDestination.split(',')[0].trim();

  // We only fetch API places when user searches, unlike the old sheet which fetched on mount.
  const [apiResults, setApiResults] = useState<CityPlace[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [googleResults, setGoogleResults] = useState<CityPlace[]>([]);
  const [searchingGoogle, setSearchingGoogle] = useState(false);

  // ─── Main Search Logic (Autocomplete + Hydration) ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (!submittedSearch.trim()) {
      setApiResults([]);
      setGoogleResults([]);
      return;
    }

    setLoadingApi(true);
    setGoogleResults([]);

    const fetchGooglePlaces = async () => {
      try {
        const { searchGooglePlacesText } = await import('@/lib/googlePlacesApi');
        const { incrementApiCounter } = await import('@/lib/placesCache');

        const q = submittedSearch.trim();
        const searchQuery = dayCity ? `${q} ${dayCity}` : q;
        
        // 1. Fetch Text Search
        const suggestions = await searchGooglePlacesText(searchQuery, dayCity);
        await incrementApiCounter('google_places', 1);

        if (cancelled || suggestions.length === 0) {
          if (!cancelled) setLoadingApi(false);
          return;
        }

        // 2. Map to CityPlace format
        const hydrated = suggestions.map((p) => {
          let numId = 0;
          for (let i = 0; i < p.id.length; i++) {
            numId = (numId << 5) - numId + p.id.charCodeAt(i);
            numId |= 0;
          }
          
          return {
            id: Math.abs(numId),
            name: p.name,
            city: p.city || dayCity || 'Local',
            category: p.primaryType || 'Atração',
            categoryColor: '#9DCC36',
            image: p.photoUrl || 'https://images.unsplash.com/photo-1488646953014-c8bf2c37e968?q=80&w=600&auto=format&fit=crop',
            rating: 4.5, // Default placeholder
            price: '$$', // Default placeholder
            openHours: '',
            lat: p.lat,
            lng: p.lng,
            address: p.address,
            googlePlaceId: p.id
          };
        }) as CityPlace[];
        
        if (!cancelled) {
          setGoogleResults(hydrated);
        }
      } catch (e) {
        console.error('Failed to search and map places', e);
      } finally {
        if (!cancelled) setLoadingApi(false);
      }
    };
    
    fetchGooglePlaces();

    return () => {
      cancelled = true;
    };
  }, [submittedSearch, dayDestination, dayCity]);

  // Combine static and Google results based on the search term
  const displayResults = useMemo(() => {
    if (!submittedSearch.trim()) {
      return []; // Load empty as requested
    }
    
    // Search in static data
    const { local: staticLocal } = searchPlaces(submittedSearch, destinations);
    
    // googleResults already contains the hydrated autocomplete results
    let merged = mergePlaces(staticLocal, googleResults);
    
    // Return max 5 items
    return merged.slice(0, 5);
  }, [submittedSearch, destinations, googleResults]);

  if (!open) return null;

  const togglePlaceItem = (place: CityPlace) => {
    const placeResult = cityPlaceToResult(place);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(placeResult.id)) next.delete(placeResult.id);
      else next.add(placeResult.id);
      return next;
    });
    setSelectedPlacesMap(prev => {
      const next = new Map(prev);
      if (next.has(placeResult.id)) next.delete(placeResult.id);
      else next.set(placeResult.id, placeResult);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedList = Array.from(selectedPlacesMap.values()).filter(p => selectedIds.has(p.id));
    if (selectedList.length > 0) {
      onSelect(selectedList, selectedDay);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSelectedPlacesMap(new Map());
    setSearch('');
    onClose();
  };

  const count = selectedIds.size;
  const isSearching = loadingApi || searchingGoogle;



  return (
    <div className="fixed inset-0 z-[210] bg-[#F3F3F3] flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white px-4 pb-4 pt-safe-top flex flex-col gap-6">
        <div className="flex items-center gap-4 h-12">
          <button onClick={handleClose} className="p-2 -ml-2 rounded-full active:bg-secondary/60 transition-colors">
            <Icon name="chevron_left" size={24} className="text-[#000000]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#171F2C] font-urbanist">Adicionar lugares</h1>
        </div>

        <div className="flex flex-col gap-4">
          {/* Day Selector */}
          <div className="flex flex-row items-center p-[12px] gap-[12px] bg-[#EEEEEE] rounded-[12px] h-[60px] w-full">
            <Icon name="calendar_today" size={20} className="text-[#141530] shrink-0" />
            <div className="flex flex-col flex-1 justify-center relative">
              <p className="text-[12px] font-medium text-[#949494] mb-[2px] leading-tight font-urbanist">Adicionar ao dia</p>
              <div className="w-full relative">
                <DaySelector
                  selectedDay={selectedDay}
                  totalDays={totalDays}
                  onChange={setSelectedDay}
                  startDate={startDate}
                  transparent
                />
              </div>
            </div>
          </div>

          {/* Search Input */}
          <form 
            className="relative flex items-center bg-[#F2F2F2] rounded-xl h-[56px] px-4 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedSearch(search);
            }}
          >
            <Icon name="search" size={16} className="text-[#141530] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por um lugar..."
              enterKeyHint="search"
              className="flex-1 bg-transparent text-[14px] text-[#141530] placeholder:text-muted-foreground outline-none font-medium font-urbanist"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSubmittedSearch(''); }} className="p-1 shrink-0">
                <Icon name="close" size={16} className="text-[#141530]" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white px-4 pt-0 overflow-y-auto scrollbar-hide" style={{ paddingBottom: '120px' }}>
        {submittedSearch && (
          <p className="text-[12px] font-semibold text-[#7F7F7F] mb-4 font-urbanist">
            Resultados de {submittedSearch}: {displayResults.length} {displayResults.length === 1 ? 'lugar' : 'lugares'}
          </p>
        )}

        {!submittedSearch ? (
           <div className="flex flex-col items-center pt-[97px] gap-4 w-full">
             <div className="w-[56px] h-[56px] bg-[#E5E5E5] rounded-full flex items-center justify-center shrink-0">
               <Icon name="search" size={24} className="text-[#141530]" />
             </div>
             <div className="flex flex-col items-center gap-2 max-w-[258px]">
               <h2 className="text-[18px] font-semibold text-[#141530] text-center font-urbanist leading-tight">
                 Qual lugar você quer adicionar?
               </h2>
               <p className="text-[14px] font-medium text-[#9E9E9E] text-center font-urbanist leading-[17px]">
                 Digite o nome de um destino, atração ou endereço para encontrar o que deseja.
               </p>
             </div>
           </div>
        ) : (
          <div className="flex flex-col gap-4">
            {isSearching && displayResults.length === 0 && (
              <div className="flex justify-center pt-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {displayResults.map((place, index) => {
              const isSelected = selectedIds.has(place.id);
              const isAlreadyAdded = existingActivityNames.includes(place.name.toLowerCase());
              
              return (
                <div key={place.id} className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    {/* Clickable Area for Details */}
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1 min-w-0 active:opacity-70 transition-opacity"
                      onClick={() => togglePlaceItem(place)}
                    >
                      <div 
                        className={`w-[93px] ${isAlreadyAdded ? 'h-[94px]' : 'h-[82px]'} rounded-lg bg-cover bg-center shrink-0`} 
                        style={{ backgroundImage: `url(${place.image})` }} 
                      />
                      
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <h3 className="text-[16px] font-semibold text-[#1A1C40] truncate leading-tight font-urbanist mb-1">{place.name}</h3>
                        <p className="text-[12px] font-semibold text-[#080B43] flex items-center gap-1 font-urbanist truncate mb-1">
                          {place.category || 'Local'} <span className="text-[#7F7F7F] font-medium text-[11px] px-0.5">|</span> {place.city}
                        </p>
                        
                        {isAlreadyAdded && (
                          <div className="inline-flex items-center justify-center px-3 h-[24px] bg-[#F2B90C] rounded-[9px] border border-[#F2B90C] w-fit mt-1">
                            <span className="text-[12px] font-medium text-[#141530] font-urbanist text-center leading-none">
                              Adicionado
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clickable Area for Selection */}
                    <div 
                      className="shrink-0 flex items-center justify-center p-[6.8px] cursor-pointer"
                      onClick={() => togglePlaceItem(place)}
                    >
                      <div className={`w-[20.4px] h-[20.4px] rounded-[4px] flex items-center justify-center transition-colors ${isSelected ? 'bg-[#9DCC36]' : 'bg-[#B6B6B6]'}`}>
                        {isSelected && (
                           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white">
                             <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                           </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < displayResults.length - 1 && (
                    <div className="h-[1px] w-full bg-[#F2F2F2]" />
                  )}
                </div>
              );
            })}

            {/* Removed Manual Google Search Button as requested */}
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-6 bg-white border-t border-[#B6B6B6] h-[97px] z-10">
        <button
          onClick={count > 0 ? handleConfirm : undefined}
          disabled={count === 0}
          className={`w-full h-[48px] rounded-[16px] flex items-center justify-center gap-2 transition-opacity ${
            count > 0 
              ? 'bg-[#9DCC36] active:opacity-80' 
              : 'bg-[#B6B6B6]'
          }`}
        >
          <span className={`text-[16px] font-bold font-urbanist ${
            count > 0 ? 'text-[#141530]' : 'text-[#7F7F7F]'
          }`}>
            Adicionar{count > 0 ? ` (${count})` : ''}
          </span>
        </button>
      </div>
    </div>
  );
}
