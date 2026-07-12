import { useState, useMemo, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PassportStamps } from '@/components/travel/PassportStamps';
import { CountryDetailSheet } from '@/components/travel/CountryDetailSheet';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { CountryVisit } from '@/data/visitedCountries';
import { CountryInfo } from '@/data/countriesCatalog';
import { CheckoutSheet } from '@/components/travel/CheckoutSheet';
import { getItineraryById } from '@/data/itineraries';
import { differenceInDays } from 'date-fns';
import { CreatorItinerariesScreen } from '@/components/screens/CreatorItinerariesScreen';
import { AllReviewsScreen } from '@/components/screens/AllReviewsScreen';
import { VisitedCountriesMapScreen } from '@/components/screens/VisitedCountriesMapScreen';
import { SubscriptionScreen } from '@/components/screens/SubscriptionScreen';
import { PurchasesScreen } from '@/components/screens/PurchasesScreen';
import { SalesSummaryScreen } from '@/components/screens/SalesSummaryScreen';
import { PaymentSettingsScreen } from '@/components/screens/PaymentSettingsScreen';

import { LoginSecurityScreen } from '@/components/screens/LoginSecurityScreen';
import { NotificationSettingsScreen } from '@/components/screens/NotificationSettingsScreen';
import { HelpCenterScreen } from '@/components/screens/HelpCenterScreen';
import { ContactUsSheet } from '@/components/travel/ContactUsSheet';
import { VibeCheckSheet } from '@/components/travel/VibeCheckSheet';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useNavigate } from 'react-router-dom';
import { EditInterestsSheet, Interest } from '@/components/travel/EditInterestsSheet';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { resolveTripThumbnailImages, resolveCoverImage } from '@/lib/coverImageResolver';
import { blockProfile, followProfile, getProfileSocialState, reportProfile, unblockProfile, unfollowProfile } from '@/lib/socialInteractions';
import { ReportSheet } from '@/components/social/ReportSheet';
import { supabase } from '@/integrations/supabase/client';
import { getPublicItinerariesByUserId } from '@/lib/profilesApi';
import { searchGooglePlacesText } from '@/lib/googlePlacesApi';
import { ALL_COUNTRIES } from '@/data/countriesCatalog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DREAM_VIBE_OPTIONS = [
  'Praias paradisíacas',
  'Aventura & natureza',
  'Cultura & história',
  'Gastronomia',
  'Vida noturna',
  'Lua de mel',
  'Mochilão',
  'Família',
  'Luxo & relax',
  'Cidade grande',
  'Outros',
];

const DREAM_WHEN_OPTIONS = [
  'Qualquer época',
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  'Verão', 'Outono', 'Inverno', 'Primavera',
  'Próximos meses', 'Ainda não sei',
];

// Mapping from onboarding interest labels (string[]) to Interest objects with icons.
const ONBOARDING_INTEREST_ICONS: Record<string, string> = {
  'História': 'history_edu',
  'Arte': 'palette',
  'Balada': 'nightlife',
  'Shopping': 'shopping_bag',
  'Andar': 'directions_walk',
  'Montanhas': 'landscape',
  'Escalada': 'hiking',
  'Bares': 'local_bar',
  'Música': 'music_note',
  'Ar livre': 'park',
  'Agitado': 'celebration',
  'Praia': 'beach_access',
  'Gastronomia': 'restaurant',
};
function mapOnboardingInterests(strings: unknown): Interest[] {
  if (!Array.isArray(strings)) return [];
  return strings
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((label) => ({ label, icon: ONBOARDING_INTEREST_ICONS[label] ?? 'tag' }));
}
const INTERESTS_STORAGE_KEY = 'wai-travel-interests';

type SettingsSubScreen = 'subscription' | 'purchases' | 'payment' | 'login-security' | 'notifications' | 'help-center';

export interface FriendProfileData {
  userId?: string;
  name: string;
  username: string;
  location: string;
  avatar: string;
  bio?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  following: number;
  followers: string;
  countries: CountryVisit[];
}

interface PublicItinerary {
  id: number;
  title: string;
  destination: string;
  image: string;
  rating: number;
  reviewCount: number;
  price: number | null;
  author: string;
  authorImage: string;
  duration: string;
  cities: number;
  places: number;
  comments: { user: string; text: string; avatar: string }[];
  theme?: { emoji: string; label: string };
}

// Tema da viagem por roteiro (cultural, romântico, gastronômico, etc.)
const itineraryThemes: Record<number, { emoji: string; label: string }> = {
  100: { emoji: '🏰', label: 'Cultural' },        // Leste Europeu no Natal
  101: { emoji: '🍷', label: 'Gastronômico' },    // Rota dos Vinhos - Portugal
  102: { emoji: '🏝️', label: 'Praia' },          // Tailândia Completa
  104: { emoji: '⛩️', label: 'Cultural' },        // Japão Cultural
  105: { emoji: '🍝', label: 'Gastronômico' },    // Costa Amalfitana
  106: { emoji: '💕', label: 'Romântico' },       // Paris Romântica
  107: { emoji: '🗽', label: 'Urbano' },          // NYC em 5 Dias
  108: { emoji: '🏝️', label: 'Praia' },          // Bali & Komodo
  109: { emoji: '🥾', label: 'Aventura' },        // Patagônia Selvagem
};

type ProfileVariant = 'self' | 'other';

interface FriendProfileScreenProps {
  friend: FriendProfileData;
  onBack: () => void;
  onChat?: () => void;
  onItineraryClick?: (id: number) => void;
  onDuplicateItinerary?: (id: number) => void;
  /**
   * 'self'  → meu próprio perfil (botão Editar, ícone Configurações no header)
   * 'other' → perfil de outra pessoa (botões Chat + Seguir, menu de 3 pontinhos no header)
   */
  variant?: ProfileVariant;
  onEditProfile?: () => void;
  onCreatorProgram?: () => void;
  isLoading?: boolean;
}



