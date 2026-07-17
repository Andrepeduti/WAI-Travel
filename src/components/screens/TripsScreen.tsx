import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { Crown, Users, ShoppingBag } from 'lucide-react';
import { CreateCollectionSheet } from '../travel/CreateCollectionSheet';
import { BottomSheet } from '../ui/BottomSheet';
import { format, differenceInDays } from 'date-fns';
import { parseLocalDate } from '@/lib/localDate';
import { ptBR } from 'date-fns/locale';
import { resolveTripThumbnailImages, GENERIC_TRAVEL_PLACEHOLDER } from '@/lib/coverImageResolver';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { type UserItinerary, fetchItineraryMemberAvatars, leaveItinerary } from '@/lib/itinerariesApi';
import { toast } from 'sonner';
import { collectionsListKey, collectionsDataKey, readJSON, writeJSON } from '@/lib/userScopedStorage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PURCHASES_CHANGED_EVENT } from '@/lib/purchasesApi';
import { ItineraryListSkeleton } from '@/components/ui/LoadingShimmers';
import { isItineraryPaused } from '@/lib/itineraryPauseState';

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

// UserItinerary type is now imported from '@/lib/itinerariesApi' (see top of file).
// Itinerary persistence moved from localStorage to Supabase. Use useMyItineraries()
// for reads, and createItinerary/updateItinerary/deleteItinerary for writes.

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

type SortOption = 'az' | 'za' | 'days-asc' | 'days-desc' | 'recent' | 'oldest';
type OriginFilter = 'all' | 'mine' | 'shared' | 'purchased';

const sortOptions: { id: SortOption; label: string; shortLabel: string }[] = [
  { id: 'az', label: 'Ordem alfabética (A–Z)', shortLabel: 'A–Z' },
  { id: 'za', label: 'Ordem alfabética (Z–A)', shortLabel: 'Z–A' },
  { id: 'days-asc', label: 'Dias restantes: menor → maior', shortLabel: 'Dias restantes ↑' },
  { id: 'days-desc', label: 'Dias restantes: maior → menor', shortLabel: 'Dias restantes ↓' },
  { id: 'recent', label: 'Mais recentes', shortLabel: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigos', shortLabel: 'Mais antigos' },
];

const originOptions: { id: OriginFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'mine', label: 'Meus roteiros' },
  { id: 'shared', label: 'Compartilhados comigo' },
  { id: 'purchased', label: 'Comprados' },
];

const privateItineraries: any[] = [];

const publicItineraries: any[] = [];

const favoriteItineraries: any[] = [];

const collections = [{
  id: 2,
  title: 'Paris',
  itemCount: 23,
  isFavorites: false,
  isPrivate: false,
  images: [
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400'
  ],
  participants: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
  ]
}, {
  id: 3,
  title: 'Rio de Janeiro',
  itemCount: 15,
  isFavorites: false,
  isPrivate: true,
  images: [
    'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400'
  ],
  participants: []
}, {
  id: 4,
  title: 'Inverno Europeu',
  itemCount: 31,
  isFavorites: false,
  isPrivate: false,
  images: [
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400',
    'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=400',
    'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=400',
    'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=400'
  ],
  participants: [
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
  ]
}, {
  id: 5,
  title: 'Tóquio & Kyoto',
  itemCount: 18,
  isFavorites: false,
  isPrivate: true,
  images: [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400'
  ],
  participants: []
}];

let cachedMemberAvatars: Record<string, string[]> = {};

type TabType = 'private' | 'public' | 'favorites' | 'collections';

interface TripsScreenProps {
  onItineraryClick: (id: number) => void;
  onPrivateItineraryClick?: (id: number) => void;
  onUserItineraryClick?: (itinerary: UserItinerary) => void;
  /** Open a user-published itinerary inside the marketplace ("for sale") view. */
  onUserPublicItineraryClick?: (itinerary: UserItinerary) => void;
  onCollectionClick: (id: number) => void;
  /** Triggered from the empty state on the "Privados" tab. */
  onCreateItinerary?: () => void;
  /** Triggered from the empty state on the "Públicos" tab. */
  onBecomeCreator?: () => void;
  /** Triggered from the empty state on the "Favoritos" tab — opens the Explore screen. */
  onExplore?: () => void;
  /** Navigate to the subscription/upgrade screen. */
  onUpgrade?: () => void;
  /** Quantos roteiros criados pelo próprio usuário já existem (para o chip de limite). */
  itineraryUsedCount?: number;
  /** Limite total do plano (free=3). */
  itineraryLimit?: number;
  defaultTab?: TabType;
}

// Single cover image thumbnail (square 1:1)
function TripThumbnail({ images }: { images: string[] }) {
  const cover = images.find((image) => image && !image.startsWith('blob:')) || GENERIC_TRAVEL_PLACEHOLDER;
  return (
    <div className="w-24 h-full aspect-square rounded-2xl overflow-hidden flex-shrink-0">
      <img
        src={cover}
        alt=""
        className="w-full h-full object-cover bg-muted"
      />
    </div>
  );
}

