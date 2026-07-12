import { useState, useMemo, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DaySelector } from './DaySelector';
import { getPlacesForDestinations, getDestinationForDay, searchPlaces, groupByCity, type CityPlace } from '@/data/cityRecommendations';
import { fetchPlacesForCity, mergePlaces, searchGoogleFallback } from '@/lib/placesApi';
import { getUserCollections, type UserCollection } from '@/components/screens/TripsScreen';
import { collectionsDataKey, readJSON } from '@/lib/userScopedStorage';

interface CollectionPlace {
  id: number;
  name: string;
  rating?: number;
  category?: string;
  image: string;
  address?: string;
}

function loadCollectionPlaces(collectionId: number): CollectionPlace[] {
  const all = readJSON<Record<number, { places?: CollectionPlace[] }>>(collectionsDataKey(), {});
  return all[collectionId]?.places ?? [];
}

export interface PlaceResult {
  id: number;
  name: string;
  category: string;
  categoryColor: string;
  image: string;
  rating: number;
  price: string;
  openHours: string;
  lat?: number;
  lng?: number;
}

interface AddPlaceSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (place: PlaceResult, day: number) => void;
  onAddManually?: () => void;
  dayNumber: number;
  totalDays: number;
  startDate?: Date;
  /** Trip destinations e.g. ['Paris, França', 'Amsterdam, Holanda'] */
  destinations?: string[];
  /** Names of activities already added across all days (lowercase) */
  existingActivityNames?: string[];
}

function cityPlaceToResult(p: CityPlace): PlaceResult {
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
  };
}

