import { useState, useMemo, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { searchPlaces, type CityPlace } from '@/data/cityRecommendations';
import { fetchPlacesForCity, mergePlaces } from '@/lib/placesApi';
import type { CollectionPlaceResult } from './AddPlaceToCollectionSheet';

interface AddPlaceToCollectionSheetV2Props {
  open: boolean;
  onClose: () => void;
  onSelect: (places: CollectionPlaceResult[]) => void;
  /** Opens the legacy manual sheet (full form: name, address, photo) */
  onAddManually?: () => void;
}

function cityPlaceToCollectionResult(p: CityPlace): CollectionPlaceResult {
  const cityLabel = p.city ? p.city.charAt(0).toUpperCase() + p.city.slice(1) : '';
  return {
    id: p.id,
    name: p.name,
    category: p.category || 'Lugar salvo',
    image: p.image,
    rating: p.rating ?? 0,
    address: p.address || cityLabel,
    lat: p.lat,
    lng: p.lng,
  };
}

export function AddPlaceToCollectionSheetV2({
  open,
  onClose,
  onSelect,
  onAddManually,
}: AddPlaceToCollectionSheetV2Props) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedPlaces, setSelectedPlaces] = useState<Map<number, CityPlace>>(new Map());

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIds(new Set());
      setSelectedPlaces(new Map());
      setGoogleResults([]);
      setApiPlaces({});
      setFetchedCities(new Set());
      setDetectedCity('');
      setSearchingGoogle(false);
    }
  }, [open]);

  // Detect city from query (e.g. "restaurante em paris" -> paris, or "paris" -> paris)
  const inferredCity = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return '';
    // Look for "em <city>" pattern
    const match = q.match(/\bem\s+([a-záéíóúãõâêîôûç\s-]+)$/i);
    if (match) return match[1].trim();
    // If query is very short, treat as city directly
    if (q.split(/\s+/).length <= 3 && q.length >= 3) return q;
    return '';
  }, [debouncedSearch]);

  const [apiPlaces, setApiPlaces] = useState<Record<string, CityPlace[]>>({});
  const [loadingApi, setLoadingApi] = useState(false);
  const [fetchedCities, setFetchedCities] = useState<Set<string>>(new Set());
  const [googleResults, setGoogleResults] = useState<CityPlace[]>([]);
  const [searchingGoogle, setSearchingGoogle] = useState(false);

  // Manual Google Places API search
  const handleManualGoogleSearch = async () => {
    const q = debouncedSearch.trim();
    if (!q || q.length < 2) return;

    setSearchingGoogle(true);
    try {
      const { searchGooglePlacesAutocomplete } = await import('@/lib/googlePlacesApi');
      const { incrementApiCounter } = await import('@/lib/placesCache');

      const targetCity = inferredCity || '';
      const searchQuery = targetCity ? `${q} ${targetCity}` : q;
      const suggestions = await searchGooglePlacesAutocomplete(searchQuery);
      await incrementApiCounter('google_places', 1);

      const converted: CityPlace[] = suggestions.map(s => ({
        id: Math.floor(Math.random() * 1000000) + 900000,
        name: s.name,
        city: targetCity || s.location,
        category: 'Local',
        categoryColor: '#6B7280',
        image: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=300', // placeholder
        rating: 0,
        price: '',
        openHours: '',
        lat: 0,
        lng: 0,
        address: s.location,
        description: s.description,
        googlePlaceId: s.placeId,
      } as any));

      setGoogleResults(converted);
    } catch (e) {
      console.error('Google search error:', e);
    } finally {
      setSearchingGoogle(false);
    }
  };

  // Combine results
  const results = useMemo<CityPlace[]>(() => {
    if (!debouncedSearch.trim()) return [];

    // Static places matching the query (treats all destinations as "global")
    const { local: staticLocal, global: staticGlobal } = searchPlaces(debouncedSearch, []);
    let combined = [...staticLocal, ...staticGlobal];

    const queryLower = debouncedSearch.toLowerCase().trim();
    const targetCity = inferredCity.split(',')[0].trim().toLowerCase();
    const apiCityPlaces = targetCity ? (apiPlaces[targetCity] || []) : [];

    // If the query basically IS the city name, show ALL places of that city.
    // Otherwise, only those matching name/category.
    const queryIsCity = !!targetCity && (
      queryLower === targetCity ||
      targetCity.includes(queryLower) ||
      queryLower.includes(targetCity)
    );

    const apiMatching = queryIsCity
      ? apiCityPlaces
      : apiCityPlaces.filter(p =>
          p.name.toLowerCase().includes(queryLower) ||
          p.category.toLowerCase().includes(queryLower)
        );
    if (apiMatching.length > 0) combined = mergePlaces(combined, apiMatching);

    // Also include all static places from that city when the query is the city
    if (queryIsCity) {
      const { local: cityStatic } = searchPlaces(targetCity, []);
      if (cityStatic.length > 0) combined = mergePlaces(combined, cityStatic);
    }

    // Google fallback
    if (googleResults.length > 0) combined = mergePlaces(combined, googleResults);

    return combined;
  }, [debouncedSearch, inferredCity, apiPlaces, googleResults]);

  // Track selected places (from current results + previously selected ones)
  useEffect(() => {
    setSelectedPlaces(prev => {
      const next = new Map(prev);
      results.forEach(p => {
        if (selectedIds.has(p.id) && !next.has(p.id)) {
          next.set(p.id, p);
        }
      });
      return next;
    });
  }, [results, selectedIds]);

  if (!open) return null;

  const togglePlace = (place: CityPlace) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(place.id)) {
        next.delete(place.id);
      } else {
        next.add(place.id);
      }
      return next;
    });
    setSelectedPlaces(prev => {
      const next = new Map(prev);
      if (next.has(place.id)) {
        next.delete(place.id);
      } else {
        next.set(place.id, place);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const places = Array.from(selectedPlaces.values())
      .filter(p => selectedIds.has(p.id))
      .map(cityPlaceToCollectionResult);
    if (places.length > 0) onSelect(places);
    handleClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSelectedPlaces(new Map());
    setSearch('');
    onClose();
  };

  const count = selectedIds.size;
  const hasResults = results.length > 0;
  const showEmptyHint = !debouncedSearch.trim();

  return (
    <div className="fixed inset-0 z-[210]" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Top Bar with Close Button */}
        <div className="flex items-center justify-end px-5 pt-1 pb-2">
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full flex items-center justify-center active:bg-secondary/60 -mr-1"
            aria-label="Fechar"
          >
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Title */}
        <div className="px-5 pb-3">
          <h3 className="text-[20px] font-bold text-foreground truncate">
            Salvar na coleção
          </h3>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nome, rua, cidade ou CEP..."
              className="w-full h-11 pl-10 pr-4 rounded-xl text-[16px] text-foreground placeholder:text-muted-foreground outline-none"
              style={{ background: '#F2F2F2' }}
            />
          </div>
        </div>

        {/* Results */}
        <div
          className="flex-1 overflow-y-auto px-5 scrollbar-hide"
          style={{ paddingBottom: count > 0 ? '90px' : '32px' }}
        >
          {loadingApi && !hasResults && !debouncedSearch && (
            <div className="flex items-center gap-2 px-1 pb-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-muted-foreground">Buscando sugestões...</span>
            </div>
          )}

          {showEmptyHint ? (
            <div className="text-center py-12">
              <Icon name="travel_explore" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-[14px] text-muted-foreground mb-1">
                Busque por nome, rua, cidade ou CEP
              </p>
              <p className="text-[12px] text-muted-foreground/80 max-w-[280px] mx-auto">
                Ex: "Torre Eiffel", "Rua Augusta, São Paulo" ou "01310-100"
              </p>
            </div>
          ) : searchingGoogle && !hasResults ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3 text-primary" />
              <p className="text-[14px] font-medium text-foreground">Buscando lugares no Google Places...</p>
            </div>
          ) : !hasResults && !loadingApi && !searchingGoogle ? (
            <div className="text-center py-12">
              <Icon name="search" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-[14px] text-muted-foreground mb-4">Nenhum lugar local encontrado</p>
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleManualGoogleSearch}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-primary-foreground bg-primary"
                >
                  <Icon name="travel_explore" size={18} />
                  Buscar no Google Places
                </button>
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
            </div>
          ) : (
            <div className="space-y-1">
              {results.map(place => {
                const isSelected = selectedIds.has(place.id);
                return (
                  <button
                    key={place.id}
                    onClick={() => togglePlace(place)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                      isSelected ? 'bg-primary/8' : 'active:bg-secondary/60'
                    }`}
                  >
                    <img
                      src={place.image}
                      alt={place.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-semibold text-foreground truncate mb-0.5">
                        {place.name}
                      </h4>
                      <div className="flex items-center gap-1 text-muted-foreground min-w-0">
                        <Icon name="location_on" size={11} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-[12px] font-medium truncate">
                          {place.address || (place.city ? place.city.charAt(0).toUpperCase() + place.city.slice(1) : '')}
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
              })}

              {/* Manual search options at the bottom */}
              <div className="pt-safe-top pb-2 flex flex-col gap-2">
                {debouncedSearch.length >= 2 && googleResults.length === 0 && (
                  <button
                    onClick={handleManualGoogleSearch}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-primary bg-primary/10 transition-colors"
                  >
                    <Icon name="travel_explore" size={18} />
                    Buscar "{debouncedSearch}" no Google
                  </button>
                )}
                {onAddManually && (
                  <button
                    onClick={() => { handleClose(); onAddManually(); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-muted-foreground border border-dashed border-border bg-transparent active:bg-secondary/40"
                  >
                    <Icon name="add" size={18} />
                    Não encontrou? Adicionar manualmente
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fixed footer button */}
        {count > 0 && (
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-card border-t border-border/40">
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-primary text-primary-foreground transition-colors"
            >
              Salvar na coleção ({count})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
