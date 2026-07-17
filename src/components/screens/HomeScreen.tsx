import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserInsights, UserInsight } from '@/hooks/use-user-insights';
import { useNotifications } from '@/hooks/use-notifications';
import { useUnreadChatCount } from '@/hooks/use-unread-chat';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { INTEREST_CATALOG } from '@/components/travel/EditInterestsSheet';
import { getInterestIcon } from '@/lib/interestIcons';
import { RankBadge } from '@/components/travel/RankBadge';
import { getItineraryById } from '@/data/itineraries';
import { SimilarTravelersCarouselSkeleton } from '@/components/ui/LoadingShimmers';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { resolveTripThumbnailImages } from '@/lib/coverImageResolver';
import { parseLocalDate } from '@/lib/localDate';
import type { UserItinerary } from '@/lib/itinerariesApi';

const MONTH_ABBR_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function formatTripRange(start?: Date, end?: Date): string {
  if (!start) return '';
  const s = `${start.getDate()} ${MONTH_ABBR_PT[start.getMonth()]}`;
  if (!end) return s;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const e = sameMonth
    ? `${end.getDate()} ${MONTH_ABBR_PT[end.getMonth()]}`
    : `${end.getDate()} ${MONTH_ABBR_PT[end.getMonth()]}`;
  return sameMonth ? `${start.getDate()}–${e}` : `${s} – ${e}`;
}
function tripStatusLabel(start?: Date, end?: Date): string {
  if (!start) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = end ? new Date(end) : s; e.setHours(0, 0, 0, 0);
  const msDay = 86400000;
  if (today >= s && today <= e) return 'Em andamento';
  const diff = Math.round((s.getTime() - today.getTime()) / msDay);
  if (diff === 1) return 'Amanhã';
  if (diff > 1) return `Em ${diff} dias`;
  return '';
}

/**
 * Sincroniza os metadados visíveis no card (locais, dias, avaliação)
 * com o dataset real exibido na tela de detalhe do roteiro do marketplace.
 * Garante que a Home nunca mostre números diferentes do detalhe.
 */
function syncCardWithDataset<T extends { id: number; rating: number; places: number; days: number }>(item: T): T {
  const dataset = getItineraryById(item.id);
  if (!dataset) return item;
  const datasetDays = dataset.days?.length ?? 0;
  const datasetPlaces = dataset.places?.length ?? 0;
  return {
    ...item,
    rating: dataset.rating ?? item.rating,
    places: datasetPlaces || item.places,
    days: datasetDays || item.days,
  };
}

// Types
interface ItineraryCard {
  id: number;
  title: string;
  image: string;
  rating: number;
  places: number;
  days: number;
  cities: number;
  author: string;
  authorImage: string;
  price: number;
  category?: string;
}
interface StatusBanner {
  id: number;
  text: string;
  icon: string;
  iconColor: string;
  iconBg?: string;
}
interface PromoBanner {
  id: number;
  label: string;
  title: string;
  description: string;
  gradient: string;
}
interface PopularItinerary {
  id: number;
  title: string;
  image: string;
  rating: number;
  places: number;
  days: number;
  author: string;
  authorImage: string;
  price: number;
  saves: number;
  category?: string;
}
export interface TopCreator {
  id: number;
  name: string;
  image: string;
  soldItineraries: number;
}
interface CategoryItem {
  id: string;
  emoji: string;
  label: string;
  image: string;
}
interface Traveler {
  id: number;
  name: string;
  age: number;
  city: string;
  avatar: string;
  interests: { label: string; emoji: string }[];
}


// Insights agora são gerados dinamicamente em `useUserInsights` com base no
// perfil, interesses e roteiros do usuário.


const promoBanners: PromoBanner[] = [{
  id: 1,
  label: 'NOMAD',
  title: 'Conta internacional',
  description: 'Sem taxa de abertura e 10% off no primeiro depósito',
  gradient: 'linear-gradient(135deg, #1a472a 0%, #2d5a40 100%)'
}, {
  id: 2,
  label: 'EVENTOS',
  title: 'Inscreva-se e faça história',
  description: 'Participe dos melhores eventos do mundo',
  gradient: 'linear-gradient(135deg, #4a1c6b 0%, #6b2d8a 100%)'
}];
const itineraries: ItineraryCard[] = [{
  id: 100,
  title: 'Leste Europeu no Natal',
  image: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  rating: 4.6,
  places: 45,
  days: 15,
  cities: 3,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 50,
  category: 'História'
}, {
  id: 5,
  title: 'Portugal & Espanha',
  image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
  rating: 4.5,
  places: 32,
  days: 16,
  cities: 3,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 45,
  category: 'Cultura'
}, {
  id: 102,
  title: 'Tailândia Completa',
  image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
  rating: 4.7,
  places: 28,
  days: 14,
  cities: 3,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 80,
  category: 'Aventura'
}, {
  id: 104,
  title: 'Japão Cultural',
  image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
  rating: 4.7,
  places: 36,
  days: 12,
  cities: 3,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 95,
  category: 'Cultura'
}, {
  id: 105,
  title: 'Costa Amalfitana',
  image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800',
  rating: 4.5,
  places: 18,
  days: 5,
  cities: 3,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 70,
  category: 'Praia'
}];

