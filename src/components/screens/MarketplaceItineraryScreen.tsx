import { Icon } from '@/components/ui/Icon';
import { shareItinerary } from '@/lib/shareItinerary';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { SaveToCollectionSheet, SavePlaceData } from '@/components/travel/SaveToCollectionSheet';
import { CheckoutScreen } from '@/components/screens/CheckoutScreen';
import { PurchaseRulesScreen } from '@/components/travel/PurchaseRulesScreen';
import { PurchaseSuccessScreen } from '@/components/screens/PurchaseSuccessScreen';
import { AllReviewsScreen } from '@/components/screens/AllReviewsScreen';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { getItineraryById } from '@/data/itineraries';
import { differenceInDays, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { OwnerPublishedSheet } from '@/components/travel/OwnerPublishedSheet';
import { recordPurchase } from '@/lib/purchasesApi';
import { ReportSheet } from '@/components/social/ReportSheet';
import { supabase } from '@/integrations/supabase/client';

// ─── Season helpers ──────────────────────────────────────────────────────────
const SOUTHERN_HEMISPHERE_KEYWORDS = [
  'brasil', 'brazil', 'argentin', 'chile', 'urugua', 'paragua', 'bolívia', 'bolivia',
  'peru', 'equador', 'ecuador', 'colômbia', 'colombia', 'venezuel',
  'austrália', 'australia', 'nova zelândia', 'new zealand',
  'áfrica do sul', 'south africa',
];

function isSouthernHemisphere(destinations: string[]): boolean {
  return destinations.some((d) => {
    const lower = d.toLowerCase();
    return SOUTHERN_HEMISPHERE_KEYWORDS.some((k) => lower.includes(k));
  });
}

function getSeasonForDate(date: Date, destinations: string[]): string {
  const m = date.getMonth();
  let season: string;
  if (m === 11 || m <= 1) season = 'Inverno';
  else if (m <= 4) season = 'Primavera';
  else if (m <= 7) season = 'Verão';
  else season = 'Outono';
  if (isSouthernHemisphere(destinations)) {
    const swap: Record<string, string> = { Inverno: 'Verão', Verão: 'Inverno', Primavera: 'Outono', Outono: 'Primavera' };
    season = swap[season];
  }
  return season;
}


// ─── Types ───────────────────────────────────────────────────────────────────

interface DayItinerary {
  day: number;
  title: string;
  description: string;
  places: string[];
  estimatedTime: string;
}

interface Place {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
}

interface Review {
  id: number;
  userName: string;
  userImage: string;
  rating: number;
  date: string;
  comment: string;
}

// ─── Mock data (marketplace) ─────────────────────────────────────────────────

// Fallback data used when dataset is not found
const fallbackItineraryData = {
  id: 1,
  title: 'Roteiro',
  subtitle: '',
  image: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  rating: 4.5,
  reviewCount: 0,
  price: 0,
  author: 'Autor',
  authorImage: '',
  authorUsername: 'Autor',
  authorVerified: false,
  duration: '',
  cities: 0,
  places: 0,
  description: '',
  tags: [] as string[],
  mainTag: '',
};

const mockDays: DayItinerary[] = [
  {
    day: 1,
    title: 'Chegada em Praga',
    description: 'Chegue pela manhã e explore o centro histórico. Visite a Praça da Cidade Velha e o famoso Relógio Astronômico.',
    places: ['Aeroporto de Praga', 'Praça da Cidade Velha', 'Relógio Astronômico', 'Ponte Carlos'],
    estimatedTime: '6 horas',
  },
  {
    day: 2,
    title: 'Castelo de Praga',
    description: 'Dia dedicado ao maior castelo antigo do mundo. Inclui a Catedral de São Vito e o Beco Dourado.',
    places: ['Castelo de Praga', 'Catedral de São Vito', 'Beco Dourado', 'Jardins Reais'],
    estimatedTime: '8 horas',
  },
  {
    day: 3,
    title: 'Viagem para Viena',
    description: 'Partida de trem para Viena. Tarde livre para explorar o centro da cidade.',
    places: ['Estação de Trem', 'Centro de Viena', 'Stephansplatz', 'Graben'],
    estimatedTime: '7 horas',
  },
];

const mockPlaces: Place[] = [
  { id: 1, name: 'Castelo de Praga', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800', category: 'História', rating: 4.8 },
  { id: 2, name: 'Ponte Carlos', image: 'https://images.unsplash.com/photo-1574322092489-e5cb9e92aae0?w=800', category: 'Passeio', rating: 4.9 },
  { id: 3, name: 'Relógio Astronômico', image: 'https://images.unsplash.com/photo-1458150945447-7fb764c11a92?w=800', category: 'Monumento', rating: 4.7 },
  { id: 4, name: 'Praça da Cidade Velha', image: 'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800', category: 'Praça', rating: 4.8 },
];

const mockReviews: Review[] = [
  {
    id: 1,
    userName: 'Carolina Silva',
    userImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    rating: 5,
    date: '15 Jan 2026',
    comment: 'Roteiro perfeito! Seguimos exatamente como indicado e foi incrível.',
  },
  {
    id: 2,
    userName: 'Pedro Oliveira',
    userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    rating: 5,
    date: '10 Jan 2026',
    comment: 'Excelente custo-benefício! Economizamos muito tempo de pesquisa.',
  },
  {
    id: 3,
    userName: 'Marina Costa',
    userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    rating: 4,
    date: '5 Jan 2026',
    comment: 'Muito bom! Só achei o dia 3 um pouco corrido.',
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MarketplaceItineraryScreenProps {
  itineraryId: number;
  onBack: () => void;
  onViewPurchasedItinerary?: (itineraryId: number, newStartDate?: Date, newEndDate?: Date) => void;
  onViewCreator?: (author: string, authorImage: string) => void;
  authorOverride?: string;
  authorImageOverride?: string;
  /** Optional dataset injected from outside (e.g. a user-published itinerary not in the static catalog). */
  datasetOverride?: import('@/data/itineraries').ItineraryDataset | null;
  /** True when the current user owns this published itinerary — swaps "favorite" for the ⋮ menu. */
  isOwner?: boolean;
  /** Owner-only callbacks shown in the ⋮ menu */
  onManageItinerary?: () => void;
  onViewSalesDashboard?: () => void;
  onUnpublish?: () => void;
  onDownloadPdf?: () => void;
  onDeleteItinerary?: () => void;
  /** Abre o chat com o autor do roteiro (deep-link para a tela de Mensagens). */
  onOpenChat?: (
    author: string,
    authorImage: string,
    itineraryContext?: {
      itineraryId?: number;
      title: string;
      thumbnail: string;
      destination?: string;
      price?: number;
    },
    authorUserId?: string,
  ) => void;
  /** Abre o checkout automaticamente ao montar (usado ao retomar uma compra interrompida). */
  autoOpenCheckout?: boolean;
}

/**
 * Tela pública / marketplace do roteiro.
 * mode: marketplace
 *
 * Apenas visualização — sem edição.
 * Exibe: criador, avaliações, curtidas, descrição, tags, dia-a-dia com lock,
 * locais incluídos, reviews e botão de compra.
 */
export function MarketplaceItineraryScreen({ itineraryId, onBack, onViewPurchasedItinerary, onViewCreator, authorOverride, authorImageOverride, datasetOverride, isOwner = false, onManageItinerary, onViewSalesDashboard, onUnpublish, onDownloadPdf, onDeleteItinerary, onOpenChat, autoOpenCheckout }: MarketplaceItineraryScreenProps) {
  const dataset = useMemo(() => datasetOverride ?? getItineraryById(itineraryId), [itineraryId, datasetOverride]);

  const itineraryData = useMemo(() => {
    if (!dataset) return fallbackItineraryData;
    const totalDays = differenceInDays(dataset.endDate, dataset.startDate) + 1;
    const uniqueCities = new Set(dataset.destinations.map(d => d.split(',')[0].trim()));
    return {
      id: dataset.id,
      title: dataset.title,
      subtitle: `${totalDays} dias • ${uniqueCities.size} cidades`,
      image: dataset.coverImage,
      rating: dataset.rating ?? 4.5,
      reviewCount: dataset.reviewCount ?? 0,
      price: dataset.price ?? 0,
      author: authorOverride || dataset.author || 'Autor',
      authorImage: authorImageOverride || dataset.authorImage || '',
      authorUsername: dataset.authorUsername || (authorOverride || dataset.author || 'Autor'),
      authorVerified: dataset.authorVerified ?? false,
      duration: `${totalDays} dias`,
      cities: uniqueCities.size,
      places: dataset.places.length,
      description: dataset.description ?? '',
      tags: dataset.tags ?? [],
      mainTag: dataset.mainTag ?? '',
    };
  }, [dataset, authorOverride]);

  const derivedDays = useMemo(() => {
    if (!dataset) return mockDays;
    return dataset.days.map(d => ({
      day: d.day,
      title: d.title,
      description: `Dia ${d.day} do roteiro com ${d.activities.length} atividades planejadas.`,
      places: d.activities.map(a => a.name),
      estimatedTime: `${d.activities.length * 2} horas`,
    }));
  }, [dataset]);

  const derivedPlaces = useMemo(() => {
    if (!dataset) return mockPlaces;
    return dataset.places.map(p => ({
      id: p.id,
      name: p.name,
      image: p.image,
      category: p.category,
      rating: p.rating,
    }));
  }, [dataset]);

  const seasonLabel = useMemo(() => {
    if (!dataset) return '';
    return getSeasonForDate(dataset.startDate, dataset.destinations ?? []);
  }, [dataset]);

  const suggestedDateLabel = useMemo(() => {
    if (!dataset) return '';
    return `${format(dataset.startDate, "dd MMM", { locale: ptBR })} — ${format(dataset.endDate, "dd MMM yyyy", { locale: ptBR })}`;
  }, [dataset]);



  const { toggleFavorite, isFavorite } = useFavorites();
  const isFavorited = isFavorite(itineraryData.id);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [savedPlaces, setSavedPlaces] = useState<Set<number>>(new Set());
  const [showOwnerSheet, setShowOwnerSheet] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [savingPlace, setSavingPlace] = useState<SavePlaceData | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPurchaseRules, setShowPurchaseRules] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [showDateChoice, setShowDateChoice] = useState(false);
  const [dateMode, setDateMode] = useState<'keep' | 'change' | null>(null);
  const [newStartDate, setNewStartDate] = useState<Date | undefined>(undefined);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  useEffect(() => {
    if (autoOpenCheckout) {
      setShowCheckout(true);
    }
  }, [autoOpenCheckout]);

  const handleToggleFollow = useCallback(() => {
    setIsFollowing(prev => {
      const next = !prev;
      toast.success(next ? `Seguindo ${itineraryData.author}` : `Você deixou de seguir ${itineraryData.author}`);
      return next;
    });
  }, [itineraryData.author]);

  const handleOpenChat = useCallback(async () => {
    if (!onOpenChat) {
      toast(`Abrindo conversa com ${itineraryData.author}…`);
      return;
    }
    const destination = dataset?.destinations?.[0];
    // Resolve o userId real do autor pelo username (quando existir).
    let authorUserId: string | undefined;
    const usernameRaw = (itineraryData.authorUsername || '').replace(/^@/, '').trim();
    if (usernameRaw) {
      try {
        const { data } = await supabase
          .from('profiles_public')
          .select('user_id')
          .ilike('username', usernameRaw)
          .maybeSingle();
        if (data?.user_id) authorUserId = data.user_id as string;
      } catch {
        // ignora — segue em modo local
      }
    }
    onOpenChat(itineraryData.author, itineraryData.authorImage, {
      itineraryId: itineraryData.id,
      title: itineraryData.title,
      thumbnail: itineraryData.image,
      destination,
      price: itineraryData.price,
    }, authorUserId);
  }, [onOpenChat, itineraryData.author, itineraryData.authorImage, itineraryData.authorUsername, itineraryData.title, itineraryData.image, itineraryData.id, itineraryData.price, dataset]);



  const { addToCart, removeFromCart } = useCart();

  const addCurrentToCart = useCallback(() => {
    if (itineraryData.price > 0) {
      addToCart({
        itineraryId,
        title: itineraryData.title,
        image: itineraryData.image,
        author: itineraryData.author,
        authorImage: itineraryData.authorImage,
        duration: itineraryData.duration,
        cities: itineraryData.cities,
        places: itineraryData.places,
        price: itineraryData.price,
        addedAt: Date.now(),
      });
    }
  }, [addToCart, itineraryId, itineraryData]);

  const totalDaysCount = useMemo(() => {
    if (!dataset) return 3;
    return differenceInDays(dataset.endDate, dataset.startDate);
  }, [dataset]);

  const computedEndDate = useMemo(() => {
    if (!newStartDate) return undefined;
    return addDays(newStartDate, totalDaysCount);
  }, [newStartDate, totalDaysCount]);

  const handleConfirmDates = () => {
    setShowDateChoice(false);
    if (dateMode === 'change' && newStartDate && computedEndDate) {
      onViewPurchasedItinerary?.(itineraryId, newStartDate, computedEndDate);
    } else {
      onViewPurchasedItinerary?.(itineraryId);
    }
  };

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const handleSavePlaceClick = (place: SavePlaceData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedPlaces.has(place.id)) {
      const newSaved = new Set(savedPlaces);
      newSaved.delete(place.id);
      setSavedPlaces(newSaved);
    } else {
      setSavingPlace(place);
      setSaveSheetOpen(true);
    }
  };

  const handlePlaceSaved = (_collectionTitle: string) => {
    if (savingPlace) {
      const newSaved = new Set(savedPlaces);
      newSaved.add(savingPlace.id);
      setSavedPlaces(newSaved);
    }
    setSavingPlace(null);
  };


  if (showPurchaseRules) {
    return (
      <PurchaseRulesScreen
        onBack={() => setShowPurchaseRules(false)}
        onAccept={() => {
          setShowPurchaseRules(false);
          setShowCheckout(true);
        }}
      />
    );
  }

  if (showCheckout) {
    return (
      <CheckoutScreen
        itinerary={itineraryData}
        onBack={() => { setShowCheckout(false); addCurrentToCart(); }}
        onConfirm={async () => {
          setShowCheckout(false);
          setShowPurchaseSuccess(true);
          removeFromCart(itineraryId);
          // Persiste a compra no Lovable Cloud (silencioso se for dataset estático).
          const result = await recordPurchase({
            datasetId: itineraryId,
            priceBRL: itineraryData.price,
            snapshot: dataset
              ? {
                  title: dataset.title,
                  destinations: dataset.destinations,
                  images: dataset.coverImage ? [dataset.coverImage] : [],
                  places: dataset.places.length,
                  description: dataset.description ?? '',
                  tags: dataset.tags ?? [],
                  mainTag: dataset.mainTag ?? '',
                  days: dataset.days.length,
                }
              : undefined,
          });
          if (!result.ok && !result.skipped) {
            toast.error('Não foi possível registrar a compra. Tente novamente.');
          }
        }}
        onSaveForLater={itineraryData.price > 0 ? () => {
          addCurrentToCart();
          toast.success('Roteiro salvo no carrinho. Acesse em Configurações > Compras.');
          setShowCheckout(false);
        } : undefined}
      />
    );
  }

  if (showAllReviews) {
    const avg = mockReviews.length > 0
      ? mockReviews.reduce((s, r) => s + r.rating, 0) / mockReviews.length
      : 0;
    return (
      <AllReviewsScreen
        creatorName={itineraryData.author}
        averageRating={avg}
        reviews={mockReviews.map((r) => ({
          user: r.userName,
          text: r.comment,
          avatar: r.userImage,
          itineraryTitle: itineraryData.title,
          itineraryId: itineraryData.id,
          rating: r.rating,
        }))}
        onBack={() => setShowAllReviews(false)}
      />
    );
  }

  if (showPurchaseSuccess && !showDateChoice) {
    return (
      <PurchaseSuccessScreen
        itineraryTitle={itineraryData.title}
        onViewItinerary={() => {
          setShowPurchaseSuccess(false);
          setShowDateChoice(true);
          setDateMode(null);
          setNewStartDate(undefined);
        }}
        onClose={() => { setShowPurchaseSuccess(false); onBack(); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2] pb-32">
      {/* Hero image */}
      <div className="relative h-[230px]">
        <img 
          src={itineraryData.image} 
          alt={itineraryData.title}
          className="w-full h-full object-cover"
        />
        
        {/* Navigation buttons */}
        <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between z-10">
          <BackButton onClick={onBack} />
          <div className="flex gap-2">
            {isOwner ? (
              <button
                onClick={() => setShowOwnerSheet(true)}
                className="btn-icon bg-white shadow-md"
                aria-label="Mais opções"
              >
                <Icon name="more_horiz" size={20} />
              </button>
            ) : (
              <button 
                onClick={() => toggleFavorite({
                  id: itineraryData.id,
                  title: itineraryData.title,
                  image: itineraryData.image,
                  creator: itineraryData.author,
                  creatorImage: itineraryData.authorImage,
                  days: derivedDays.length,
                  places: itineraryData.places,
                  price: itineraryData.price,
                  rating: itineraryData.rating,
                  reviews: itineraryData.reviewCount,
                })}
                className="btn-icon bg-white shadow-md"
              >
                <Icon 
                  name="favorite" 
                  size={20} 
                  filled={isFavorited}
                  className={isFavorited ? 'text-florida-normal' : ''}
                />
              </button>
            )}
            <button
              onClick={() => setShowDetailsSheet(true)}
              className="btn-icon bg-white shadow-md"
              aria-label="Mais detalhes"
            >
              <Icon name="more_horiz" size={20} />
            </button>
          </div>
        </div>

      </div>

      {/* Content */}
      <div className="px-5 pt-6">
        {/* Title */}
        <h1 className="text-[24px] font-bold leading-tight mb-2">{itineraryData.title}</h1>

        {/* Metadata */}
        <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          <span>{itineraryData.places} locais</span>
          <span>{derivedDays.length} dias</span>
          <span>{itineraryData.cities} cidades</span>
        </div>

        {/* Rating, reviews */}
        <div className="flex items-center gap-2.5 mb-5 flex-nowrap whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Icon name="star" size={14} filled className="text-[#F2B90C]" />
            <span className="text-[13px] font-semibold">{itineraryData.rating}</span>
          </div>

          <div className="w-px h-3.5 bg-border flex-shrink-0" />

          <div className="flex items-center gap-1 flex-shrink-0">
            <Icon name="chat_bubble" size={14} className="text-muted-foreground" />
            <span className="text-[13px] font-medium">{itineraryData.reviewCount} reviews</span>
          </div>

          <div className="w-px h-3.5 bg-border flex-shrink-0" />

          <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
            <div className="avatar-stack flex-shrink-0">
              {mockReviews.slice(0, 3).map((review) => (
                <img 
                  key={review.id}
                  src={review.userImage}
                  alt={review.userName}
                />
              ))}
            </div>
            <span className="text-[13px] text-muted-foreground truncate">+ 1k salvaram</span>
          </div>
        </div>

        {/* Author section */}
        <div className="flex items-center justify-between mb-4">
          <button
            className="flex items-center gap-3"
            onClick={() => onViewCreator?.(itineraryData.author, itineraryData.authorImage)}
          >
            <img 
              src={itineraryData.authorImage}
              alt={itineraryData.author}
              className="w-11 h-11 rounded-full object-cover"
            />
            <div className="text-left">
              <div className="flex items-center gap-1">
                <p className="text-[15px] font-semibold">{itineraryData.author}</p>
                {itineraryData.authorVerified && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#3B82F6]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{itineraryData.authorUsername}</p>
            </div>
          </button>
          {!isOwner && (
            <div className="flex gap-2">
              <button
                onClick={handleOpenChat}
                aria-label={`Conversar com ${itineraryData.author}`}
                className="btn-icon border border-border active:scale-95 transition-transform"
              >
                <Icon name="chat_bubble" size={20} />
              </button>
              <button
                onClick={handleToggleFollow}
                aria-pressed={isFollowing}
                className={cn(
                  'px-5 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-all',
                  isFollowing
                    ? 'bg-card text-foreground border border-border'
                    : 'text-white'
                )}
                style={isFollowing ? undefined : { background: '#1A1C40' }}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
            </div>
          )}
        </div>

        {/* Info badges */}
        <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-hide -mx-5 px-5">
          <div className="p-3.5 flex items-center gap-3 flex-shrink-0 min-w-[240px] rounded-2xl bg-white">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white">
              <Icon name="language" size={16} className="text-[#1A1C40]" />
            </div>
            <p className="text-[13px] font-semibold text-[#1A1C40]">
              Experiente em roteiros europeus
            </p>
          </div>

          <div className="p-3.5 flex items-center gap-3 flex-shrink-0 min-w-[240px] rounded-2xl bg-white">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white">
              <Icon name="group" size={16} className="text-[#1A1C40]" />
            </div>
            <p className="text-[13px] font-semibold text-[#1A1C40]">
              +500 viajantes usaram
            </p>
          </div>
        </div>



        {/* Description */}
        <section className="mb-10">
          <h2 className="section-title mb-3">Sobre este roteiro</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
            {itineraryData.description?.trim()
              ? itineraryData.description
              : `Roteiro completo com ${derivedDays.length} dias, ${derivedPlaces.length} locais imperdíveis e dicas práticas para aproveitar ao máximo sua viagem por ${itineraryData.title.toLowerCase()}.`}
          </p>

          {suggestedDateLabel && (
            <div className="flex items-center gap-2 mb-4 text-[13px] text-[#1A1C40]">
              <Icon name="calendar_month" size={16} className="text-[#1A1C40]" />
              <span>
                <span className="font-semibold">Data sugerida:</span> {suggestedDateLabel}
                <span className="text-muted-foreground"> · {itineraryData.duration}</span>
              </span>
            </div>
          )}

          {(itineraryData.tags.length > 0 || itineraryData.mainTag || seasonLabel) && (
            <div className="flex flex-wrap gap-2">
              {(() => {
                const baseList = itineraryData.tags.length > 0
                  ? itineraryData.tags
                  : (itineraryData.mainTag ? [itineraryData.mainTag] : []);
                const ordered = itineraryData.mainTag
                  ? [itineraryData.mainTag, ...baseList.filter((t) => t !== itineraryData.mainTag)]
                  : baseList;
                const withSeason = seasonLabel && !ordered.includes(seasonLabel)
                  ? [...ordered, seasonLabel]
                  : ordered;
                return withSeason.map((tag) => {
                  const isMain = tag === itineraryData.mainTag;
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center h-7 rounded-full px-3"
                      style={isMain
                        ? { background: '#1A1C40', fontSize: 12, fontWeight: 600, color: '#FFFFFF' }
                        : { background: '#E5E7EB', fontSize: 12, fontWeight: 500, color: '#1A1C40' }}
                    >
                      {tag}
                    </span>
                  );
                });
              })()}
            </div>
          )}


        </section>

        {/* Day by day itinerary */}
        <section className="mb-10">
          <h2 className="section-title mb-4">Roteiro dia a dia</h2>
          <div className="space-y-3">
            {(showAllDays ? derivedDays : derivedDays.slice(0, 4)).map((day) => {
              const isLocked = day.day > 1;
              const isExpanded = expandedDays.has(day.day);
              
              return (
                <div key={day.day} className="card-base overflow-hidden">
                  <button
                    onClick={() => toggleDay(day.day)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex-1">
                      <p className="text-[15px] font-bold">
                        Dia {day.day}: {day.title}
                      </p>
                      {!isExpanded && (
                        <p className="text-[12px] text-muted-foreground mt-1">
                          {day.places.length} locais • {day.estimatedTime}
                        </p>
                      )}
                    </div>
                    <Icon 
                      name={isExpanded ? 'chevron_up' : 'chevron_down'} 
                      size={20} 
                      className="text-muted-foreground flex-shrink-0 ml-2" 
                    />
                  </button>
                  
                  {isExpanded && (
                    <div className="relative px-4 pb-4 pt-2">
                      {isLocked && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-lg">
                            <p className="text-[13px] font-semibold">
                              {day.places.length} Locais - Compre para desbloquear
                            </p>
                            <Icon name="lock" size={16} className="text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      )}
                      <div className={isLocked ? 'blur-[2px]' : ''}>
                        <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">
                          {day.description}
                        </p>
                        <div className="space-y-2">
                          {day.places.map((place, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                              <span className="text-[13px]">{place}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <Icon name="schedule" size={16} className="text-muted-foreground" />
                          <span className="text-[12px] text-muted-foreground">
                            Tempo estimado: {day.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {derivedDays.length > 4 && (
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className="w-full mt-3 py-3 rounded-xl flex items-center justify-center gap-1.5 bg-white"
              style={{ border: '1px solid #E5E7EB' }}
            >
              <span className="text-[13px] font-semibold" style={{ color: '#1A1C40' }}>
                {showAllDays ? 'Exibir menos' : `Exibir mais ${derivedDays.length - 4} dias`}
              </span>
              <Icon name={showAllDays ? 'chevron_up' : 'chevron_down'} size={16} style={{ color: '#1A1C40' }} />
            </button>
          )}
        </section>

        {/* Places included */}
        <section className="mb-10">
          <h2 className="section-title mb-4">Alguns lugares que você vai explorar</h2>
          <div className="-mr-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            <div className="flex gap-3 pr-5">
              {derivedPlaces.map((place) => (
                <div
                  key={place.id}
                  className="relative flex-shrink-0 snap-start rounded-2xl overflow-hidden"
                  style={{ width: '160px', aspectRatio: '4 / 5', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}
                >
                  <img
                    src={place.image}
                    alt={place.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Black overlay for text legibility */}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)' }}
                  />
                  {/* Place name */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4
                      className="text-white"
                      style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                    >
                      {place.name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews section */}
        <section className="mb-10 -mx-5">
          <button
            onClick={() => setShowAllReviews(true)}
            className="flex items-center gap-1 mb-4 px-5 active:opacity-70"
          >
            <h2 className="section-title">Avaliações</h2>
            <Icon name="chevron_right" size={18} style={{ color: '#1A1C40' }} />
          </button>

          {/* AI Summary */}
          <div className="px-5">
            <div className="card-base p-4 mb-4" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e0f2fe 100%)' }}>
              <div className="flex items-start gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✨</span>
                </div>
                <p className="text-[12px] font-bold text-purple-700">Resumo por IA</p>
              </div>
              <p className="text-[13px] text-gray-700 leading-relaxed">
                Este roteiro tem <strong>excelente avaliação</strong>. Destaques:
                <strong> organização impecável</strong> e <strong>dicas práticas</strong>.
              </p>
            </div>
          </div>

          {/* Individual reviews carousel */}
          <div className="pl-5">
            <HorizontalCarousel showDots={false} itemClassName="w-[260px]">
              {mockReviews.map((review) => (
                <div key={review.id} className="card-base p-3.5 w-full h-full">
                  <div className="flex items-start gap-3">
                    <img
                      src={review.userImage}
                      alt={review.userName}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                          {review.userName}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Icon
                              key={i}
                              name="star"
                              size={9}
                              filled
                              style={{ color: i < review.rating ? '#F2B90C' : '#E5E7EB' }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-1" style={{ fontSize: '11px' }}>
                        {review.date}
                      </p>
                      <p className="text-foreground" style={{ fontSize: 'var(--text-sm)', lineHeight: '1.4' }}>
                        "{review.comment}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </HorizontalCarousel>
          </div>
        </section>
      </div>

      {/* Fixed footer */}
      <div 
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-30"
        style={{ 
          boxShadow: 'var(--shadow-bottom-nav)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="max-w-[430px] mx-auto px-5 pt-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Preço total</span>
            <p className="text-[20px] font-bold" style={{ color: '#1A1C40' }}>R$ {itineraryData.price.toFixed(2).replace('.', ',')}</p>
          </div>
          <button onClick={() => setShowPurchaseRules(true)} className="btn-primary px-8">
            Comprar roteiro
          </button>
        </div>
      </div>

      <SaveToCollectionSheet
        open={saveSheetOpen}
        onClose={() => { setSaveSheetOpen(false); setSavingPlace(null); }}
        place={savingPlace}
        onSaved={handlePlaceSaved}
      />

      {/* Date choice bottom sheet - overlays on top */}
      {showDateChoice && (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => { setShowDateChoice(false); onBack(); }}>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-2">
              <h3 className="text-lg font-bold text-foreground">Datas da viagem</h3>
              <button
                onClick={() => { setShowDateChoice(false); onBack(); }}
                className="w-8 h-8 flex items-center justify-center"
              >
                <Icon name="close" size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 160px)' }}>
              <p className="text-sm text-muted-foreground mb-4">
                Deseja manter as datas originais ou escolher novas datas para sua viagem?
              </p>
              <button
                onClick={() => {
                  setShowDateChoice(false);
                  onViewPurchasedItinerary?.(itineraryId);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl mb-3 transition-all active:scale-[0.98]"
                style={{
                  background: dateMode === 'keep' ? 'rgba(157, 204, 54, 0.1)' : '#F2F2F2',
                  border: dateMode === 'keep' ? '2px solid #9DCC36' : '2px solid transparent',
                }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: dateMode === 'keep' ? 'rgba(157, 204, 54, 0.15)' : '#E5E7EB' }}
                >
                  <Icon name="calendar_today" size={20} style={{ color: dateMode === 'keep' ? '#9DCC36' : '#6B7280' }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Manter datas originais</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dataset ? `${format(dataset.startDate, "dd MMM", { locale: ptBR })} — ${format(dataset.endDate, "dd MMM yyyy", { locale: ptBR })}` : ''}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setDateMode('change')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl mb-4 transition-all active:scale-[0.98]"
                style={{
                  background: dateMode === 'change' ? 'rgba(157, 204, 54, 0.1)' : '#F2F2F2',
                  border: dateMode === 'change' ? '2px solid #9DCC36' : '2px solid transparent',
                }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: dateMode === 'change' ? 'rgba(157, 204, 54, 0.15)' : '#E5E7EB' }}
                >
                  <Icon name="calendar_month" size={20} style={{ color: dateMode === 'change' ? '#9DCC36' : '#6B7280' }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Escolher novas datas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Selecione a data de início</p>
                </div>
              </button>
              {dateMode === 'change' && (
                <div className="mb-4">
                  <Calendar
                    mode="single"
                    selected={newStartDate}
                    onSelect={(d) => {
                      setNewStartDate(d);
                      if (d) {
                        const end = addDays(d, totalDaysCount);
                        setShowDateChoice(false);
                        onViewPurchasedItinerary?.(itineraryId, d, end);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    scrollable
                    className={cn("pointer-events-auto w-full p-0")}
                    classNames={{
                      months: "w-full",
                      month: "w-full space-y-4",
                      table: "w-full border-collapse",
                      head_row: "flex w-full",
                      head_cell: "flex-1 text-muted-foreground font-normal text-[0.75rem] lowercase text-center",
                      row: "flex w-full mt-1",
                      cell: "flex-1 relative text-center text-sm p-0 focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary-official/20 [&:has([aria-selected].day-range-start)]:rounded-l-full [&:has([aria-selected].day-range-end)]:rounded-r-full",
                      day: "h-10 w-full p-0 font-normal inline-flex items-center justify-center transition-colors hover:bg-muted rounded-full aria-selected:opacity-100",
                      day_selected: "!bg-primary-official !text-[#1A1C40] rounded-full hover:!bg-primary-official focus:!bg-primary-official",
                      day_today: "bg-[#141530] text-white rounded-full hover:bg-[#141530] focus:bg-[#141530] aria-selected:!bg-primary-official aria-selected:!text-white",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_outside: "text-muted-foreground opacity-50",
                    }}
                    locale={ptBR}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Details bottom sheet */}
      {showDetailsSheet && (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowDetailsSheet(false)}>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-2">
              <h3 className="text-lg font-bold text-foreground">Mais detalhes</h3>
              <button
                onClick={() => setShowDetailsSheet(false)}
                className="w-8 h-8 flex items-center justify-center"
              >
                <Icon name="close" size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 pb-6 space-y-1">
              <button
                onClick={() => {
                  setShowDetailsSheet(false);
                  shareItinerary({
                    title: itineraryData.title,
                    author: itineraryData.author,
                    description: `${derivedDays.length} dias, ${itineraryData.places} locais. A partir de R$ ${itineraryData.price.toFixed(2).replace('.', ',')}`,
                    datasetId: itineraryId,
                  });
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-muted transition-colors"
              >
                <Icon name="share" size={20} />
                <span className="text-sm font-medium">Compartilhar</span>
              </button>
              <button
                onClick={() => {
                  setShowDetailsSheet(false);
                  setReportSheetOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-muted transition-colors text-red-600"
              >
                <Icon name="error" size={20} className="text-red-600" />
                <span className="text-sm font-medium">Denunciar conteúdo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isOwner && (
        <OwnerPublishedSheet
          open={showOwnerSheet}
          onClose={() => setShowOwnerSheet(false)}
          tripName={itineraryData.title}
          datasetId={itineraryId}
          onManageItinerary={onManageItinerary}
          onViewSalesDashboard={onViewSalesDashboard}
          onUnpublish={onUnpublish}
          onDownloadPdf={onDownloadPdf}
          onDelete={onDeleteItinerary}
        />
      )}

      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        targetType="itinerary"
        targetName={itineraryData.title}
        onSubmit={async ({ reasonLabel, details }) => {
          // Persiste como denúncia ao autor com contexto do roteiro.
          let authorUserId: string | undefined;
          const usernameRaw = (itineraryData.authorUsername || '').replace(/^@/, '').trim();
          if (usernameRaw) {
            try {
              const { data } = await supabase
                .from('profiles_public')
                .select('user_id')
                .ilike('username', usernameRaw)
                .maybeSingle();
              if (data?.user_id) authorUserId = data.user_id as string;
            } catch {/* segue */}
          }
          const reason = `Roteiro denunciado: ${reasonLabel}`;
          const composedDetails = `Roteiro: ${itineraryData.title} (id: ${itineraryData.id})\n\n${details || '(sem detalhes adicionais)'}`;
          if (authorUserId) {
            const { reportProfile } = await import('@/lib/socialInteractions');
            await reportProfile(authorUserId, reason, composedDetails);
          } else {
            console.warn('[MarketplaceItinerary] autor não identificado — denúncia registrada localmente', { reason, composedDetails });
          }
        }}
      />
    </div>
  );
}
