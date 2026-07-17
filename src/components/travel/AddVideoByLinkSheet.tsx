import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/ui/BackButton';
import { extractPlacesFromLink } from '@/lib/videoPlaceExtractor';
import { VideoProcessingLoader } from '@/components/travel/VideoProcessingLoader';
import { toast } from 'sonner';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { getUserCollections, saveUserCollection, type UserCollection } from '@/components/screens/TripsScreen';
import { addPlacesToCollection, addImportedVideoToCollection, buildImportedVideoFromLink } from '@/lib/collectionPlaces';
import { CreateCollectionSheet } from '@/components/travel/CreateCollectionSheet';
import { mockPeople } from '@/components/travel/ShareCollectionSheet';
import { appendActivitiesToDay } from '@/lib/plannerApi';
import { ITINERARIES_CHANGED_EVENT } from '@/lib/itinerariesApi';
import type { UserItinerary } from '@/lib/itinerariesApi';

interface VideoPreview {
  title: string;
  domain: string;
  description: string;
  thumbnail: string;
  embedUrl?: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'other';
}

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

function parseVideoUrl(url: string): { platform: VideoPreview['platform']; videoId?: string; thumbnail?: string; embedUrl?: string } {
  const trimmed = url.trim();
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const id = ytMatch[1];
    return { platform: 'youtube', videoId: id, thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` };
  }
  if (trimmed.includes('tiktok.com')) return { platform: 'tiktok' };
  if (trimmed.includes('instagram.com')) {
    const igMatch = trimmed.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
    return { platform: 'instagram', embedUrl: igMatch ? `https://www.instagram.com/p/${igMatch[1]}/embed` : undefined };
  }
  return { platform: 'other' };
}

type Step = 'extract' | 'results' | 'selectDestination' | 'selectDay';

interface AddVideoByLinkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onSubmit: (link: string, places?: ExtractedPlace[]) => void;
  onCreateNewItinerary?: (places: ExtractedPlace[]) => void;
  onCollectionCreated?: (collectionId: number) => void;
  collectionMode?: boolean;
}