// Component for avatar stack
function AvatarStack({ participants }: { participants: string[] }) {
  const maxVisible = 4;
  const visible = participants.slice(0, maxVisible);
  const extraCount = Math.max(0, participants.length - maxVisible);

  return (
    <div className="flex -space-x-2">
      {visible.map((avatar, index) => (
        <img 
          key={index}
          src={avatar} 
          alt=""
          className="w-7 h-7 rounded-full border-2 border-white object-cover"
        />
      ))}
      {extraCount > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-white bg-muted flex items-center justify-center">
          <span className="text-[10px] font-semibold text-muted-foreground">
            +{extraCount}
          </span>
        </div>
      )}
    </div>
  );
}

// Section divider for upcoming vs past trips
function SectionHeader({
  icon,
  label,
  count,
  variant,
}: {
  icon: string;
  label: string;
  count: number;
  variant: 'upcoming' | 'past';
}) {
  const isUpcoming = variant === 'upcoming';
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[15px] font-bold text-foreground">{label}</h2>
      <span className="text-[13px] font-medium text-muted-foreground">
        {count}
      </span>
      <div className="flex-1 h-px bg-border ml-1" />
    </div>
  );
}

// Swipeable itinerary card with delete action
function SwipeableItineraryCard({
  item,
  isPrivate,
  isShared,
  isSwiped,
  onSwipeOpen,
  onSwipeClose,
  onClick,
  onDelete,
  getDaysRemainingStyle,
}: {
  item: any;
  isPrivate: boolean;
  isShared: boolean;
  isSwiped: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  onClick: () => void;
  onDelete: () => void;
  getDaysRemainingStyle: (days: number) => string;
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
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action behind: Excluir (dono) ou Sair (participante) */}
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-destructive rounded-r-2xl">
        <button onClick={onDelete} className="flex flex-col items-center gap-1">
          <Icon name={isShared ? 'logout' : 'delete'} size={22} className="text-destructive-foreground" />
          <span className="text-[11px] font-medium text-destructive-foreground">{isShared ? 'Sair' : 'Excluir'}</span>
        </button>
      </div>

      {/* Draggable card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="flex gap-4 items-stretch bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] relative z-10"
      >
        <button onClick={() => { if (!isSwiped) onClick(); else onSwipeClose(); }} className="flex-shrink-0 self-stretch">
          <div className={`h-full ${item.isPast ? 'grayscale-[0.6] opacity-80 transition' : ''}`}>
            <TripThumbnail images={item.images} />
          </div>
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <button onClick={() => { if (!isSwiped) onClick(); else onSwipeClose(); }} className="text-left min-w-0">
            <h3 className={`font-semibold text-[16px] leading-tight truncate ${item.isPast ? 'text-muted-foreground' : 'text-[#1A1C40]'}`}>
              {item.title}
            </h3>
          </button>
          {isPrivate ? (
            <>
              <p className="text-[12px] font-medium text-muted-foreground">
                {item.dateRange} <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground mx-1 align-middle" /> {item.places} lugares
              </p>
              {item.participants && item.participants.length > 0 && (
                <AvatarStack participants={item.participants} />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {item.isPast ? (
                  <span className="h-7 inline-flex items-center gap-1 text-[12px] font-medium px-3 rounded-2xl bg-[#F2F2F2] text-[#8E8E93]">
                    <Icon name="check_circle" size={14} className="text-[#8E8E93]" />
                    Concluída
                  </span>
                ) : item.isFlexible ? null : (
                  <span className={`h-7 inline-flex items-center text-[12px] font-medium px-3 rounded-2xl ${getDaysRemainingStyle(item.daysRemaining)}`}>
                    Em {item.daysRemaining} dias
                  </span>
                )}
                {item.isPurchased ? (
                  <span
                    title="Comprado"
                    aria-label="Comprado"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-2xl text-[#8E8E93] bg-[#F2F2F2]"
                  >
                    <ShoppingBag size={14} className="text-[#8E8E93]" />
                  </span>
                ) : item.isShared ? (
                  <span
                    title="Compartilhado"
                    aria-label="Compartilhado"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-2xl text-[#8E8E93] bg-[#F2F2F2]"
                  >
                    <Users size={14} className="text-[#8E8E93]" />
                  </span>
                ) : (
                  <span
                    title="Criado por mim"
                    aria-label="Criado por mim"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-2xl text-[#8E8E93] bg-[#F2F2F2]"
                  >
                    <Crown size={14} className="text-[#8E8E93]" />
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              {(() => {
                const paused = isItineraryPaused(item.id);
                return (
                  <span
                    className="h-7 inline-flex items-center gap-1.5 self-start text-[12px] font-semibold px-2.5 rounded-2xl bg-[#F2F2F2]"
                    style={{ color: paused ? '#8A6D00' : '#3F7A0F' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: paused ? '#E0B400' : '#3F7A0F' }}
                    />
                    {paused ? 'Pausado' : 'Ativo'}
                  </span>
                );
              })()}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <Icon name="shopping_bag" size={14} className="text-muted-foreground" />
                  <span className="text-[12px] font-medium text-muted-foreground">
                    {(item.salesCount ?? 0).toLocaleString('pt-BR')} {item.salesCount === 1 ? 'venda' : 'vendas'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon name="star" size={14} className="text-amber-500" />
                  <span className="text-[12px] font-medium text-muted-foreground">
                    {item.rating ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon name="favorite" size={14} style={{ color: '#DA501F' }} />
                  <span className="text-[12px] font-medium text-muted-foreground">
                    {(item.favoritesCount ?? 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <p className="text-[14px] font-bold text-foreground mt-2">
                {item.priceCents != null
                  ? `R$ ${(item.priceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'Grátis'}
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Collection card with mosaic / cover / placeholder thumbnail
function CollectionCard({ 
  collection, 
  onClick, 
  isEditing, 
  isSelected, 
  onToggleSelect,
  onLongPress 
}: { 
  collection: typeof collections[0]; 
  onClick: () => void;
  isEditing: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onLongPress: () => void;
}) {
  const longPressTimer = { current: null as ReturnType<typeof setTimeout> | null };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (isEditing) {
      onToggleSelect();
    } else {
      onClick();
    }
  };

  const renderThumbnail = () => {
    const imgs = collection.images;
    if (imgs.length >= 4) {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px]">
          {imgs.slice(0, 4).map((img, i) => (
            <img key={i} src={img} alt="" className="w-full h-full object-cover" />
          ))}
        </div>
      );
    }
    if (imgs.length >= 2) {
      return (
        <div className="w-full h-full grid grid-cols-2 gap-[1px]">
          {imgs.slice(0, 2).map((img, i) => (
            <img key={i} src={img} alt="" className="w-full h-full object-cover" />
          ))}
        </div>
      );
    }
    if (imgs.length === 1) {
      return <img src={imgs[0]} alt={collection.title} className="w-full h-full object-cover" />;
    }
    return (
      <div className="w-full h-full bg-[#F2F2F2] flex items-center justify-center">
        <Icon name={collection.isFavorites ? "favorite" : "bookmark"} size={32} className="text-muted-foreground/25" />
      </div>
    );
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="w-full text-left active:scale-[0.97] transition-transform duration-150 relative"
    >
      {/* Image area — rounded top only */}
      <div className="relative w-full aspect-[4/3] rounded-t-[16px] overflow-hidden">
        {renderThumbnail()}

        {/* Edit mode check */}
        {isEditing && (
          <div className="absolute top-2.5 left-2.5">
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected ? 'bg-primary border-primary' : 'border-white bg-black/30'
            }`}>
              {isSelected && <Icon name="check" size={16} className="text-primary-foreground" />}
            </div>
          </div>
        )}
      </div>

      {/* Content area — solid background, no overlay */}
      <div className="bg-card rounded-b-[16px] border border-t-0 border-border/50 px-3 py-2.5">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-bold text-[14px] text-foreground leading-tight line-clamp-1">
            {collection.title}
          </h3>
          {collection.isPrivate && (
            <Icon name="lock" size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[12px] font-medium text-muted-foreground">
            {collection.itemCount} itens
          </p>
          {collection.participants.length > 0 && (
            <div className="flex -space-x-1.5">
              {collection.participants.slice(0, 3).map((avatar, i) => (
                <img key={i} src={avatar} alt="" className="w-5 h-5 rounded-full border-[1.5px] border-card object-cover" />
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function TripsScreen({
  onItineraryClick,
  onPrivateItineraryClick,
  onUserItineraryClick,
  onUserPublicItineraryClick,
  onCollectionClick,
  onCreateItinerary,
  onBecomeCreator,
  onExplore,
  onUpgrade,
  itineraryUsedCount,
  itineraryLimit,
  defaultTab = 'private'
}: TripsScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [isEditingCollections, setIsEditingCollections] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<number>>(new Set());
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('az');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const { favorites: favoriteItems, removeFavorite } = useFavorites();
  
  const tabs = [{
    id: 'private' as TabType,
    label: 'Meus roteiros'
  }, {
    id: 'public' as TabType,
    label: 'À venda'
  }, {
    id: 'favorites' as TabType,
    label: 'Favoritos'
  }, {
    id: 'collections' as TabType,
    label: 'Coleções'
  }];
  
  const { user: authUser } = useAuth();
  const [userCollections, setUserCollections] = useState<UserCollection[]>(() => getUserCollections());
  const { itineraries: userItineraries, loading: itinerariesLoading, remove: removeItinerary, refetch: refetchItineraries } = useMyItineraries();
  const [salesByItinerary, setSalesByItinerary] = useState<Record<string, number>>({});
  const [purchasedItineraryIds, setPurchasedItineraryIds] = useState<Set<string>>(new Set());
  const [purchasesVersion, setPurchasesVersion] = useState(0);

  // Recarrega vendas/compras quando uma nova compra é registrada em qualquer tela.
  useEffect(() => {
    const handler = () => setPurchasesVersion((v) => v + 1);
    window.addEventListener(PURCHASES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, handler);
  }, []);

  // Recarrega coleções sempre que o usuário ativo muda (login / logout / troca).
  useEffect(() => {
    setUserCollections(getUserCollections());
  }, [authUser?.id]);

  // Carrega contagem de vendas por roteiro (para a aba "À venda").
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
    return () => { cancelled = true; };
  }, [authUser?.id, userItineraries.length, purchasesVersion]);

  // Carrega quais roteiros do usuário foram comprados (buyer_id = user).
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
      setPurchasedItineraryIds(new Set((data as { itinerary_id: string }[]).map(r => r.itinerary_id)));
    })();
    return () => { cancelled = true; };
  }, [authUser?.id, userItineraries.length, purchasesVersion]);

  // Avatares reais (dono + membros aceitos) por roteiro — usados nos cards.
  const [memberAvatarsByItin, setMemberAvatarsByItin] = useState<Record<string, string[]>>(() => cachedMemberAvatars);
  useEffect(() => {
    const ids = userItineraries.map((u) => u.id).filter((id): id is string => typeof id === 'string');
    if (ids.length === 0) {
      if (Object.keys(cachedMemberAvatars).length > 0) {
        cachedMemberAvatars = {};
        setMemberAvatarsByItin({});
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const map = await fetchItineraryMemberAvatars(ids);
        if (!cancelled) {
          cachedMemberAvatars = map;
          setMemberAvatarsByItin(map);
        }
      } catch {
        /* silencioso */
      }
    })();
    return () => { cancelled = true; };
  }, [userItineraries]);

  const allCollections = useMemo(() => [...userCollections], [userCollections]);

  const mergedPrivateItineraries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Apenas roteiros privados ficam nesta aba; cópias à venda ficam em "Públicos".
    const userCards = userItineraries.filter(ui => !ui.isPublic).map(ui => {
      const start = parseLocalDate(ui.startDate) ?? new Date();
      const end = parseLocalDate(ui.endDate) ?? new Date();
      const isFlexible = ui.tags?.includes('_FLEXIBLE_DATES_') || false;
      const durationDays = differenceInDays(end, start) + 1;
      const daysRemaining = Math.max(0, differenceInDays(start, new Date()));
      const dateRange = isFlexible ? `Duração: ${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}` : `${format(start, "d 'de' MMM", { locale: ptBR })} - ${format(end, "d 'de' MMM", { locale: ptBR })}`;
      const validImages = ui.images.filter((image) => image && !image.startsWith('blob:'));
      const images = validImages.length > 0 ? validImages : resolveTripThumbnailImages(ui.destinations);
      return {
        id: ui.id as string | number,
        title: ui.title,
        dateRange,
        places: ui.places,
        daysRemaining,
        isPast: !isFlexible && end < today,
        isFlexible,
        images,
        participants: (typeof ui.id === 'string' && (memberAvatarsByItin[ui.id]?.length ?? 0) > 0)
          ? memberAvatarsByItin[ui.id]
          : ui.participants,
        isPurchased: (typeof ui.id === 'string' && purchasedItineraryIds.has(ui.id)) || (ui.sourceDatasetId != null && !ui.isPublic),
        // "Compartilhado" = sou membro mas não sou dono do roteiro.
        isShared: !!authUser?.id && ui.userId !== authUser.id,
        _userItinerary: ui,
      };
    });
    userCards.sort((a, b) => (parseLocalDate(a._userItinerary.startDate)?.getTime() ?? 0) - (parseLocalDate(b._userItinerary.startDate)?.getTime() ?? 0));
    return userCards;
  }, [userItineraries, purchasedItineraryIds, authUser?.id, memberAvatarsByItin]);

  const mergedPublicItineraries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const userPublicCards = userItineraries.filter(ui => ui.isPublic).map(ui => {
      const start = parseLocalDate(ui.startDate) ?? new Date();
      const end = parseLocalDate(ui.endDate) ?? new Date();
      const isFlexible = ui.tags?.includes('_FLEXIBLE_DATES_') || false;
      const durationDays = differenceInDays(end, start) + 1;
      const daysRemaining = Math.max(0, differenceInDays(start, new Date()));
      const dateRange = isFlexible ? `Duração: ${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}` : `${format(start, "d 'de' MMM", { locale: ptBR })} - ${format(end, "d 'de' MMM", { locale: ptBR })}`;
      const validImages = ui.images.filter((image) => image && !image.startsWith('blob:'));
      const images = validImages.length > 0 ? validImages : resolveTripThumbnailImages(ui.destinations);
      return {
        id: ui.id as string | number,
        title: ui.title,
        dateRange,
        places: ui.places,
        daysRemaining,
        isPast: !isFlexible && end < today,
        isFlexible,
        images,
        participants: ui.participants,
        priceCents: ui.priceCents ?? null,
        salesCount: salesByItinerary[ui.id] ?? 0,
        _userItinerary: ui,
      };
    });
    userPublicCards.sort((a, b) => (parseLocalDate(a._userItinerary.startDate)?.getTime() ?? 0) - (parseLocalDate(b._userItinerary.startDate)?.getTime() ?? 0));
    return userPublicCards;
  }, [userItineraries, salesByItinerary]);

  const currentItineraries = activeTab === 'private'
    ? mergedPrivateItineraries
    : mergedPublicItineraries;

  const filteredItineraries = useMemo(() => {
    if (activeTab !== 'private' || originFilter === 'all') return currentItineraries;
    return currentItineraries.filter((i: any) => {
      if (originFilter === 'mine') return !i.isShared && !i.isPurchased;
      if (originFilter === 'shared') return !!i.isShared;
      if (originFilter === 'purchased') return !!i.isPurchased;
      return true;
    });
  }, [currentItineraries, originFilter, activeTab]);

  const sortedItineraries = useMemo(() => {
    const sorted = [...filteredItineraries];
    switch (sortBy) {
      case 'az': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'za': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      case 'days-asc': sorted.sort((a, b) => a.daysRemaining - b.daysRemaining); break;
      case 'days-desc': sorted.sort((a, b) => b.daysRemaining - a.daysRemaining); break;
      case 'recent': sorted.sort((a, b) => String(b.id).localeCompare(String(a.id))); break;
      case 'oldest': sorted.sort((a, b) => String(a.id).localeCompare(String(b.id))); break;
    }
    return sorted;
  }, [filteredItineraries, sortBy]);

  // Refresh collections from localStorage on tab change. Itineraries auto-sync via realtime.
  useEffect(() => {
    if (activeTab === 'collections') {
      setUserCollections(getUserCollections());
    }
    if (activeTab === 'private') {
      refetchItineraries();
    }
  }, [activeTab, refetchItineraries]);

  const itemCount = activeTab === 'collections' ? allCollections.length : currentItineraries.length;
  const itemLabel = activeTab === 'collections' ? 'coleções' : 'roteiros';
  const activeSort = sortOptions.find(o => o.id === sortBy)!;

  const getDaysRemainingStyle = (days: number) => {
    if (days <= 7) {
      return 'bg-[#2563EB] text-white';
    }
    return 'bg-[#F2F2F2] text-[#8E8E93]';
  };

  const [swipedItemId, setSwipedItemId] = useState<string | number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string | number; title: string; isUser: boolean; isPurchased?: boolean; isShared?: boolean } | null>(null);

  const handleDeleteItinerary = useCallback(async (id: string | number, isUser: boolean, isShared?: boolean) => {
    if (isShared && typeof id === 'string') {
      await leaveItinerary(id);
      toast.success('Você saiu do roteiro.');
    } else if (isUser && typeof id === 'string') {
      await removeItinerary(id);
    }
    // For static itineraries we just hide them (could store deleted IDs)
    setShowDeleteConfirm(null);
    setSwipedItemId(null);
  }, [removeItinerary]);


  const toggleSelectCollection = useCallback((id: number) => {
    setSelectedCollections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterEditMode = useCallback(() => {
    setIsEditingCollections(true);
    setSelectedCollections(new Set());
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditingCollections(false);
    setSelectedCollections(new Set());
  }, []);

  // Vídeos importados recentemente — agregados de todas as coleções do usuário,
  // ordenados do mais recente para o mais antigo. A seção só aparece quando há
  // pelo menos 1 vídeo importado em qualquer coleção.
  const [videosTick, setVideosTick] = useState(0);
  useEffect(() => {
    const handler = () => setVideosTick(t => t + 1);
    window.addEventListener('collection:updated', handler);
    return () => window.removeEventListener('collection:updated', handler);
  }, []);
  const recentImportedVideos = useMemo<Array<{
    id: number;
    collectionId: number;
    title: string;
    author: string;
    cover: string;
    source: string;
    sourceIcon: string;
    link?: string;
  }>>(() => {
    const dataKey = collectionsDataKey();
    if (!dataKey) return [];
    const all = readJSON<Record<number, { videos?: Array<any> }>>(dataKey, {});
    const collected: Array<any> = [];
    for (const [cid, payload] of Object.entries(all)) {
      const vids = payload?.videos ?? [];
      for (const v of vids) {
        collected.push({
          id: v.id,
          collectionId: Number(cid),
          title: v.title,
          author: v.sourceLabel ?? '',
          cover: v.thumbnail,
          source: v.sourceLabel ?? 'Vídeo',
          sourceIcon: v.sourceIcon ?? 'videocam',
          link: v.link,
        });
      }
    }
    return collected.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videosTick, userCollections]);
  return <div className="min-h-screen pb-24 bg-[#F2F2F2]">
    {/* Header — fixed title */}
      <header className="px-6 pt-safe-top pb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="text-[22px] font-bold text-foreground">Roteiros e coleções</h1>
          <button
            onClick={() => setShowCreateSheet(true)}
            aria-label="Criar"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Icon name="add" size={20} className="text-primary-foreground" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-5 px-6 overflow-x-auto no-scrollbar">
          {tabs.map(tab => <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== 'collections') exitEditMode(); }} className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />}
            </button>)}
        </div>
      </div>

      {/* Content */}
      <main className={activeTab === 'collections' ? 'px-6 pt-5' : 'px-5 pt-4'}>
        {(activeTab === 'private' || activeTab === 'public') && itemCount > 0 && (() => {
          const limit = itineraryLimit ?? 0;
          const used = itineraryUsedCount ?? 0;
          const remaining = Math.max(limit - used, 0);
          const showLimitChip = activeTab === 'private' && limit > 0;
          const isReached = remaining === 0;
          const isWarning = remaining === 1;
          const chipText = isReached
            ? 'Limite atingido'
            : `Restam ${remaining} ${remaining === 1 ? 'roteiro' : 'roteiros'}`;
          const chipStyle = isReached
            ? { background: 'rgba(220, 38, 38, 0.1)', color: '#B91C1C', borderColor: 'rgba(220, 38, 38, 0.25)' }
            : isWarning
              ? { background: 'rgba(234, 88, 12, 0.1)', color: '#C2410C', borderColor: 'rgba(234, 88, 12, 0.25)' }
              : { background: '#F2F2F2', color: '#6B7280', borderColor: 'transparent' };
          return (
            <div className="flex items-center justify-between mb-4 gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {itemCount} {itemLabel}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {showLimitChip && (
                  <button
                    type="button"
                    onClick={() => onUpgrade?.()}
                    aria-label={`${chipText}. Toque para ver planos.`}
                    className="inline-flex items-center h-7 px-3 rounded-full border text-xs font-semibold transition-transform active:scale-95"
                    style={chipStyle}
                  >
                    {chipText}
                  </button>
                )}
                <button
                  onClick={() => setShowSortSheet(true)}
                  className="relative w-9 h-9 flex items-center justify-center border border-border rounded-full hover:bg-muted/50 transition-colors flex-shrink-0"
                >
                  <Icon name="tune" size={18} className="text-foreground" />
                  {(sortBy !== 'az' || (activeTab === 'private' && originFilter !== 'all')) && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                  )}
                </button>
              </div>
            </div>
          );
        })()}


        {/* Private / Public Itineraries List */}
        {(activeTab === 'private' || activeTab === 'public') && (() => {
          const upcoming = activeTab === 'private'
            ? sortedItineraries.filter((i: any) => !i.isPast)
            : sortedItineraries;
          const past = activeTab === 'private'
            ? sortedItineraries.filter((i: any) => i.isPast)
            : [];

          const renderCard = (item: any) => {
            const handleClick = () => {
              if (activeTab === 'public' && item._userItinerary && onUserPublicItineraryClick) {
                onUserPublicItineraryClick(item._userItinerary);
              } else if (activeTab === 'private' && item._userItinerary && onUserItineraryClick) {
                onUserItineraryClick(item._userItinerary);
              } else if (activeTab === 'private' && onPrivateItineraryClick) {
                onPrivateItineraryClick(item.id);
              } else {
                onItineraryClick(item.id);
              }
            };
            const isShared = !!(item._userItinerary && authUser?.id && item._userItinerary.userId && item._userItinerary.userId !== authUser.id);
            return (
              <SwipeableItineraryCard
                key={item.id}
                item={item}
                isPrivate={activeTab === 'private'}
                isShared={isShared}
                isSwiped={swipedItemId === item.id}
                onSwipeOpen={() => setSwipedItemId(item.id)}
                onSwipeClose={() => setSwipedItemId(null)}
                onClick={handleClick}
                onDelete={() => setShowDeleteConfirm({ id: item.id, title: item.title, isUser: !!item._userItinerary, isPurchased: !!item.isPurchased, isShared })}
                getDaysRemainingStyle={getDaysRemainingStyle}
              />
            );
          };

          const isEmpty = upcoming.length === 0 && past.length === 0;

          if (itinerariesLoading && isEmpty) {
            return <ItineraryListSkeleton count={3} />;
          }

          if (isEmpty) {
            if (activeTab === 'private') {
              return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                    <Icon name="luggage" size={28} className="text-muted-foreground text-xs" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Nenhum roteiro ainda
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                    Crie seu primeiro roteiro e organize sua próxima viagem do seu jeito.
                  </p>
                  <button
                    onClick={() => onCreateItinerary?.()}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-semibold active:scale-95 transition-transform"
                  >
                    Criar roteiro
                  </button>
                </div>
              );
            }
            return (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                  <Icon name="search" size={28} className="text-muted-foreground text-xs" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Você ainda não publicou roteiros
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                  Torne-se um criador, publique seus roteiros no marketplace e ganhe com suas viagens.
                </p>
                <button
                  onClick={() => onBecomeCreator?.()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-semibold active:scale-95 transition-transform"
                >
                  Quero ser criador
                </button>
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-6">
              {activeTab === 'private' && upcoming.length > 0 && (
                <SectionHeader
                  icon="flight_takeoff"
                  label="Próximas viagens"
                  count={upcoming.length}
                  variant="upcoming"
                />
              )}
              {upcoming.length > 0 && (
                <div className="flex flex-col gap-4">
                  {upcoming.map(renderCard)}
                </div>
              )}

              {activeTab === 'private' && past.length > 0 && (
                <>
                  <SectionHeader
                    icon="check_circle"
                    label="Viagens passadas"
                    count={past.length}
                    variant="past"
                  />
                  <div className="flex flex-col gap-4">
                    {past.map(renderCard)}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <>
            {favoriteItems.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                  <Icon name="favorite" size={28} className="text-muted-foreground text-xs" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Você ainda não salvou roteiros</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
                  Salve roteiros públicos para comparar e comprar depois.
                </p>
                <button 
                  onClick={() => onExplore?.()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-semibold active:scale-95 transition-transform"
                >
                  Explorar roteiros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {favoriteItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onItineraryClick(item.id)}
                    className="text-left bg-card rounded-2xl overflow-hidden border border-border/50 active:scale-[0.97] transition-transform duration-150 flex flex-col"
                    style={{ height: 260 }}
                  >
                    {/* Image — fixed height */}
                    <div className="relative w-full overflow-hidden flex-shrink-0" style={{ height: 120 }}>
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover block" />
                      {item.rating && (
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full px-2 py-1">
                          <Icon name="star" size={12} filled className="text-amber-500" />
                          <span className="text-[11px] font-bold text-foreground">{item.rating}</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(item.id);
                        }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Icon name="favorite" size={18} filled style={{ color: '#DA501F' }} />
                      </button>
                    </div>

                    {/* Content — fixed height, fixed gaps */}
                    <div className="px-3 pt-2 pb-2.5 flex flex-col flex-1 min-h-0">
                      {/* Title — reserved for 2 lines */}
                      <h4
                        className="font-semibold text-[13px] text-foreground leading-[1.25] line-clamp-2"
                        style={{ height: 32 }}
                      >
                        {item.title}
                      </h4>

                      {/* Creator — fixed line */}
                      <div className="flex items-center gap-1.5 mt-1.5" style={{ height: 20 }}>
                        <img
                          src={item.creatorImage || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(item.creator || '?')}
                          alt={item.creator}
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-border/50"
                        />
                        <span className="text-[12px] font-medium text-foreground/60 truncate">
                          {item.creator}
                        </span>
                      </div>

                      {/* Metadata — fixed line */}
                      <div className="flex items-center gap-1.5 text-[12px] font-medium flex-nowrap mt-1.5 truncate" style={{ height: 18 }}>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Icon name="schedule" size={13} className="text-foreground/50" />
                          <span className="text-foreground/60">{item.days}d</span>
                        </div>
                        <span className="text-foreground/30 text-[14px]">·</span>
                        <div className="flex items-center gap-1 flex-shrink-0 truncate">
                          <Icon name="location_on" size={13} className="text-foreground/50" />
                          <span className="text-foreground/60 truncate">{item.places} lugares</span>
                        </div>
                      </div>

                      {/* Price — pinned to bottom */}
                      <span className="mt-auto text-[15px] font-bold leading-none" style={{ color: '#1a1c40' }}>
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div className="-mx-6">
            {/* Collections section */}
            <section className="px-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-foreground">
                  Coleções <span className="text-muted-foreground font-medium">{allCollections.length}</span>
                </h2>
              </div>
              {allCollections.length === 0 ? (
                /* Empty state — segue o padrão da aba Favoritos */
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                    <Icon name="folder" size={28} className="text-muted-foreground text-xs" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Você ainda não tem coleções</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
                    Crie coleções para organizar lugares que você quer visitar.
                  </p>
                  <button
                    onClick={() => setShowCreateCollection(true)}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-semibold active:scale-95 transition-transform"
                  >
                    Criar coleção
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {allCollections.map(collection => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      onClick={() => onCollectionClick(collection.id)}
                      isEditing={isEditingCollections}
                      isSelected={selectedCollections.has(collection.id)}
                      onToggleSelect={() => toggleSelectCollection(collection.id)}
                      onLongPress={enterEditMode}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Importados recentemente removido a pedido do usuário */}
          </div>
        )}
      </main>

      {/* Create collection sheet (triggered from "+ Nova" inline button) */}
      <CreateCollectionSheet
        isOpen={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        onSubmit={(name) => {
          const newCollection: UserCollection = {
            id: Date.now(),
            title: name,
            itemCount: 0,
            isFavorites: false,
            isPrivate: false,
            images: [],
            participants: [],
          };
          saveUserCollection(newCollection);
          setUserCollections(getUserCollections());
          setShowCreateCollection(false);
        }}
      />

      {/* Create action sheet — Novo roteiro / Nova coleção */}
      <BottomSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        bodyClassName="px-6 pb-2"
      >
        <div className="space-y-2 py-2">
          <button
            onClick={() => {
              setShowCreateSheet(false);
              onCreateItinerary?.();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Icon name="map" size={24} className="text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Novo roteiro</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Planeje uma nova viagem do zero</p>
            </div>
          </button>
          <button
            onClick={() => {
              setShowCreateSheet(false);
              setShowCreateCollection(true);
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Icon name="folder" size={24} className="text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Nova coleção</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Organize lugares e ideias em uma pasta</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Sort Bottom Sheet — inline to respect 430px container */}
      {showSortSheet && (
        <div className="absolute inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setShowSortSheet(false)} 
          />
          {/* Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[24px] animate-in slide-in-from-bottom duration-300 pb-6 max-h-[85vh] overflow-y-auto">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>

            {/* Header */}
            <div className="flex justify-center py-4">
              <h2 className="text-[17px] font-bold text-foreground">
                {activeTab === 'private' ? 'Filtros' : 'Ordenar por'}
              </h2>
            </div>

            {/* Origin filter — apenas na aba "Meus roteiros" */}
            {activeTab === 'private' && (
              <div className="px-6">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-2">Mostrar</h3>
                <div className="flex flex-col">
                  {originOptions.map((option, index) => (
                    <button
                      key={option.id}
                      onClick={() => { setOriginFilter(option.id); setShowSortSheet(false); }}
                      className={`flex items-center justify-between min-h-[48px] py-4 ${
                        index < originOptions.length - 1 ? 'border-b border-[#EAEAEA]' : ''
                      }`}
                    >
                      <span className="text-[15px] font-normal text-foreground">{option.label}</span>
                      <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        originFilter === option.id ? 'border-foreground' : 'border-muted-foreground/40'
                      }`}>
                        {originFilter === option.id && (
                          <div className="w-[12px] h-[12px] rounded-full bg-foreground" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-5">Ordenar por</h3>
              </div>
            )}

            {/* Options */}
            <div className="flex flex-col px-6">
              {sortOptions.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => { setSortBy(option.id); setShowSortSheet(false); }}
                  className={`flex items-center justify-between min-h-[48px] py-4 ${
                    index < sortOptions.length - 1 ? 'border-b border-[#EAEAEA]' : ''
                  }`}
                >
                  <span className="text-[15px] font-normal text-foreground">
                    {option.label}
                  </span>
                  {/* Instagram-style radio button */}
                  <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    sortBy === option.id ? 'border-foreground' : 'border-muted-foreground/40'
                  }`}>
                    {sortBy === option.id && (
                      <div className="w-[12px] h-[12px] rounded-full bg-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Sheet */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowDeleteConfirm(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[101] flex justify-center">
            <div className="bg-background rounded-t-3xl w-full w-full animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-6 pb-8 text-center">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name={showDeleteConfirm.isShared ? 'logout' : 'delete'} size={28} className="text-destructive" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {showDeleteConfirm.isShared ? 'Sair deste roteiro?' : 'Excluir roteiro?'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {showDeleteConfirm.isShared ? (
                    <>
                      Você deixará de participar deste roteiro e perderá acesso às futuras atualizações feitas pelo organizador. Essa ação não excluirá o roteiro para os demais participantes.
                    </>
                  ) : showDeleteConfirm.isPurchased ? (
                    <>
                      O roteiro "<span className="font-medium">{showDeleteConfirm.title}</span>" será removido da sua lista, mas como você o comprou, ele ficará sempre disponível para resgate em <span className="font-medium text-foreground">Configurações › Compras</span>.
                    </>
                  ) : (
                    <>
                      O roteiro "<span className="font-medium">{showDeleteConfirm.title}</span>" será removido permanentemente.
                    </>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-semibold border border-border text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteItinerary(showDeleteConfirm.id, showDeleteConfirm.isUser, showDeleteConfirm.isShared)}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-semibold bg-destructive text-destructive-foreground"
                  >
                    {showDeleteConfirm.isShared ? 'Sair do roteiro' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>;
}