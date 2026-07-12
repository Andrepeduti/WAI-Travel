import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useNavStack } from '@/hooks/useNavStack';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation, TabType } from '@/components/travel/BottomNavigation';
import { HomeScreen, type TopCreator } from '@/components/screens/HomeScreen';
import { CreateBottomSheet } from '@/components/travel/CreateBottomSheet';
import { SuccessToast } from '@/components/travel/SuccessToast';

// Type-only imports for lazy-loaded screens (zero runtime cost).
import type { FriendProfileData } from '@/components/screens/FriendProfileScreen';
import type { ItineraryFormData } from '@/components/travel/CreateItinerarySheet';
import type { DisplayItinerary } from '@/components/screens/DestinationItinerariesScreen';
import type { CreatorProfileData } from '@/components/screens/CreatorProfileScreen';
import type { ItineraryListItem } from '@/components/screens/ItineraryListScreen';

// Heavy/secondary screens — loaded on demand to keep the initial bundle small.
const ExploreScreen = lazy(() => import('@/components/screens/ExploreScreen').then(m => ({ default: m.ExploreScreen })));
const TripsScreen = lazy(() => import('@/components/screens/TripsScreen').then(m => ({ default: m.TripsScreen })));
const AIAssistantScreen = lazy(() => import('@/components/screens/AIAssistantScreen').then(m => ({ default: m.AIAssistantScreen })));
const AIHistoryScreen = lazy(() => import('@/components/screens/AIHistoryScreen').then(m => ({ default: m.AIHistoryScreen })));
const MarketplaceItineraryScreen = lazy(() => import('@/components/screens/MarketplaceItineraryScreen').then(m => ({ default: m.MarketplaceItineraryScreen })));
const CreatorItineraryDashboardScreen = lazy(() => import('@/components/screens/CreatorItineraryDashboardScreen').then(m => ({ default: m.CreatorItineraryDashboardScreen })));
const ProfileScreen = lazy(() => import('@/components/screens/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const UserProfileScreen = lazy(() => import('@/components/screens/UserProfileScreen').then(m => ({ default: m.UserProfileScreen })));
const CreatorDashboardScreen = lazy(() => import('@/components/screens/CreatorDashboardScreen').then(m => ({ default: m.CreatorDashboardScreen })));
const FriendProfileScreen = lazy(() => import('@/components/screens/FriendProfileScreen').then(m => ({ default: m.FriendProfileScreen })));
const CreatorProgramScreen = lazy(() => import('@/components/screens/CreatorProgramScreen').then(m => ({ default: m.CreatorProgramScreen })));
const EditProfileScreen = lazy(() => import('@/components/screens/EditProfileScreen').then(m => ({ default: m.EditProfileScreen })));
const AchievementsScreen = lazy(() => import('@/components/screens/AchievementsScreen').then(m => ({ default: m.AchievementsScreen })));
const SalesSummaryScreen = lazy(() => import('@/components/screens/SalesSummaryScreen').then(m => ({ default: m.SalesSummaryScreen })));
const SearchScreen = lazy(() => import('@/components/screens/SearchScreen').then(m => ({ default: m.SearchScreen })));
const DestinationItinerariesScreen = lazy(() => import('@/components/screens/DestinationItinerariesScreen').then(m => ({ default: m.DestinationItinerariesScreen })));
const ChatScreen = lazy(() => import('@/components/screens/ChatScreen').then(m => ({ default: m.ChatScreen })));
const NotificationsScreen = lazy(() => import('@/components/screens/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const CreateItinerarySheet = lazy(() => import('@/components/travel/CreateItinerarySheet').then(m => ({ default: m.CreateItinerarySheet })));
const PlanLimitReachedSheet = lazy(() => import('@/components/travel/PlanLimitReachedSheet').then(m => ({ default: m.PlanLimitReachedSheet })));
const CreateCollectionSheet = lazy(() => import('@/components/travel/CreateCollectionSheet').then(m => ({ default: m.CreateCollectionSheet })));
const CreateGuideSheet = lazy(() => import('@/components/travel/CreateGuideSheet').then(m => ({ default: m.CreateGuideSheet })));
const AddVideoSheet = lazy(() => import('@/components/travel/AddVideoSheet').then(m => ({ default: m.AddVideoSheet })));
const AddVideoByLinkSheet = lazy(() => import('@/components/travel/AddVideoByLinkSheet').then(m => ({ default: m.AddVideoByLinkSheet })));
const PlannerItineraryScreen = lazy(() => import('@/components/screens/PlannerItineraryScreen').then(m => ({ default: m.PlannerItineraryScreen })));
const AddVideoFromGallerySheet = lazy(() => import('@/components/travel/AddVideoFromGallerySheet').then(m => ({ default: m.AddVideoFromGallerySheet })));
const CollectionDetailScreen = lazy(() => import('@/components/screens/CollectionDetailScreen').then(m => ({ default: m.CollectionDetailScreen })));
const ExperienceDetailScreen = lazy(() => import('@/components/screens/ExperienceDetailScreen').then(m => ({ default: m.ExperienceDetailScreen })));
const TripRemindersScreen = lazy(() => import('@/components/screens/TripRemindersScreen').then(m => ({ default: m.TripRemindersScreen })));
const PromoDetailScreen = lazy(() => import('@/components/screens/PromoDetailScreen').then(m => ({ default: m.PromoDetailScreen })));
const CreatorProfileScreen = lazy(() => import('@/components/screens/CreatorProfileScreen').then(m => ({ default: m.CreatorProfileScreen })));
const FindPeopleScreen = lazy(() => import('@/components/screens/FindPeopleScreen').then(m => ({ default: m.FindPeopleScreen })));
const SimilarTravelersScreen = lazy(() => import('@/components/screens/SimilarTravelersScreen').then(m => ({ default: m.SimilarTravelersScreen })));
const TopCreatorsScreen = lazy(() => import('@/components/screens/TopCreatorsScreen').then(m => ({ default: m.TopCreatorsScreen })));
const ItineraryListScreen = lazy(() => import('@/components/screens/ItineraryListScreen').then(m => ({ default: m.ItineraryListScreen })));
const PersonalInfoScreen = lazy(() => import('@/components/screens/PersonalInfoScreen').then(m => ({ default: m.PersonalInfoScreen })));
const LoginSecurityScreen = lazy(() => import('@/components/screens/LoginSecurityScreen').then(m => ({ default: m.LoginSecurityScreen })));
const PaymentSettingsScreen = lazy(() => import('@/components/screens/PaymentSettingsScreen').then(m => ({ default: m.PaymentSettingsScreen })));
const NotificationSettingsScreen = lazy(() => import('@/components/screens/NotificationSettingsScreen').then(m => ({ default: m.NotificationSettingsScreen })));
const LanguageScreen = lazy(() => import('@/components/screens/LanguageScreen').then(m => ({ default: m.LanguageScreen })));
const HelpCenterScreen = lazy(() => import('@/components/screens/HelpCenterScreen').then(m => ({ default: m.HelpCenterScreen })));
const CartScreen = lazy(() => import('@/components/screens/CartScreen').then(m => ({ default: m.CartScreen })));
const PurchasesScreen = lazy(() => import('@/components/screens/PurchasesScreen').then(m => ({ default: m.PurchasesScreen })));
const SubscriptionScreen = lazy(() => import('@/components/screens/SubscriptionScreen').then(m => ({ default: m.SubscriptionScreen })));
const GoalsSettingsScreen = lazy(() => import('@/components/screens/GoalsSettingsScreen').then(m => ({ default: m.GoalsSettingsScreen })));

import { addOptimisticItinerary, buildOptimisticItinerary, removeOptimisticItinerary, replaceOptimisticItinerary, useMyItineraries } from '@/hooks/use-my-itineraries';
// `saveUserCollection`/`deleteUserCollection`/`UserItinerary` continuam vindos do módulo de TripsScreen,
// mas como TripsScreen agora é lazy, importamos somente o que precisamos de forma estática (os helpers
// são leves; o componente em si só é avaliado quando referenciado).
import { saveUserCollection, deleteUserCollection, type UserItinerary } from '@/components/screens/TripsScreen';
import { createItinerary, updateItinerary, deleteItinerary, getUserItineraryById } from '@/lib/itinerariesApi';
import { loadPlannerActivities, loadPlannerTransports } from '@/lib/plannerActivitiesStore';
import { mockPeople } from '@/components/travel/ShareCollectionSheet';
import { getItineraryById, getItinerariesByAuthor, setItineraryAuthorOverride, ItineraryDataset } from '@/data/itineraries';
import waiLogo from '@/assets/wai-logo.png.asset.json';
import { buildSyntheticMarketplaceDataset } from '@/lib/syntheticMarketplaceDataset';
import { resolveTripThumbnailImages } from '@/lib/coverImageResolver';
import { differenceInDays, addDays, format } from 'date-fns';
import { formatLocalDate, parseLocalDate } from '@/lib/localDate';
import { ptBR } from 'date-fns/locale';
import { visitedCountries } from '@/data/visitedCountries';

// Suspense fallback for lazy-loaded screens — matches the App-level fallback
// so transitions look like an instant render with empty background.
const ScreenFallback = () => (
  <div className="flex h-[100dvh] w-full items-center justify-center bg-background" />
);

type ProfileSubScreen = 'main' | 'profile' | 'user' | 'creator' | 'friend' | 'creator-program' | 'edit' | 'achievements' | 'sales' | 'find-people' | 'top-creators' | 'personal-info' | 'login-security' | 'payment-settings' | 'notification-settings' | 'language' | 'help-center' | 'purchases' | 'subscription' | 'goals';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const { user: currentUser } = useCurrentUser();

  // Faz com que todos os roteiros estáticos (templates do app) apareçam como
  // criados pelo próprio app (WAI).
  useEffect(() => {
    setItineraryAuthorOverride({ name: 'WAI', avatar: waiLogo.url, username: '@wai', verified: true });
  }, []);


  // Auth gate: redireciona para /login se não houver sessão.
  // Damos um pequeno grace period (300ms) após `loading` virar false sem sessão
  // para evitar redirecionar prematuramente quando estamos chegando aqui logo
  // após o callback do OAuth, antes de o setSession + onAuthStateChange propagar.
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (authLoading) return;
    if (session) {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      return;
    }
    // Sem sessão: agenda um redirect com grace period.
    if (redirectTimerRef.current) return;
    redirectTimerRef.current = setTimeout(() => {
      redirectTimerRef.current = null;
      navigate('/login', { replace: true });
    }, 300);
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [session, authLoading, navigate]);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showItinerarySheet, setShowItinerarySheet] = useState(false);
  const [showPlanLimitSheet, setShowPlanLimitSheet] = useState(false);
  const { itineraries: myItinerariesForLimit } = useMyItineraries();
  const FREE_PLAN_ITINERARY_LIMIT = 3;
  // Conta apenas roteiros originais criados pelo próprio usuário.
  // Exclui: comprados (sourceDatasetId != null) e compartilhados (userId != auth user).
  // Não excluímos os publicados, pois eles também contam no limite do plano free.
  const ownCreatedCount = myItinerariesForLimit.filter(
    (it) => it.userId === session?.user?.id && it.sourceDatasetId == null
  ).length;

  // Listen for the custom event to show the plan limit sheet (e.g. from duplicating an itinerary)
  useEffect(() => {
    const handler = () => setShowPlanLimitSheet(true);
    window.addEventListener('wai:plan-limit-reached', handler);
    return () => window.removeEventListener('wai:plan-limit-reached', handler);
  }, []);

  /**
   * Opens the create itinerary sheet, but if the user is on the free plan
   * and already has the maximum number of itineraries, shows the upgrade
   * sheet instead.
   */
  const tryOpenItinerarySheet = () => {
    if (ownCreatedCount >= FREE_PLAN_ITINERARY_LIMIT) {
      setShowPlanLimitSheet(true);
      return;
    }
    setShowItinerarySheet(true);
  };

  // Abre o sheet de criar roteiro quando navegado com state { openCreateItinerary: true }
  useEffect(() => {
    const state = location.state as { openCreateItinerary?: boolean; openMarketplaceItineraryId?: number; openCreatorDashboardItinerary?: UserItinerary; openItineraryForPublish?: UserItinerary; openCollaboratorItineraryId?: string } | null;
    if (state?.openCreateItinerary) {
      tryOpenItinerarySheet();
      // Limpa o state para não reabrir em re-renderizações
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    // Deep link: abre roteiro colaborativo a partir do convite aceito.
    if (state?.openCollaboratorItineraryId) {
      getUserItineraryById(state.openCollaboratorItineraryId).then(dataset => {
        if (dataset) {
          handleUserItineraryClick(dataset);
        }
      });
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    // Deep link: abre tela do roteiro do marketplace compartilhado via /r/:datasetId.
    if (state?.openMarketplaceItineraryId) {
      const dataset = getItineraryById(state.openMarketplaceItineraryId);
      if (dataset) {
        setSelectedItinerary(dataset);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
    // Abre o dashboard de criador de um roteiro à venda (vindo do perfil em /profile).
    if (state?.openCreatorDashboardItinerary) {
      setCreatorDashboardItinerary(state.openCreatorDashboardItinerary);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // Abre um roteiro existente do usuário no planner com o fluxo de publicação já aberto.
    if (state?.openItineraryForPublish) {
      handleUserItineraryClick(state.openItineraryForPublish);
      setAutoOpenPublishFlow(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const [showGuideSheet, setShowGuideSheet] = useState(false);
  const [showAddVideoSheet, setShowAddVideoSheet] = useState(false);
  const [showAddVideoByLinkSheet, setShowAddVideoByLinkSheet] = useState(false);
  const [showAddVideoFromGallery, setShowAddVideoFromGallery] = useState(false);
  const [pendingVideoPlaces, setPendingVideoPlaces] = useState<any[] | null>(null);
  const [newItineraryData, setNewItineraryData] = useState<ItineraryFormData | null>(null);
  const [activeUserItineraryId, setActiveUserItineraryId] = useState<string | null>(null);
  const [activeUserItineraryDataset, setActiveUserItineraryDataset] = useState<ItineraryDataset | null>(null);
  const [activeUserItineraryIsPurchased, setActiveUserItineraryIsPurchased] = useState(false);
  const [autoOpenPublishFlow, setAutoOpenPublishFlow] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryDataset | null>(null);
  const [resumeCheckoutId, setResumeCheckoutId] = useState<number | null>(null);
  /** Marker that selectedItinerary came from a user-published itinerary (uuid) — render via datasetOverride. */
  const [injectedMarketplaceDataset, setInjectedMarketplaceDataset] = useState<ItineraryDataset | null>(null);
  /** When set, the marketplace view is showing the current user's own published itinerary. */
  const [ownedPublicUserItinerary, setOwnedPublicUserItinerary] = useState<UserItinerary | null>(null);
  /** When set, the seller-side dashboard for this user-published itinerary is shown. */
  const [creatorDashboardItinerary, setCreatorDashboardItinerary] = useState<UserItinerary | null>(null);
  /** When set, the planner is shown in "creator edit" mode for this published itinerary. */
  const [creatorEditingItinerary, setCreatorEditingItinerary] = useState<UserItinerary | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [destinationList, setDestinationList] = useState<{ country: string; continent: string; image: string } | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [newCollectionName, setNewCollectionName] = useState<string | null>(null);
  const [newCollectionSharedWith, setNewCollectionSharedWith] = useState<string[]>([]);
  const [selectedExperienceId, setSelectedExperienceId] = useState<number | null>(null);
  const [profileSubScreen, setProfileSubScreen] = useState<ProfileSubScreen>('main');
  // Origem da tela "Programa de Criadores" — controla para onde o botão Voltar retorna.
  const [creatorProgramOrigin, setCreatorProgramOrigin] = useState<'profile' | 'trips'>('profile');
  // Origem da tela "Assinatura" — controla para onde o botão Voltar retorna.
  const [subscriptionOrigin, setSubscriptionOrigin] = useState<'profile' | 'trips'>('profile');
  const [showChat, setShowChat] = useState(false);
  const [chatInitialContact, setChatInitialContact] = useState<{
    name: string;
    avatar: string;
    userId?: string;
    itineraryContext?: {
      itineraryId?: number;
      title: string;
      thumbnail: string;
      destination?: string;
      price?: number;
    };
  } | null>(null);
  const openChatWithContact = useCallback((
    name: string,
    avatar: string,
    itineraryContext?: {
      itineraryId?: number;
      title: string;
      thumbnail: string;
      destination?: string;
      price?: number;
    },
    userId?: string,
  ) => {
    setChatInitialContact({ name, avatar, userId, itineraryContext });
    setShowChat(true);
  }, []);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showAIHistory, setShowAIHistory] = useState(false);
  const [showTripReminders, setShowTripReminders] = useState(false);
  const [showPromoDetail, setShowPromoDetail] = useState(false);
  const [navigatedFromNotifications, setNavigatedFromNotifications] = useState(false);
  const [navigatedFromFriendProfile, setNavigatedFromFriendProfile] = useState(false);
  const [navigatedFromPurchases, setNavigatedFromPurchases] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showDeleteSuccessToast, setShowDeleteSuccessToast] = useState(false);
  const [showDeleteCollectionToast, setShowDeleteCollectionToast] = useState(false);
  const [returnToCollections, setReturnToCollections] = useState(false);
  const [returnToPublic, setReturnToPublic] = useState(false);
  const [purchasedItineraryId, setPurchasedItineraryId] = useState<number | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfileData | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfileData | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showSimilarTravelers, setShowSimilarTravelers] = useState(false);
  const [itineraryList, setItineraryList] = useState<{ title: string; items: ItineraryListItem[] } | null>(null);

  // ───────────────────────────────────────────────────────────────────────
  // Pilha de histórico de navegação: garante que o botão "voltar" sempre
  // retorne para a tela onde o usuário estava antes (mesmo quando uma
  // mesma tela pode ser aberta a partir de origens diferentes).
  // ───────────────────────────────────────────────────────────────────────
  const navSignature = useMemo(() => {
    return [
      activeTab,
      profileSubScreen,
      selectedCreator ? `creator:${(selectedCreator as any).id ?? selectedCreator.name}` : '',
      selectedFriend ? `friend:${(selectedFriend as any).id ?? (selectedFriend as any).name}` : '',
      selectedItinerary ? `it:${selectedItinerary.id}` : '',
      activeUserItineraryId ? `userIt:${activeUserItineraryId}` : '',
      creatorDashboardItinerary ? `dash:${creatorDashboardItinerary.id}` : '',
      selectedCollectionId != null ? `col:${selectedCollectionId}` : '',
      selectedExperienceId != null ? `exp:${selectedExperienceId}` : '',
      destinationList ? `dest:${destinationList.country}` : '',
      showSearch ? 'search' : '',
      showChat ? 'chat' : '',
      showNotifications ? 'notif' : '',
      showAIAssistant ? 'ai' : '',
      showAIHistory ? 'aih' : '',
      showCart ? 'cart' : '',
      showTripReminders ? 'trip-reminders' : '',
      showPromoDetail ? 'promo' : '',
      showSimilarTravelers ? 'similar' : '',
      newItineraryData ? 'new-it' : '',
    ].filter(Boolean).join('|');
  }, [
    activeTab, profileSubScreen, selectedCreator, selectedFriend, selectedItinerary,
    activeUserItineraryId, creatorDashboardItinerary, selectedCollectionId,
    selectedExperienceId, destinationList, showSearch, showChat, showNotifications,
    showAIAssistant, showAIHistory, showCart, showTripReminders, showPromoDetail,
    showSimilarTravelers, newItineraryData,
  ]);

  // Snapshot dos setters de tela: ao restaurar, reaplica todos os valores
  // capturados no momento em que a tela foi aberta.
  const captureRestore = useCallback(() => {
    const snap = {
      activeTab,
      profileSubScreen,
      selectedCreator,
      selectedFriend,
      selectedItinerary,
      activeUserItineraryId,
      activeUserItineraryDataset,
      creatorDashboardItinerary,
      selectedCollectionId,
      selectedExperienceId,
      destinationList,
      showSearch,
      showChat,
      showNotifications,
      showAIAssistant,
      showAIHistory,
      showCart,
      showTripReminders,
      showPromoDetail,
      showSimilarTravelers,
      newItineraryData,
      injectedMarketplaceDataset,
      ownedPublicUserItinerary,
      purchasedItineraryId,
      navigatedFromNotifications,
      navigatedFromFriendProfile,
      navigatedFromPurchases,
      returnToCollections,
      returnToPublic,
      chatInitialContact,
    };
    return () => {
      setActiveTab(snap.activeTab);
      setProfileSubScreen(snap.profileSubScreen);
      setSelectedCreator(snap.selectedCreator);
      setSelectedFriend(snap.selectedFriend);
      setSelectedItinerary(snap.selectedItinerary);
      setActiveUserItineraryId(snap.activeUserItineraryId);
      setActiveUserItineraryDataset(snap.activeUserItineraryDataset);
      setCreatorDashboardItinerary(snap.creatorDashboardItinerary);
      setSelectedCollectionId(snap.selectedCollectionId);
      setSelectedExperienceId(snap.selectedExperienceId);
      setDestinationList(snap.destinationList);
      setShowSearch(snap.showSearch);
      setShowChat(snap.showChat);
      setShowNotifications(snap.showNotifications);
      setShowAIAssistant(snap.showAIAssistant);
      setShowAIHistory(snap.showAIHistory);
      setShowCart(snap.showCart);
      setShowTripReminders(snap.showTripReminders);
      setShowPromoDetail(snap.showPromoDetail);
      setShowSimilarTravelers(snap.showSimilarTravelers);
      setNewItineraryData(snap.newItineraryData);
      setInjectedMarketplaceDataset(snap.injectedMarketplaceDataset);
      setOwnedPublicUserItinerary(snap.ownedPublicUserItinerary);
      setPurchasedItineraryId(snap.purchasedItineraryId);
      setNavigatedFromNotifications(snap.navigatedFromNotifications);
      setNavigatedFromFriendProfile(snap.navigatedFromFriendProfile);
      setNavigatedFromPurchases(snap.navigatedFromPurchases);
      setReturnToCollections(snap.returnToCollections);
      setReturnToPublic(snap.returnToPublic);
      setChatInitialContact(snap.chatInitialContact);
    };
  }, [
    activeTab, profileSubScreen, selectedCreator, selectedFriend, selectedItinerary,
    activeUserItineraryId, activeUserItineraryDataset, creatorDashboardItinerary,
    selectedCollectionId, selectedExperienceId, destinationList, showSearch, showChat,
    showNotifications, showAIAssistant, showAIHistory, showCart, showTripReminders,
    showPromoDetail, showSimilarTravelers, newItineraryData, injectedMarketplaceDataset,
    ownedPublicUserItinerary, purchasedItineraryId, navigatedFromNotifications,
    navigatedFromFriendProfile, navigatedFromPurchases, returnToCollections, returnToPublic, chatInitialContact,
  ]);

  const { wrapBack, resetStack } = useNavStack(navSignature, captureRestore());

  // Reset return flags when leaving the trips tab so subsequent visits start clean.
  useEffect(() => {
    if (activeTab !== 'trips') {
      if (returnToPublic) setReturnToPublic(false);
      if (returnToCollections) setReturnToCollections(false);
    }
  }, [activeTab, returnToPublic, returnToCollections]);

  const handleTabChange = (tab: TabType) => {
    if (tab === 'create') {
      setShowCreateSheet(true);
    } else if (tab === 'ai') {
      setShowAIAssistant(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Tour guiado: trocar de aba quando o tour pedir.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as TabType | undefined;
      if (detail === 'home' || detail === 'explore' || detail === 'trips') {
        setActiveTab(detail);
      }
    };
    window.addEventListener('wai:tour-set-tab', handler);
    return () => window.removeEventListener('wai:tour-set-tab', handler);
  }, []);

  const handleCreateOptionSelect = (optionId: string) => {
    setShowCreateSheet(false);
    if (optionId === 'itinerary') {
      tryOpenItinerarySheet();
    } else if (optionId === 'video') {
      setShowAddVideoSheet(true);
    } else if (optionId === 'collection') {
      setShowCollectionSheet(true);
    } else if (optionId === 'guide') {
      setShowGuideSheet(true);
    }
  };

  const handleAddVideoOptionSelect = (optionId: string) => {
    setShowAddVideoSheet(false);
    if (optionId === 'link') {
      setShowAddVideoByLinkSheet(true);
    } else if (optionId === 'gallery') {
      setShowAddVideoFromGallery(true);
    }
  };

  const handleBackToAddVideoSheet = () => {
    setShowAddVideoByLinkSheet(false);
    setShowAddVideoFromGallery(false);
    setShowAddVideoSheet(true);
  };

  const handleVideoLinkSubmit = (link: string, places?: any[], destination?: 'itinerary' | 'collection') => {
    console.log('Video link submitted:', link, 'destination:', destination, 'places:', places?.length);
    setShowAddVideoByLinkSheet(false);
  };

  const handleVideoGallerySubmit = (file: File | null, places?: any[], destination?: 'itinerary' | 'collection') => {
    console.log('Video file submitted:', file?.name, 'destination:', destination, 'places:', places?.length);
    setShowAddVideoFromGallery(false);
  };

  const handleCreateNewItineraryFromVideo = (places: any[]) => {
    setPendingVideoPlaces(places);
    setShowAddVideoByLinkSheet(false);
    setShowAddVideoFromGallery(false);
    if (ownCreatedCount >= FREE_PLAN_ITINERARY_LIMIT) {
      setShowPlanLimitSheet(true);
      return;
    }
    setShowItinerarySheet(true);
  };

  const getDestinationImages = (destinations: string[]): string[] => {
    const city = destinations[0]?.split(',')[0]?.trim().toLowerCase() ?? '';
    const imageMap: Record<string, string[]> = {
      'roma': [
        'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400',
        'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=400',
        'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400',
        'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=400',
      ],
      'paris': [
        'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
        'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400',
        'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=400',
        'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400',
      ],
      'londres': [
        'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
        'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=400',
        'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400',
        'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=400',
      ],
      'barcelona': [
        'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400',
        'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=400',
        'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400',
        'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=400',
      ],
      'amsterdam': [
        'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400',
        'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=400',
        'https://images.unsplash.com/photo-1512470876337-d72d5c37f8f3?w=400',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      ],
      'tóquio': [
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400',
        'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
        'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400',
        'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400',
      ],
      'nova york': [
        'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400',
        'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400',
        'https://images.unsplash.com/photo-1522083165195-3424ed14020d?w=400',
        'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=400',
      ],
      'lisboa': [
        'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400',
        'https://images.unsplash.com/photo-1548707309-dcebeab426c8?w=400',
        'https://images.unsplash.com/photo-1558369981-f9ca78462e61?w=400',
        'https://images.unsplash.com/photo-1573053986147-34b1f8e801b2?w=400',
      ],
    };
    return imageMap[city] ?? resolveTripThumbnailImages(destinations).map((url) => url.replace('w=800', 'w=400'));
  };

  const handleItinerarySubmit = async (data: ItineraryFormData) => {
    const title = data.tripName?.trim() || (data.destinations.length > 0 ? `${data.destinations[0].split(',')[0]} trip` : 'Novo roteiro');
    const placesFromVideo = pendingVideoPlaces;
    const input = {
      title,
      destinations: data.destinations,
      startDate: formatLocalDate(data.startDate) || formatLocalDate(new Date()),
      endDate: formatLocalDate(data.endDate) || formatLocalDate(new Date()),
      images: getDestinationImages(data.destinations),
      participants: [],
      places: placesFromVideo ? placesFromVideo.length : 0,
    };
    const tempId = `pending-itinerary-${Date.now()}`;
    if (session?.user?.id) {
      addOptimisticItinerary(buildOptimisticItinerary(input, session.user.id, tempId));
    }

    const created = await createItinerary(input);
    if (!created) {
      console.error('Failed to create itinerary');
      removeOptimisticItinerary(tempId);
      return;
    }

    try {
      const { fetchPlacesForCity } = await import('@/lib/placesApi');
      await Promise.allSettled(
        data.destinations.map(dest => fetchPlacesForCity(dest))
      );
    } catch (e) {
      console.error('Error prefetching places:', e);
    }

    setShowItinerarySheet(false);
    setShowSuccessToast(true);

    replaceOptimisticItinerary(tempId, created);
    if (placesFromVideo) {
      console.log('Adding', placesFromVideo.length, 'places from video to new itinerary:', created.id);
      setPendingVideoPlaces(null);
    }
    
    setNewItineraryData(data);
    resetStack();
    setActiveUserItineraryId(created.id);
  };

  const handleUserItineraryClick = (userItinerary: UserItinerary) => {
    const formData: ItineraryFormData = {
      destinations: userItinerary.destinations,
      startDate: parseLocalDate(userItinerary.startDate),
      endDate: parseLocalDate(userItinerary.endDate),
      invitedFriends: [],
      tripName: userItinerary.title,
      coverImage: resolveTripThumbnailImages(
        userItinerary.destinations,
        userItinerary.images?.find((image) => image && !image.startsWith('blob:')),
      )[0],
      isPublic: userItinerary.isPublic,
      priceCents: userItinerary.priceCents,
    };
    setActiveUserItineraryId(userItinerary.id);
    // Try to load the original dataset for purchased itineraries (linked via sourceDatasetId)
    const datasetId = userItinerary.sourceDatasetId ?? null;
    const dataset = datasetId ? getItineraryById(datasetId) : null;
    setActiveUserItineraryIsPurchased(datasetId != null);
    if (dataset) {
      const startDate = parseLocalDate(userItinerary.startDate) ?? new Date();
      const endDate = parseLocalDate(userItinerary.endDate) ?? new Date();
      const dayOffset = differenceInDays(startDate, dataset.startDate);
      const plannerDataset: ItineraryDataset = {
        ...dataset,
        type: 'planner',
        startDate,
        endDate,
        days: dataset.days.map(d => ({
          ...d,
          date: addDays(d.date, dayOffset),
        })),
        participants: [],
      };
      setActiveUserItineraryDataset(plannerDataset);
    } else {
      setActiveUserItineraryDataset(null);
    }
    setNewItineraryData(formData);
  };

  const handleItineraryUpdate = (updatedData: ItineraryFormData) => {
    if (activeUserItineraryId !== null && !activeUserItineraryId.startsWith('pending-itinerary-')) {
      const autoTitle = updatedData.destinations.length > 0
        ? `${updatedData.destinations[0].split(',')[0]} trip`
        : 'Novo roteiro';
      const title = updatedData.tripName?.trim() || autoTitle;
      void updateItinerary(activeUserItineraryId, {
        title,
        destinations: updatedData.destinations,
        startDate: formatLocalDate(updatedData.startDate) || formatLocalDate(new Date()),
        endDate: formatLocalDate(updatedData.endDate) || formatLocalDate(new Date()),
        ...(updatedData.coverImage ? { images: [updatedData.coverImage] } : {}),
      });
    }
  };

  const handleCollectionSubmit = (name: string, sharedWithIds: string[] = []) => {
    const newId = -(Date.now());
    saveUserCollection({
      id: newId,
      title: name,
      itemCount: 0,
      isFavorites: false,
      isPrivate: false,
      images: [],
      participants: sharedWithIds.map(id => {
        const person = mockPeople.find(p => p.id === id);
        return person?.photo || '';
      }).filter(Boolean),
    });
    setNewCollectionName(name);
    setNewCollectionSharedWith(sharedWithIds);
    setSelectedCollectionId(newId);
  };

  const handleGuideSubmit = (data: { title: string; destination: string }) => {
    console.log('Guide created:', data);
  };

  const handleItineraryClick = (id: number) => {
    const dataset = getItineraryById(id);
    if (dataset) {
      setSelectedItinerary(dataset);
    }
    setShowSearch(false);
    window.scrollTo(0, 0);
  };

  const handleMarketplaceItineraryClick = (id: number, fallbackItem?: DisplayItinerary) => {
    const dataset = getItineraryById(id);
    if (dataset) {
      setInjectedMarketplaceDataset(null);
      setOwnedPublicUserItinerary(null);
      setSelectedItinerary(dataset);
      window.scrollTo(0, 0);
    } else if (fallbackItem) {
      // Build a marketplace dataset from the card data + sintetiza dias e
      // lugares (preservando totalDays/totalPlaces) para que a tela de
      // detalhe não fique com seções "Roteiro dia a dia" e "Lugares" vazias.
      const synthetic = buildSyntheticMarketplaceDataset(fallbackItem);
      setInjectedMarketplaceDataset(synthetic);
      setOwnedPublicUserItinerary(null);
      setSelectedItinerary(synthetic);
      window.scrollTo(0, 0);
    }
    setShowSearch(false);
  };

  /**
   * Open a user-published itinerary in the Marketplace ("for sale") view.
   * If the itinerary was originally purchased from the catalog, reuse that dataset
   * (preserves places/days). Otherwise build a minimal marketplace dataset from
   * the user's persisted data.
   */
  const handleUserPublicItineraryClick = (userItinerary: UserItinerary) => {
    const baseDataset = userItinerary.sourceDatasetId
      ? getItineraryById(userItinerary.sourceDatasetId)
      : null;

    const startDate = parseLocalDate(userItinerary.startDate) ?? new Date();
    const endDate = parseLocalDate(userItinerary.endDate) ?? new Date();
    const totalDays = Math.max(1, differenceInDays(endDate, startDate) + 1);
    const validUserCover = userItinerary.images?.find((image) => image && !image.startsWith('blob:'));
    const coverImage = validUserCover
      ?? baseDataset?.coverImage
      ?? resolveTripThumbnailImages(userItinerary.destinations)[0];
    const priceFromCents = userItinerary.priceCents != null
      ? userItinerary.priceCents / 100
      : (baseDataset?.price ?? 0);

    // Carrega as atividades / transportes que o usuário planejou no privado
    const persistedActivities = loadPlannerActivities(userItinerary.id);
    const persistedTransports = loadPlannerTransports(userItinerary.id);
    const hasAnyPersistedActivities = Object.values(persistedActivities).some(arr => arr && arr.length > 0);

    // Helper: monta os `days` mesclando o que está no localStorage do planner
    // sobre os days base (catálogo) ou um esqueleto vazio (criado do zero).
    const buildHydratedDays = (skeletonDays: { day: number; date: Date; title?: string }[]) =>
      skeletonDays.map(d => {
        const persisted = persistedActivities[d.day];
        return {
          day: d.day,
          title: d.title ?? '',
          date: d.date,
          activities: (persisted && persisted.length > 0
            ? persisted
            : []
          ).map(a => ({
            id: a.id,
            type: a.type,
            startTime: a.startTime,
            endTime: a.endTime,
            category: a.category,
            categoryColor: a.categoryColor,
            name: a.name,
            image: a.image,
            openHours: a.openHours,
            rating: a.rating,
            price: a.price,
            noteText: a.noteText,
          })),
          transports: persistedTransports[d.day] ?? [],
        };
      });

    // Deriva a lista de "Locais incluídos" a partir das atividades reais
    const derivePlacesFromDays = (days: { day: number; activities: { id: number; name: string; image: string; category: string; rating: number; type?: 'activity' | 'note' }[] }[]) => {
      const seen = new Set<string>();
      const result: { id: number; name: string; image: string; category: string; rating: number; lat: number; lng: number; day?: number }[] = [];
      for (const d of days) {
        for (const a of d.activities) {
          if (a.type === 'note') continue;
          const key = a.name.trim().toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          result.push({
            id: a.id,
            name: a.name,
            image: a.image,
            category: a.category,
            rating: a.rating ?? 0,
            lat: 0,
            lng: 0,
            day: d.day,
          });
        }
      }
      return result;
    };

    let marketplaceDataset: ItineraryDataset;

    if (baseDataset) {
      const reanchoredBaseDays = baseDataset.days.map((d, idx) => ({
        ...d,
        date: addDays(startDate, idx),
      }));
      const finalDays = hasAnyPersistedActivities
        ? buildHydratedDays(reanchoredBaseDays.map(d => ({ day: d.day, date: d.date, title: d.title })))
        : reanchoredBaseDays;
      const finalPlaces = hasAnyPersistedActivities
        ? derivePlacesFromDays(finalDays)
        : baseDataset.places;
      marketplaceDataset = {
        ...baseDataset,
        startDate,
        endDate,
        days: finalDays,
        places: finalPlaces,
        type: 'marketplace',
        title: userItinerary.title || baseDataset.title,
        coverImage,
        destinations: userItinerary.destinations.length > 0 ? userItinerary.destinations : baseDataset.destinations,
        author: currentUser.name || baseDataset.author || 'Você',
        authorImage: currentUser.avatar || baseDataset.authorImage || '',
        price: priceFromCents,
        description: userItinerary.description ?? baseDataset.description ?? '',
        tags: userItinerary.tags && userItinerary.tags.length > 0 ? userItinerary.tags : (baseDataset.tags ?? []),
        mainTag: userItinerary.mainTag || baseDataset.mainTag || '',
      };
    } else {
      const skeleton = Array.from({ length: totalDays }, (_, i) => ({
        day: i + 1,
        date: addDays(startDate, i),
        title: '',
      }));
      const hydratedDays = buildHydratedDays(skeleton);
      marketplaceDataset = {
        id: -1,
        title: userItinerary.title || 'Roteiro',
        type: 'marketplace',
        state: 'filled',
        destinations: userItinerary.destinations,
        startDate,
        endDate,
        coverImage,
        participants: [],
        days: hydratedDays,
        places: derivePlacesFromDays(hydratedDays),
        suggestions: [],
        author: currentUser.name || 'Você',
        authorImage: currentUser.avatar || '',
        rating: 0,
        reviewCount: 0,
        price: priceFromCents,
        description: userItinerary.description ?? '',
        tags: userItinerary.tags ?? [],
        mainTag: userItinerary.mainTag ?? '',
      };
    }

    setInjectedMarketplaceDataset(marketplaceDataset);
    setOwnedPublicUserItinerary(userItinerary);
    setSelectedItinerary(marketplaceDataset);
    window.scrollTo(0, 0);
  };

  const handleBackFromDetail = () => {
    setSelectedItinerary(null);
    setInjectedMarketplaceDataset(null);
    setOwnedPublicUserItinerary(null);
    setReturnToCollections(false);
  };

  const handleSearchOpen = () => {
    setShowSearch(true);
  };

  const handleSearchClose = () => {
    setShowSearch(false);
  };

  // Show Creator Profile
  if (selectedCreator) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <CreatorProfileScreen
            creator={selectedCreator}
            onBack={wrapBack(() => setSelectedCreator(null))}
            onItineraryClick={(id) => {
              setSelectedCreator(null);
              const dataset = getItineraryById(id);
              if (dataset) setSelectedItinerary(dataset);
            }}
          />
        </div>
      </div>
    );
  }

  // Show Similar Travelers (clicked from "Viajantes com mesmo interesse")
  if (showSimilarTravelers) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <SimilarTravelersScreen
            onBack={wrapBack(() => setShowSimilarTravelers(false))}
            onViewProfile={(traveler) => {
              setSelectedFriend({
                userId: traveler.userId,
                name: traveler.name,
                username: traveler.username || traveler.name.toLowerCase().replace(/\s+/g, ''),
                location: traveler.city || '',
                avatar: traveler.avatar || '',
                following: 0,
                followers: '0',
                countries: [],
              });
              setShowSimilarTravelers(false);
              setActiveTab('home');
              setProfileSubScreen('friend');
            }}
          />
        </div>
      </div>
    );
  }

  // Show AI History
  if (showAIHistory) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <AIHistoryScreen
            onBack={wrapBack(() => setShowAIHistory(false))}
            onSelectChat={(id) => {
              setShowAIHistory(false);
              setShowAIAssistant(true);
            }}
          />
        </div>
      </div>
    );
  }

  // Show AI Assistant
  if (showAIAssistant) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <AIAssistantScreen
            onBack={wrapBack(() => {
              if (navigatedFromNotifications) {
                setNavigatedFromNotifications(false);
                setShowAIAssistant(false);
                setShowNotifications(true);
              } else {
                setShowAIAssistant(false);
              }
            })}
            onOpenHistory={() => {
              setShowAIAssistant(false);
              setShowAIHistory(true);
            }}
          />
        </div>
      </div>
    );
  }

  // Show experience detail
  if (selectedExperienceId !== null) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <ExperienceDetailScreen 
            experienceId={selectedExperienceId} 
            onBack={wrapBack(() => setSelectedExperienceId(null))} 
          />
        </div>
      </div>
    );
  }

  if (creatorDashboardItinerary) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <CreatorItineraryDashboardScreen
            itinerary={creatorDashboardItinerary}
            onBack={wrapBack(() => setCreatorDashboardItinerary(null))}
            onPreview={() => {
              const it = creatorDashboardItinerary;
              setCreatorDashboardItinerary(null);
              handleUserPublicItineraryClick(it);
            }}
            onEdit={(it) => {
              setCreatorEditingItinerary(it);
              setCreatorDashboardItinerary(null);
              handleUserItineraryClick(it);
            }}
            onUnpublished={() => setCreatorDashboardItinerary(null)}
          />
        </div>
      </div>
    );
  }

  if (profileSubScreen === 'sales') {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <SalesSummaryScreen onBack={wrapBack(() => {
            if (navigatedFromNotifications) {
              setNavigatedFromNotifications(false);
              setProfileSubScreen('main');
              setShowNotifications(true);
            } else {
              setProfileSubScreen('creator');
            }
          })} />
        </div>
      </div>
    );
  }

  // Show itinerary detail — route based on type
  if (selectedItinerary !== null) {
    const handleItineraryBack = (fallbackToTrips = false) => {
      setResumeCheckoutId(null);
      setPurchasedItineraryId(null);

      if (navigatedFromPurchases) {
        setNavigatedFromPurchases(false);
        setSelectedItinerary(null);
        setProfileSubScreen('purchases');
      } else if (navigatedFromFriendProfile) {
        setNavigatedFromFriendProfile(false);
        setSelectedItinerary(null);
      } else if (navigatedFromNotifications) {
        setNavigatedFromNotifications(false);
        setSelectedItinerary(null);
        setShowNotifications(true);
      } else if (fallbackToTrips) {
        setSelectedItinerary(null);
        setActiveTab('trips');
        setReturnToCollections(false);
      } else {
        handleBackFromDetail();
      }
    };

    if (selectedItinerary.type === 'marketplace') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <MarketplaceItineraryScreen 
              itineraryId={selectedItinerary.id} 
              autoOpenCheckout={resumeCheckoutId === selectedItinerary.id}
              datasetOverride={injectedMarketplaceDataset && injectedMarketplaceDataset === selectedItinerary ? injectedMarketplaceDataset : null}
              isOwner={!!ownedPublicUserItinerary}
              onOpenChat={(name, avatar, preview, authorUserId) => { setSelectedItinerary(null); openChatWithContact(name, avatar, preview, authorUserId); }}
              onManageItinerary={() => {
                if (ownedPublicUserItinerary) {
                  const owned = ownedPublicUserItinerary;
                  setInjectedMarketplaceDataset(null);
                  setOwnedPublicUserItinerary(null);
                  setSelectedItinerary(null);
                  handleUserItineraryClick(owned);
                }
              }}
              onViewSalesDashboard={() => {
                setInjectedMarketplaceDataset(null);
                setOwnedPublicUserItinerary(null);
                setSelectedItinerary(null);
                setProfileSubScreen('sales');
                navigate('/home');
              }}
              onUnpublish={() => {
                if (ownedPublicUserItinerary) {
                  void updateItinerary(ownedPublicUserItinerary.id, { isPublic: false });
                  handleItineraryBack();
                }
              }}
              onDownloadPdf={async () => {
                if (!ownedPublicUserItinerary || !selectedItinerary) return;
                const ds = selectedItinerary;
                const totalDays = differenceInDays(ds.endDate, ds.startDate) + 1;
                // Dynamic import: jspdf + html2canvas só baixam quando o usuário clica em "Baixar PDF".
                const { downloadItineraryPdf } = await import('@/lib/itineraryPdf');
                downloadItineraryPdf({
                  title: ds.title,
                  destinations: ds.destinations,
                  startDate: format(ds.startDate, "d 'de' MMM yyyy", { locale: ptBR }),
                  endDate: format(ds.endDate, "d 'de' MMM yyyy", { locale: ptBR }),
                  days: Array.from({ length: totalDays }, (_, i) => ({
                    dayNumber: i + 1,
                    date: format(addDays(ds.startDate, i), "EEE, d 'de' MMM", { locale: ptBR }),
                    activities: (ds.days[i]?.activities ?? []).map((a: any) => ({
                      time: a.startTime && a.endTime ? `${a.startTime}–${a.endTime}` : a.startTime,
                      name: a.type === 'note' ? (a.noteText || 'Tempo livre') : a.name,
                      location: a.category,
                      notes: a.observation,
                    })),
                  })),
                });
              }}
              onDeleteItinerary={() => {
                if (ownedPublicUserItinerary) {
                  void deleteItinerary(ownedPublicUserItinerary.id);
                  handleItineraryBack();
                }
              }}
              onBack={wrapBack(() => handleItineraryBack())}
              authorOverride={navigatedFromFriendProfile && selectedFriend ? selectedFriend.name : undefined}
              authorImageOverride={navigatedFromFriendProfile && selectedFriend ? selectedFriend.avatar : undefined}
              onViewPurchasedItinerary={(id, newStartDate, newEndDate) => {
                const dataset = getItineraryById(id);
                if (dataset) {
                  const updatedDataset = { ...dataset };
                  if (newStartDate && newEndDate) {
                    const dayOffset = differenceInDays(newStartDate, dataset.startDate);
                    updatedDataset.startDate = newStartDate;
                    updatedDataset.endDate = newEndDate;
                    updatedDataset.days = dataset.days.map(d => ({
                      ...d,
                      date: addDays(d.date, dayOffset),
                    }));
                  }
                  const plannerDataset: ItineraryDataset = {
                    ...updatedDataset,
                    type: 'planner',
                    participants: [],
                  };
                  setPurchasedItineraryId(id);
                  setSelectedItinerary(plannerDataset);
                }
              }}
              onViewCreator={() => {
                if (navigatedFromFriendProfile && selectedFriend) {
                  // Go back to the friend profile instead of opening a new creator profile
                  setSelectedItinerary(null);
                } else {
                  const author = selectedItinerary.author || 'Autor';
                  const authorImage = selectedItinerary.authorImage || '';
                  setSelectedItinerary(null);
                  navigate('/profile', {
                    state: {
                      friend: {
                        name: author,
                        username: '@' + author.toLowerCase().replace(/[^a-z0-9]/g, ''),
                        location: 'Brasil',
                        avatar: authorImage,
                        following: 128,
                        followers: '4.2k',
                      },
                    },
                  });
                }
              }}
            />
          </div>
        </div>
      );
    }

    // type === 'planner' (filled or empty)
    const plannerData: ItineraryFormData = {
      destinations: selectedItinerary.destinations,
      startDate: selectedItinerary.startDate,
      endDate: selectedItinerary.endDate,
      invitedFriends: [],
    };
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <PlannerItineraryScreen 
            data={plannerData}
            itineraryDataset={selectedItinerary}
            itineraryId={selectedItinerary.id}
            isPurchased={purchasedItineraryId === selectedItinerary.id}
            onBack={wrapBack(() => {
              // A cópia editável do comprador já é criada por `recordPurchase` (ensureBuyerCopy)
              // no momento do checkout — não recriamos aqui para evitar duplicatas.
              handleItineraryBack(true);
            })}
            onDelete={async () => {
              if (selectedItinerary?.id && typeof selectedItinerary.id === 'string') {
                await deleteItinerary(selectedItinerary.id);
              }
              setSelectedItinerary(null);
              setPurchasedItineraryId(null);
              setActiveTab('trips');
              setReturnToCollections(false);
              setShowDeleteSuccessToast(true);
            }}
            onUpdate={() => {
              // Header edits on a freshly-purchased dataset are not persisted until the user
              // re-opens it from the "Privados" tab as their own itinerary record.
            }}

            onNavigateToAI={() => { setSelectedItinerary(null); setPurchasedItineraryId(null); setShowAIAssistant(true); }}
            onNavigateToSales={() => { setSelectedItinerary(null); setPurchasedItineraryId(null); setReturnToPublic(true); setActiveTab('trips'); }}
            onOpenItinerary={(dataset) => {
              setSelectedItinerary(dataset);
            }}
          />
        </div>
      </div>
    );
  }

  // Show new itinerary screen (from creation flow)
  if (newItineraryData) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <PlannerItineraryScreen 
            data={newItineraryData}
            itineraryDataset={activeUserItineraryDataset ?? undefined}
            itineraryId={activeUserItineraryId ?? undefined}
            isPurchased={activeUserItineraryIsPurchased}
            creatorEditMode={!!creatorEditingItinerary}
            autoOpenPublishFlow={autoOpenPublishFlow}
            onBack={wrapBack(() => {
              setAutoOpenPublishFlow(false);
              if (creatorEditingItinerary) {
                const it = creatorEditingItinerary;
                setNewItineraryData(null); setActiveUserItineraryId(null); setActiveUserItineraryDataset(null); setActiveUserItineraryIsPurchased(false);
                setCreatorEditingItinerary(null);
                setCreatorDashboardItinerary(it);
                return;
              }
              setNewItineraryData(null); setActiveUserItineraryId(null); setActiveUserItineraryDataset(null); setActiveUserItineraryIsPurchased(false); setActiveTab('trips'); setReturnToCollections(false);
            })}
            onSaveCreatorEdit={() => {
              const it = creatorEditingItinerary;
              setNewItineraryData(null); setActiveUserItineraryId(null); setActiveUserItineraryDataset(null); setActiveUserItineraryIsPurchased(false);
              setCreatorEditingItinerary(null);
              if (it) setCreatorDashboardItinerary(it);
            }}
            onDelete={async () => {
              if (activeUserItineraryId && !activeUserItineraryId.startsWith('pending-itinerary-')) {
                await deleteItinerary(activeUserItineraryId);
              }
              setNewItineraryData(null);
              setActiveUserItineraryId(null);
              setActiveUserItineraryDataset(null);
              setActiveUserItineraryIsPurchased(false);
              setCreatorEditingItinerary(null);
              setActiveTab('trips');
              setReturnToCollections(false);
              setShowDeleteSuccessToast(true);
            }}
            onUpdate={handleItineraryUpdate}
            onNavigateToAI={() => { setNewItineraryData(null); setActiveUserItineraryId(null); setActiveUserItineraryDataset(null); setActiveUserItineraryIsPurchased(false); setShowAIAssistant(true); }}
            onNavigateToSales={() => { setNewItineraryData(null); setActiveUserItineraryId(null); setActiveUserItineraryDataset(null); setActiveUserItineraryIsPurchased(false); setCreatorEditingItinerary(null); setReturnToPublic(true); setActiveTab('trips'); }}
            onUpgrade={() => {
              setNewItineraryData(null); 
              setActiveUserItineraryId(null); 
              setActiveUserItineraryDataset(null); 
              setActiveUserItineraryIsPurchased(false); 
              setCreatorEditingItinerary(null);
              setSubscriptionOrigin('trips');
              setActiveTab('home');
              setProfileSubScreen('subscription');
            }}
          />
        </div>
        <SuccessToast 
          isVisible={showSuccessToast} 
          onClose={() => setShowSuccessToast(false)} 
        />
      </div>
    );
  }

  // Show collection detail screen
  if (selectedCollectionId !== null) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <CollectionDetailScreen 
            collectionId={selectedCollectionId} 
            collectionName={newCollectionName}
            sharedWithIds={newCollectionSharedWith}
            onBack={wrapBack(() => { setSelectedCollectionId(null); setNewCollectionName(null); setNewCollectionSharedWith([]); setActiveTab('trips'); setReturnToCollections(true); })}
            onDelete={() => { deleteUserCollection(selectedCollectionId); setSelectedCollectionId(null); setNewCollectionName(null); setNewCollectionSharedWith([]); setActiveTab('trips'); setReturnToCollections(true); setShowDeleteCollectionToast(true); }}
          />
        </div>
      </div>
    );
  }

  // Show cart screen
  if (showCart) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <CartScreen
            onBack={wrapBack(() => setShowCart(false))}
            onResumeCheckout={(id) => {
              setShowCart(false);
              handleMarketplaceItineraryClick(id);
            }}
          />
        </div>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <ChatScreen
            onBack={wrapBack(() => { setShowChat(false); setChatInitialContact(null); })}
            initialContact={chatInitialContact}
            onViewItinerary={(id) => {
              setShowChat(false);
              setChatInitialContact(null);
              handleMarketplaceItineraryClick(id);
            }}
          />
        </div>
      </div>
    );
  }

  // Show trip reminders screen
  if (showTripReminders) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <TripRemindersScreen onBack={wrapBack(() => {
            if (navigatedFromNotifications) {
              setNavigatedFromNotifications(false);
              setShowTripReminders(false);
              setShowNotifications(true);
            } else {
              setShowTripReminders(false);
            }
          })} />
        </div>
      </div>
    );
  }

  // Show promo detail screen
  if (showPromoDetail) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <PromoDetailScreen onBack={wrapBack(() => {
            if (navigatedFromNotifications) {
              setNavigatedFromNotifications(false);
              setShowPromoDetail(false);
              setShowNotifications(true);
            } else {
              setShowPromoDetail(false);
            }
          })} />
        </div>
      </div>
    );
  }

  // Show notifications screen
  if (showNotifications) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <NotificationsScreen
            onBack={wrapBack(() => setShowNotifications(false))}
            onNavigateToItinerary={(id) => { 
              setShowNotifications(false); 
              if (typeof id === 'string') {
                const found = myItinerariesForLimit.find(it => it.id === id);
                if (found) {
                  handleUserItineraryClick(found);
                } else {
                  const fallbackFormData: ItineraryFormData = {
                    destinations: ['Carregando...'],
                    startDate: new Date(),
                    endDate: new Date(),
                    invitedFriends: [],
                    tripName: 'Roteiro Compartilhado',
                    coverImage: '',
                    isPublic: false,
                    priceCents: 0
                  };
                  setActiveUserItineraryId(id);
                  setNewItineraryData(fallbackFormData);
                  setActiveUserItineraryDataset(null);
                  setActiveUserItineraryIsPurchased(false);
                  setCreatorEditingItinerary(null);
                }
              } else {
                handleItineraryClick(id);
              }
              setNavigatedFromNotifications(true); 
            }}
            onNavigateToSales={() => { setShowNotifications(false); setProfileSubScreen('sales'); setNavigatedFromNotifications(true); }}
            onNavigateToAI={() => { setShowNotifications(false); setShowAIAssistant(true); setNavigatedFromNotifications(true); }}
            onNavigateToTripReminders={() => { setShowNotifications(false); setShowTripReminders(true); setNavigatedFromNotifications(true); }}
            onNavigateToPromo={() => { setShowNotifications(false); setShowPromoDetail(true); setNavigatedFromNotifications(true); }}
            onNavigateToCart={() => { setShowNotifications(false); setShowCart(true); setNavigatedFromNotifications(true); }}
            onNavigateToPurchases={() => { setShowNotifications(false); setProfileSubScreen('purchases'); setNavigatedFromNotifications(true); }}
          />
        </div>
      </div>
    );
  }

  // Show destination itineraries list
  // Show generic itinerary list (from Home "see all" sections)
  if (itineraryList) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <ItineraryListScreen
            title={itineraryList.title}
            items={itineraryList.items}
            onBack={wrapBack(() => setItineraryList(null))}
            onItineraryClick={(id) => { setItineraryList(null); handleMarketplaceItineraryClick(id); }}
            onGoToExplore={() => { setItineraryList(null); setActiveTab('explore'); }}
          />
        </div>
      </div>
    );
  }

  if (destinationList) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <DestinationItinerariesScreen
            country={destinationList.country}
            continent={destinationList.continent}
            coverImage={destinationList.image}
            onBack={wrapBack(() => setDestinationList(null))}
            onItineraryClick={(id, item) => {
              setDestinationList(null);
              handleMarketplaceItineraryClick(id, item);
            }}
          />
        </div>
      </div>
    );
  }

  // Show search screen
  if (showSearch) {
    return (
      <div className="min-h-screen bg-muted flex items-start justify-center">
        <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
          <SearchScreen 
            onClose={handleSearchClose} 
            onItineraryClick={handleItineraryClick}
            onPublicUserItineraryClick={(it) => { setShowSearch(false); handleUserPublicItineraryClick(it); }}
            onPlaceClick={(place) => { setShowSearch(false); setDestinationList(place); }}
          />
        </div>
      </div>
    );
  }

  // Profile sub-screens
  if (activeTab === 'home' && profileSubScreen !== 'main') {
    if (profileSubScreen === 'profile' || profileSubScreen === 'user') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <UserProfileScreen 
              onBack={wrapBack(() => setProfileSubScreen('main'))}
              onEditProfile={() => setProfileSubScreen('edit')}
              onViewCreatorProgram={() => { setCreatorProgramOrigin('profile'); setProfileSubScreen('creator-program'); }}
              onChatClick={() => setShowChat(true)}
              onFindPeople={() => setProfileSubScreen('find-people')}
              onNavigateToSetting={(setting) => { if (setting === 'subscription') setSubscriptionOrigin('profile'); setProfileSubScreen(setting as ProfileSubScreen); }}
              onPublicItineraryClick={(it) => { setProfileSubScreen('main'); setCreatorDashboardItinerary(it); }}
            />
          </div>
        </div>
      );
    }
    if (profileSubScreen === 'creator') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <CreatorDashboardScreen 
              onBack={wrapBack(() => setProfileSubScreen('main'))}
              onEditProfile={() => setProfileSubScreen('edit')}
              onViewSales={() => setProfileSubScreen('sales')}
            />
          </div>
        </div>
      );
    }
    if (profileSubScreen === 'friend' && selectedFriend) {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <FriendProfileScreen
              friend={selectedFriend}
              onBack={wrapBack(() => { setProfileSubScreen('main'); setSelectedFriend(null); })}
              onChat={() => { setProfileSubScreen('main'); setSelectedFriend(null); setShowChat(true); }}
              onItineraryClick={(id) => { setNavigatedFromFriendProfile(true); handleItineraryClick(id); }}
            />
          </div>
        </div>
      );
    }
    if (profileSubScreen === 'creator-program') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <CreatorProgramScreen
              onBack={wrapBack(() => {
                if (creatorProgramOrigin === 'trips') {
                  setProfileSubScreen('main');
                  setActiveTab('trips');
                } else {
                  setProfileSubScreen('user');
                }
              })}
              onStartCreating={() => {
                if (creatorProgramOrigin === 'trips') {
                  setProfileSubScreen('main');
                  setActiveTab('trips');
                } else {
                  setProfileSubScreen('user');
                }
                tryOpenItinerarySheet();
              }}
              onPublishExisting={(it) => {
                if (creatorProgramOrigin === 'trips') {
                  setProfileSubScreen('main');
                  setActiveTab('trips');
                } else {
                  setProfileSubScreen('user');
                }
                handleUserItineraryClick(it);
                setAutoOpenPublishFlow(true);
              }}
            />
          </div>
        </div>
      );
    }
    if (profileSubScreen === 'edit') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <EditProfileScreen 
              onBack={wrapBack(() => setProfileSubScreen('user'))}
              onSave={() => setProfileSubScreen('user')}
            />
          </div>
        </div>
      );
    }
    if (profileSubScreen === 'achievements') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <AchievementsScreen onBack={wrapBack(() => setProfileSubScreen('user'))} />
          </div>
        </div>
      );
    }
    if (profileSubScreen === 'find-people') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <FindPeopleScreen
              onBack={wrapBack(() => setProfileSubScreen('user'))}
              onViewProfile={() => navigate('/profile')}
            />
          </div>
        </div>
      );
    }
    if (profileSubScreen === 'top-creators') {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            <TopCreatorsScreen
              onBack={wrapBack(() => setProfileSubScreen('main'))}
              onViewProfile={() => navigate('/profile')}
            />
          </div>
        </div>
      );
    }
    // Settings sub-screens
    const settingsScreenMap: Record<string, { component: React.ReactNode }> = {
      'personal-info': { component: <PersonalInfoScreen onBack={wrapBack(() => setProfileSubScreen('user'))} /> },
      'goals': { component: <GoalsSettingsScreen onBack={wrapBack(() => setProfileSubScreen('user'))} /> },
      'login-security': { component: <LoginSecurityScreen onBack={wrapBack(() => setProfileSubScreen('user'))} /> },
      'payment-settings': { component: <PaymentSettingsScreen onBack={wrapBack(() => setProfileSubScreen('user'))} /> },
      'notification-settings': { component: <NotificationSettingsScreen onBack={wrapBack(() => setProfileSubScreen('user'))} /> },
      'language': { component: <LanguageScreen onBack={wrapBack(() => setProfileSubScreen('user'))} /> },
      'help-center': { component: <HelpCenterScreen onBack={wrapBack(() => setProfileSubScreen('user'))} /> },
      'purchases': { component: <PurchasesScreen onBack={wrapBack(() => setProfileSubScreen('user'))} onNavigateToItinerary={(id) => { setProfileSubScreen('main'); handleItineraryClick(id); setNavigatedFromPurchases(true); }} onResumeCheckout={(id) => { setResumeCheckoutId(id); handleItineraryClick(id); setNavigatedFromPurchases(true); }} /> },
      'subscription': { component: <SubscriptionScreen onBack={wrapBack(() => {
        if (subscriptionOrigin === 'trips') {
          setProfileSubScreen('main');
          setActiveTab('trips');
        } else {
          setProfileSubScreen('user');
        }
      })} /> },
    };
    const settingsEntry = settingsScreenMap[profileSubScreen];
    if (settingsEntry) {
      return (
        <div className="min-h-screen bg-muted flex items-start justify-center">
          <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
            {settingsEntry.component}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center">
      <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl relative overflow-x-clip">
        {activeTab === 'home' && (
          <HomeScreen 
            onItineraryClick={handleMarketplaceItineraryClick} 
            onExperienceClick={(id) => setSelectedExperienceId(id)}
            onSearchClick={handleSearchOpen}
            onProfileClick={() => navigate('/user')}
            onCreatorClick={() => navigate('/profile')}
            onChatClick={() => setShowChat(true)}
            onNotificationsClick={() => setShowNotifications(true)}
            onCartClick={() => setShowCart(true)}
            onFindPeopleClick={() => setShowSimilarTravelers(true)}
            onSeeAllItineraries={(title, items) => setItineraryList({ title, items })}
            onContinuePlanning={(it) => handleUserItineraryClick(it)}
            onInsightAction={(insight) => {
              const action = insight.action;
              if (!action) return;
              switch (action.type) {
                case 'open-itinerary': {
                  const target = myItinerariesForLimit.find((it) => String(it.id) === action.itineraryId);
                  if (target) {
                    handleUserItineraryClick(target);
                  } else {
                    setActiveTab('trips');
                  }
                  break;
                }
                case 'open-trips':
                  setActiveTab('trips');
                  break;
                case 'open-explore':
                  setActiveTab('explore');
                  break;
                case 'open-edit-profile':
                  navigate('/user');
                  setProfileSubScreen('edit');
                  break;
                case 'create-itinerary':
                  setShowItinerarySheet(true);
                  break;
              }
            }}
          />
        )}
        {activeTab === 'explore' && (
          <Suspense fallback={<ScreenFallback />}>
            <ExploreScreen 
              onItineraryClick={handleMarketplaceItineraryClick}
              onSearchClick={handleSearchOpen}
              onProfileClick={() => navigate('/profile')}
              onSeeDestinationItineraries={(d) => setDestinationList(d)}
            />
          </Suspense>
        )}
        {activeTab === 'trips' && (
          <Suspense fallback={<ScreenFallback />}>
            <TripsScreen 
              key={returnToPublic ? 'public' : returnToCollections ? 'collections' : 'default'}
              onItineraryClick={handleItineraryClick} 
              onPrivateItineraryClick={handleItineraryClick}
              onUserItineraryClick={handleUserItineraryClick}
              onUserPublicItineraryClick={(it) => setCreatorDashboardItinerary(it)}
              onCollectionClick={(id) => { setSelectedCollectionId(id); setReturnToCollections(false); }}
              onCreateItinerary={() => tryOpenItinerarySheet()}
              onBecomeCreator={() => { setCreatorProgramOrigin('trips'); setActiveTab('home'); setProfileSubScreen('creator-program'); }}
              onExplore={() => setActiveTab('explore')}
              onUpgrade={() => { setSubscriptionOrigin('trips'); setActiveTab('home'); setProfileSubScreen('subscription'); }}
              itineraryUsedCount={ownCreatedCount}
              itineraryLimit={FREE_PLAN_ITINERARY_LIMIT}
              defaultTab={returnToPublic ? 'public' : returnToCollections ? 'collections' : 'private'}
            />
          </Suspense>
        )}
        {activeTab === 'ai' && null}

        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        
        <CreateBottomSheet 
          isOpen={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          onOptionSelect={handleCreateOptionSelect}
        />
        
        {/* Sheets lazy: só montam (e baixam o chunk) quando abertos pela primeira vez. */}
        <Suspense fallback={null}>
          {showItinerarySheet && (
            <CreateItinerarySheet
              isOpen={showItinerarySheet}
              onClose={() => { setShowItinerarySheet(false); setPendingVideoPlaces(null); }}
              onSubmit={handleItinerarySubmit}
              initialDestinations={pendingVideoPlaces ? [...new Set(pendingVideoPlaces.map((p: any) => p.location as string))] : undefined}
            />
          )}

          {showPlanLimitSheet && (
            <PlanLimitReachedSheet
              isOpen={showPlanLimitSheet}
              onClose={() => setShowPlanLimitSheet(false)}
              onUpgrade={() => {
                setShowPlanLimitSheet(false);
                setSubscriptionOrigin('trips');
                setActiveTab('home');
                setProfileSubScreen('subscription');
              }}
              currentCount={ownCreatedCount}
              limit={FREE_PLAN_ITINERARY_LIMIT}
            />
          )}

          {showAddVideoSheet && (
            <AddVideoSheet
              isOpen={showAddVideoSheet}
              onClose={() => setShowAddVideoSheet(false)}
              onOptionSelect={handleAddVideoOptionSelect}
            />
          )}

          {showAddVideoByLinkSheet && (
            <AddVideoByLinkSheet
              isOpen={showAddVideoByLinkSheet}
              onClose={() => setShowAddVideoByLinkSheet(false)}
              onBack={wrapBack(handleBackToAddVideoSheet)}
              onSubmit={handleVideoLinkSubmit}
              onCreateNewItinerary={handleCreateNewItineraryFromVideo}
              onCollectionCreated={(id) => { setSelectedCollectionId(id); setReturnToCollections(false); }}
            />
          )}

          {showAddVideoFromGallery && (
            <AddVideoFromGallerySheet
              isOpen={showAddVideoFromGallery}
              onClose={() => setShowAddVideoFromGallery(false)}
              onBack={wrapBack(handleBackToAddVideoSheet)}
              onSubmit={handleVideoGallerySubmit}
              onCreateNewItinerary={handleCreateNewItineraryFromVideo}
              onCollectionCreated={(id) => { setSelectedCollectionId(id); setReturnToCollections(false); }}
            />
          )}

          {showCollectionSheet && (
            <CreateCollectionSheet
              isOpen={showCollectionSheet}
              onClose={() => setShowCollectionSheet(false)}
              onSubmit={handleCollectionSubmit}
            />
          )}

          {showGuideSheet && (
            <CreateGuideSheet
              isOpen={showGuideSheet}
              onClose={() => setShowGuideSheet(false)}
              onSubmit={handleGuideSubmit}
            />
          )}
        </Suspense>

        <SuccessToast 
          isVisible={showSuccessToast} 
          onClose={() => setShowSuccessToast(false)} 
        />
        <SuccessToast 
          isVisible={showDeleteSuccessToast} 
          onClose={() => setShowDeleteSuccessToast(false)}
          title="Roteiro excluído!"
          description="O roteiro foi removido com sucesso."
        />
        <SuccessToast 
          isVisible={showDeleteCollectionToast} 
          onClose={() => setShowDeleteCollectionToast(false)}
          title="Coleção excluída!"
          description="A coleção foi removida com sucesso."
        />
      </div>
    </div>
  );
};

export default Index;