export function AddPlaceSheet({ open, onClose, onSelect, onAddManually, dayNumber, totalDays, startDate, destinations = [], existingActivityNames = [] }: AddPlaceSheetProps) {
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayNumber);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'places' | 'collections'>('places');
  const [openCollectionId, setOpenCollectionId] = useState<number | null>(null);
  useEffect(() => { setSelectedDay(dayNumber); }, [dayNumber]);

  // Reset tab/collection state when sheet opens
  useEffect(() => {
    if (open) {
      setActiveTab('places');
      setOpenCollectionId(null);
    }
  }, [open]);

  // User collections
  const userCollections = useMemo<UserCollection[]>(() => {
    if (!open) return [];
    return getUserCollections();
  }, [open]);

  const openCollection = useMemo(
    () => userCollections.find(c => c.id === openCollectionId) ?? null,
    [userCollections, openCollectionId]
  );

  const collectionPlaces = useMemo<CollectionPlace[]>(() => {
    if (openCollectionId == null) return [];
    return loadCollectionPlaces(openCollectionId);
  }, [openCollectionId]);

  const filteredCollections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return userCollections;
    return userCollections.filter(c => c.title.toLowerCase().includes(q));
  }, [userCollections, search]);

  const filteredCollectionPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collectionPlaces;
    return collectionPlaces.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category ?? '').toLowerCase().includes(q)
    );
  }, [collectionPlaces, search]);

  // API state
  const [apiPlaces, setApiPlaces] = useState<Record<string, CityPlace[]>>({});
  const [loadingApi, setLoadingApi] = useState(false);
  const [fetchedCities, setFetchedCities] = useState<Set<string>>(new Set());

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 1000);
    return () => clearTimeout(t);
  }, [search]);

  // Determine the destination for the selected day
  const dayDestination = useMemo(() => {
    if (destinations.length <= 1) return destinations[0] || '';
    return getDestinationForDay(destinations, selectedDay, totalDays);
  }, [destinations, selectedDay, totalDays]);

  const dayCity = dayDestination.split(',')[0].trim();

  // Fetch API places when sheet opens or destination changes
  const fetchApiPlaces = useCallback(async (cityName: string) => {
    const key = cityName.toLowerCase().trim().split(',')[0].trim();
    if (!key || fetchedCities.has(key)) return;

    setLoadingApi(true);
    setFetchedCities(prev => new Set(prev).add(key));

    try {
      const places = await fetchPlacesForCity(cityName);
      if (places.length > 0) {
        setApiPlaces(prev => ({ ...prev, [key]: places }));
      } else {
        // Empty result — allow retry on next interaction.
        setFetchedCities(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to fetch places for', cityName, e);
      setFetchedCities(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } finally {
      setLoadingApi(false);
    }
  }, [fetchedCities]);

  // Fetch for current day destination when sheet opens
  useEffect(() => {
    if (!open || !dayCity) return;
    fetchApiPlaces(dayDestination);
    // Also fetch other destinations in background
    destinations.forEach(d => {
      const city = d.split(',')[0].trim().toLowerCase();
      if (city !== dayCity.toLowerCase()) {
        // Slight delay to avoid hammering the API
        setTimeout(() => fetchApiPlaces(d), 1500);
      }
    });
  }, [open, dayCity, dayDestination, destinations, fetchApiPlaces]);

  // Get preloaded places (static + API merged)
  const preloadedPlaces = useMemo(() => {
    if (destinations.length === 0) return [];

    // Get static places
    let staticLocal: CityPlace[];
    let staticOther: CityPlace[] = [];

    if (destinations.length > 1 && dayDestination) {
      staticLocal = getPlacesForDestinations([dayDestination]);
      const otherDests = destinations.filter(d => d !== dayDestination);
      staticOther = getPlacesForDestinations(otherDests);
    } else {
      staticLocal = getPlacesForDestinations(destinations);
    }

    // Merge with API places for each destination
    const dayCityKey = dayCity.toLowerCase().trim();
    const apiLocal = apiPlaces[dayCityKey] || [];
    const mergedLocal = mergePlaces(staticLocal, apiLocal);

    // Merge API places for other destinations
    let mergedOther = staticOther;
    if (destinations.length > 1) {
      const otherDests = destinations.filter(d => d !== dayDestination);
      for (const d of otherDests) {
        const key = d.split(',')[0].trim().toLowerCase();
        const apiOther = apiPlaces[key] || [];
        if (apiOther.length > 0) {
          mergedOther = mergePlaces(mergedOther, apiOther);
        }
      }
    }

    return [...mergedLocal, ...mergedOther];
  }, [destinations, dayDestination, dayCity, apiPlaces]);

  // Google Places fallback results (state, fed by effect below)
  const [googleResults, setGoogleResults] = useState<CityPlace[]>([]);

  // Search results
  const { localResults, globalResults } = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return { localResults: preloadedPlaces, globalResults: [] as CityPlace[] };
    }

    const query = debouncedSearch.toLowerCase().trim();

    // Search in static data
    const { local: staticLocal, global: staticGlobal } = searchPlaces(debouncedSearch, destinations);

    // Also search in API data
    const allApiPlaces = Object.values(apiPlaces).flat();
    const matchingApi = allApiPlaces.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );

    // Split API matches into local/global
    const destCitiesLower = destinations.map(d => d.split(',')[0].trim().toLowerCase());
    const apiLocal = matchingApi.filter(p => destCitiesLower.includes(p.city.toLowerCase()));
    const apiGlobal = matchingApi.filter(p => !destCitiesLower.includes(p.city.toLowerCase()));

    let mergedLocal = mergePlaces(staticLocal, apiLocal);

    // Append Google fallback results to local (deduped)
    if (googleResults.length > 0) {
      mergedLocal = mergePlaces(mergedLocal, googleResults);
    }

    // Always restrict to trip destinations — never show places outside referenced cities.
    void staticGlobal; void apiGlobal;
    return { localResults: mergedLocal, globalResults: [] as CityPlace[] };
  }, [debouncedSearch, destinations, preloadedPlaces, apiPlaces, googleResults]);

  const hasResults = localResults.length > 0 || globalResults.length > 0;

  // Google Places fallback: when text search returns 0 results from local+API,
  // search globally restricted to the day's city.
  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q || !dayCity) {
      setGoogleResults([]);
      return;
    }

    // Check if local+API produced any matches for this query
    const queryLower = q.toLowerCase();
    const { local: staticLocal, global: staticGlobal } = searchPlaces(q, destinations);
    const apiMatches = Object.values(apiPlaces).flat().filter(p =>
      p.name.toLowerCase().includes(queryLower) || p.category.toLowerCase().includes(queryLower)
    );
    if (staticLocal.length + staticGlobal.length + apiMatches.length > 0) {
      setGoogleResults([]);
      return;
    }

    // Debounce extra (the search itself is already debounced 300ms; total ~500ms)
    let cancelled = false;
    const t = setTimeout(async () => {
      const results = await searchGoogleFallback(q, dayCity);
      if (!cancelled) setGoogleResults(results);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [debouncedSearch, dayCity, destinations, apiPlaces]);

  if (!open) return null;

  const togglePlace = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (activeTab === 'collections' && openCollection) {
      const selected = collectionPlaces.filter(p => selectedIds.has(p.id));
      selected.forEach(p => {
        onSelect(
          {
            id: p.id,
            name: p.name,
            category: p.category || 'Lugar salvo',
            categoryColor: '#9DCC36',
            image: p.image,
            rating: p.rating ?? 0,
            price: '',
            openHours: '',
          },
          selectedDay
        );
      });
    } else {
      const allPlaces = [...localResults, ...globalResults];
      const selected = allPlaces.filter(p => selectedIds.has(p.id));
      selected.forEach(place => onSelect(cityPlaceToResult(place), selectedDay));
    }
    setSelectedIds(new Set());
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearch('');
    onClose();
  };

  const count = selectedIds.size;

  const renderPlaceRow = (place: CityPlace, showCityBadge?: boolean, hideDetails?: boolean) => {
    const isSelected = selectedIds.has(place.id);
    const isApiOnly = place.rating === 0; // API places have no rating
    const isAlreadyAdded = existingActivityNames.includes(place.name.toLowerCase());
    return (
      <button
        key={place.id}
        onClick={() => togglePlace(place.id)}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
          isSelected ? 'bg-primary/8' : 'active:bg-secondary/60'
        }`}
      >
        <img src={place.image} alt={place.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-[14px] font-semibold text-foreground truncate">{place.name}</h4>
            {isAlreadyAdded && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#E6F0FB] text-[#3B82F6] flex-shrink-0">
                Adicionado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground min-w-0">
            <Icon name="location_on" size={11} className="text-muted-foreground flex-shrink-0" />
            <span className="text-[12px] font-medium truncate">
              {place.city.charAt(0).toUpperCase() + place.city.slice(1)}
            </span>
          </div>
        </div>
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40 bg-transparent'
          }`}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
    );
  };

  // Determine if we need city badges (multi-destination trip)
  const isMultiDest = destinations.length > 1;
  const dayCityLower = dayCity.toLowerCase();

  return (
    <div className="fixed inset-0 z-[210]" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            {activeTab === 'collections' && openCollection && (
              <button
                onClick={() => { setOpenCollectionId(null); setSelectedIds(new Set()); setSearch(''); }}
                className="w-8 h-8 -ml-2 rounded-full flex items-center justify-center active:bg-secondary/60"
                aria-label="Voltar"
              >
                <Icon name="chevron_left" size={20} className="text-foreground" />
              </button>
            )}
            <h3 className="text-[16px] font-semibold text-foreground truncate">
              {activeTab === 'collections' && openCollection ? openCollection.title : 'Adicionar lugar'}
            </h3>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center active:bg-secondary/60">
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Tabs */}
        {!openCollection && (
          <div className="px-5 pb-3">
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F2F2F2' }}>
              {([
                { key: 'places', label: 'Lugares' },
                { key: 'collections', label: 'Coleções' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveTab(t.key);
                    setSelectedIds(new Set());
                    setSearch('');
                  }}
                  className={`flex-1 h-9 rounded-lg text-[13px] font-semibold transition-colors ${
                    activeTab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                activeTab === 'collections'
                  ? openCollection
                    ? `Buscar em ${openCollection.title}...`
                    : 'Buscar coleção...'
                  : `Buscar lugares em ${dayCity}...`
              }
              className="w-full h-11 pl-10 pr-4 rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
              style={{ background: '#F2F2F2' }}
            />
          </div>
        </div>

        {/* Day Selector */}
        {totalDays > 1 && (
          <div className="px-5 pb-3">
            <DaySelector
              selectedDay={selectedDay}
              totalDays={totalDays}
              onChange={setSelectedDay}
              startDate={startDate}
            />
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 scrollbar-hide" style={{ paddingBottom: count > 0 ? '90px' : '32px' }}>
          {/* ─── COLLECTIONS TAB ─── */}
          {activeTab === 'collections' ? (
            !openCollection ? (
              filteredCollections.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="collections_bookmark" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-[14px] text-muted-foreground">Nenhuma coleção encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCollections.map(col => {
                    const placesInside = loadCollectionPlaces(col.id);
                    const total = placesInside.length || col.itemCount || 0;
                    const cover = placesInside[0]?.image || col.images?.[0];
                    return (
                      <button
                        key={col.id}
                        onClick={() => { setOpenCollectionId(col.id); setSelectedIds(new Set()); setSearch(''); }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl active:bg-secondary/60 text-left"
                      >
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {cover ? (
                            <img src={cover} alt={col.title} className="w-full h-full object-cover" />
                          ) : (
                            <Icon name="folder" size={22} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[14px] font-semibold text-foreground truncate">{col.title}</h4>
                          <p className="text-[12px] text-muted-foreground">
                            {total} {total === 1 ? 'lugar' : 'lugares'}
                          </p>
                        </div>
                        <Icon name="chevron_right" size={20} className="text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )
            ) : filteredCollectionPlaces.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="bookmark" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-[14px] text-muted-foreground">
                  {collectionPlaces.length === 0
                    ? 'Esta coleção ainda não tem lugares salvos'
                    : 'Nenhum lugar encontrado'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCollectionPlaces.map(p => {
                  const isSelected = selectedIds.has(p.id);
                  const isAlreadyAdded = existingActivityNames.includes(p.name.toLowerCase());
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlace(p.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                        isSelected ? 'bg-primary/8' : 'active:bg-secondary/60'
                      }`}
                    >
                      <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="text-[14px] font-semibold text-foreground truncate">{p.name}</h4>
                          {isAlreadyAdded && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#E6F0FB] text-[#3B82F6] flex-shrink-0">
                              Adicionado
                            </span>
                          )}
                        </div>
                        {p.category && (
                          <span className="text-[12px] text-muted-foreground truncate">{p.category}</span>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40 bg-transparent'
                        }`}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
          <>
          {/* Loading indicator */}
          {loadingApi && (
            <div className="flex items-center gap-2 px-1 pb-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-muted-foreground">Buscando mais lugares em {dayCity}...</span>
            </div>
          )}

          {!hasResults && !loadingApi ? (
            <div className="text-center py-12">
              <Icon name="search" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-[14px] text-muted-foreground mb-4">Nenhum lugar encontrado</p>
              {onAddManually && (
                <button
                  onClick={() => { handleClose(); onAddManually(); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-foreground border border-border bg-card"
                >
                  <Icon name="add" size={18} />
                  Adicionar manualmente
                </button>
              )}
            </div>
          ) : hasResults && (
            <div className="space-y-1">
              {/* Local results grouped by city */}
              {localResults.length > 0 && (
                <>
                  {isMultiDest ? (
                    (() => {
                      // Separate current-day places from other destination places
                      const currentDayPlaces = localResults.filter(p => p.city.toLowerCase() === dayCityLower);
                      const otherDestPlaces = localResults.filter(p => p.city.toLowerCase() !== dayCityLower);
                      const otherGroups = groupByCity(otherDestPlaces);

                      return (
                        <>
                          {/* Current destination first */}
                          {currentDayPlaces.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1 pb-2">
                                📍 {dayCity}
                              </p>
                              {currentDayPlaces.map(p => renderPlaceRow(p, false))}
                            </div>
                          )}

                          {/* Other destinations */}
                          {otherGroups.map(group => (
                            <div key={group.city}>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-safe-top pb-2">
                                ✈️ {group.city} <span className="normal-case font-normal">· outro destino</span>
                              </p>
                              {group.places.map(p => renderPlaceRow(p, true))}
                            </div>
                          ))}
                        </>
                      );
                    })()
                  ) : (
                    localResults.map(p => renderPlaceRow(p, false))
                  )}
                </>
              )}

              {/* Add manually option at the bottom */}
              {onAddManually && (
                <div className="pt-safe-top pb-2">
                  <button
                    onClick={() => { handleClose(); onAddManually(); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-muted-foreground border border-dashed border-border bg-transparent active:bg-secondary/40"
                  >
                    <Icon name="add" size={18} />
                    Não encontrou? Adicionar manualmente
                  </button>
                </div>
              )}
            </div>
          )}
          </>
          )}
        </div>

        {/* Fixed footer button */}
        {count > 0 && (
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-card border-t border-border/40">
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-primary text-primary-foreground transition-colors"
            >
              Adicionar ({count})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