const popularItineraries: PopularItinerary[] = [{
  id: 106,
  title: 'Paris Romântica',
  image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  rating: 4.9,
  places: 24,
  days: 6,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 75,
  saves: 3200,
  category: 'Romântico'
}, {
  id: 4,
  title: 'Grécia Mitológica',
  image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800',
  rating: 4.8,
  places: 30,
  days: 10,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 59,
  saves: 2800,
  category: 'História'
}, {
  id: 107,
  title: 'NYC em 5 Dias',
  image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  rating: 4.7,
  places: 22,
  days: 5,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 60,
  saves: 2500,
  category: 'Cidade'
}, {
  id: 108,
  title: 'Bali & Komodo',
  image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
  rating: 4.9,
  places: 26,
  days: 8,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 85,
  saves: 2100,
  category: 'Praia'
}, {
  id: 109,
  title: 'Patagônia Selvagem',
  image: 'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800',
  rating: 4.6,
  places: 18,
  days: 12,
  author: 'WAI',
  authorImage: '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png',
  price: 110,
  saves: 1900,
  category: 'Natureza'
}];

const topCreators: TopCreator[] = [
  { id: 1, name: 'Camila Ribeiro', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', soldItineraries: 1842 },
  { id: 2, name: 'Lucas Mendonça', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', soldItineraries: 1356 },
  { id: 3, name: 'Rafael Duarte', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400', soldItineraries: 1120 },
  { id: 4, name: 'Beatriz Almeida', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', soldItineraries: 890 },
  { id: 5, name: 'Maria Vieira', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', soldItineraries: 764 },
  { id: 6, name: 'Marina Costa', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', soldItineraries: 651 },
  { id: 7, name: 'Laura Fernandes', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', soldItineraries: 523 },
  { id: 8, name: 'Pedro Santos', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', soldItineraries: 412 },
  { id: 9, name: 'Juliana Melo', image: 'https://images.unsplash.com/photo-1521252659862-eec69941b071?w=400', soldItineraries: 387 },
  { id: 10, name: 'Thiago Lima', image: 'https://images.unsplash.com/photo-1545996124-0501ebae84d0?w=400', soldItineraries: 298 },
];

const categories: CategoryItem[] = [
  { id: 'praia', emoji: '🌴', label: 'Praia', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' },
  { id: 'inverno', emoji: '❄️', label: 'Inverno', image: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=800' },
  { id: 'cidade', emoji: '🏙️', label: 'Cidade', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800' },
  { id: 'natureza', emoji: '🌄', label: 'Natureza', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
  { id: 'gastronomico', emoji: '🍷', label: 'Gastronômico', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800' },
  { id: 'mochilao', emoji: '🎒', label: 'Mochilão', image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800' },
  { id: 'luxo', emoji: '💎', label: 'Luxo', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800' },
];

// Travelers mockados removidos — agora os perfis reais são carregados do banco em runtime.


interface HomeScreenProps {
  onItineraryClick: (id: number) => void;
  onExperienceClick?: (id: number) => void;
  onSearchClick?: () => void;
  onFindPeopleClick?: () => void;
  onProfileClick?: () => void;
  onCreatorClick?: (creator: TopCreator) => void;
  onChatClick?: () => void;
  onNotificationsClick?: () => void;
  onCartClick?: () => void;
  onCategoryClick?: (categoryId: string) => void;
  onSeeAllItineraries?: (title: string, items: any[]) => void;
  onInsightAction?: (insight: UserInsight) => void;
  onContinuePlanning?: (itinerary: UserItinerary) => void;
  userName?: string;
}
export function HomeScreen({
  onItineraryClick,
  onExperienceClick,
  onSearchClick,
  onFindPeopleClick,
  onProfileClick,
  onCreatorClick,
  onChatClick,
  onNotificationsClick,
  onCartClick,
  onCategoryClick,
  onSeeAllItineraries,
  onInsightAction,
  onContinuePlanning,
  userName
}: HomeScreenProps) {
  const { itemCount: cartItemCount } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();
  const { insights, loading: insightsLoading } = useUserInsights();
  const { unreadCount } = useNotifications();
  const unreadChatCount = useUnreadChatCount();
  const { itineraries: myItineraries, loading: myLoading } = useMyItineraries();
  const ongoingTrips = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return myItineraries
      .filter(it => !it.isPublic)
      .map(it => {
        const start = parseLocalDate(it.startDate);
        const end = parseLocalDate(it.endDate) ?? start;
        return { it, start, end };
      })
      .filter(({ start, end }) => start && end && end.getTime() >= today.getTime())
      .sort((a, b) => (a.start!.getTime() - b.start!.getTime()))
      .slice(0, 8);
  })();
  const displayName = userName ?? (currentUser.name ? currentUser.name.split(' ')[0] : 'Viajante');
  const avatarUrl = currentUser.avatar || '';
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<number>>(new Set());
  const [realTravelers, setRealTravelers] = useState<Array<{
    userId: string;
    name: string;
    username: string;
    city: string;
    avatar: string;
    interests: string[];
    compatibility: number;
    sharedTripsCount: number;
  }>>([]);
  const [travelersLoading, setTravelersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { fetchSimilarTravelers } = await import('@/lib/similarTravelers');
        const list = await fetchSimilarTravelers(6);
        if (cancelled) return;
        setRealTravelers(
          list.map((t) => ({
            userId: t.userId,
            name: t.name,
            username: t.username,
            city: t.city,
            avatar: t.avatar,
            compatibility: t.compatibility,
            sharedTripsCount: t.sharedTripsCount,
            // Prioriza interesses em comum no card (lista completa; UI corta em 3 + "+X")
            interests: t.sharedInterests.length > 0
              ? [...t.sharedInterests, ...t.interests.filter((i) => !t.sharedInterests.includes(i))]
              : t.interests,
          }))
        );
      } finally {
        if (!cancelled) setTravelersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const toggleSave = (item: { id: number; title: string; image: string; author: string; authorImage: string; days: number; places: number; price: number; rating?: number }, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({
      id: item.id,
      title: item.title,
      image: item.image,
      creator: item.author,
      creatorImage: item.authorImage,
      days: item.days,
      places: item.places,
      price: item.price,
      rating: item.rating,
    });
  };

  const formatSold = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
    return n.toString();
  };

  return <div className="min-h-screen pb-24 bg-[#f2f2f2] w-full max-w-full overflow-x-hidden box-border" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
      {/* Header */}
      <header className="pt-4 bg-[#f2f2f2] pb-[24px] -mx-4" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between mb-4 pb-[16px] pr-4">
          <div className="flex items-center gap-3">
            <button onClick={onProfileClick} className="focus:outline-none">
              {currentUserLoading ? (
                <Skeleton className="w-12 h-12 rounded-full" aria-label="Carregando avatar" />
              ) : (
                <UserAvatar
                  src={avatarUrl}
                  alt="Avatar"
                  size={48}
                  className="border-white shadow-md border-0"
                />
              )}
            </button>
            <div className="flex flex-col gap-1">
              {currentUserLoading ? (
                <>
                  <Skeleton className="h-3.5 w-10 rounded" />
                  <Skeleton className="h-5 w-28 rounded" />
                </>
              ) : (
                <>
                  <span className="text-body-md font-medium text-foreground leading-none">Olá,</span>
                  <span className="text-title-lg font-semibold text-foreground leading-none">{displayName}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onChatClick} className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 active:opacity-80 transition-all" aria-label="Mensagens">
              <span className="relative inline-flex">
                <Icon name="chat_bubble_outline" size={22} className="text-foreground" />
                {unreadChatCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full border-[1.5px] border-white" />}
              </span>
            </button>
            <button onClick={onNotificationsClick} className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 active:opacity-80 transition-all" aria-label="Notificações">
              <span className="relative inline-flex">
                <Icon name="notifications" size={22} className="text-foreground" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full border-[1.5px] border-white" />}
              </span>
            </button>
          </div>
        </div>

        {currentUserLoading || insightsLoading ? (
          <div className="w-full flex gap-3 overflow-hidden pb-[8px]">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="w-[240px] shrink-0 bg-white rounded-lg p-4 flex items-center gap-3 shadow-sm"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-full rounded" />
                  <Skeleton className="h-3.5 w-2/3 rounded" />
                </div>
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : insights.length > 0 && (
          <div className="w-full">
            <HorizontalCarousel showDots={true} className="w-full pb-[8px]" itemClassName="w-[240px]">
              {insights.map(banner => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => banner.action && onInsightAction?.(banner)}
                  disabled={!banner.action}
                  className="w-[240px] bg-white rounded-lg p-4 flex items-center gap-3 shadow-sm text-left transition-transform active:scale-[0.98] disabled:cursor-default"
                >
                  <div className="flex-1">
                    <p className="text-body-md font-medium text-foreground leading-snug text-sm line-clamp-2">
                      {banner.text}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(53, 135, 242, 0.12)' }}>
                    <Icon name={banner.icon} size={22} style={{ color: '#3587F2' }} />
                  </div>
                </button>
              ))}
            </HorizontalCarousel>
          </div>
        )}

      </header>

      {/* Content */}
      <main className="pt-4 section-stack bg-[#f2f2f2] -mr-4">

        {/* Continue planejando */}
        {myLoading ? (
          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-3">Continue planejando</h2>
            <HorizontalCarousel showDots={false} className="w-full pb-1" itemClassName="w-[260px]">
              {[1, 2].map(i => (
                <div key={i} className="w-[260px] flex items-center gap-3 bg-card rounded-2xl p-2 pr-3 text-left" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)' }}>
                  <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                    <Skeleton className="h-[18px] w-20 rounded-full mt-1" />
                  </div>
                </div>
              ))}
            </HorizontalCarousel>
          </section>
        ) : ongoingTrips.length > 0 && (
          <section>
            <h2 className="text-[16px] font-semibold text-foreground mb-3">Continue planejando</h2>
            <HorizontalCarousel showDots={false} className="w-full pb-1" itemClassName="w-[260px]">
              {ongoingTrips.map(({ it, start, end }) => {
                const cover = resolveTripThumbnailImages(
                  it.destinations,
                  it.images?.find((image) => image && !image.startsWith('blob:')),
                )[0];
                const status = tripStatusLabel(start, end);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onContinuePlanning?.(it)}
                    className="w-[260px] flex items-center gap-3 bg-card rounded-2xl p-2 pr-3 text-left active:scale-[0.98] transition-transform"
                    style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)' }}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      {cover && <img src={cover} alt={it.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <h3 className="text-[14px] font-semibold text-foreground leading-tight line-clamp-1">{it.title}</h3>
                      <span className="text-[12px] text-muted-foreground leading-tight">{formatTripRange(start, end)}</span>
                      {status && (
                        <span className="self-start mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight text-[#5C7A2A] bg-[#5C7A2A]/10">{status}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </HorizontalCarousel>
          </section>
        )}

        {/* Seu próximo destino ideal */}
        <section>
          <button
            onClick={() => onSeeAllItineraries?.('Seu próximo destino ideal', itineraries.map(syncCardWithDataset))}
            className="flex items-center gap-2 mb-3"
          >
            <h2 className="text-[16px] font-semibold text-foreground">Seu próximo destino ideal</h2>
            <Icon name="chevron_right" size={18} className="text-foreground" />
          </button>
          
          <HorizontalCarousel showDots={false} className="w-full pb-4" itemClassName="w-[240px]">
            {itineraries.map(syncCardWithDataset).map(item => (
              <button key={item.id} onClick={() => onItineraryClick(item.id)} className="w-[240px] flex flex-col text-left bg-card rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}>
                <div className="relative w-full aspect-[16/10] overflow-hidden p-2">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-xl" />
                  {item.category && (
                    <div className="absolute top-4 left-4 flex items-center gap-1 bg-white rounded-full pl-2 pr-2.5 py-1 shadow-sm">
                      <span className="text-[13px] leading-none">⛩️</span>
                      <span className="text-[11px] font-semibold text-foreground">{item.category}</span>
                    </div>
                  )}
                  <div role="button" tabIndex={0} onClick={e => toggleSave(item, e)} onKeyDown={e => e.key === 'Enter' && toggleSave(item, e)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm cursor-pointer z-10">
                    <Icon name="favorite" size={18} filled={isFavorite(item.id)} className={isFavorite(item.id) ? 'text-florida' : ''} style={!isFavorite(item.id) ? { color: '#1E293B' } : undefined} />
                  </div>
                </div>
                <div className="px-4 pt-1 pb-4 flex flex-col gap-2">
                  <h3 className="font-bold text-[15px] text-foreground leading-tight">{item.title}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Icon name="star" size={14} className="text-[#F2B90C]" />
                      <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="location_on" size={14} style={{ color: '#1E293B' }} />
                      <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.places} locais</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="schedule" size={14} style={{ color: '#1E293B' }} />
                      <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.days} dias</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <img src={item.authorImage} alt={item.author} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-[13px] font-medium" style={{ color: '#171F2C' }}>{item.author}</span>
                    </div>
                    <span className="text-[15px] font-bold text-foreground">R$ {item.price}</span>
                  </div>
                </div>
              </button>
            ))}
          </HorizontalCarousel>
        </section>

        {/* Viajantes com mesmo interesse — perfis reais */}
        {(travelersLoading || realTravelers.length > 0) && (
          <section>
            <button onClick={onFindPeopleClick} className="flex items-center gap-2 mb-3">
              <h2 className="text-[16px] font-semibold text-foreground">Viajantes com mesmo interesse</h2>
              <Icon name="chevron_right" size={18} className="text-foreground" />
            </button>

            {travelersLoading ? (
              <SimilarTravelersCarouselSkeleton count={4} />
            ) : (
            <HorizontalCarousel showDots={false} className="w-full pb-2" itemClassName="w-[240px]">
              {realTravelers.map((traveler) => (
                <button
                  key={traveler.userId}
                  onClick={onFindPeopleClick}
                  className="w-[240px] h-[150px] bg-card rounded-2xl p-3 text-left card-elevated flex flex-col"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <UserAvatar
                      src={traveler.avatar}
                      alt={traveler.name}
                      size={40}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground truncate">
                        {traveler.name}
                      </p>
                      {traveler.city && (
                        <p className="text-[12px] text-muted-foreground truncate">{traveler.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="flex flex-wrap gap-1.5 overflow-hidden" style={{ maxHeight: 60 }}>
                      {traveler.compatibility > 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold w-fit"
                          style={{
                            background: 'linear-gradient(135deg, #EDE4FF 0%, #E0D0FF 100%)',
                            color: '#6B21A8',
                          }}
                        >
                          <Icon name="auto_awesome" size={12} style={{ color: '#7C3AED' }} />
                          <span>{traveler.compatibility}% match</span>
                        </span>
                      )}
                      {traveler.interests.slice(0, 3).map((interest, i) => {
                        const iconName = getInterestIcon(interest);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#F2F2F2] text-[11px] font-medium text-neutral-600 w-fit"
                          >
                            <Icon name={iconName} size={12} className="text-neutral-600" />
                            <span className="text-neutral-600">{interest}</span>
                          </span>
                        );
                      })}
                      {traveler.interests.length > 3 && (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-[#F2F2F2] text-[11px] font-semibold text-neutral-600 w-fit">
                          +{traveler.interests.length - 3}
                        </span>
                      )}
                    </div>
                    {traveler.sharedTripsCount > 0 && (
                      <p className="text-[11px] text-muted-foreground truncate mt-2">
                        {traveler.sharedTripsCount} viagens em comum
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </HorizontalCarousel>
            )}
          </section>
        )}


        {/* Roteiros Mais Populares */}
        <section>
          <button
            onClick={() => onSeeAllItineraries?.('Roteiros à venda mais populares', popularItineraries.map(syncCardWithDataset))}
            className="flex items-center gap-2 mb-3"
          >
            <h2 className="text-[16px] font-semibold text-foreground">Roteiros à venda mais populares</h2>
            <Icon name="chevron_right" size={18} className="text-foreground" />
          </button>

          <HorizontalCarousel showDots={false} className="w-full pb-4" itemClassName="w-[240px]">
            {popularItineraries.map(syncCardWithDataset).map(item => (
              <button key={item.id} onClick={() => onItineraryClick(item.id)} className="w-[240px] flex flex-col text-left bg-card rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}>
                <div className="relative w-full aspect-[16/10] overflow-hidden p-2">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-xl" />
                  {item.category && (
                    <div className="absolute top-4 left-4 flex items-center gap-1 bg-white rounded-full pl-2 pr-2.5 py-1 shadow-sm">
                      <span className="text-[13px] leading-none">⛩️</span>
                      <span className="text-[11px] font-semibold text-foreground">{item.category}</span>
                    </div>
                  )}
                  <div role="button" tabIndex={0} onClick={e => toggleSave(item, e)} onKeyDown={e => e.key === 'Enter' && toggleSave(item, e)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm cursor-pointer z-10">
                    <Icon name="favorite" size={18} filled={isFavorite(item.id)} className={isFavorite(item.id) ? 'text-florida' : ''} style={!isFavorite(item.id) ? { color: '#1E293B' } : undefined} />
                  </div>
                </div>
                <div className="px-4 pt-1 pb-4 flex flex-col gap-2">
                  <h3 className="font-bold text-[15px] text-foreground leading-tight">{item.title}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Icon name="star" size={14} className="text-[#F2B90C]" />
                      <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="location_on" size={14} style={{ color: '#1E293B' }} />
                      <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.places} locais</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="schedule" size={14} style={{ color: '#1E293B' }} />
                      <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.days} dias</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <img src={item.authorImage} alt={item.author} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-[13px] font-medium" style={{ color: '#171F2C' }}>{item.author}</span>
                    </div>
                    <span className="text-[15px] font-bold text-foreground">R$ {item.price}</span>
                  </div>
                </div>
              </button>
            ))}
          </HorizontalCarousel>
        </section>

        {/* Promotional Banners - oculto por enquanto */}
        {false && (
        <section>
          <HorizontalCarousel showDots={true} className="w-full pb-2" itemClassName="w-[280px]">
            {promoBanners.map(banner => <div key={banner.id} className="w-[280px] h-[120px] rounded-lg p-4 relative overflow-hidden" style={{
            background: banner.gradient
          }}>
                <div className="relative z-10">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{banner.label}</span>
                  <h3 className="text-white font-bold text-[15px] mt-1 leading-tight">{banner.title}</h3>
                  <p className="text-white/70 text-xs mt-1 max-w-[180px]">{banner.description}</p>
                </div>
              </div>)}
          </HorizontalCarousel>
        </section>
        )}

        <section className="pb-4">
          <button onClick={onFindPeopleClick} className="flex items-center gap-2 mb-3">
            <h2 className="text-[16px] font-semibold text-foreground">Criadores de roteiro em alta</h2>
            <Icon name="chevron_right" size={18} className="text-foreground" />
          </button>

          <HorizontalCarousel showDots={false} className="w-full pb-4" itemClassName="w-[155px]">
            {topCreators.map((creator, idx) => {
              const isTop3 = idx < 3;
              const medalGradient = idx === 0
                ? 'linear-gradient(135deg, #FFD86B 0%, #E0A82E 100%)'
                : idx === 1
                ? 'linear-gradient(135deg, #E2E6EC 0%, #A8B0BC 100%)'
                : 'linear-gradient(135deg, #E8A87C 0%, #B87333 100%)';

              return (
                <div
                  key={creator.id}
                  className="w-[155px] flex flex-col items-center rounded-2xl py-5 px-3 bg-white transition-transform"
                  style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}
                >
                  <button
                    onClick={() => onCreatorClick?.(creator)}
                    className="flex flex-col items-center w-full active:scale-[0.97] transition-transform"
                  >
                    <div className="relative mb-3">
                      <img
                        src={creator.image}
                        alt={creator.name}
                        className="w-[72px] h-[72px] rounded-full object-cover"
                      />
                      {isTop3 && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md ring-2 ring-white"
                          style={{ background: medalGradient }}
                        >
                          <span className="text-white text-[12px] font-bold drop-shadow">{idx + 1}</span>
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-[14px] text-[#1A1C40] truncate w-full text-center">{creator.name}</p>
                    <div className="flex items-center gap-1 mb-3">
                      <Icon name="star" size={12} className="text-[#F2B90C]" />
                      <p className="text-[12px] text-[#1A1C40]/60">{formatSold(creator.soldItineraries)} roteiros vendidos</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFollowedCreatorIds(prev => {
                        const next = new Set(prev);
                        if (next.has(creator.id)) next.delete(creator.id); else next.add(creator.id);
                        return next;
                      });
                    }}
                    className="text-[12px] font-medium px-5 py-1.5 rounded-full transition-all active:scale-95"
                    style={
                      followedCreatorIds.has(creator.id)
                        ? { background: '#141530', color: '#FFFFFF', border: '1px solid #141530' }
                        : { background: 'transparent', color: '#141530', border: '1px solid #141530' }
                    }
                  >
                    {followedCreatorIds.has(creator.id) ? 'Seguindo' : 'Seguir'}
                  </button>
                </div>
              );
            })}
          </HorizontalCarousel>
        </section>
      </main>
    </div>;
}