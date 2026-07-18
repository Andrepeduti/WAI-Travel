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
import { differenceInDays, addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { OwnerPublishedSheet } from '@/components/travel/OwnerPublishedSheet';
import { recordPurchase } from '@/lib/purchasesApi';
import { getInterestIcon } from '@/lib/interestIcons';
import { ReportSheet } from '@/components/social/ReportSheet';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getMarketplaceItinerary, getItineraryReviews } from '@/lib/marketplaceApi';
import { loadPlannerData } from '@/lib/plannerApi';
import { Loader2 } from 'lucide-react';

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
  id: string;
  userName: string;
  userImage: string;
  rating: number;
  date: string;
  comment: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MarketplaceItineraryScreenProps {
  itineraryId: number | string;
  onBack: () => void;
  onViewPurchasedItinerary?: (itineraryId: number | string, newStartDate?: Date, newEndDate?: Date) => void;
  onViewCreator?: (author: string, authorImage: string) => void;
  authorOverride?: string;
  authorImageOverride?: string;
  /** Optional dataset injected from outside (e.g. a user-published itinerary not in the static catalog). */
  datasetOverride?: any | null;
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
      itineraryId?: number | string;
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

  const idStr = String(itineraryId);

  const { data: marketplaceData, isLoading: isLoadingItinerary } = useQuery({
    queryKey: ['marketplace-itinerary', idStr],
    queryFn: () => getMarketplaceItinerary(idStr),
    enabled: !!idStr,
  });

  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['itinerary-reviews', idStr],
    queryFn: () => getItineraryReviews(idStr),
    enabled: !!idStr,
  });

  const { data: plannerData, isLoading: isLoadingPlanner } = useQuery({
    queryKey: ['planner-data', idStr],
    queryFn: () => loadPlannerData(idStr),
    enabled: !!idStr,
  });

  const itineraryData = useMemo(() => {
    if (!marketplaceData) return null;

    // We only have startDate and endDate strings in marketplaceData
    let totalDays = 3;
    if (marketplaceData.startDate && marketplaceData.endDate) {
      try {
        totalDays = Math.max(1, differenceInDays(parseISO(marketplaceData.endDate), parseISO(marketplaceData.startDate)) + 1);
      } catch (e) { }
    }

    const uniqueCities = new Set(marketplaceData.destinations.map(d => d.split(',')[0].trim()));
    const rCount = reviewsData?.length || 0;
    const avgRating = rCount > 0 ? (reviewsData!.reduce((acc, curr) => acc + curr.rating, 0) / rCount).toFixed(1) : '0';

    return {
      id: marketplaceData.id,
      title: marketplaceData.title || 'Roteiro',
      subtitle: `${totalDays} dias • ${uniqueCities.size} cidades`,
      image: marketplaceData.images?.[0] || 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
      rating: Number(avgRating),
      reviewCount: rCount,
      price: (marketplaceData.priceCents ?? 0) / 100,
      author: authorOverride || marketplaceData.authorName || 'Autor',
      authorImage: authorImageOverride || marketplaceData.authorAvatar || '',
      authorUsername: marketplaceData.authorUsername || (authorOverride || marketplaceData.authorName || 'Autor'),
      authorVerified: true, // Assuming published means verified enough for this UI
      duration: `${totalDays} dias`,
      cities: uniqueCities.size || 1,
      places: marketplaceData.places || 0,
      description: marketplaceData.description ?? '',
      tags: marketplaceData.tags ?? [],
      destinations: marketplaceData.destinations ?? [],
      startDate: marketplaceData.startDate ? parseISO(marketplaceData.startDate) : new Date(),
      endDate: marketplaceData.endDate ? parseISO(marketplaceData.endDate) : addDays(new Date(), totalDays - 1),
      salesCount: (marketplaceData as any).salesCount || 0,
    };
  }, [marketplaceData, reviewsData, authorOverride, authorImageOverride]);

  const derivedDays = useMemo<DayItinerary[]>(() => {
    if (!plannerData || !plannerData.activities) return [];

    const days: DayItinerary[] = [];
    Object.keys(plannerData.activities).forEach(dayKey => {
      const day = Number(dayKey);
      const acts = plannerData.activities[day] || [];
      if (acts.length > 0) {
        days.push({
          day,
          title: `Dia ${day}`,
          description: `Dia ${day} do roteiro com ${acts.length} atividades planejadas.`,
          places: acts.map(a => a.name),
          estimatedTime: `${acts.length * 2} horas`,
        });
      }
    });
    return days.sort((a, b) => a.day - b.day);
  }, [plannerData]);

  const derivedPlaces = useMemo<Place[]>(() => {
    if (!plannerData || !plannerData.activities) return [];
    const allPlaces: Place[] = [];
    Object.values(plannerData.activities).forEach(acts => {
      acts.forEach(a => {
        allPlaces.push({
          id: a.id,
          name: a.name,
          image: a.image || 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800',
          category: a.category || 'Atividade',
          rating: a.rating || 4.5,
        });
      });
    });
    return allPlaces.slice(0, 10); // Show max 10 places in summary
  }, [plannerData]);

  const seasonLabel = useMemo(() => {
    if (!itineraryData) return '';
    return getSeasonForDate(itineraryData.startDate, itineraryData.destinations);
  }, [itineraryData]);

  const suggestedDateLabel = useMemo(() => {
    if (!itineraryData) return '';
    return `${format(itineraryData.startDate, "dd MMM", { locale: ptBR })} — ${format(itineraryData.endDate, "dd MMM yyyy", { locale: ptBR })}`;
  }, [itineraryData]);



  const { toggleFavorite, isFavorite } = useFavorites();
  const isFavorited = itineraryData ? isFavorite(itineraryData.id) : false;
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
      toast.success(next ? `Seguindo ${itineraryData?.author}` : `Você deixou de seguir ${itineraryData?.author}`);
      return next;
    });
  }, [itineraryData?.author]);

  const handleOpenChat = useCallback(async () => {
    if (!itineraryData) return;
    if (!onOpenChat) {
      toast(`Abrindo conversa com ${itineraryData.author}…`);
      return;
    }
    const destination = itineraryData?.destinations?.[0];
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
  }, [onOpenChat, itineraryData?.author, itineraryData?.authorImage, itineraryData?.authorUsername, itineraryData?.title, itineraryData?.image, itineraryData?.id, itineraryData?.price]);



  const { addToCart, removeFromCart } = useCart();

  const addCurrentToCart = useCallback(() => {
    if (!itineraryData) return;
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
    if (!itineraryData?.startDate || !itineraryData?.endDate) return 3;
    return differenceInDays(itineraryData.endDate, itineraryData.startDate);
  }, [itineraryData]);

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


  if (isLoadingItinerary) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!itineraryData) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-background p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Ops!</h2>
        <p className="text-muted-foreground mb-2">Roteiro não encontrado.</p>
        <p className="text-muted-foreground mb-8 text-sm">Este roteiro pode ter sido removido ou o link é inválido.</p>
        <button onClick={onBack} className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium w-full max-w-[200px]">
          Voltar
        </button>
      </div>
    );
  }

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
            snapshot: itineraryData
              ? {
                title: itineraryData.title,
                destinations: itineraryData.destinations,
                images: itineraryData.image ? [itineraryData.image] : [],
                places: itineraryData.places,
                description: itineraryData.description ?? '',
                tags: itineraryData.tags ?? [],
                days: totalDaysCount,
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
    const rData = reviewsData ?? [];
    const avg = rData.length > 0
      ? rData.reduce((s, r) => s + r.rating, 0) / rData.length
      : 0;
    return (
      <AllReviewsScreen
        creatorName={itineraryData.author}
        averageRating={avg}
        reviews={rData.map((r) => ({
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
        <div className="absolute top-0 left-0 right-0 px-4 flex items-center justify-between z-10" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <div className="flex gap-2">
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
            <span className="text-[13px] font-semibold">{itineraryData.rating > 0 ? itineraryData.rating : '-'}</span>
          </div>

          <div className="w-px h-3.5 bg-border flex-shrink-0" />

          <div className="flex items-center gap-1 flex-shrink-0">
            <Icon name="chat_bubble" size={14} className="text-muted-foreground" />
            <span className="text-[13px] font-medium">{itineraryData.reviewCount} reviews</span>
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
              </div>
              <p className="text-xs text-muted-foreground">
                {itineraryData.authorUsername ? (itineraryData.authorUsername.startsWith('@') ? itineraryData.authorUsername : `@${itineraryData.authorUsername}`) : ''}
              </p>
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
              <Icon name="group" size={16} className="text-[#1A1C40]" />
            </div>
            <p className="text-[13px] font-semibold text-[#1A1C40]">
              {itineraryData.salesCount > 0 ? `+${itineraryData.salesCount} viajantes compraram` : 'Nenhum viajante comprou ainda'}
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

          {itineraryData && (
            <div className="flex items-center gap-2 mb-4 text-[13px] text-[#1A1C40]">
              <Icon name="calendar_month" size={16} className="text-[#1A1C40]" />
              <span>
                {itineraryData.tags?.includes('_FLEXIBLE_DATES_') ? (
                  <span className="font-semibold">Datas flexíveis</span>
                ) : (
                  <>
                    <span className="font-semibold">Data sugerida:</span> {suggestedDateLabel}
                  </>
                )}
                <span className="text-muted-foreground"> · {itineraryData.duration}</span>
              </span>
            </div>
          )}

          {(itineraryData.tags.length > 0 || seasonLabel) && (
            <div className="flex flex-wrap gap-2">
              {(() => {
                const ordered = itineraryData.tags.filter(t => t !== '_FLEXIBLE_DATES_');
                const withSeason = seasonLabel && !ordered.includes(seasonLabel)
                  ? [...ordered, seasonLabel]
                  : ordered;
                return withSeason.map((tag) => {
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 h-7 rounded-2xl px-3"
                      style={{ background: '#FFFFFF', fontSize: 12, fontWeight: 500, color: '#1A1C40' }}
                    >
                      <Icon name={getInterestIcon(tag)} size={14} style={{ color: '#1A1C40' }} />
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



          {/* Individual reviews carousel */}
          <div className="pl-5">
            <HorizontalCarousel showDots={false} itemClassName="w-[260px]">
              {(reviewsData || []).map((review) => (
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
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full w-full bg-card border-t border-border z-30"
        style={{
          boxShadow: 'var(--shadow-bottom-nav)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="w-full mx-auto px-5 pt-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Preço total</span>
            <p className="text-[20px] font-bold" style={{ color: '#1A1C40' }}>R$ {itineraryData.price.toFixed(2).replace('.', ',')}</p>
          </div>
          <button
            onClick={() => setShowPurchaseRules(true)}
            className="btn-primary px-8"
            disabled={isOwner}
            style={isOwner ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            {isOwner ? 'Seu roteiro' : 'Comprar roteiro'}
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
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full w-full bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300"
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
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full w-full bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300"
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
            } catch {/* segue */ }
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
