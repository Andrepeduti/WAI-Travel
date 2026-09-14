import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, animate } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { ShoppingBag, Star, Heart, Mic, SlidersHorizontal, Plus, Trash2, LogOut } from 'lucide-react';
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
import { TripsFilterScreen } from '@/components/screens/TripsFilterScreen';
import { EmptyItinerariesIllustration } from '@/components/travel/EmptyItinerariesIllustration';
import { DeleteConfirmSheet } from '@/components/travel/DeleteConfirmSheet';

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


let cachedMemberAvatars: Record<string, any[]> = {};

interface TripsScreenProps {
  onItineraryClick: (id: number) => void;
  onPrivateItineraryClick?: (id: number) => void;
  onUserItineraryClick?: (itinerary: UserItinerary) => void;
  /** Open a user-published itinerary inside the marketplace ("for sale") view. */
  onUserPublicItineraryClick?: (itinerary: UserItinerary) => void;
  onCollectionClick: (id: number) => void;
  /** Triggered from the empty state or + button */
  onCreateItinerary?: (type?: 'personal' | 'seller') => void;
  onBecomeCreator?: () => void;
  onExplore?: () => void;
  onUpgrade?: () => void;
  itineraryUsedCount?: number;
  itineraryLimit?: number;
  defaultTab?: TabType;
  onOpenCreateSheet?: () => void;
}

