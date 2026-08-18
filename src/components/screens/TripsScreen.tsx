import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, useMotionValue, PanInfo } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { ShoppingBag, Star, Heart, Mic, SlidersHorizontal, Plus } from 'lucide-react';
import { format, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { parseLocalDate } from '@/lib/localDate';
import { ptBR } from 'date-fns/locale';
import { resolveTripThumbnailImages, GENERIC_TRAVEL_PLACEHOLDER } from '@/lib/coverImageResolver';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { type UserItinerary, fetchItineraryMemberAvatars, leaveItinerary } from '@/lib/itinerariesApi';
import { toast } from 'sonner';
import { collectionsListKey, readJSON, writeJSON } from '@/lib/userScopedStorage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PURCHASES_CHANGED_EVENT } from '@/lib/purchasesApi';
import { ItineraryListSkeleton } from '@/components/ui/LoadingShimmers';
import { BottomSheet } from '../ui/BottomSheet';

export type { UserItinerary };

export interface UserCollection {
  id: number;
  title: string;
  itemCount: number;
  isFavorites: boolean;
  isPrivate: boolean;
  images: string[];
  participants: string[];
}

export function getUserCollections(): UserCollection[] {
  return readJSON<UserCollection[]>(collectionsListKey(), []);
}

export function saveUserCollection(collection: UserCollection) {
  const key = collectionsListKey();
  if (!key) return;
  const existing = getUserCollections();
  existing.unshift(collection);
  writeJSON(key, existing);
}

export function deleteUserCollection(collectionId: number) {
  const key = collectionsListKey();
  if (!key) return;
  const existing = getUserCollections();
  writeJSON(key, existing.filter(c => c.id !== collectionId));
}

type TabType = 'private' | 'public' | 'favorites' | 'collections';
type SortOption = 'az' | 'za' | 'days-asc' | 'days-desc' | 'recent' | 'oldest';
type OriginFilter = 'all' | 'mine' | 'shared' | 'purchased';

const sortOptions: { id: SortOption; label: string; shortLabel: string }[] = [
  { id: 'recent', label: 'Mais recentes', shortLabel: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigos', shortLabel: 'Mais antigos' },
  { id: 'days-asc', label: 'Dias restantes: menor → maior', shortLabel: 'Dias restantes ↑' },
  { id: 'days-desc', label: 'Dias restantes: maior → menor', shortLabel: 'Dias restantes ↓' },
  { id: 'az', label: 'Ordem alfabética (A–Z)', shortLabel: 'A–Z' },
  { id: 'za', label: 'Ordem alfabética (Z–A)', shortLabel: 'Z–A' },
];

const originOptions: { id: OriginFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'mine', label: 'Criados por você' },
  { id: 'shared', label: 'Compartilhados' },
  { id: 'purchased', label: 'Comprados' },
];

let cachedMemberAvatars: Record<string, any[]> = {};

interface TripsScreenProps {
  onItineraryClick: (id: number) => void;
  onPrivateItineraryClick?: (id: number) => void;
  onUserItineraryClick?: (itinerary: UserItinerary) => void;
  /** Open a user-published itinerary inside the marketplace ("for sale") view. */
  onUserPublicItineraryClick?: (itinerary: UserItinerary) => void;
  onCollectionClick: (id: number) => void;
  /** Triggered from the empty state or + button */
  onCreateItinerary?: () => void;
  onBecomeCreator?: () => void;
  onExplore?: () => void;
  onUpgrade?: () => void;
  itineraryUsedCount?: number;
  itineraryLimit?: number;
  defaultTab?: TabType;
}

// Single cover image thumbnail (Figma: width 95px, height 117px, border-radius 8px)
function TripThumbnail({ images }: { images: string[] }) {
  const cover = images.find((image) => image && !image.startsWith('blob:')) || GENERIC_TRAVEL_PLACEHOLDER;
  return (
    <div className="w-[95px] h-[117px] min-w-[95px] min-h-[117px] rounded-[8px] overflow-hidden flex-shrink-0 bg-muted">
      <img
        src={cover}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

interface ParticipantItem {
  avatar: string;
  name?: string;
  isOwner?: boolean;
}

// Component for avatar stack (Figma: 32x32px, border 1.33px #FEFEFE, border-radius 53px)
function AvatarStack({ participants }: { participants?: (string | ParticipantItem)[] }) {
  if (!participants || participants.length === 0) {
    return null;
  }

  const list: ParticipantItem[] = participants.map((p, idx) => {
    if (typeof p === 'string') {
      return { avatar: p, isOwner: idx === 0 };
    }
    return p;
  });

  const maxVisible = 2;
  const visible = list.slice(0, maxVisible);
  const extraCount = Math.max(0, list.length - maxVisible);

  return (
    <div className="flex items-center -space-x-[11px] h-[32px]">
      {visible.map((item, index) => (
        <img
          key={index}
          src={item.avatar}
          alt={item.name || ''}
          title={item.name ? `${item.name}${item.isOwner ? ' (Dono)' : ''}` : undefined}
          className="w-[32px] h-[32px] rounded-full border-[1.33px] border-[#FEFEFE] object-cover bg-muted flex-shrink-0"
        />
      ))}
      {extraCount > 0 && (
        <div className="w-[32px] h-[32px] rounded-full border-[1.33px] border-[#FEFEFE] bg-[#F2F2F2] flex items-center justify-center flex-shrink-0 z-10">
          <span className="text-[10px] font-bold text-[#1A1C40]">
            +{extraCount}
          </span>
        </div>
      )}
    </div>
  );
}

export function TripsScreen({
  onItineraryClick,
  onPrivateItineraryClick,
  onUserItineraryClick,
  onUserPublicItineraryClick,
  onCreateItinerary,
  defaultTab = 'private',
}: TripsScreenProps) {
  const [activeTab, setActiveTab] = useState<'private' | 'public'>(
    defaultTab === 'public' ? 'public' : 'private'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [showSortSheet, setShowSortSheet] = useState(false);

  const { user: authUser } = useAuth();
  const {
    itineraries: userItineraries,
    loading: itinerariesLoading,
    remove: removeItinerary,
    refetch: refetchItineraries,
  } = useMyItineraries();

  const [salesByItinerary, setSalesByItinerary] = useState<Record<string, number>>({});
  const [purchasedItineraryIds, setPurchasedItineraryIds] = useState<Set<string>>(new Set());
  const [purchasesVersion, setPurchasesVersion] = useState(0);

  useEffect(() => {
    const handler = () => setPurchasesVersion((v) => v + 1);
    window.addEventListener(PURCHASES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, handler);
  }, []);

  // Carrega contagem de vendas por roteiro
  useEffect(() => {
    if (!authUser?.id) {
      setSalesByItinerary({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('itinerary_sales')
        .select('itinerary_id')
        .eq('seller_id', authUser.id);
      if (cancelled || error || !data) return;
      const counts: Record<string, number> = {};
      for (const row of data as { itinerary_id: string }[]) {
        counts[row.itinerary_id] = (counts[row.itinerary_id] ?? 0) + 1;
      }
      setSalesByItinerary(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, userItineraries.length, purchasesVersion]);

  // Carrega quais roteiros do usuário foram comprados
  useEffect(() => {
    if (!authUser?.id) {
      setPurchasedItineraryIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('itinerary_sales')
        .select('itinerary_id')
        .eq('buyer_id', authUser.id);
      if (cancelled || error || !data) return;
      setPurchasedItineraryIds(new Set((data as { itinerary_id: string }[]).map((r) => r.itinerary_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, userItineraries.length, purchasesVersion]);

  // Avatares reais por roteiro
  const [memberAvatarsByItin, setMemberAvatarsByItin] = useState<Record<string, string[]>>(() => cachedMemberAvatars);
  const [visualsReady, setVisualsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ids = userItineraries.map((u) => u.id).filter((id): id is string => typeof id === 'string');

    (async () => {
      let map = cachedMemberAvatars;
      if (ids.length > 0) {
        try {
          map = await fetchItineraryMemberAvatars(ids);
          if (!cancelled) {
            cachedMemberAvatars = map;
            setMemberAvatarsByItin(map);
          }
        } catch {
          /* silencioso */
        }
      }
      if (!cancelled) {
        setVisualsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userItineraries]);

  // Roteiros pessoais (inclui criados como pessoais e os híbridos publicados depois)
  const mergedPrivateItineraries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userCards = userItineraries
      .filter((ui) => ui.isPersonal !== false && !ui.deletedAt)
      .map((ui) => {
        const parsedStart = parseLocalDate(ui.startDate);
        const parsedEnd = parseLocalDate(ui.endDate);
        const start = parsedStart ? new Date(parsedStart) : (parsedEnd ? new Date(parsedEnd) : new Date(today));
        const end = parsedEnd ? new Date(parsedEnd) : (parsedStart ? new Date(parsedStart) : new Date(today));
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const isFlexible = ui.tags?.includes('_FLEXIBLE_DATES_') || false;
        const isCancelled = ui.tags?.includes('_CANCELLED_') || ui.tags?.includes('_CANCELED_') || false;
        const durationDays = Math.max(1, differenceInDays(end, start) + 1);
        const daysRemaining = differenceInCalendarDays(start, today);
        const isPast = !isCancelled && end < today;
        const isInProgress = !isCancelled && !isPast && today >= start && today <= end;
        const formatShortDate = (d: Date) => {
          const day = format(d, 'd');
          const monthMap: Record<number, string> = {
            0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
            6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez'
          };
          return `${day} ${monthMap[d.getMonth()]}`;
        };
        const dateRange = isFlexible
          ? `${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}`
          : `${formatShortDate(start)} - ${formatShortDate(end)} (${durationDays} ${durationDays === 1 ? 'dia' : 'dias'})`;
        const validImages = ui.images.filter((image) => image && !image.startsWith('blob:'));
        const images = validImages.length > 0 ? validImages : resolveTripThumbnailImages(ui.destinations);

        const isPurchased =
          (typeof ui.id === 'string' && purchasedItineraryIds.has(ui.id)) ||
          (ui.sourceDatasetId != null && !ui.isPublic);
        const isShared = !!authUser?.id && ui.userId !== authUser.id;

        // Subtítulo do card
        let subtitle = 'Criado por você';
        if (isPurchased) {
          subtitle = 'Roteiro comprado';
        } else if (isShared) {
          subtitle = 'Compartilhado com você';
        }

        return {
          id: ui.id as string | number,
          title: ui.title,
          subtitle,
          dateRange,
          places: ui.places,
          daysRemaining,
          isPast,
          isInProgress,
          isCancelled,
          isFlexible,
          images,
          participants:
            typeof ui.id === 'string' && (memberAvatarsByItin[ui.id]?.length ?? 0) > 0
              ? memberAvatarsByItin[ui.id]
              : ui.participants,
          isPurchased,
          isShared,
          _userItinerary: ui,
        };
      });

    return userCards;
  }, [userItineraries, purchasedItineraryIds, authUser?.id, memberAvatarsByItin]);

  // Roteiros publicados (apenas roteiros do próprio autor logado)
  const mergedPublicItineraries = useMemo(() => {
    const userPublicCards = userItineraries
      .filter((ui) => ui.isPublic && ui.userId === authUser?.id && !ui.deletedAt)
      .map((ui) => {
        const validImages = ui.images.filter((image) => image && !image.startsWith('blob:'));
        const images = validImages.length > 0 ? validImages : resolveTripThumbnailImages(ui.destinations);
        const salesCount = salesByItinerary[ui.id] ?? 0;
        const isPaused = ui.isPaused ?? false;
        const isDraft = !ui.priceCents || ui.tags?.includes('_DRAFT_');

        let status: 'Ativo' | 'Rascunho' | 'Pausado' = 'Ativo';
        if (isPaused) {
          status = 'Pausado';
        } else if (isDraft) {
          status = 'Rascunho';
        }

        return {
          id: ui.id as string | number,
          title: ui.title,
          images,
          priceCents: ui.priceCents ?? 2990,
          salesCount: salesCount > 0 ? `${salesCount} vendas` : '-',
          rating: '4.5',
          likesCount: '500',
          status,
          _userItinerary: ui,
        };
      });

    return userPublicCards;
  }, [userItineraries, salesByItinerary, authUser?.id]);

  // Filtro e busca
  const filteredPersonalList = useMemo(() => {
    let list = mergedPrivateItineraries;

    if (originFilter !== 'all') {
      list = list.filter((item) => {
        if (originFilter === 'mine') return !item.isShared && !item.isPurchased;
        if (originFilter === 'shared') return item.isShared;
        if (originFilter === 'purchased') return item.isPurchased;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item._userItinerary?.destinations?.some((d: string) => d.toLowerCase().includes(q))
      );
    }

    const sorted = [...list];
    switch (sortBy) {
      case 'az':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'za':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'days-asc':
        sorted.sort((a, b) => {
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;
          return a.daysRemaining - b.daysRemaining;
        });
        break;
      case 'days-desc':
        sorted.sort((a, b) => {
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;
          return b.daysRemaining - a.daysRemaining;
        });
        break;
      case 'recent':
        sorted.sort((a, b) => {
          // 1. Roteiros em viagem (em andamento) sempre no topo
          if (a.isInProgress && !b.isInProgress) return -1;
          if (!a.isInProgress && b.isInProgress) return 1;

          // 2. Roteiros concluídos sempre por último
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;

          // 3. Regra secundária: editados mais recentemente
          const timeA = a._userItinerary?.updatedAt
            ? new Date(a._userItinerary.updatedAt).getTime()
            : 0;
          const timeB = b._userItinerary?.updatedAt
            ? new Date(b._userItinerary.updatedAt).getTime()
            : 0;
          return timeB - timeA;
        });
        break;
      case 'oldest':
        sorted.sort((a, b) => {
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;

          const timeA = a._userItinerary?.createdAt
            ? new Date(a._userItinerary.createdAt).getTime()
            : 0;
          const timeB = b._userItinerary?.createdAt
            ? new Date(b._userItinerary.createdAt).getTime()
            : 0;
          return timeA - timeB;
        });
        break;
    }

    return sorted;
  }, [mergedPrivateItineraries, originFilter, searchQuery, sortBy]);

  const filteredPublicList = useMemo(() => {
    let list = mergedPublicItineraries;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item._userItinerary?.destinations?.some((d: string) => d.toLowerCase().includes(q))
      );
    }

    return list;
  }, [mergedPublicItineraries, searchQuery]);

  // Swipe & Exclusão
  const [swipedItemId, setSwipedItemId] = useState<string | number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    id: string | number;
    title: string;
    isUser: boolean;
    isShared?: boolean;
  } | null>(null);

  const handleDelete = useCallback(
    async (id: string | number, isUser: boolean, isShared?: boolean) => {
      if (isShared && typeof id === 'string') {
        await leaveItinerary(id);
        toast.success('Você saiu do roteiro.');
      } else if (isUser && typeof id === 'string') {
        await removeItinerary(id);
        toast.success('Roteiro excluído com sucesso.');
      }
      setShowDeleteConfirm(null);
      setSwipedItemId(null);
    },
    [removeItinerary]
  );

  // Regra de cores para tag de contagem regressiva (Figma: height 24px, padding 4px 12px, border-radius 9px)
  const renderCountdownTag = (daysRemaining: number, isPast: boolean, isInProgress?: boolean) => {
    if (isPast || (daysRemaining < 0 && !isInProgress)) {
      return (
        <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#3C8622] text-[#3C8622] bg-white text-[12px] font-medium leading-[14px]">
          Concluído
        </span>
      );
    }
    if (isInProgress || daysRemaining === 0) {
      return (
        <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#3587F2] text-[#2865B6] bg-white text-[12px] font-medium leading-[14px]">
          Em viagem
        </span>
      );
    }
    if (daysRemaining === 1) {
      return (
        <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#F59E0B] text-[#D97706] bg-white text-[12px] font-medium leading-[14px]">
          Em 1 dia
        </span>
      );
    }
    if (daysRemaining <= 4) {
      return (
        <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#F59E0B] text-[#D97706] bg-white text-[12px] font-medium leading-[14px]">
          Em {daysRemaining} dias
        </span>
      );
    }
    if (daysRemaining <= 20) {
      return (
        <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#F59E0B] text-[#D97706] bg-white text-[12px] font-medium leading-[14px]">
          Em {daysRemaining} dias
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#555555] text-[#555555] bg-white text-[12px] font-medium leading-[14px]">
        Em {daysRemaining} dias
      </span>
    );
  };

  const isTripsScreenLoading = itinerariesLoading || !visualsReady;

  return (
    <div className="min-h-screen pb-28 bg-[#FFFFFF] font-sans">
      {/* Top Header */}
      <header className="px-6 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-[26px] font-bold text-[#1A1C40] tracking-tight">Meus roteiros</h1>
        <button
          onClick={onCreateItinerary}
          aria-label="Criar novo roteiro"
          className="w-11 h-11 rounded-full flex items-center justify-center bg-[#9ecc3b] text-[#1A1C40] hover:opacity-90 active:scale-95 transition-all shadow-sm flex-shrink-0"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </header>

      {/* Tabs */}
      <div className="px-6 border-b border-[#F0F0F0]">
        <div className="flex gap-8">
          <button
            onClick={() => {
              setActiveTab('private');
              setSearchQuery('');
            }}
            className={`pb-3 text-[15px] font-bold transition-all relative whitespace-nowrap ${activeTab === 'private' ? 'text-[#1A1C40]' : 'text-[#8E8E93] hover:text-[#1A1C40]'
              }`}
          >
            Roteiros pessoais
            {activeTab === 'private' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1A1C40] rounded-full"
              />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('public');
              setSearchQuery('');
            }}
            className={`pb-3 text-[15px] font-bold transition-all relative whitespace-nowrap ${activeTab === 'public' ? 'text-[#1A1C40]' : 'text-[#8E8E93] hover:text-[#1A1C40]'
              }`}
          >
            Roteiros publicados
            {activeTab === 'public' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1A1C40] rounded-full"
              />
            )}
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center bg-[#F4F4F5] rounded-2xl px-3.5 py-2.5 transition-colors focus-within:ring-1 focus-within:ring-[#1A1C40]/20">
            <Icon name="search" size={18} className="text-[#8E8E93] mr-2.5 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busque por um roteiro..."
              className="flex-1 bg-transparent text-[14px] text-[#1A1C40] placeholder:text-[#8E8E93] focus:outline-none"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-[#8E8E93] hover:text-[#1A1C40]"
              >
                <Icon name="close" size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.info('Busca por voz em breve')}
                className="p-1 text-[#8E8E93] hover:text-[#1A1C40]"
                aria-label="Busca por voz"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowSortSheet(true)}
            aria-label="Filtros e ordenação"
            className="w-11 h-11 rounded-2xl bg-[#F4F4F5] flex items-center justify-center text-[#1A1C40] hover:bg-[#ECECED] active:scale-95 transition-all flex-shrink-0 relative"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {(sortBy !== 'recent' || originFilter !== 'all') && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#9ecc3b]" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 pt-2">
        {isTripsScreenLoading ? (
          <ItineraryListSkeleton count={3} />
        ) : activeTab === 'private' ? (
          /* Aba: Roteiros Pessoais */
          filteredPersonalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F4F4F5] flex items-center justify-center mb-3 text-[#8E8E93]">
                <Icon name="map" size={28} />
              </div>
              <h3 className="text-[16px] font-bold text-[#1A1C40] mb-1">
                {searchQuery ? 'Nenhum roteiro encontrado' : 'Você ainda não tem roteiros'}
              </h3>
              <p className="text-[13px] text-[#8E8E93] max-w-xs mb-5">
                {searchQuery
                  ? 'Tente buscar por outro termo ou limpe os filtros.'
                  : 'Comece a planejar sua próxima aventura agora mesmo.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={onCreateItinerary}
                  className="px-5 py-2.5 rounded-full bg-[#9ecc3b] text-[#1A1C40] text-[13px] font-bold shadow-sm active:scale-95 transition-all"
                >
                  Criar meu primeiro roteiro
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPersonalList.map((item) => (
                <PersonalItineraryCard
                  key={item.id}
                  item={item}
                  isSwiped={swipedItemId === item.id}
                  onSwipeOpen={() => setSwipedItemId(item.id)}
                  onSwipeClose={() => setSwipedItemId(null)}
                  onClick={() => {
                    if (item._userItinerary && onUserItineraryClick) {
                      onUserItineraryClick(item._userItinerary);
                    } else if (onPrivateItineraryClick) {
                      onPrivateItineraryClick(Number(item.id));
                    } else {
                      onItineraryClick(Number(item.id));
                    }
                  }}
                  onDelete={() =>
                    setShowDeleteConfirm({
                      id: item.id,
                      title: item.title,
                      isUser: !!item._userItinerary,
                      isShared: !!item.isShared,
                    })
                  }
                  renderCountdownTag={renderCountdownTag}
                />
              ))}
            </div>
          )
        ) : (
          /* Aba: Roteiros Publicados */
          filteredPublicList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F4F4F5] flex items-center justify-center mb-3 text-[#8E8E93]">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-[16px] font-bold text-[#1A1C40] mb-1">
                Nenhum roteiro publicado
              </h3>
              <p className="text-[13px] text-[#8E8E93] max-w-xs mb-5">
                Crie um roteiro para vender e transforme suas experiências de viagem em renda.
              </p>
              <button
                onClick={onCreateItinerary}
                className="px-5 py-2.5 rounded-full bg-[#9ecc3b] text-[#1A1C40] text-[13px] font-bold shadow-sm active:scale-95 transition-all"
              >
                Criar roteiro para vender
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPublicList.map((item) => (
                <PublishedItineraryCard
                  key={item.id}
                  item={item}
                  onClick={() => {
                    if (item._userItinerary && onUserPublicItineraryClick) {
                      onUserPublicItineraryClick(item._userItinerary);
                    } else if (item._userItinerary && onUserItineraryClick) {
                      onUserItineraryClick(item._userItinerary);
                    }
                  }}
                />
              ))}
            </div>
          )
        )}
      </main>

      {/* Delete Confirmation Sheet */}
      {showDeleteConfirm && (
        <BottomSheet
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          title={showDeleteConfirm.isShared ? 'Sair do roteiro' : 'Excluir roteiro'}
        >
          <div className="p-6 text-center">
            <p className="text-[14px] text-[#8E8E93] mb-6">
              Tem certeza que deseja {showDeleteConfirm.isShared ? 'sair de' : 'excluir'} "
              <strong className="text-[#1A1C40]">{showDeleteConfirm.title}</strong>"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3.5 rounded-2xl bg-[#F4F4F5] text-[#1A1C40] text-[14px] font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  handleDelete(
                    showDeleteConfirm.id,
                    showDeleteConfirm.isUser,
                    showDeleteConfirm.isShared
                  )
                }
                className="flex-1 py-3.5 rounded-2xl bg-[#DC2626] text-white text-[14px] font-semibold"
              >
                {showDeleteConfirm.isShared ? 'Sair' : 'Excluir'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Sort & Filter Sheet */}
      {showSortSheet && (
        <BottomSheet
          isOpen={showSortSheet}
          onClose={() => setShowSortSheet(false)}
          title="Filtros e ordenação"
        >
          <div className="p-6 space-y-6">
            {activeTab === 'private' && (
              <div>
                <label className="text-[13px] font-bold text-[#1A1C40] uppercase tracking-wider block mb-3">
                  Origem
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {originOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setOriginFilter(opt.id)}
                      className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold transition-all text-left ${originFilter === opt.id
                          ? 'bg-[#1A1C40] text-white'
                          : 'bg-[#F4F4F5] text-[#1A1C40] hover:bg-[#ECECED]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[13px] font-bold text-[#1A1C40] uppercase tracking-wider block mb-3">
                Ordenar por
              </label>
              <div className="space-y-2">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSortBy(opt.id);
                      setShowSortSheet(false);
                    }}
                    className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-[14px] font-medium transition-all ${sortBy === opt.id
                        ? 'bg-[#1A1C40] text-white'
                        : 'bg-[#F4F4F5] text-[#1A1C40] hover:bg-[#ECECED]'
                      }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.id && <Icon name="check" size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// Card do Roteiro Pessoal (Figma: Frame 1321316171 / 1321316194)
function PersonalItineraryCard({
  item,
  isSwiped,
  onSwipeOpen,
  onSwipeClose,
  onClick,
  onDelete,
  renderCountdownTag,
}: {
  item: any;
  isSwiped: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  onClick: () => void;
  onDelete: () => void;
  renderCountdownTag: (daysRemaining: number, isPast: boolean, isInProgress?: boolean) => React.ReactNode;
}) {
  const x = useMotionValue(0);
  const DELETE_WIDTH = 80;
  const dragThreshold = 40;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -dragThreshold) {
      onSwipeOpen();
      x.set(-DELETE_WIDTH);
    } else {
      onSwipeClose();
      x.set(0);
    }
  };

  useEffect(() => {
    if (!isSwiped) x.set(0);
  }, [isSwiped, x]);

  return (
    <div className="relative pb-[24px] border-b border-[#F2F2F2] last:border-b-0">
      {/* Botão de Excluir / Sair atrás (renderizado apenas quando arrastado para não vazar borda vermelha) */}
      {isSwiped && (
        <div className="absolute right-0 top-0 bottom-[24px] w-20 flex items-center justify-center bg-[#DC2626] rounded-2xl z-0">
          <button onClick={onDelete} className="flex flex-col items-center gap-1">
            <Icon
              name={item.isShared ? 'logout' : 'delete'}
              size={20}
              className="text-white"
            />
            <span className="text-[11px] font-medium text-white">
              {item.isShared ? 'Sair' : 'Excluir'}
            </span>
          </button>
        </div>
      )}

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!isSwiped) onClick();
          else onSwipeClose();
        }}
        className="flex gap-[15px] items-center bg-white active:scale-[0.99] transition-transform cursor-pointer relative z-10 w-full min-h-[117px]"
      >
        <TripThumbnail images={item.images} />

        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch h-[117px] py-0">
          <div className="flex flex-col gap-[4px]">
            <h3 className="font-semibold text-[16px] leading-[19px] text-[#1A1C40] truncate">
              {item.title}
            </h3>
            <p className="font-medium text-[14px] leading-[17px] text-[#555555] truncate">
              {item.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-[12px]">
            <p className="font-medium text-[14px] leading-[17px] text-[#7F7F7F] truncate">
              {item.dateRange}
            </p>

            <div className="flex items-center gap-[16px] h-[32px]">
              <AvatarStack participants={item.participants} />
              {renderCountdownTag(item.daysRemaining, item.isPast, item.isInProgress)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Card do Roteiro Publicado (Figma)
function PublishedItineraryCard({
  item,
  onClick,
}: {
  item: any;
  onClick: () => void;
}) {
  const getStatusBadge = (status: 'Ativo' | 'Rascunho' | 'Pausado') => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#3C8622] text-[#3C8622] bg-white text-[12px] font-medium leading-[14px]">
            Ativo
          </span>
        );
      case 'Rascunho':
        return (
          <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#3587F2] text-[#2865B6] bg-white text-[12px] font-medium leading-[14px]">
            Rascunho
          </span>
        );
      case 'Pausado':
        return (
          <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#555555] text-[#555555] bg-white text-[12px] font-medium leading-[14px]">
            Pausado
          </span>
        );
    }
  };

  const formattedPrice = item.priceCents
    ? `R$ ${(item.priceCents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
    : 'R$ 29,90';

  return (
    <div
      onClick={onClick}
      className="flex gap-[15px] items-center bg-white pb-[24px] border-b border-[#F2F2F2] last:border-b-0 active:scale-[0.99] transition-transform cursor-pointer w-full min-h-[117px]"
    >
      <TripThumbnail images={item.images} />

      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch h-[117px] py-0">
        <div className="flex flex-col gap-[4px]">
          <h3 className="font-semibold text-[16px] leading-[19px] text-[#1A1C40] truncate">
            {item.title}
          </h3>

          <div className="flex items-center gap-3 text-[13px] text-[#6B7280]">
            <div className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span>{item.salesCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{item.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>{item.likesCount}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-[#1A1C40]">{formattedPrice}</span>
          <div>{getStatusBadge(item.status)}</div>
        </div>
      </div>
    </div>
  );
}