interface ProfileHighlight {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

const AVAILABLE_HIGHLIGHTS: ProfileHighlight[] = [
  { id: 'europa', emoji: '🏰', title: 'Guru da Europa', description: 'Especialista em roteiros pela Europa' },
  { id: 'praias', emoji: '🏖️', title: 'Guru de praias', description: 'Conhece os melhores destinos de praia' },
  { id: 'gastronomia', emoji: '🍝', title: 'Guru gastronômico', description: 'Especialista em viagens gastronômicas' },
  { id: 'aventura', emoji: '🏔️', title: 'Guru de aventura', description: 'Trilhas, montanhas e adrenalina' },
  { id: 'cultura', emoji: '🎭', title: 'Guru cultural', description: 'Museus, história e patrimônios' },
  { id: 'asia', emoji: '🏯', title: 'Guru da Ásia', description: 'Especialista em roteiros pela Ásia' },
  { id: 'orcamento', emoji: '💰', title: 'Mestre do orçamento', description: 'Viagens incríveis gastando pouco' },
  { id: 'luxo', emoji: '✨', title: 'Curador de luxo', description: 'Experiências premium e exclusivas' },
];

const HIGHLIGHT_STORAGE_KEY = 'wai-travel-profile-highlight';

interface DreamTrip {
  id: string;
  destination: string;
  emoji: string;
  when: string;
  vibe: string;
  gradient: string;
  image: string;
}

const DREAM_TRIPS_STORAGE_KEY = 'wai-travel-dream-trips';

const DEFAULT_DREAM_TRIPS: DreamTrip[] = [
  {
    id: 'dt1',
    destination: 'Japão',
    emoji: '🗾',
    when: 'Primavera 2026',
    vibe: 'Cerejeiras & ramen',
    gradient: 'linear-gradient(135deg, #FF9AA2 0%, #FFB7B2 100%)',
    image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600',
  },
  {
    id: 'dt2',
    destination: 'Patagônia',
    emoji: '🏔️',
    when: 'Verão 2026',
    vibe: 'Trilhas & geleiras',
    gradient: 'linear-gradient(135deg, #84B6F4 0%, #6B8FD8 100%)',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600',
  },
  {
    id: 'dt3',
    destination: 'Marrocos',
    emoji: '🐪',
    when: 'Outono 2026',
    vibe: 'Deserto & especiarias',
    gradient: 'linear-gradient(135deg, #FFB347 0%, #E07B39 100%)',
    image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600',
  },
];

const DREAM_TRIP_PRESETS: { emoji: string; gradient: string; image: string }[] = [
  { emoji: '🗾', gradient: 'linear-gradient(135deg, #FF9AA2 0%, #FFB7B2 100%)', image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600' },
  { emoji: '🏔️', gradient: 'linear-gradient(135deg, #84B6F4 0%, #6B8FD8 100%)', image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600' },
  { emoji: '🐪', gradient: 'linear-gradient(135deg, #FFB347 0%, #E07B39 100%)', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600' },
  { emoji: '🏝️', gradient: 'linear-gradient(135deg, #5EEAD4 0%, #14B8A6 100%)', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600' },
  { emoji: '🏰', gradient: 'linear-gradient(135deg, #C4B5FD 0%, #8B5CF6 100%)', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600' },
  { emoji: '🌋', gradient: 'linear-gradient(135deg, #FCA5A5 0%, #DC2626 100%)', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600' },
  { emoji: '🦁', gradient: 'linear-gradient(135deg, #FCD34D 0%, #B45309 100%)', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600' },
  { emoji: '🌌', gradient: 'linear-gradient(135deg, #6366F1 0%, #1E1B4B 100%)', image: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600' },
];




// Traveler rank based on sales + reviews
type TravelerRank = 'bronze' | 'prata' | 'ouro';

function getTravelerRank(totalSales: number, totalReviews: number): { rank: TravelerRank; label: string; color: string } {
  const score = totalSales + totalReviews;
  if (score >= 50) return { rank: 'ouro', label: 'Viajante ouro', color: '#B68B09' };
  if (score >= 20) return { rank: 'prata', label: 'Viajante prata', color: '#848484' };
  return { rank: 'bronze', label: 'Viajante bronze', color: '#CD7F32' };
}



const walletItems: { icon: string; label: string; key: SettingsSubScreen }[] = [
  { icon: 'workspace_premium', label: 'Assinatura', key: 'subscription' },
  { icon: 'shopping_bag', label: 'Compras', key: 'purchases' },
  
  { icon: 'account_balance_wallet', label: 'Forma de recebimento', key: 'payment' },
];

const accountItems: { icon: string; label: string; key?: SettingsSubScreen; isToggle?: boolean }[] = [
  { icon: 'lock', label: 'Login e segurança', key: 'login-security' },
  { icon: 'notifications', label: 'Notificações', key: 'notifications' },
  { icon: 'dark_mode', label: 'Tema', isToggle: true },
];

const supportItems: { icon: string; label: string; key?: SettingsSubScreen; action?: 'contact' }[] = [
  { icon: 'info', label: 'Central de ajuda (FAQ)', key: 'help-center' },
  { icon: 'chat_bubble_outline', label: 'Fale conosco', action: 'contact' },
];

const dangerItems = [
  { icon: 'logout', label: 'Sair', danger: true, action: 'signout' as const },
];

export function FriendProfileScreen({ friend, onBack, onChat, onItineraryClick, onDuplicateItinerary, variant = 'other', onEditProfile, onCreatorProgram, isLoading }: FriendProfileScreenProps) {
  const isSelf = variant === 'self';
  const { signOut, user: authUser } = useAuth();
  const { user: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [followersDelta, setFollowersDelta] = useState(0);
  const [liveCounts, setLiveCounts] = useState<{ followers: number; following: number } | null>(null);
  const [showAllItineraries, setShowAllItineraries] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showCountriesMap, setShowCountriesMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSalesSummary, setShowSalesSummary] = useState(false);
  const [settingsScreen, setSettingsScreen] = useState<SettingsSubScreen | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [socialLinksOpen, setSocialLinksOpen] = useState(false);
  const [friendInterests, setFriendInterests] = useState<string[]>([]);
  // Visited countries do usuário logado — usado no Vibe Check para cruzar com o amigo.
  const [myVisitedCountries, setMyVisitedCountries] = useState<{ name: string; flag: string }[]>([]);

  // Carrega os interesses do amigo (perfil real com userId) sempre que abrir o Vibe Check.
  useEffect(() => {
    if (isSelf || !friend.userId || !showVibeCheck) return;
    let cancelled = false;
    supabase
      .from('profiles_public')
      .select('interests')
      .eq('user_id', friend.userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('[VibeCheck] friend interests fetch failed', error); return; }
        const raw = (data as { interests?: unknown } | null)?.interests;
        if (Array.isArray(raw)) {
          setFriendInterests(raw.filter((s): s is string => typeof s === 'string'));
        }
      });
    return () => { cancelled = true; };
  }, [isSelf, friend.userId, showVibeCheck]);

  // Carrega "extras" de países visitados do próprio usuário (do localStorage),
  // que somam aos países seed do passaporte para o cálculo de match.
  useEffect(() => {
    if (!showVibeCheck || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('wai-travel-visited-extra');
      const arr = stored ? (JSON.parse(stored) as CountryVisit[]) : [];
      setMyVisitedCountries(arr.map(c => ({ name: c.name, flag: c.flag })));
    } catch {
      setMyVisitedCountries([]);
    }
  }, [showVibeCheck]);
  const [otherMenuOpen, setOtherMenuOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string>(() => {
    if (typeof window === 'undefined') return AVAILABLE_HIGHLIGHTS[0].id;
    return localStorage.getItem(HIGHLIGHT_STORAGE_KEY) || AVAILABLE_HIGHLIGHTS[0].id;
  });
  const selectedHighlight =
    AVAILABLE_HIGHLIGHTS.find(h => h.id === selectedHighlightId) || AVAILABLE_HIGHLIGHTS[0];

  useEffect(() => {
    if (isSelf || !friend.userId) return;
    let cancelled = false;
    getProfileSocialState(friend.userId)
      .then((state) => {
        if (!cancelled) {
          setIsFollowing(state.isFollowing);
          setIsBlocked(state.isBlocked);
        }
      })
      .catch((error) => console.error('[FriendProfileScreen] social state failed', error));
    return () => { cancelled = true; };
  }, [friend.userId, isSelf]);

  // Fetch real follower/following counts for the viewed profile + subscribe to changes.
  useEffect(() => {
    if (isSelf || !friend.userId) {
      setLiveCounts(null);
      return;
    }
    let cancelled = false;
    setFollowersDelta(0);
    const load = async () => {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('followers_count, following_count')
        .eq('user_id', friend.userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('[FriendProfileScreen] count fetch failed', error);
        return;
      }
      if (data) setLiveCounts({ followers: data.followers_count ?? 0, following: data.following_count ?? 0 });
    };
    load();
    const channel = supabase
      .channel(`profile-counts:${friend.userId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${friend.userId}` },
        (payload) => {
          const row = payload.new as { followers_count?: number; following_count?: number };
          setLiveCounts({ followers: row.followers_count ?? 0, following: row.following_count ?? 0 });
          setFollowersDelta(0);
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [friend.userId, isSelf]);

  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutItinerary, setCheckoutItinerary] = useState<PublicItinerary | null>(null);
  // Self-only persistence: extra countries marked from the world map (besides the seed list).
  const VISITED_EXTRA_KEY = 'wai-travel-visited-extra';
  const [extraCountries, setExtraCountries] = useState<CountryVisit[]>(() => {
    if (typeof window === 'undefined' || !isSelf) return [];
    try {
      const stored = localStorage.getItem(VISITED_EXTRA_KEY);
      return stored ? (JSON.parse(stored) as CountryVisit[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !isSelf) return;
    localStorage.setItem(VISITED_EXTRA_KEY, JSON.stringify(extraCountries));
  }, [extraCountries, isSelf]);
  const countries = useMemo<CountryVisit[]>(
    () => (isSelf ? [...friend.countries, ...extraCountries] : friend.countries),
    [isSelf, friend.countries, extraCountries],
  );

  // Interests — only what the user picked at onboarding (self) until they edit it here.
  // We persist to localStorage ONLY after an explicit edit, so onboarding values from
  // Supabase remain the source of truth for fresh profiles.
  const [interests, setInterests] = useState<Interest[]>(() => {
    if (typeof window === 'undefined' || !isSelf) return [];
    try {
      const stored = localStorage.getItem(INTERESTS_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Interest[]) : [];
    } catch {
      return [];
    }
  });
  // Seed self interests from onboarding (profiles.interests) when localStorage is empty.
  useEffect(() => {
    if (!isSelf || typeof window === 'undefined') return;
    if (!authUser?.id) return;
    if (localStorage.getItem(INTERESTS_STORAGE_KEY)) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('interests')
      .eq('user_id', authUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('[FriendProfile] interests fetch failed', error); return; }
        const mapped = mapOnboardingInterests((data as { interests?: unknown } | null)?.interests);
        if (mapped.length > 0) setInterests(mapped);
      });
    return () => { cancelled = true; };
  }, [isSelf, authUser?.id]);
  // Carrega interesses do AMIGO (perfil de outra pessoa) para exibir publicamente.
  useEffect(() => {
    if (isSelf || !friend.userId) return;
    let cancelled = false;
    supabase
      .from('profiles_public')
      .select('interests')
      .eq('user_id', friend.userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('[FriendProfile] friend interests fetch failed', error); return; }
        const mapped = mapOnboardingInterests((data as { interests?: unknown } | null)?.interests);
        setInterests(mapped);
        setFriendInterests(mapped.map(m => m.label));
      });
    return () => { cancelled = true; };
  }, [isSelf, friend.userId]);

  const persistInterests = (next: Interest[]) => {
    setInterests(next);
    if (typeof window !== 'undefined' && isSelf) {
      localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(next));
    }
  };
  const [editInterestsOpen, setEditInterestsOpen] = useState(false);

  const [duplicatedIds, setDuplicatedIds] = useState<Set<number>>(new Set());

  // Roteiros públicos REAIS de outro usuário (vindos do banco). Só
  // entram em ação quando o perfil tem userId real (perfil do banco).
  const [realPublicItineraries, setRealPublicItineraries] = useState<PublicItinerary[]>([]);
  const [isFetchingPublicItineraries, setIsFetchingPublicItineraries] = useState(!isSelf && !!friend.userId);

  useEffect(() => {
    if (isSelf || !friend.userId) {
      setRealPublicItineraries([]);
      setIsFetchingPublicItineraries(false);
      return;
    }
    let cancelled = false;
    setIsFetchingPublicItineraries(true);
    (async () => {
      const rows = await getPublicItinerariesByUserId(friend.userId!);
      if (cancelled) return;
      const mapped: PublicItinerary[] = rows.map((r, idx) => {
        const days = r.start_date && r.end_date
          ? Math.max(1, differenceInDays(new Date(r.end_date), new Date(r.start_date)) + 1)
          : 1;
        const uniqueCities = new Set((r.destinations || []).map(d => d.split(',')[0].trim()));
        return {
          id: idx + 1, // id local apenas para keys (entidade real é por uuid)
          title: r.title || 'Roteiro',
          destination: r.destinations?.[0] || '',
          image: r.images?.[0] || '',
          rating: 0,
          reviewCount: 0,
          price: r.price_cents ? r.price_cents / 100 : null,
          author: friend.name,
          authorImage: friend.avatar,
          duration: `${days} dias`,
          cities: uniqueCities.size,
          places: r.places_count ?? 0,
          comments: [],
          theme: r.main_tag ? { emoji: '✈️', label: r.main_tag } : undefined,
        };
      });
      setRealPublicItineraries(mapped);
      setIsFetchingPublicItineraries(false);
    })();
    return () => { cancelled = true; };
  }, [isSelf, friend.userId, friend.name, friend.avatar]);

  const publicItineraries = useMemo(
    () => {
      if (isSelf) return [];
      return realPublicItineraries;
    },
    [isSelf, realPublicItineraries],
  );

  // Roteiros públicos reais do próprio usuário (vindos do banco)
  const { itineraries: myItineraries, loading: myItinerariesLoading } = useMyItineraries();
  const myPublicItineraries = useMemo(
    () => (isSelf ? myItineraries.filter(it => it.isPublic) : []),
    [isSelf, myItineraries],
  );

  // Roteiros do próprio usuário publicados À VENDA (priceCents > 0).
  // O ícone de "resumo de vendas" só aparece quando há ao menos um.
  const hasItinerariesForSale = useMemo(
    () => isSelf && myPublicItineraries.some(it => (it.priceCents ?? 0) > 0),
    [isSelf, myPublicItineraries],
  );

  // Badge de novas vendas: conta itinerary_sales criadas após o último
  // acesso (timestamp em localStorage). Limpa ao abrir o resumo.
  const salesSeenKey = authUser ? `sales-summary:last-seen:${authUser.id}` : null;
  const [unreadSalesCount, setUnreadSalesCount] = useState(0);
  useEffect(() => {
    if (!isSelf || !authUser || !hasItinerariesForSale) {
      setUnreadSalesCount(0);
      return;
    }
    let cancelled = false;
    const lastSeen = (salesSeenKey && localStorage.getItem(salesSeenKey)) || '1970-01-01T00:00:00Z';
    const load = async () => {
      const { count, error } = await supabase
        .from('itinerary_sales')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', authUser.id)
        .gt('created_at', lastSeen);
      if (!cancelled && !error) setUnreadSalesCount(count ?? 0);
    };
    load();
    const channel = supabase
      .channel(`sales-badge:${authUser.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'itinerary_sales', filter: `seller_id=eq.${authUser.id}` },
        () => load(),
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [isSelf, authUser, hasItinerariesForSale, salesSeenKey]);

  const handleOpenSalesSummary = useCallback(() => {
    if (salesSeenKey) localStorage.setItem(salesSeenKey, new Date().toISOString());
    setUnreadSalesCount(0);
    setShowSalesSummary(true);
  }, [salesSeenKey]);

  // Dream trips (próximas viagens futuras)
  // - Self: persistido no localStorage; começa vazio até o usuário adicionar.
  // - Outros perfis REAIS (com userId): vazio (sem dados ainda no banco).
  // - Perfis legacy (sem userId): lista mockada para demonstração da feature.
  const [dreamTrips, setDreamTrips] = useState<DreamTrip[]>(() => {
    if (!isSelf) return friend.userId ? [] : DEFAULT_DREAM_TRIPS;
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(DREAM_TRIPS_STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored) as DreamTrip[]; } catch { /* fallthrough */ }
    }
    return [];
  });
  const [dreamTripSheetOpen, setDreamTripSheetOpen] = useState(false);
  const [dreamTripToRemove, setDreamTripToRemove] = useState<DreamTrip | null>(null);
  const [newDreamDest, setNewDreamDest] = useState('');
  const [newDreamWhen, setNewDreamWhen] = useState<string>('');
  const [newDreamYear, setNewDreamYear] = useState<number | undefined>(undefined);
  const [newDreamVibe, setNewDreamVibe] = useState('');
  const [newDreamPresetIdx, setNewDreamPresetIdx] = useState(0);
  const [destPickerOpen, setDestPickerOpen] = useState(false);
  const [destSearch, setDestSearch] = useState('');
  const [whenPickerOpen, setWhenPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [vibePickerOpen, setVibePickerOpen] = useState(false);
  const [isAddingDreamTrip, setIsAddingDreamTrip] = useState(false);

  const persistDreamTrips = (trips: DreamTrip[]) => {
    setDreamTrips(trips);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DREAM_TRIPS_STORAGE_KEY, JSON.stringify(trips));
    }
  };

  const addDreamTrip = async () => {
    if (!newDreamDest.trim() || !newDreamWhen) return;
    setIsAddingDreamTrip(true);
    
    const preset = DREAM_TRIP_PRESETS[newDreamPresetIdx];
    const destination = newDreamDest.trim();
    let placeImage = resolveCoverImage([destination]).url; // fallback
    
    try {
      // Usa Google Places diretamente para buscar a melhor foto do lugar escolhido
      const places = await searchGooglePlacesText(`${destination} tourist destination`);
      if (places && places.length > 0 && places[0].photoUrl) {
        placeImage = places[0].photoUrl;
      } else {
        // Fallback para a function caso o Places não retorne nada (raro)
        const { data, error } = await supabase.functions.invoke('google-image-search', {
          body: { query: `turismo ${destination} landmark travel` }
        });
        if (data?.image && !error) {
          placeImage = data.image;
        }
      }
    } catch (e) {
      console.error('Error fetching image:', e);
    }

    const whenLabel = newDreamYear ? `${newDreamWhen} ${newDreamYear}` : newDreamWhen;
    const newTrip: DreamTrip = {
      id: `dt-${Date.now()}`,
      destination,
      when: whenLabel,
      vibe: newDreamVibe || '',
      emoji: preset.emoji,
      gradient: preset.gradient,
      image: placeImage,
    };
    persistDreamTrips([...dreamTrips, newTrip]);
    setNewDreamDest('');
    setNewDreamWhen('');
    setNewDreamYear(undefined);
    setNewDreamVibe('');
    setNewDreamPresetIdx(0);
    setDreamTripSheetOpen(false);
    setIsAddingDreamTrip(false);
    toast.success('Destino dos sonhos adicionado');
  };

  const removeDreamTrip = (id: string) => {
    persistDreamTrips(dreamTrips.filter(t => t.id !== id));
  };

  // Map → mark a country as visited (adds a new stamp to the passport).
  const handleMarkVisitedFromMap = (info: CountryInfo, year: number) => {
    if (countries.some(c => c.code === info.code)) {
      toast.success(`${info.flag} ${info.name} já está nos seus visitados`);
      return;
    }
    const newCountry: CountryVisit = {
      code: info.code,
      name: info.name,
      flag: info.flag,
      year,
      continent: info.continent === 'Mundo' ? 'Outros' : info.continent,
      cities: [],
      days: 0,
      dateRange: String(year),
      lat: 0,
      lng: 0,
      photos: [],
    };
    setExtraCountries(prev => [...prev, newCountry]);
    toast.success(`${info.flag} ${info.name} adicionado ao passaporte`);
  };

  // Map → "Quero visitar": abre o mesmo bottom sheet de "Adicionar próxima viagem"
  // já pré-preenchendo o destino com o país escolhido.
  const handleMarkWantToVisitFromMap = (info: CountryInfo) => {
    if (dreamTrips.some(t => t.destination.toLowerCase() === info.name.toLowerCase())) {
      toast.success(`${info.flag} ${info.name} já está nos destinos dos sonhos`);
      return;
    }
    setNewDreamDest(info.name);
    setNewDreamWhen('');
    setNewDreamYear(undefined);
    setNewDreamVibe('');
    setNewDreamPresetIdx(dreamTrips.length % DREAM_TRIP_PRESETS.length);
    setShowCountriesMap(false);
    setDreamTripSheetOpen(true);
  };

  const handleFollowToggle = async () => {
    if (!friend.userId || socialLoading) {
      if (!friend.userId) toast.error('Abra um perfil real para seguir');
      return;
    }
    setSocialLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowersDelta((d) => d + (next ? 1 : -1));
    try {
      if (next) {
        await followProfile(friend.userId);
        setIsBlocked(false);
      } else {
        await unfollowProfile(friend.userId);
      }
    } catch (error) {
      setIsFollowing(!next);
      setFollowersDelta((d) => d + (next ? -1 : 1));
      console.error('[FriendProfileScreen] follow failed', error);
      toast.error('Não foi possível salvar essa ação');
    } finally {
      setSocialLoading(false);
    }
  };

  const handleOpenReport = () => {
    if (!friend.userId) {
      toast.error('Abra um perfil real para denunciar');
      return;
    }
    setOtherMenuOpen(false);
    setReportSheetOpen(true);
  };

  const handleSubmitReport = async (payload: { reasonId: string; reasonLabel: string; details: string }) => {
    if (!friend.userId) throw new Error('Perfil inválido');
    await reportProfile(friend.userId, payload.reasonLabel, payload.details);
  };

  const handleBlockToggle = async () => {
    if (!friend.userId) {
      toast.error('Abra um perfil real para bloquear');
      return;
    }
    setOtherMenuOpen(false);
    const next = !isBlocked;
    setIsBlocked(next);
    if (next) setIsFollowing(false);
    try {
      if (next) {
        await blockProfile(friend.userId);
        toast.success(`${friend.name} foi bloqueado`);
      } else {
        await unblockProfile(friend.userId);
        toast.success(`${friend.name} foi desbloqueado`);
      }
    } catch (error) {
      setIsBlocked(!next);
      console.error('[FriendProfileScreen] block failed', error);
      toast.error('Não foi possível salvar essa ação');
    }
  };

  // Compute rank
  const totalSales = parseInt(friend.followers.replace(/\D/g, '')) || 0;
  const totalReviews = publicItineraries.reduce((sum, it) => sum + it.reviewCount, 0);
  const rankInfo = getTravelerRank(totalSales, totalReviews);

  const allReviews = useMemo(() => {
    return publicItineraries.flatMap(it =>
      it.comments.map((c, idx) => ({
        ...c,
        itineraryTitle: it.title,
        itineraryId: it.id,
        // Stable rating derived from itinerary rating + slight variation per comment
        rating: Math.max(1, Math.min(5, Math.round((it.rating + ((idx % 3) - 1) * 0.5) * 2) / 2)),
      }))
    );
  }, [publicItineraries]);

  // Determinar se o perfil tem conteúdo além dos interesses (para empty state divertido)
  const hasProfileContent = useMemo(() => {
    if (isSelf) return true;
    const hasBio = !!friend.bio?.trim();
    const hasCountries = countries.length > 0;
    const hasDreamTrips = dreamTrips.length > 0;
    const hasItineraries = publicItineraries.length > 0;
    const hasReviews = publicItineraries.some(it => it.comments.length > 0);
    return hasBio || hasCountries || hasDreamTrips || hasItineraries || hasReviews;
  }, [isSelf, friend, countries, dreamTrips, publicItineraries]);

  if (showSalesSummary) {
    return <SalesSummaryScreen onBack={() => setShowSalesSummary(false)} />;
  }


  const handleUpdatePhotos = (_countryCode: string, _photos: string[]) => {};

  const handleDeleteCountry = (countryCode: string) => {
    // Only "extra" (user-added) countries can be removed from local storage.
    setExtraCountries(prev => prev.filter(c => c.code !== countryCode));
    setSelectedCountry(null);
    setSheetOpen(false);
  };

  if (showAllItineraries) {
    return (
      <CreatorItinerariesScreen
        creatorName={friend.name}
        itineraries={publicItineraries}
        acquiredIds={duplicatedIds}
        onBack={() => setShowAllItineraries(false)}
        onItineraryClick={(id) => {
          setShowAllItineraries(false);
          onItineraryClick?.(id);
        }}
      />
    );
  }

  if (showAllReviews) {
    const avg = publicItineraries.length > 0
      ? publicItineraries.reduce((s, it) => s + it.rating, 0) / publicItineraries.length
      : 0;
    return (
      <AllReviewsScreen
        creatorName={friend.name}
        reviews={allReviews}
        averageRating={avg}
        onBack={() => setShowAllReviews(false)}
      />
    );
  }

  if (showCountriesMap) {
    return (
      <VisitedCountriesMapScreen
        countries={countries}
        userName={isSelf ? undefined : friend.name}
        onBack={() => setShowCountriesMap(false)}
        onMarkVisited={isSelf ? handleMarkVisitedFromMap : undefined}
        onMarkWantToVisit={isSelf ? handleMarkWantToVisitFromMap : undefined}
        onDeleteCountry={isSelf ? handleDeleteCountry : undefined}
      />
    );
  }

  if (showSettings) {
    // Render specific settings sub-screen
    const closeSub = () => setSettingsScreen(null);
    if (settingsScreen === 'subscription') return <SubscriptionScreen onBack={closeSub} />;
    if (settingsScreen === 'purchases') return <PurchasesScreen onBack={closeSub} onNavigateToItinerary={(id) => { setShowSettings(false); setSettingsScreen(null); onItineraryClick?.(id); }} />;
    if (settingsScreen === 'payment') return <PaymentSettingsScreen onBack={closeSub} />;
    
    if (settingsScreen === 'login-security') return <LoginSecurityScreen onBack={closeSub} />;
    if (settingsScreen === 'notifications') return <NotificationSettingsScreen onBack={closeSub} />;
    if (settingsScreen === 'help-center') return <HelpCenterScreen onBack={closeSub} />;

    return (
      <div className="min-h-screen bg-white pb-12">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white">
          <div className="flex items-center gap-3 px-4 pt-safe-top pb-3">
            <BackButton onClick={() => setShowSettings(false)} />
            <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
              Configurações
            </h1>
          </div>
        </div>

        {[
          { title: 'Carteira', items: walletItems },
          { title: 'Conta', items: accountItems },
          { title: 'Suporte', items: supportItems },
        ].map((section) => (
          <div key={section.title} className="px-5 mt-5">
            <h2 className="text-foreground mb-2" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
              {section.title}
            </h2>
            {section.items.map((item: any, idx) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.isToggle) return;
                  if (item.action === 'contact') { setContactOpen(true); return; }
                  if (item.key) setSettingsScreen(item.key);
                }}
                className="w-full flex items-center justify-between py-3 text-left"
                style={{ borderBottom: idx < section.items.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <Icon name={item.icon} size={20} className="text-muted-foreground text-xs" />
                  <span className="text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                    {item.label}
                  </span>
                </div>
                {item.isToggle ? (
                  <div
                    onClick={(e) => { e.stopPropagation(); setDarkMode(!darkMode); }}
                    className="relative w-11 h-6 rounded-full cursor-pointer transition-colors"
                    style={{ background: darkMode ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.25)' }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: darkMode ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </div>
                ) : (
                  <Icon name="chevron_right" size={18} className="text-muted-foreground text-xs" />
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Sair / Excluir conta */}
        <div className="px-5 mt-8">
          {dangerItems.map((item, idx) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between py-3 text-left"
              style={{ borderBottom: idx < dangerItems.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
              onClick={async () => {
                if (item.action === 'signout') {
                  await signOut();
                  navigate('/login', { replace: true });
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Icon name={item.icon} size={20} style={{ color: item.danger ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }} />
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)', color: item.danger ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
                  {item.label}
                </span>
              </div>
              <Icon name="chevron_right" size={18} className="text-muted-foreground text-xs" />
            </button>
          ))}
        </div>

        <ContactUsSheet isOpen={contactOpen} onClose={() => setContactOpen(false)} />
      </div>
    );
  }

  const isScreenLoading = isLoading || isFetchingPublicItineraries || (isSelf && myItinerariesLoading);

  if (isScreenLoading) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] pb-24 animate-pulse">
        {/* Header */}
        <div className="relative flex items-center justify-between px-4 pb-2" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <div className="flex items-center">
            <BackButton onClick={onBack} ariaLabel="Voltar" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 h-6 bg-[#0A0A0A]/10 rounded w-24" />
          <div className="w-11 h-11 bg-white rounded-full shadow-sm" />
        </div>

        {/* Profile Card Shimmer */}
        <div className="px-5 mt-3 mb-4">
          <div className="card-base p-5 bg-white border border-[#0A0A0A]/5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#0A0A0A]/10 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="h-4 bg-[#0A0A0A]/10 rounded w-2/3" />
                <div className="h-3 bg-[#0A0A0A]/10 rounded w-1/3" />
                <div className="h-3 bg-[#0A0A0A]/10 rounded w-1/2" />
              </div>
            </div>
            <div className="h-9 bg-[#0A0A0A]/10 rounded-xl w-full" />
          </div>
        </div>

        {/* Highlights Shimmer */}
        <div className="px-5 space-y-3">
          <div className="h-20 bg-white rounded-2xl border border-[#0A0A0A]/5 p-4 flex gap-3">
            <div className="w-10 h-10 bg-[#0A0A0A]/10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#0A0A0A]/10 rounded w-1/3" />
              <div className="h-3 bg-[#0A0A0A]/10 rounded w-2/3" />
            </div>
          </div>
          <div className="h-20 bg-white rounded-2xl border border-[#0A0A0A]/5 p-4 flex gap-3">
            <div className="w-10 h-10 bg-[#0A0A0A]/10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#0A0A0A]/10 rounded w-1/4" />
              <div className="h-3 bg-[#0A0A0A]/10 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2] pb-24">
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 pb-2" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
        <div className="flex items-center">
          <BackButton onClick={onBack} ariaLabel="Voltar" />
        </div>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
          {friend.username ? (friend.username.startsWith('@') ? friend.username : `@${friend.username}`) : 'Perfil'}
        </h1>
        {isSelf ? (
          <div className="flex items-center gap-2">
            {hasItinerariesForSale && (
              <button
                onClick={handleOpenSalesSummary}
                className="relative w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 active:opacity-80 transition-all"
                aria-label="Resumo de vendas"
              >
                <Icon name="account_balance_wallet" size={22} style={{ color: '#1A1C40' }} />
                {unreadSalesCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white"
                    aria-label={`${unreadSalesCount} novas vendas`}
                  >
                    {unreadSalesCount > 99 ? '99+' : unreadSalesCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 active:opacity-80 transition-all"
              aria-label="Configurações"
            >
              <Icon name="settings" size={22} style={{ color: '#1A1C40' }} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setOtherMenuOpen((v) => !v)}
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 active:opacity-80 transition-all"
              aria-label="Mais opções"
            >
              <Icon name="more_horiz" size={22} style={{ color: '#1A1C40' }} />
            </button>
            {otherMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setOtherMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 z-40 rounded-xl overflow-hidden bg-white"
                  style={{ minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                >
                  <button
                    onClick={handleOpenReport}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-muted active:bg-muted"
                    style={{ fontSize: 14, color: '#1A1C40', fontWeight: 500 }}
                  >
                    <Icon name="flag" size={16} style={{ color: '#1A1C40' }} />
                    Reportar usuário
                  </button>
                  <div style={{ borderTop: '1px solid hsl(var(--divider))' }} />
                  <button
                    onClick={handleBlockToggle}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-muted active:bg-muted"
                    style={{ fontSize: 14, color: 'hsl(var(--destructive))', fontWeight: 500 }}
                  >
                    <Icon name="block" size={16} style={{ color: 'hsl(var(--destructive))' }} />
                    {isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="px-5 mt-3 mb-4">
        <div className="card-base p-5">
          <div className="flex items-center gap-4 mb-3">
            {friend.avatar ? (
              <img src={friend.avatar} alt={friend.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <UserAvatar
                src={null}
                alt="Sem foto de perfil"
                size={64}
                className="flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  {friend.name}
                </h2>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" style={{ marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10" fill="#1D9BF0"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 1 }}>
                {friend.location && (
                  <div className="flex items-center gap-0.5">
                    <Icon name="location_on" size={12} className="text-muted-foreground text-xs" />
                    <span className="text-muted-foreground text-xs font-medium">{friend.location}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    const handle = friend.username?.replace(/^@/, '');
                    if (isSelf) navigate('/me/seguindo', { state: { friend } });
                    else if (handle) navigate(`/u/${handle}/seguindo`, { state: { friend } });
                  }}
                  className="flex items-center gap-1 active:opacity-70"
                >
                  <span className="text-foreground text-sm" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{liveCounts ? liveCounts.following : friend.following}</span>
                  <span className="text-muted-foreground text-sm font-medium">seguindo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const handle = friend.username?.replace(/^@/, '');
                    if (isSelf) navigate('/me/seguidores', { state: { friend } });
                    else if (handle) navigate(`/u/${handle}/seguidores`, { state: { friend } });
                  }}
                  className="flex items-center gap-1 ml-2 active:opacity-70"
                >
                  <span className="text-foreground text-sm" style={{ fontWeight: 'var(--font-weight-semibold)' }}>{(() => {
                    if (liveCounts) return Math.max(0, liveCounts.followers + followersDelta).toString();
                    const raw = String(friend.followers ?? '0');
                    const n = parseInt(raw.replace(/\D/g, ''), 10);
                    if (!Number.isFinite(n) || /[a-zA-Z]/.test(raw)) return raw;
                    return Math.max(0, n + followersDelta).toString();
                  })()}</span>
                  <span className="text-muted-foreground text-sm font-medium">seguidores</span>
                </button>
              </div>
            </div>
          </div>
          {/* Bio */}
          {friend.bio && friend.bio.trim().length > 0 && (
            <p
              className="text-muted-foreground mb-3 font-medium"
              style={{
                fontSize: '15px',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}
            >
              {friend.bio}
            </p>
          )}
          {/* Redes sociais */}
          {(() => {
            const ig = (friend.instagram ?? '').replace(/^@/, '').trim();
            const tt = (friend.tiktok ?? '').replace(/^@/, '').trim();
            const yt = (friend.youtube ?? '').replace(/^@/, '').trim();
            if (!ig && !tt && !yt) return null;
            const navy = '#1A1C40';
            return (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setSocialLinksOpen(true)}
                  className="inline-flex items-center gap-1.5 active:opacity-70"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: navy }}>Redes sociais</span>
                </button>
              </div>
            );
          })()}





          {/* Action buttons */}
          {isSelf ? (
            <button
              onClick={onEditProfile}
              className="btn-outline w-full"
              style={{ fontSize: '14px', fontWeight: 'var(--font-weight-semibold)', padding: '8px 14px' }}
            >
              Editar perfil
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={onChat}
                  className="btn-outline flex-1"
                  style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', padding: '8px 14px' }}
                >
                  <Icon name="chat" size={14} />
                  Chat
                </button>
                <button
                  onClick={handleFollowToggle}
                  disabled={socialLoading || isBlocked}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full transition-all active:scale-[0.98]"
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    padding: '8px 14px',
                    background: isBlocked ? '#E5E7EB' : isFollowing ? '#1A1C40' : '#9DCC36',
                    color: isBlocked ? '#8E8E93' : isFollowing ? '#FFFFFF' : '#1A1C40',
                    border: 'none',
                    opacity: socialLoading ? 0.7 : 1,
                  }}
                >
                  {isFollowing && !isBlocked && <Icon name="check" size={14} style={{ color: '#FFFFFF' }} />}
                  {isBlocked ? 'Bloqueado' : isFollowing ? 'Seguindo' : 'Seguir'}
                </button>
              </div>
              {/* AI Vibe Check — secondary, AI-flavored action */}
              <button
                onClick={() => setShowVibeCheck(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-full transition-all active:scale-[0.98]"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '7px 12px',
                  color: '#7C3AED',
                  background: 'linear-gradient(90deg, rgba(157,204,54,0.08) 0%, rgba(124,58,237,0.10) 100%)',
                  border: '1px solid rgba(124,58,237,0.20)',
                }}
              >
                <Icon name="auto_awesome" size={12} filled style={{ color: '#7C3AED' }} />
                Conferir sintonia
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ EMPTY STATE DIVERTIDO — perfil sem informações ═══ */}
      {!isSelf && !hasProfileContent && (
        <div className="px-5 mb-8">
          <div className="card-base p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
              <span className="text-2xl">🫣</span>
            </div>
            <h3 className="text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
              Esse perfil ainda é um mistério
            </h3>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5, maxWidth: 280 }}>
              Por enquanto só sabemos os interesses de viagem. Em breve tem mais histórias por aqui.
            </p>

          </div>
        </div>
      )}

      {/* ═══ HIGHLIGHT / CREDIBILIDADE — removido (pedido do usuário) ═══ */}


      {/* Highlight picker sheet */}
      {isSelf && highlightPickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          onClick={() => setHighlightPickerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
            style={{ maxWidth: 430 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-3 pb-1">
              <span className="block w-10 h-1 rounded-full" style={{ background: '#D1D5DB' }} />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1C40' }}>
                Escolher destaque
              </h3>
              <button
                onClick={() => setHighlightPickerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#F2F2F2' }}
                aria-label="Fechar"
              >
                <Icon name="close" size={16} style={{ color: '#1A1C40' }} />
              </button>
            </div>
            <p className="px-5 pb-3" style={{ fontSize: 13, color: '#8E8E93', lineHeight: 1.4 }}>
              Escolha qual destaque aparece no seu perfil para outros viajantes.
            </p>
            <div className="overflow-y-auto px-3 pb-6">
              {AVAILABLE_HIGHLIGHTS.map(h => {
                const isActive = h.id === selectedHighlightId;
                return (
                  <button
                    key={h.id}
                    onClick={() => {
                      setSelectedHighlightId(h.id);
                      try { localStorage.setItem(HIGHLIGHT_STORAGE_KEY, h.id); } catch {}
                      setHighlightPickerOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 active:opacity-70"
                    style={{
                      background: isActive ? '#F0F7E0' : 'transparent',
                      border: isActive ? '1.5px solid #9DCC36' : '1.5px solid transparent',
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-[22px] leading-none"
                      style={{ background: '#F2F2F2' }}
                    >
                      {h.emoji}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1C40', lineHeight: 1.2 }}>
                        {h.title}
                      </p>
                      <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 2, lineHeight: 1.3 }}>
                        {h.description}
                      </p>
                    </div>
                    {isActive && (
                      <Icon name="check_circle" size={20} style={{ color: '#9DCC36' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {(isSelf || publicItineraries.length > 0) && (
        <div className="px-5 mb-4">
          <button
            type="button"
            onClick={() => { if (isSelf) setHighlightPickerOpen(true); }}
            className="w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.99]"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', cursor: isSelf ? 'pointer' : 'default' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#F2F2F2', fontSize: '20px' }}
            >
              {selectedHighlight.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1C40' }}>{selectedHighlight.title}</p>
              <p style={{ fontSize: '11px', color: '#8E8E93' }}>{selectedHighlight.description}</p>
            </div>
            {isSelf && <Icon name="chevron_right" size={18} style={{ color: '#8E8E93' }} />}
          </button>
        </div>
      )}

      {(isSelf || publicItineraries.length > 0) && (

      <div className="mb-8">
        <button
          onClick={() => publicItineraries.length > 0 && setShowAllItineraries(true)}
          className="flex items-center gap-1 mb-3 px-5 active:opacity-70"
          disabled={publicItineraries.length === 0 && myPublicItineraries.length === 0}
        >
          <h3 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
            Roteiros à venda
          </h3>
          {publicItineraries.length > 0 && (
            <Icon name="chevron_right" size={18} style={{ color: '#1A1C40' }} />
          )}
        </button>

        {isSelf && myPublicItineraries.length > 0 ? (
          <div className="pl-5">
            <HorizontalCarousel showDots={false} itemClassName="w-[240px]">
              {myPublicItineraries.map(it => {
                const customCover = it.images?.find(img => img && !img.startsWith('blob:'));
                const cover = resolveTripThumbnailImages(it.destinations || [], customCover)[0];
                const primaryDest = (it.destinations?.[0] || '').split(',')[0];
                const cities = (it.destinations || []).length;
                const days = it.startDate && it.endDate
                  ? Math.max(1, differenceInDays(new Date(it.endDate), new Date(it.startDate)) + 1)
                  : null;
                const priceReais = it.priceCents != null ? it.priceCents / 100 : null;
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      if (isSelf) {
                        navigate('/home', { state: { openCreatorDashboardItinerary: it } });
                      } else {
                        navigate(`/itinerary/${it.id}`);
                      }
                    }}
                    className="w-[240px] flex flex-col text-left bg-card rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}
                  >
                    <div className="relative w-full aspect-[16/10] overflow-hidden p-2">
                      <img src={cover} alt={it.title} className="w-full h-full object-cover rounded-xl" />
                      {primaryDest && (
                        <div className="absolute top-4 left-4 flex items-center gap-1 bg-white rounded-full pl-2 pr-2.5 py-1 shadow-sm">
                          <span className="text-[13px] leading-none">📍</span>
                          <span className="text-[11px] font-semibold text-foreground">{primaryDest}</span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
                      <h3 className="font-bold text-[15px] text-foreground leading-tight line-clamp-1">{it.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <Icon name="location_on" size={14} style={{ color: '#1E293B' }} />
                        <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{cities} {cities === 1 ? 'cidade' : 'cidades'}</span>
                        {days && (
                          <>
                            <Icon name="schedule" size={14} style={{ color: '#1E293B' }} className="ml-2" />
                            <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{days} {days === 1 ? 'dia' : 'dias'}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-start pt-1">
                        {priceReais !== null && priceReais > 0 ? (
                          <span className="text-[15px] font-bold text-foreground">R$ {priceReais.toFixed(0)}</span>
                        ) : (
                          <span className="text-muted-foreground font-semibold" style={{ fontSize: '12px' }}>Grátis</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </HorizontalCarousel>
          </div>
        ) : publicItineraries.length === 0 ? (
          <div className="px-5">
            {isSelf ? (
              <button
                onClick={onCreatorProgram}
                className="w-full text-left rounded-2xl flex items-center gap-3 px-4 py-3 active:opacity-80 transition-opacity"
                style={{ background: '#FFFFFF' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(157, 204, 54, 0.15)' }}
                >
                  <Icon name="map" size={18} style={{ color: '#9DCC36' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1C40', lineHeight: 1.2 }}>
                    Torne-se um criador
                  </p>
                  <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 2, lineHeight: 1.3 }}>
                    Publique roteiros e ganhe dinheiro
                  </p>
                </div>
                <Icon name="chevron_right" size={20} style={{ color: '#1A1C40' }} className="flex-shrink-0" />
              </button>
            ) : (
              <div className="card-base flex items-center gap-3 px-4" style={{ minHeight: 88 }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F2F2F2' }}>
                  <Icon name="map" size={20} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <h4 className="text-foreground font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                    Sem roteiros publicados
                  </h4>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.3 }}>
                    Esse perfil ainda não publicou nenhum roteiro.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pl-5">
            <HorizontalCarousel showDots={false} itemClassName="w-[240px]">
              {publicItineraries.map(it => {
                const isAcquired = duplicatedIds.has(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => onItineraryClick?.(it.id)}
                    className="w-[240px] flex flex-col text-left bg-card rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}
                  >
                    <div className="relative w-full aspect-[16/10] overflow-hidden p-2">
                      <img src={it.image} alt={it.title} className="w-full h-full object-cover rounded-xl" />
                      {it.theme && (
                        <div className="absolute top-4 left-4 flex items-center gap-1 bg-white rounded-full pl-2 pr-2.5 py-1 shadow-sm">
                          <span className="text-[13px] leading-none">{it.theme.emoji}</span>
                          <span className="text-[11px] font-semibold text-foreground">{it.theme.label}</span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
                      <h3 className="font-bold text-[15px] text-foreground leading-tight line-clamp-1">{it.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <Icon name="star" size={14} filled className="text-[#F2B90C]" />
                        <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{it.rating}</span>
                        <Icon name="location_on" size={14} style={{ color: '#1E293B' }} className="ml-2" />
                        <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{it.cities} cidades</span>
                        <Icon name="schedule" size={14} style={{ color: '#1E293B' }} className="ml-2" />
                        <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{it.duration}</span>
                      </div>
                      <div className="flex items-center justify-start pt-1">
                        {isAcquired ? (
                          <div className="inline-flex items-center gap-1 h-6 rounded-full px-2.5" style={{ background: '#F2F2F2' }}>
                            <Icon name="check_circle" size={12} style={{ color: '#1A1C40' }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#1A1C40' }}>Adquirido</span>
                          </div>
                        ) : it.price !== null ? (
                          <span className="text-[15px] font-bold text-foreground">R$ {it.price.toFixed(0)}</span>
                        ) : (
                          <span className="text-muted-foreground font-semibold" style={{ fontSize: '12px' }}>Grátis</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </HorizontalCarousel>
          </div>
        )}
      </div>
      )}

      {/* ═══ AVALIAÇÕES ═══ */}
      {/* Oculto para o próprio usuário quando ele ainda não tem avaliações */}
      {((isSelf && allReviews.length > 0) || (!isSelf && allReviews.length > 0)) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-5">
            <button
              onClick={() => allReviews.length > 0 && setShowAllReviews(true)}
              className="flex items-center gap-1 active:opacity-70"
              disabled={allReviews.length === 0}
            >
              <h3 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                Avaliações
              </h3>
              {allReviews.length > 0 && (
                <Icon name="chevron_right" size={18} style={{ color: '#1A1C40' }} />
              )}
            </button>
          </div>

          {allReviews.length === 0 ? (
            <div className="px-5">
              <div className="card-base flex items-center gap-3 px-4" style={{ minHeight: 88 }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F2F2F2' }}>
                  <Icon name="chat" size={20} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <h4 className="text-foreground font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                    Ainda sem avaliações
                  </h4>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.3 }}>
                    As avaliações aparecem aqui após viagens concluídas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="pl-5">
              <HorizontalCarousel showDots={false} itemClassName="w-[260px]">
                {allReviews.map((review, idx) => (
                  <div key={idx} className="card-base p-3.5 w-full h-full">
                    <div className="flex items-start gap-3">
                      <img src={review.avatar} alt={review.user} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                            {review.user}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Icon key={i} name="star" size={9} filled style={{ color: '#F2B90C' }} />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-1 text-xs" style={{ fontSize: '11px' }}>
                          sobre <span className="text-foreground font-medium">{review.itineraryTitle}</span>
                        </p>
                        <p className="text-foreground text-sm" style={{ fontSize: 'var(--text-sm)', lineHeight: '1.4' }}>"{review.text}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </HorizontalCarousel>
            </div>
          )}
        </div>
      )}

      {/* ═══ PASSAPORTE ═══ */}
      {(isSelf || countries.length > 0) && (
      <div className="mb-8">
        <button
          onClick={() => setShowCountriesMap(true)}
          className="w-full flex items-center justify-between mb-3 px-5 active:opacity-70"
        >
          <div className="flex flex-col items-start">
            <h3 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Passaporte · {countries.length} {countries.length === 1 ? 'país' : 'países'}
            </h3>
            <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
              Toque para marcar os países que você já visitou
            </span>
          </div>
          <Icon name="chevron_right" size={18} style={{ color: '#1A1C40' }} />
        </button>
        {countries.length === 0 ? (
          <div className="px-5">
            {isSelf ? (
              <button
                type="button"
                onClick={() => setShowCountriesMap(true)}
                className="w-full card-base flex items-center gap-3 px-4"
                style={{ minHeight: 88 }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F2F2F2' }}>
                  <Icon name="public" size={20} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <h4 className="text-foreground font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                    Crie seu passaporte
                  </h4>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.3 }}>
                    Marque os países que você já visitou.
                  </p>
                </div>
              </button>
            ) : (
              <div className="card-base flex items-center gap-3 px-4" style={{ minHeight: 88 }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F2F2F2' }}>
                  <Icon name="public" size={20} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <h4 className="text-foreground font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                    Passaporte vazio
                  </h4>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.3 }}>
                    Nenhum país visitado ainda.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 w-full min-w-0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '8px 0', overflow: 'hidden' }}>
            <HorizontalCarousel
              showDots={false}
              itemClassName="w-[100px]"
            >
              {countries.map((country, idx) => {
                const stampColors = [
                  'hsl(var(--capri-normal))',
                  'hsl(var(--florida-normal))',
                  'hsl(var(--violet-normal))',
                  'hsl(var(--cyan-dark))',
                  'hsl(var(--sun-dark))',
                  'hsl(var(--sicilia-dark))',
                ];
                const rotations = [-4, 3, -2, 5, -3, 2, -5, 1, -1, 4];
                const color = stampColors[idx % stampColors.length];
                const rotation = rotations[idx % rotations.length];
                return (
                  <button
                    key={country.code}
                    onClick={() => { setSelectedCountry(country); setSheetOpen(true); }}
                    className="relative w-[100px] h-[100px] rounded-lg flex flex-col items-center justify-center active:scale-95 flex-shrink-0"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      border: `2px solid ${color}`,
                      padding: '8px 4px',
                      transition: 'transform 0.15s ease',
                      background: 'hsl(32 22% 93%)',
                    }}
                  >
                    {/* Dashed inner border */}
                    <div
                      className="absolute inset-[3px] rounded-md pointer-events-none"
                      style={{ border: `1.5px dashed ${color}`, opacity: 0.3 }}
                    />

                    <span style={{ fontSize: '28px', lineHeight: 1 }}>{country.flag}</span>
                    <span
                      className="mt-1 uppercase tracking-wider text-center"
                      style={{
                        fontSize: '9px',
                        fontWeight: 'var(--font-weight-bold)',
                        color,
                        letterSpacing: '0.08em',
                        lineHeight: 1.1,
                      }}
                    >
                      {country.name}
                    </span>
                    <span
                      style={{
                        fontSize: '8px',
                        fontWeight: 'var(--font-weight-semibold)',
                        color,
                        opacity: 0.75,
                      }}
                    >
                      {country.year}
                    </span>

                    {/* Ink smudge */}
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full pointer-events-none"
                      style={{
                        background: color,
                        opacity: 0.05,
                        filter: 'blur(4px)',
                      }}
                    />
                  </button>
                );
              })}
            </HorizontalCarousel>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ═══ PRÓXIMAS VIAGENS (Dream trips / Wanderlist) ═══ */}
      {(isSelf || dreamTrips.length > 0) && (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 px-5">
          <div className="flex flex-col items-start">
            <h3 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Destinos dos sonhos
            </h3>
            <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
              {isSelf ? 'Salve destinos que você quer viver um dia' : `Destinos que ${friend.name.split(' ')[0]} quer conhecer`}
            </span>
          </div>
          {isSelf && dreamTrips.length > 0 && (
            <button
              type="button"
              onClick={() => setDreamTripSheetOpen(true)}
              aria-label="Adicionar destino dos sonhos"
              className="inline-flex items-center gap-1 flex-shrink-0 transition-transform active:scale-95"
              style={{
                background: 'transparent',
                color: '#1A1C40',
                padding: 0,
                fontSize: '14px',
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              <Icon name="add" size={14} style={{ color: '#1A1C40' }} />
              Novo
            </button>
          )}
        </div>

        {dreamTrips.length === 0 ? (
          <div className="px-5">
            <button
              type="button"
              onClick={() => setDreamTripSheetOpen(true)}
              className="w-full card-base flex items-center gap-3 px-4"
              style={{ minHeight: 88 }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F2F2F2' }}>
                <Icon name="location_on" size={20} className="text-muted-foreground" />
              </div>
              <div className="flex flex-col items-start text-left">
                <h4 className="text-foreground font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                  Adicione seu primeiro destino
                </h4>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.3 }}>
                  Salve lugares para suas próximas viagens.
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="pl-5">
            <HorizontalCarousel showDots={false} itemClassName="w-[180px]">
              {dreamTrips.map(trip => (
                <div
                  key={trip.id}
                  className="relative w-full rounded-2xl overflow-hidden"
                  style={{
                    aspectRatio: '1 / 1',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* Background image */}
                  <img src={trip.image} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover" />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{ background: trip.gradient, mixBlendMode: 'multiply', opacity: 0.55 }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.75) 100%)' }} />

                  {/* Top: remove button */}
                  {isSelf && (
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => setDreamTripToRemove(trip)}
                        className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform"
                        style={{ background: 'rgba(0,0,0,0.45)' }}
                        aria-label="Remover"
                      >
                        <Icon name="close" size={14} style={{ color: '#FFFFFF' }} />
                      </button>
                    </div>
                  )}

                  {/* Bottom: text */}
                  <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white">
                    <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
                      {trip.when}
                    </p>
                    <h4 style={{ fontSize: 17, fontWeight: 800, marginTop: 4, lineHeight: 1.15 }}>
                      {trip.destination}
                    </h4>
                    <p style={{ fontSize: 11, opacity: 0.92, marginTop: 4, lineHeight: 1.25 }}>
                      {trip.vibe}
                    </p>
                  </div>
                </div>
              ))}
            </HorizontalCarousel>
          </div>
        )}
      </div>
      )}

      {/* Sheet: adicionar próxima viagem */}
      {dreamTripSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDreamTripSheetOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl"
            style={{ maxWidth: 430, maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center pt-3 pb-1">
              <span className="block w-10 h-1 rounded-full" style={{ background: '#D1D5DB' }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1C40' }}>Adicionar destino dos sonhos</h3>
              <button
                onClick={() => setDreamTripSheetOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#F2F2F2' }}
                aria-label="Fechar"
              >
                <Icon name="close" size={16} style={{ color: '#1A1C40' }} />
              </button>
            </div>

            <div className="px-5 pb-6 flex flex-col gap-4">
              {/* Destino — select de países */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1C40' }}>Destino</label>
                <Popover open={destPickerOpen} onOpenChange={setDestPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full mt-1.5 px-3 py-3 rounded-xl flex items-center justify-between text-left"
                      style={{ fontSize: 16, background: '#F2F2F2', color: newDreamDest ? '#1A1C40' : '#9CA3AF' }}
                    >
                      <span className="truncate">{newDreamDest || 'Selecione um país'}</span>
                      <Icon name="expand_more" size={20} style={{ color: '#1A1C40' }} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] max-h-[300px] overflow-hidden"
                    align="start"
                  >
                    <div className="p-2 border-b border-border">
                      <input
                        autoFocus
                        value={destSearch}
                        onChange={(e) => setDestSearch(e.target.value)}
                        placeholder="Buscar país..."
                        className="w-full px-3 py-2 rounded-lg outline-none"
                        style={{ fontSize: 16, background: '#F2F2F2', color: '#1A1C40' }}
                      />
                    </div>
                    <div className="max-h-[240px] overflow-y-auto">
                      {ALL_COUNTRIES
                        .filter((c) => c.name.toLowerCase().includes(destSearch.toLowerCase()))
                        .map((c) => (
                          <button
                            key={c.iso3}
                            type="button"
                            onClick={() => {
                              setNewDreamDest(c.name);
                              setDestPickerOpen(false);
                              setDestSearch('');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted text-left"
                            style={{ fontSize: 14, color: '#1A1C40' }}
                          >
                            <span style={{ fontSize: 18 }}>{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                          </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quando — período genérico (mês ou temporada) */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1C40' }}>Quando</label>
                <Popover open={whenPickerOpen} onOpenChange={setWhenPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full mt-1.5 px-3 py-3 rounded-xl flex items-center justify-between text-left"
                      style={{ fontSize: 16, background: '#F2F2F2', color: newDreamWhen ? '#1A1C40' : '#9CA3AF' }}
                    >
                      <span>{newDreamWhen || 'Selecione um período'}</span>
                      <Icon name="expand_more" size={20} style={{ color: '#1A1C40' }} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto"
                    align="start"
                  >
                    {DREAM_WHEN_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setNewDreamWhen(opt);
                          setWhenPickerOpen(false);
                        }}
                        className="w-full px-3 py-2.5 hover:bg-muted text-left"
                        style={{ fontSize: 14, color: '#1A1C40' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Ano — opcional */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1C40' }}>Ano</label>
                <Popover open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full mt-1.5 px-3 py-3 rounded-xl flex items-center justify-between text-left"
                      style={{ fontSize: 16, background: '#F2F2F2', color: newDreamYear ? '#1A1C40' : '#9CA3AF' }}
                    >
                      <span>{newDreamYear ? String(newDreamYear) : 'Selecione um ano (opcional)'}</span>
                      <Icon name="expand_more" size={20} style={{ color: '#1A1C40' }} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto"
                    align="start"
                  >
                    {(() => {
                      const current = new Date().getFullYear();
                      const years = Array.from({ length: 6 }, (_, i) => current + i);
                      return years.map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setNewDreamYear(yr);
                            setYearPickerOpen(false);
                          }}
                          className="w-full px-3 py-2.5 hover:bg-muted text-left"
                          style={{ fontSize: 14, color: '#1A1C40' }}
                        >
                          {yr}
                        </button>
                      ));
                    })()}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Vibe — opcional */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1C40' }}>Vibe da viagem</label>
                <Popover open={vibePickerOpen} onOpenChange={setVibePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full mt-1.5 px-3 py-3 rounded-xl flex items-center justify-between text-left"
                      style={{ fontSize: 16, background: '#F2F2F2', color: newDreamVibe ? '#1A1C40' : '#9CA3AF' }}
                    >
                      <span>{newDreamVibe || 'Selecione uma vibe (opcional)'}</span>
                      <Icon name="expand_more" size={20} style={{ color: '#1A1C40' }} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto"
                    align="start"
                  >
                    {DREAM_VIBE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setNewDreamVibe(opt);
                          setVibePickerOpen(false);
                        }}
                        className="w-full px-3 py-2.5 hover:bg-muted text-left"
                        style={{ fontSize: 14, color: '#1A1C40' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {(() => {
                const enabled = !!newDreamDest.trim() && !!newDreamWhen && !isAddingDreamTrip;
                return (
                  <button
                    onClick={addDreamTrip}
                    disabled={!enabled}
                    className="w-full mt-2 rounded-full transition-colors flex items-center justify-center gap-2"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '12px 14px',
                      background: enabled ? '#9DCC36' : '#E5E5E5',
                      color: enabled ? '#1A1C40' : '#9CA3AF',
                      cursor: enabled ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isAddingDreamTrip && <Icon name="refresh" className="animate-spin" size={16} />}
                    {isAddingDreamTrip ? 'Buscando foto perfeita...' : 'Adicionar'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sheet: confirmar exclusão de próxima viagem */}
      {dreamTripToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDreamTripToRemove(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl"
            style={{ maxWidth: 430 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center pt-3 pb-1">
              <span className="block w-10 h-1 rounded-full" style={{ background: '#D1D5DB' }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1C40' }}>Remover destino dos sonhos</h3>
              <button
                onClick={() => setDreamTripToRemove(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#F2F2F2' }}
                aria-label="Fechar"
              >
                <Icon name="close" size={16} style={{ color: '#1A1C40' }} />
              </button>
            </div>

            <div className="px-5 pb-6">
              <p className="text-muted-foreground text-xs" style={{ fontSize: 14, lineHeight: 1.4 }}>
                Tem certeza que deseja remover <strong style={{ color: '#1A1C40' }}>{dreamTripToRemove.destination}</strong> dos seus destinos dos sonhos?
              </p>

              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => setDreamTripToRemove(null)}
                  className="flex-1 rounded-full"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    color: '#1A1C40',
                    border: '1.5px solid #1A1C40',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    removeDreamTrip(dreamTripToRemove.id);
                    setDreamTripToRemove(null);
                  }}
                  className="flex-1 rounded-full"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    padding: '12px 14px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {(isSelf || interests.length > 0) && (
      <div className="px-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
            Interesses
          </h3>
          {isSelf && (
            <button
              onClick={() => setEditInterestsOpen(true)}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full"
              style={{ background: '#F2F2F7', color: '#1A1C40', fontSize: 12, fontWeight: 600 }}
              aria-label="Editar interesses"
            >
              <Icon name="edit" size={14} style={{ color: '#1A1C40' }} />
              Editar
            </button>
          )}
        </div>
        {interests.length === 0 ? (
          <button
            onClick={() => isSelf && setEditInterestsOpen(true)}
            disabled={!isSelf}
            className="w-full rounded-2xl py-4 px-3 text-center"
            style={{
              background: '#F2F2F7',
              color: '#8E8E93',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {isSelf ? 'Adicione seus interesses de viagem' : 'Sem interesses ainda'}
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {interests.map(tag => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5 h-7 rounded-2xl px-3"
                style={{ background: '#FFFFFF', fontSize: '12px', fontWeight: 500, color: '#1A1C40' }}
              >
                <Icon name={tag.icon} size={14} style={{ color: '#1A1C40' }} />
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
      )}

      {isSelf && (
        <EditInterestsSheet
          open={editInterestsOpen}
          onOpenChange={setEditInterestsOpen}
          selected={interests}
          onSave={persistInterests}
        />
      )}

      <CountryDetailSheet country={selectedCountry} open={sheetOpen} onOpenChange={setSheetOpen} onUpdatePhotos={handleUpdatePhotos} onDeleteCountry={isSelf ? handleDeleteCountry : undefined} />

      {checkoutItinerary && (
        <CheckoutSheet
          open={!!checkoutItinerary}
          onClose={() => setCheckoutItinerary(null)}
          itinerary={{
            title: checkoutItinerary.title,
            image: checkoutItinerary.image,
            author: checkoutItinerary.author,
            authorImage: checkoutItinerary.authorImage,
            duration: checkoutItinerary.duration,
            cities: checkoutItinerary.cities,
            places: checkoutItinerary.places,
            price: checkoutItinerary.price!,
          }}
          onConfirm={() => {
            setCheckoutItinerary(null);
            onItineraryClick?.(checkoutItinerary.id);
          }}
        />
      )}

      {/* AI Vibe Check Sheet */}
      <VibeCheckSheet
        isOpen={showVibeCheck}
        onClose={() => setShowVibeCheck(false)}
        friendName={friend.name}
        friendAvatar={friend.avatar}
        myAvatar={currentUser.avatar}
        myName={currentUser.name}
        myInterests={currentUser.interests}
        friendInterests={friendInterests}
        myVisited={myVisitedCountries}
        friendVisited={friend.countries.map(c => ({ name: c.name, flag: c.flag }))}
        myWishlist={isSelf ? dreamTrips.map(t => ({ name: t.destination, flag: t.emoji })) : []}
        friendWishlist={!isSelf ? dreamTrips.map(t => ({ name: t.destination, flag: t.emoji })) : []}
      />

      {/* Social Links Sheet */}
      {(() => {
        const ig = (friend.instagram ?? '').replace(/^@/, '').trim();
        const tt = (friend.tiktok ?? '').replace(/^@/, '').trim();
        const yt = (friend.youtube ?? '').replace(/^@/, '').trim();
        const navy = '#1A1C40';
        const items: { key: string; href: string; label: string; handle: string; icon: JSX.Element }[] = [];
        if (ig) items.push({
          key: 'ig', href: `https://instagram.com/${ig}`, label: 'Instagram', handle: `@${ig}`,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          ),
        });
        if (tt) items.push({
          key: 'tt', href: `https://www.tiktok.com/@${tt}`, label: 'TikTok', handle: `@${tt}`,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={navy} aria-hidden="true">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
            </svg>
          ),
        });
        if (yt) items.push({
          key: 'yt', href: `https://youtube.com/@${yt}`, label: 'YouTube', handle: `@${yt}`,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={navy} aria-hidden="true">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>
            </svg>
          ),
        });
        return (
          <BottomSheet open={socialLinksOpen} onClose={() => setSocialLinksOpen(false)} title="Redes sociais">
            <div className="flex flex-col gap-2 py-2">
              {items.map(item => (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSocialLinksOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card active:opacity-70"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: '15px', fontWeight: 700, color: navy }}>{item.label}</div>
                    <div className="text-muted-foreground truncate" style={{ fontSize: '13px' }}>{item.handle}</div>
                  </div>
                  <Icon name="open_in_new" size={18} className="text-muted-foreground flex-shrink-0" />
                </a>
              ))}
            </div>
          </BottomSheet>
        );
      })()}

      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        targetType="profile"
        targetName={friend.name}
        onSubmit={handleSubmitReport}
      />
    </div>
  );
}