export function AddVideoByLinkSheet({ isOpen, onClose, onBack, onSubmit, onCreateNewItinerary, onCollectionCreated, collectionMode = false }: AddVideoByLinkSheetProps) {
  const [link, setLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
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

  const isValidLink = link.trim().length > 0;

  useEffect(() => {
    if (!link.trim()) {
      setVideoPreview(null);
      return;
    }
    const timeoutId = setTimeout(() => {
      setIsLoadingPreview(true);
      const parsed = parseVideoUrl(link);
      setTimeout(() => {
        const preview: VideoPreview = {
          platform: parsed.platform,
          title: parsed.platform === 'youtube' ? 'YouTube · Vídeo' : parsed.platform === 'tiktok' ? 'TikTok · Vídeo' : parsed.platform === 'instagram' ? 'Instagram · Vídeo' : 'Vídeo',
          domain: parsed.platform === 'youtube' ? 'youtube.com' : parsed.platform === 'tiktok' ? 'tiktok.com' : parsed.platform === 'instagram' ? 'instagram.com' : (() => { try { return new URL(link.startsWith('http') ? link : `https://${link}`).hostname; } catch { return ''; } })(),
          description: '',
          thumbnail: parsed.thumbnail || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop',
          embedUrl: parsed.embedUrl,
        };
        setVideoPreview(preview);
        setIsLoadingPreview(false);
      }, 400);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [link]);

  const handleExtract = async () => {
    if (!isValidLink) return;
    setIsProcessing(true);
    try {
      const places = await extractPlacesFromLink(link.trim());
      if (places.length === 0) {
        toast.error('Não conseguimos identificar locais nesse vídeo. Tente outro link.');
        setIsProcessing(false);
        return;
      }
      setExtractedPlaces(places);
      setSelectedPlaces(new Set(places.map((p) => p.id)));
      setStep('results');
    } catch (err: any) {
      console.error('[extract link]', err);
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

  const handleConfirmPlaces = () => {
    const selected = extractedPlaces.filter(p => selectedPlaces.has(p.id));
    onSubmit(link, selected);
    resetAll();
  };

  const handleAddToExistingCollection = (collectionId: number) => {
    const selected = extractedPlaces.filter(p => selectedPlaces.has(p.id));
    const collection = userCollections.find(c => c.id === collectionId);
    addPlacesToCollection(collectionId, selected, link);
    if (link?.trim()) {
      const fallbackThumb = selected[0]?.image || '';
      const fallbackTitle = `Vídeo · ${selected.length} ${selected.length === 1 ? 'lugar' : 'lugares'}`;
      addImportedVideoToCollection(collectionId, buildImportedVideoFromLink(link, fallbackThumb, fallbackTitle));
    }
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
    addPlacesToCollection(newId, selected, link);
    if (link?.trim()) {
      const fallbackThumb = selected[0]?.image || '';
      const fallbackTitle = `Vídeo · ${selected.length} ${selected.length === 1 ? 'lugar' : 'lugares'}`;
      addImportedVideoToCollection(newId, buildImportedVideoFromLink(link, fallbackThumb, fallbackTitle));
    }
    setUserCollections(getUserCollections());
    toast.success(`Coleção "${name}" criada com ${selected.length} ${selected.length === 1 ? 'lugar' : 'lugares'}`);
    setShowCreateCollection(false);
    onClose();
    resetAll();
    onCollectionCreated?.(newId);
  };

  const resetAll = () => {
    setLink('');
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
    setLink('');
    setVideoPreview(null);
    setIsProcessing(false);
    onBack();
  };

  if (!isOpen) return null;

  const showingResults = step === 'results';

  // Header content per step
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
        title: 'Lugares extraídos do vídeo',
        subtitle: `Identificamos ${extractedPlaces.length} ${extractedPlaces.length === 1 ? 'local' : 'locais'} no vídeo. Toque para selecionar quais deseja adicionar.`
      };
    }
    return {
      title: 'Adicionar por link',
      subtitle: 'Cole o link de um vídeo do YouTube, Instagram ou TikTok'
    };
  };

  const header = getHeader();

  // Destination items
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
      onSubmit(link, selected);
      onClose();
      resetAll();
    } catch (err) {
      console.error('[AddVideoByLink] save to itinerary failed', err);
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
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Link do vídeo</label>
                  <div className="relative">
                    <Input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="h-14 pl-12 pr-4 text-base rounded-2xl border-border bg-muted/30"
                    />
                    <Icon name="link" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                {isLoadingPreview && (
                  <div className="mt-6 p-4 rounded-2xl border border-border bg-muted/20">
                    <div className="flex gap-4">
                      <Skeleton className="w-24 h-24 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </div>
                )}

                {videoPreview && !isLoadingPreview && (
                  <div className="mt-6 rounded-2xl border border-border bg-muted/20 overflow-hidden">
                    {videoPreview.embedUrl ? (
                      <div className="relative w-full" style={{ aspectRatio: videoPreview.platform === 'instagram' ? '9/16' : '16/9' }}>
                        <iframe
                          src={videoPreview.embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          frameBorder="0"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                        <img src={videoPreview.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                            <Icon name="play_arrow" size={32} className="text-foreground ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-3 flex items-center gap-2">
                      <Icon name="language" size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-[13px] font-medium text-foreground truncate">{videoPreview.title}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Loading state — substitui o conteúdo enquanto processa */}
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
                {/* Create New */}
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

                {/* Section title */}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
                  {destinationType === 'itinerary' ? 'Seus roteiros' : 'Suas coleções'}
                </span>

                {/* Search */}
                <div className="relative">
                  <Icon
                    name="search"
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
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

                {/* Items */}
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
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        }`}
                      >
                        {String(day).padStart(2, '0')}
                      </div>
                      <div className="text-left flex-1">
                        <span className="text-base font-semibold text-foreground">
                          Dia {String(day).padStart(2, '0')}
                        </span>
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
                onClick={handleConfirmPlaces}
                disabled={selectedPlaces.size === 0}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                Adicionar {selectedPlaces.size} {selectedPlaces.size === 1 ? 'lugar' : 'lugares'}
              </Button>
            ) : showingResults ? (
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setDestinationType('itinerary');
                    setStep('selectDestination');
                    setSearchQuery('');
                  }}
                  disabled={selectedPlaces.size === 0}
                  className="w-full h-14 rounded-2xl text-base font-semibold"
                >
                  Adicionar ao roteiro
                </Button>
                <Button
                  onClick={() => {
                    setDestinationType('collection');
                    setStep('selectDestination');
                    setSearchQuery('');
                  }}
                  disabled={selectedPlaces.size === 0}
                  variant="outline"
                  className="w-full h-14 rounded-2xl text-base font-semibold !bg-transparent !border-2 !border-[hsl(var(--premium-midnight))] !text-[hsl(var(--premium-midnight))] hover:!bg-[hsl(var(--premium-midnight))]/5"
                >
                  Adicionar à coleção
                </Button>
              </div>
            ) : collectionMode ? (
              <Button
                onClick={handleExtract}
                disabled={!videoPreview || isLoadingPreview || isProcessing}
                className={`w-full h-14 rounded-2xl text-base font-semibold ${(!videoPreview || isLoadingPreview) && !isProcessing ? 'bg-muted text-muted-foreground hover:bg-muted' : ''}`}
              >
                {isProcessing ? 'Processando...' : isLoadingPreview ? 'Carregando preview...' : 'Extrair lugares'}
              </Button>
            ) : (
              <Button
                onClick={handleExtract}
                disabled={!videoPreview || isLoadingPreview || isProcessing}
                className={`w-full h-14 rounded-2xl text-base font-semibold ${(!videoPreview || isLoadingPreview) && !isProcessing ? 'bg-muted text-muted-foreground hover:bg-muted' : ''}`}
              >
                {isProcessing ? 'Processando...' : isLoadingPreview ? 'Carregando preview...' : 'Extrair lugares do vídeo'}
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
