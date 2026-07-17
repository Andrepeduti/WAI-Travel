import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/ui/BackButton';
import { extractPlacesFromFile } from '@/lib/videoPlaceExtractor';
import { VideoProcessingLoader } from '@/components/travel/VideoProcessingLoader';
import { toast } from 'sonner';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { getUserCollections, saveUserCollection, type UserCollection } from '@/components/screens/TripsScreen';
import { addPlacesToCollection } from '@/lib/collectionPlaces';
import { CreateCollectionSheet } from '@/components/travel/CreateCollectionSheet';
import { mockPeople } from '@/components/travel/ShareCollectionSheet';
import { appendActivitiesToDay } from '@/lib/plannerApi';
import { ITINERARIES_CHANGED_EVENT } from '@/lib/itinerariesApi';
import type { UserItinerary } from '@/lib/itinerariesApi';

interface ExtractedPlace {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
  location: string;
}

interface ExistingItem {
  id: string;
  name: string;
  destination?: string;
  itemCount?: number;
  coverImage?: string;
}

const mockExtractedPlaces: ExtractedPlace[] = [
  { id: 1, name: 'Torre Eiffel', image: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=400', category: 'Monumento', rating: 4.8, location: 'Paris, França' },
  { id: 2, name: 'Museu do Louvre', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400', category: 'Museu', rating: 4.7, location: 'Paris, França' },
  { id: 3, name: 'Sacré-Cœur', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400', category: 'Igreja', rating: 4.6, location: 'Paris, França' },
  { id: 4, name: 'Café de Flore', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400', category: 'Restaurante', rating: 4.5, location: 'Paris, França' },
  { id: 5, name: 'Jardim de Luxemburgo', image: 'https://images.unsplash.com/photo-1575451928516-25a36e4df886?w=400', category: 'Parque', rating: 4.4, location: 'Paris, França' },
];

// Roteiros e coleções reais agora vêm de useMyItineraries() e getUserCollections().

type Step = 'extract' | 'results' | 'selectDestination' | 'selectDay';

interface AddVideoFromGallerySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onSubmit: (file: File | null, places?: ExtractedPlace[], destination?: 'itinerary' | 'collection') => void;
  onCreateNewItinerary?: (places: ExtractedPlace[]) => void;
  onCollectionCreated?: (collectionId: number) => void;
  collectionMode?: boolean;
}

export function AddVideoFromGallerySheet({ isOpen, onClose, onBack, onSubmit, onCreateNewItinerary, onCollectionCreated, collectionMode = false }: AddVideoFromGallerySheetProps) {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedPlaces, setExtractedPlaces] = useState<ExtractedPlace[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<Step>('extract');
  const [destinationType, setDestinationType] = useState<'itinerary' | 'collection'>('itinerary');
  const [selectedItinerary, setSelectedItinerary] = useState<UserItinerary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [savingToItinerary, setSavingToItinerary] = useState(false);
  const [userCollections, setUserCollections] = useState<UserCollection[]>([]);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const { itineraries: userItineraries, loading: itinerariesLoading } = useMyItineraries();

  // Recarrega coleções do localStorage sempre que o sheet abre
  useEffect(() => {
    if (isOpen) setUserCollections(getUserCollections());
  }, [isOpen]);

  const itineraryItems: ExistingItem[] = userItineraries.map((it) => ({
    id: it.id,
    name: it.title,
    destination: it.destinations?.[0] ?? '',
    coverImage: it.images?.[0],
  }));
  const collectionItems: ExistingItem[] = userCollections.map((c) => ({
    id: String(c.id),
    name: c.title,
    itemCount: c.itemCount,
    coverImage: c.images?.[0],
  }));

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedVideo(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedVideo(null);
    setVideoPreview(null);
  };

  const handleExtract = async () => {
    if (!selectedVideo) return;
    setIsProcessing(true);
    try {
      const places = await extractPlacesFromFile(selectedVideo, selectedVideo.name);
      if (places.length === 0) {
        toast.error('Não conseguimos identificar locais nesse vídeo. Tente outro.');
        setIsProcessing(false);
        return;
      }
      setExtractedPlaces(places);
      setSelectedPlaces(new Set(places.map((p) => p.id)));
      setStep('results');
    } catch (err: any) {
      console.error('[extract gallery]', err);
      toast.error(err?.message || 'Não foi possível analisar este vídeo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlace = (id: number) => {
    setSelectedPlaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirmPlaces = (dest?: 'itinerary' | 'collection') => {
    const selected = extractedPlaces.filter(p => selectedPlaces.has(p.id));
    onSubmit(selectedVideo, selected, dest);
    resetAll();
  };

  const handleAddToExistingCollection = (collectionId: number) => {
    const selected = extractedPlaces.filter(p => selectedPlaces.has(p.id));
    const collection = userCollections.find(c => c.id === collectionId);
    addPlacesToCollection(collectionId, selected);
    toast.success(`${selected.length} ${selected.length === 1 ? 'lugar adicionado' : 'lugares adicionados'} a "${collection?.title ?? 'coleção'}"`);
    onClose();
    resetAll();
  };

  const handleCreateNewCollection = (name: string, sharedWithIds: string[] = []) => {
    const selected = extractedPlaces.filter(p => selectedPlaces.has(p.id));
    const newId = -(Date.now());
    const newCollection: UserCollection = {
      id: newId,
      title: name,
      itemCount: 0,
      isFavorites: false,
      isPrivate: sharedWithIds.length === 0,
      images: [],
      participants: sharedWithIds.map(id => {
        const person = mockPeople.find(p => p.id === id);
        return person?.photo || '';
      }).filter(Boolean),
    };
    saveUserCollection(newCollection);
    addPlacesToCollection(newId, selected);
    setUserCollections(getUserCollections());
    toast.success(`Coleção "${name}" criada com ${selected.length} ${selected.length === 1 ? 'lugar' : 'lugares'}`);
    setShowCreateCollection(false);
    onClose();
    resetAll();
    onCollectionCreated?.(newId);
  };

  const resetAll = () => {
    setSelectedVideo(null);
    setVideoPreview(null);
    setExtractedPlaces([]);
    setSelectedPlaces(new Set());
    setStep('extract');
    setSearchQuery('');
    setSelectedDay(null);
    setSelectedItinerary(null);
  };

  const handleBack = () => {
    if (step === 'selectDay') {
      setStep('selectDestination');
      setSelectedDay(null);
      return;
    }
    if (step === 'selectDestination') {
      setStep('results');
      setSearchQuery('');
      return;
    }
    if (step === 'results') {
      setExtractedPlaces([]);
      setSelectedPlaces(new Set());
      setStep('extract');
      return;
    }
    if (selectedVideo) {
      handleRemoveVideo();
      return;
    }
    onBack();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isValid = selectedVideo !== null;
  const showingResults = step === 'results';

  const getHeader = () => {
    if (step === 'selectDay' && selectedItinerary) {
      return {
        title: 'Selecionar dia',
        subtitle: <>Em qual dia de <span className="font-semibold text-foreground">{selectedItinerary.title}</span> deseja adicionar?</>
      };
    }
    if (step === 'selectDestination') {
      return {
        title: destinationType === 'itinerary' ? 'Selecionar Roteiro' : 'Selecionar Coleção',
        subtitle: undefined
      };
    }
    if (showingResults) {
      return {
        title: `${extractedPlaces.length} lugares encontrados`,
        subtitle: `${selectedPlaces.size} selecionados — toque para desmarcar`
      };
    }
    return {
      title: 'Escolher da galeria',
      subtitle: 'Selecione um vídeo da sua galeria para extrair os lugares'
    };
  };

  const header = getHeader();
  const destItems = destinationType === 'itinerary' ? itineraryItems : collectionItems;
  const filteredDestItems = destItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const destIconName = destinationType === 'itinerary' ? 'description' : 'bookmark';

  const itineraryDayCount = (() => {
    if (!selectedItinerary) return 1;
    const s = new Date(selectedItinerary.startDate).getTime();
    const e = new Date(selectedItinerary.endDate).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 1;
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  })();

  const formatDayLabel = (day: number) => {
    const baseISO = selectedItinerary?.startDate ?? new Date().toISOString();
    const startDate = new Date(baseISO);
    if (Number.isNaN(startDate.getTime())) return `Dia ${day}`;
    const date = addDays(startDate, day - 1);
    const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
    const capitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return format(date, 'dd/MM') + ' - ' + capitalized;
  };

  const handleSaveToItinerary = async () => {
    if (!selectedItinerary || !selectedDay || savingToItinerary) return;
    const selected = extractedPlaces.filter(p => selectedPlaces.has(p.id));
    if (selected.length === 0) return;
    setSavingToItinerary(true);
    try {
      const count = await appendActivitiesToDay(
        selectedItinerary.id,
        selectedDay,
        selected.map(p => ({
          name: p.name,
          category: p.category || 'Lugar salvo',
          categoryColor: '#9DCC36',
          image: p.image || '',
          rating: p.rating ?? 0,
        })),
      );
      if (count === 0) {
        toast.error('Não foi possível adicionar ao roteiro');
        return;
      }
      try {
        window.dispatchEvent(new CustomEvent(ITINERARIES_CHANGED_EVENT, { detail: { type: 'updated', id: selectedItinerary.id } }));
      } catch {}
      toast.success(`${count} ${count === 1 ? 'lugar adicionado' : 'lugares adicionados'} ao Dia ${selectedDay} de "${selectedItinerary.title}"`);
      onSubmit(selectedVideo, selected, 'itinerary');
      onClose();
      resetAll();
    } catch (err) {
      console.error('[AddVideoFromGallery] save to itinerary failed', err);
      toast.error('Não foi possível adicionar ao roteiro');
    } finally {
      setSavingToItinerary(false);
    }
  };


  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full w-full pb-8 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]">
          {/* Handle */}
          <div className="flex justify-center py-3 flex-shrink-0">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Voltar"
                className="w-8 h-8 -ml-1 flex items-center justify-center active:scale-95 active:opacity-70 transition-all flex-shrink-0"
              >
                <Icon name="chevron_left" size={24} className="text-foreground [&>svg]:stroke-[2.5]" />
              </button>
              <h2 className="text-xl font-bold text-foreground my-0 mt-[24px]">{header.title}</h2>
            </div>
            {header.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{header.subtitle}</p>
            )}
          </div>

          {/* Content */}
          <div className="px-6 flex-1 overflow-y-auto min-h-0">
            {/* STEP: Extract */}
            {step === 'extract' && !isProcessing && (
              <>
                {!selectedVideo ? (
                  <label className="block">
                    <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                    <div className="border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors min-h-[200px]">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Icon name="video_library" size={32} className="text-muted-foreground" />
                      </div>
                      <p className="text-base font-semibold text-foreground mb-1">Toque para selecionar</p>
                      <p className="text-sm text-muted-foreground text-center">Formatos suportados: MP4, MOV, AVI</p>
                      <p className="text-xs text-muted-foreground mt-2">Tamanho máximo: 500MB</p>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden bg-muted aspect-video">
                      {videoPreview && (
                        <video src={videoPreview} className="w-full h-full object-cover" controls />
                      )}
                      <button onClick={handleRemoveVideo} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                        <Icon name="close" size={18} className="text-white" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon name="movie" size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{selectedVideo.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedVideo.size)}</p>
                      </div>
                      <Icon name="check_circle" size={24} className="text-green-500" filled />
                    </div>
                  </div>
                )}

                {!selectedVideo && (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Dicas</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 py-2">
                        <Icon name="lightbulb" size={18} className="text-amber-500" />
                        <p className="text-sm text-muted-foreground">Vídeos com narração ou legendas funcionam melhor</p>
                      </div>
                      <div className="flex items-center gap-3 py-2">
                        <Icon name="schedule" size={18} className="text-primary" />
                        <p className="text-sm text-muted-foreground">Vídeos mais curtos são processados mais rapidamente</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 'extract' && isProcessing && (
              <VideoProcessingLoader />
            )}

            {/* STEP: Results */}
            {showingResults && (
              <div className="space-y-2 pb-4">
                {extractedPlaces.map(place => {
                  const selected = selectedPlaces.has(place.id);
                  return (
                    <button
                      key={place.id}
                      onClick={() => togglePlace(place.id)}
                      className={`w-full flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-colors text-left ${
                        selected ? 'border-primary bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <img
                        src={place.image}
                        alt={place.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallback !== '1') {
                            img.dataset.fallback = '1';
                            img.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=400&fit=crop&q=70';
                          }
                        }}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-muted"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{place.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{place.location}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            <Icon name="star" size={10} filled className="text-amber-500" />
                            <span className="text-[10px] font-semibold text-foreground">{place.rating}</span>
                          </div>
                          <span className="inline-flex items-center h-7 px-2.5 rounded-2xl text-xs font-medium" style={{ backgroundColor: '#F2F2F2', color: '#8E8E93' }}>{place.category}</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-background'
                      }`}>
                        {selected && <Check size={14} strokeWidth={3} className="text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STEP: Select Destination */}
            {step === 'selectDestination' && (
              <div className="space-y-4 pb-4">
                <button
                  onClick={() => {
                    if (destinationType === 'itinerary' && onCreateNewItinerary) {
                      const selected = extractedPlaces.filter(p => selectedPlaces.has(p.id));
                      onCreateNewItinerary(selected);
                      resetAll();
                    } else {
                      setShowCreateCollection(true);
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon name="add" size={24} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <span className="text-base font-semibold text-foreground">
                      {destinationType === 'itinerary' ? 'Criar novo roteiro' : 'Criar nova coleção'}
                    </span>
                    <p className="text-sm text-muted-foreground">Começar do zero</p>
                  </div>
                </button>

                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
                  {destinationType === 'itinerary' ? 'Seus roteiros' : 'Suas coleções'}
                </span>

                <div className="relative">
                  <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-10 text-base rounded-2xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: '#D1D1D6' }}
                    >
                      <Icon name="close" size={14} className="text-white" />
                    </button>
                  )}
                </div>

                {destinationType === 'itinerary' && itinerariesLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredDestItems.length > 0 ? (
                  <div className="space-y-2">
                    {filteredDestItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (destinationType === 'itinerary') {
                            const full = userItineraries.find(it => it.id === item.id) ?? null;
                            setSelectedItinerary(full);
                            setSelectedDay(1);
                            setStep('selectDay');
                          } else {
                            handleAddToExistingCollection(Number(item.id));
                          }
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {item.coverImage ? (
                          <img src={item.coverImage} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon name={destIconName} size={22} className="text-foreground" />
                          </div>
                        )}
                        <div className="text-left flex-1">
                          <span className="text-base font-semibold text-foreground">{item.name}</span>
                          <p className="text-sm text-muted-foreground">
                            {item.destination || `${item.itemCount ?? 0} itens`}
                          </p>
                        </div>
                        <Icon name="chevron_right" size={20} className="text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Icon name={destIconName} size={40} className="text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? (destinationType === 'itinerary' ? 'Nenhum roteiro encontrado' : 'Nenhuma coleção encontrada')
                        : (destinationType === 'itinerary' ? 'Você ainda não tem roteiros' : 'Você ainda não tem coleções')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Select Day */}
            {step === 'selectDay' && (
              <div className="space-y-2 pb-4">
                {Array.from({ length: itineraryDayCount }, (_, i) => i + 1).map((day) => {
                  const isSelected = selectedDay === day;
                  const dateLabel = formatDayLabel(day);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-muted/30 border-2 border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}>
                        {String(day).padStart(2, '0')}
                      </div>
                      <div className="text-left flex-1">
                        <span className="text-base font-semibold text-foreground">Dia {String(day).padStart(2, '0')}</span>
                        <p className="text-sm text-muted-foreground">{dateLabel}</p>
                      </div>
                      {isSelected && (
                        <Icon name="check_circle" size={24} className="text-primary" filled />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="px-6 pt-4 flex-shrink-0">
            {step === 'selectDay' ? (
              <Button
                onClick={handleSaveToItinerary}
                disabled={!selectedDay || savingToItinerary || selectedPlaces.size === 0}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                {savingToItinerary ? 'Adicionando…' : 'Confirmar'}
              </Button>
            ) : step === 'selectDestination' ? null : showingResults && collectionMode ? (
              <Button
                onClick={() => handleConfirmPlaces()}
                disabled={selectedPlaces.size === 0}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                Adicionar {selectedPlaces.size} {selectedPlaces.size === 1 ? 'lugar' : 'lugares'}
              </Button>
            ) : showingResults ? (
              <div className="space-y-3">
                <Button
                  onClick={() => { setDestinationType('itinerary'); setStep('selectDestination'); setSearchQuery(''); }}
                  disabled={selectedPlaces.size === 0}
                  className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
                >
                  <Icon name="map" size={20} />
                  Adicionar ao roteiro
                </Button>
                <Button
                  onClick={() => { setDestinationType('collection'); setStep('selectDestination'); setSearchQuery(''); }}
                  disabled={selectedPlaces.size === 0}
                  variant="outline"
                  className="w-full h-14 rounded-2xl text-base font-semibold gap-2 !bg-transparent !border-2 !border-[hsl(var(--premium-midnight))] !text-[hsl(var(--premium-midnight))] hover:!bg-[hsl(var(--premium-midnight))]/5"
                >
                  <Icon name="bookmark" size={20} />
                  Adicionar à coleção
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleExtract}
                disabled={!isValid || isProcessing}
                className={`w-full h-14 rounded-2xl text-base font-semibold gap-2 ${
                  !isValid && !isProcessing ? 'bg-muted text-muted-foreground hover:bg-muted' : ''
                }`}
              >
                <Icon name="video_library" size={20} />
                {isProcessing ? 'Processando...' : 'Extrair lugares do vídeo'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <CreateCollectionSheet
        isOpen={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        onSubmit={handleCreateNewCollection}
        hideShare
      />
    </>
  );
}