// Single cover image thumbnail (Figma: width 95px, height 117px, border-radius 8px)
function TripThumbnail({ images, className }: { images: string[], className?: string }) {
  const cover = images.find((image) => image && !image.startsWith('blob:')) || GENERIC_TRAVEL_PLACEHOLDER;
  return (
    <div className={`rounded-[8px] overflow-hidden flex-shrink-0 bg-muted ${className || "w-[95px] h-[117px] min-w-[95px] min-h-[117px]"}`}>
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
  onOpenCreateSheet,
  defaultTab = 'private',
  onDeleteSuccess,
  onLeaveSuccess,
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

  // Minhas viagens (inclui criados como pessoais e os híbridos publicados depois)
  const mergedPrivateItineraries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userCards = userItineraries
      .filter((ui) => ui.isPersonal !== false && !ui.deletedAt)
      .map((ui) => {
        const parsedStart = parseLocalDate(ui.startDate);
        const parsedEnd = parseLocalDate(ui.endDate);
        const isFlexible = ui.isFlexible || false;
        const isCancelled = ui.status === 'suspended' || false;

        const start = parsedStart ? new Date(parsedStart) : (parsedEnd ? new Date(parsedEnd) : new Date(today));
        const end = parsedEnd ? new Date(parsedEnd) : (parsedStart ? new Date(parsedStart) : new Date(today));
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const durationDays = Math.max(1, differenceInDays(end, start) + 1);
        const daysRemaining = parsedStart ? differenceInCalendarDays(start, today) : 999999;
        const isPast = !isCancelled && !isFlexible && !!parsedEnd && end < today;
        const isInProgress = !isCancelled && !isFlexible && !isPast && !!parsedStart && today >= start && today <= end;
        const formatShortDate = (d: Date) => {
          const day = format(d, 'd');
          const monthMap: Record<number, string> = {
            0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
            6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez'
          };
          return `${day} ${monthMap[d.getMonth()]}`;
        };
        const dateRange = isFlexible || !parsedStart
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
          startDateObj: parsedStart ? start : null,
          endDateObj: parsedEnd ? end : null,
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

        let status: 'Ativo' | 'Rascunho' | 'Pausado' = 'Ativo';
        if (ui.status === 'suspended' || ui.isPaused) {
          status = 'Pausado';
        } else if (ui.status === 'draft') {
          status = 'Rascunho';
        }

        return {
          id: ui.id as string | number,
          title: ui.title,
          images,
          priceCents: ui.priceCents,
          salesCount,
          rating: 0,
          likesCount: 0,
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
          if (a.isInProgress && !b.isInProgress) return -1;
          if (!a.isInProgress && b.isInProgress) return 1;
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;
          return a.daysRemaining - b.daysRemaining;
        });
        break;
      case 'days-desc':
        sorted.sort((a, b) => {
          if (a.isInProgress && !b.isInProgress) return -1;
          if (!a.isInProgress && b.isInProgress) return 1;
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

          // 2. Roteiros com data de concluído sempre por último
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;

          // Se ambos estão em andamento: início mais próximo no topo
          if (a.isInProgress && b.isInProgress) {
            const timeA = a.startDateObj ? a.startDateObj.getTime() : 0;
            const timeB = b.startDateObj ? b.startDateObj.getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            const endA = a.endDateObj ? a.endDateObj.getTime() : 0;
            const endB = b.endDateObj ? b.endDateObj.getTime() : 0;
            return endA - endB;
          }

          // Se ambos estão concluídos: mais recentemente concluído no topo dos concluídos
          if (a.isPast && b.isPast) {
            const endA = a.endDateObj ? a.endDateObj.getTime() : 0;
            const endB = b.endDateObj ? b.endDateObj.getTime() : 0;
            if (endA !== endB) return endB - endA;
            const timeA = a.startDateObj ? a.startDateObj.getTime() : 0;
            const timeB = b.startDateObj ? b.startDateObj.getTime() : 0;
            return timeB - timeA;
          }

          // 3. Roteiros futuros: data mais próxima em cima dos de data mais distante
          const timeA = !a.isFlexible && a.startDateObj ? a.startDateObj.getTime() : Infinity;
          const timeB = !b.isFlexible && b.startDateObj ? b.startDateObj.getTime() : Infinity;
          if (timeA !== timeB) return timeA - timeB;

          // Desempate por data de criação mais recente
          const createdA = a._userItinerary?.createdAt ? new Date(a._userItinerary.createdAt).getTime() : 0;
          const createdB = b._userItinerary?.createdAt ? new Date(b._userItinerary.createdAt).getTime() : 0;
          return createdB - createdA;
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
        if (onLeaveSuccess) {
          onLeaveSuccess();
        } else {
          toast.success('Você saiu do roteiro.');
        }
      } else if (isUser && typeof id === 'string') {
        await removeItinerary(id);
        if (onDeleteSuccess) {
          onDeleteSuccess();
        } else {
          toast.success('Roteiro excluído com sucesso.');
        }
      }
      setShowDeleteConfirm(null);
      setSwipedItemId(null);
    },
    [removeItinerary, onDeleteSuccess, onLeaveSuccess]
  );

  // Regra de cores para tag de contagem regressiva (Figma: height 24px, padding 4px 12px, border-radius 9px)
  const renderCountdownTag = (daysRemaining: number, isPast: boolean, isInProgress?: boolean, isFlexible?: boolean) => {
    if (isFlexible) return null;
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
    <div className="min-h-[100dvh] pb-28 bg-[#FFFFFF] font-sans">
      {/* Top Header */}
      <header 
        className="px-6 pb-8 flex items-center justify-between"
        style={{ paddingTop: 'calc(max(24px, env(safe-area-inset-top) + 16px))' }}
      >
        <h1 className="text-[26px] font-bold text-[#1A1C40] tracking-tight">Roteiros</h1>
        <button
          onClick={() => onOpenCreateSheet ? onOpenCreateSheet() : onCreateItinerary?.()}
          aria-label="Criar novo roteiro"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#9ecc3b] text-[#1A1C40] hover:opacity-90 active:scale-95 transition-all shadow-sm flex-shrink-0"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#F0F0F0]">
        <div className="flex w-full px-6">
          <button
            onClick={() => {
              setActiveTab('private');
              setSearchQuery('');
            }}
            className={`flex-1 pb-3 text-center text-[15px] transition-all relative whitespace-nowrap ${activeTab === 'private' ? 'font-semibold text-[#1A1C40]' : 'font-medium text-[#8E8E93] hover:text-[#1A1C40]'
              }`}
          >
            Minhas viagens
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
            className={`flex-1 pb-3 text-center text-[15px] transition-all relative whitespace-nowrap ${activeTab === 'public' ? 'font-semibold text-[#1A1C40]' : 'font-medium text-[#8E8E93] hover:text-[#1A1C40]'
              }`}
          >
            Minha loja
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
      {(
        (activeTab === 'private' ? mergedPrivateItineraries.length > 0 : mergedPublicItineraries.length > 0) ||
        searchQuery ||
        originFilter !== 'all'
      ) && (
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-[#F4F4F5] rounded-[10px] px-3.5 py-2.5 transition-colors focus-within:ring-1 focus-within:ring-[#1A1C40]/20">
                <Icon name="search" size={18} className="text-[#8E8E93] mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busque por um roteiro..."
                  className="flex-1 bg-transparent text-[14px] text-[#1A1C40] placeholder:text-[#8E8E93] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-[#8E8E93] hover:text-[#1A1C40]"
                  >
                    <Icon name="close" size={16} />
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
        )}

      {/* Main Content */}
      <main className="px-6 pt-2">
        {isTripsScreenLoading ? (
          <ItineraryListSkeleton count={3} />
        ) : activeTab === 'private' ? (
          /* Aba: Minhas viagens */
          filteredPersonalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {searchQuery ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-[#F4F4F5] flex items-center justify-center mb-3 text-[#8E8E93]">
                    <Icon name="map" size={28} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1A1C40] mb-1">
                    Nenhum roteiro encontrado
                  </h3>
                  <p className="text-[13px] text-[#8E8E93] max-w-xs mb-5">
                    Tente buscar por outro termo ou limpe os filtros.
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-6 mt-6">
                  {/* Image container */}
                  <div className="flex items-center justify-center">
                    <img src="/empty-store.png" alt="Nenhum roteiro" className="w-[126px] h-[168px] object-contain" />
                  </div>

                  {/* Text & Button Group */}
                  <div className="flex flex-col items-center gap-4">
                    {/* Texts */}
                    <div className="flex flex-col items-center gap-2">
                      <h3 className="text-[18px] font-semibold text-[#141530] leading-[22px]">
                        Você ainda não tem roteiros
                      </h3>
                      <p className="text-[14px] font-medium text-[#7F7F7F] max-w-[260px] text-center leading-[16px]">
                        Crie seu próximo roteiro e organize sua viagem do seu jeito.
                      </p>
                    </div>

                    {/* Button */}
                    <button
                      onClick={() => onCreateItinerary?.('personal')}
                      className="flex flex-row justify-center items-center px-4 py-3 gap-2 min-w-[141px] h-[48px] rounded-[12px] border border-[#141530] text-[#141530] text-[16px] font-bold leading-[19px] hover:bg-[#141530]/5 active:scale-95 transition-all shadow-none"
                    >
                      Criar viagem pessoal
                    </button>
                  </div>
                </div>
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {searchQuery ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-[#F4F4F5] flex items-center justify-center mb-3 text-[#8E8E93]">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1A1C40] mb-1">
                    Nenhum roteiro encontrado
                  </h3>
                  <p className="text-[13px] text-[#8E8E93] max-w-xs mb-5">
                    Tente buscar por outro termo ou limpe os filtros.
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-6 mt-6">
                  {/* Image container */}
                  <div className="flex items-center justify-center">
                    <img src="/empty-store.png" alt="Nenhum roteiro" className="w-[126px] h-[168px] object-contain scale-x-[-1]" />
                  </div>

                  {/* Text & Button Group */}
                  <div className="flex flex-col items-center gap-4">
                    {/* Texts */}
                    <div className="flex flex-col items-center gap-2">
                      <h3 className="text-[18px] font-semibold text-[#141530] leading-[22px]">
                        Você ainda não tem roteiros à venda
                      </h3>
                      <p className="text-[14px] font-medium text-[#7F7F7F] max-w-[249px] text-center leading-[16px]">
                        Crie um roteiro para sua loja e publique quando estiver pronto para vender.
                      </p>
                    </div>

                    {/* Button */}
                    <button
                      onClick={() => onCreateItinerary?.('seller')}
                      className="flex flex-row justify-center items-center px-4 py-3 gap-2 min-w-[141px] h-[48px] rounded-[12px] border border-[#141530] text-[#141530] text-[16px] font-bold leading-[19px] hover:bg-[#141530]/5 active:scale-95 transition-all shadow-none"
                    >
                      Criar roteiro pra venda
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPublicList.map((item) => (
                <PublishedItineraryCard
                  key={item.id}
                  item={item}
                  onClick={() => {
                    if (!item._userItinerary) return;
                    if (item._userItinerary.status === 'draft') {
                      if (onUserItineraryClick) {
                        onUserItineraryClick(item._userItinerary);
                      }
                    } else {
                      if (onUserPublicItineraryClick) {
                        onUserPublicItineraryClick(item._userItinerary);
                      } else if (onUserItineraryClick) {
                        onUserItineraryClick(item._userItinerary);
                      }
                    }
                  }}
                />
              ))}
            </div>
          )
        )}
      </main>

      {/* Delete Confirmation Sheet */}
      <DeleteConfirmSheet
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title={showDeleteConfirm?.title}
        isShared={showDeleteConfirm?.isShared}
        onConfirm={() => {
          if (!showDeleteConfirm) return;
          handleDelete(
            showDeleteConfirm.id,
            showDeleteConfirm.isUser,
            showDeleteConfirm.isShared
          );
        }}
      />

      {/* Sort & Filter Screen */}
      {showSortSheet && (
        <TripsFilterScreen
          onClose={() => setShowSortSheet(false)}
          activeTab={activeTab}
          initialSortBy={sortBy}
          initialOriginFilter={originFilter}
          onApply={(newSortBy, newOriginFilter) => {
            setSortBy(newSortBy);
            setOriginFilter(newOriginFilter);
            setShowSortSheet(false);
          }}
        />
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
  renderCountdownTag: (daysRemaining: number, isPast: boolean, isInProgress?: boolean, isFlexible?: boolean) => React.ReactNode;
}) {
  const x = useMotionValue(0);
  // Garante que o botão vermelho só tenha opacidade quando o card começar a se mover para a esquerda
  const deleteOpacity = useTransform(x, [-12, -2, 0], [1, 1, 0]);
  const DELETE_WIDTH = 84;
  const dragThreshold = 30;

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Sensibilidade imediata: arrasto além de 30px ou flick rápido
    const shouldOpen = info.offset.x < -dragThreshold || (info.velocity.x < -200 && info.offset.x < -5);
    if (shouldOpen) {
      animate(x, -DELETE_WIDTH, { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 });
      onSwipeOpen();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 });
      onSwipeClose();
    }
  };

  useEffect(() => {
    if (!isSwiped) {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 });
    } else {
      animate(x, -DELETE_WIDTH, { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 });
    }
  }, [isSwiped, x]);

  return (
    <div className="relative pb-[24px] border-b border-[#F2F2F2] last:border-b-0 overflow-hidden select-none">
      {/* Botão de Excluir / Sair atrás (opacidade controlada para nunca vazar bordas quando parado) */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute right-0 top-0 h-[117px] w-[84px] flex items-center justify-center bg-[#DC2626] rounded-2xl z-0 pointer-events-auto"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-full h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
          aria-label={item.isShared ? 'Sair do roteiro' : 'Excluir roteiro'}
        >
          <Icon
            name={item.isShared ? 'logout' : 'delete'}
            size={22}
            className="text-white"
          />
          <span className="text-[12px] font-semibold text-white">
            {item.isShared ? 'Sair' : 'Excluir'}
          </span>
        </button>
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!isSwiped) onClick();
          else onSwipeClose();
        }}
        className="flex gap-[15px] items-center bg-white cursor-pointer relative z-10 w-full min-h-[117px]"
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
              {renderCountdownTag(item.daysRemaining, item.isPast, item.isInProgress, item.isFlexible)}
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
          <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#646464] text-[#646464] bg-white text-[12px] font-medium leading-[14px]">
            Rascunho
          </span>
        );
      case 'Pausado':
        return (
          <span className="inline-flex items-center justify-center h-[24px] px-[12px] py-[4px] rounded-[9px] border border-[#D8911E] text-[#D8911E] bg-white text-[12px] font-medium leading-[14px]">
            Pausado
          </span>
        );
    }
  };

  const salesStr = (item.salesCount === 0 || item.salesCount == null) ? '-' : `${item.salesCount} vendas`;
  const ratingStr = (item.rating === 0 || item.rating == null) ? '-' : String(item.rating).replace('.', ',');
  const likesStr = (item.likesCount === 0 || item.likesCount == null) ? '-' : item.likesCount;

  const formattedPrice = item.priceCents
    ? `R$ ${(item.priceCents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
    : '-';

  return (
    <div
      onClick={onClick}
      className="flex gap-[16px] items-center bg-white pb-[24px] border-b border-[#F2F2F2] last:border-b-0 active:scale-[0.99] transition-transform cursor-pointer w-full"
    >
      <TripThumbnail images={item.images} className="w-[95px] h-[94px] min-w-[95px] min-h-[94px]" />

      <div className="flex-1 min-w-0 flex flex-col justify-center h-[94px] gap-[16px]">
        <div className="flex flex-col gap-[12px]">
          <h3 className="font-semibold text-[16px] leading-[19px] text-[#1A1C40] truncate">
            {item.title}
          </h3>

          <div className="flex items-center gap-[16px]">
            <div className="flex items-center gap-1">
              <Star className="w-[17px] h-[17px] text-[#FDAC2A] stroke-[1.5]" />
              <span className="text-[14px] font-medium text-[#646464] leading-[17px] font-['Urbanist',sans-serif]">{ratingStr}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-[17px] h-[17px] text-[#DA501F] stroke-[1.5]" />
              <span className="text-[14px] font-medium text-[#646464] leading-[17px] font-['Urbanist',sans-serif]">{likesStr}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="w-[16px] h-[16px] text-[#141530] stroke-[1.5]" />
              <span className="text-[14px] font-medium text-[#646464] leading-[17px] font-['Urbanist',sans-serif]">{salesStr}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[12px]">
          <span className="text-[14px] font-medium text-[#141530] font-['Urbanist',sans-serif]">{formattedPrice}</span>
          {getStatusBadge(item.status)}
        </div>
      </div>
    </div>
  );
}