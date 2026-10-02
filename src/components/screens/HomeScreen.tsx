import { useCurrentUser } from '@/hooks/use-current-user';
import { useNotifications } from '@/hooks/use-notifications';
import { useHomeModules } from '@/hooks/use-home-modules';
import { useMySalesListings } from '@/hooks/use-my-sales-listings';
import { useRecommendedItineraries, type RecommendedItinerary } from '@/hooks/use-recommended-itineraries';
import { useTrendingDestinations, type TrendingDestination } from '@/hooks/use-trending-destinations';
import { useTopCreators, type TopCreator } from '@/hooks/use-top-creators';
import type { SimilarTraveler } from '@/lib/similarTravelers';
import type { PublicItinerarySearchRow, UserItinerary } from '@/lib/itinerariesApi';
import type { HomeModule } from '@/lib/homeModules';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeCategories } from '@/components/home/HomeCategories';
import { OngoingTripSection } from '@/components/home/OngoingTripSection';
import { CompletedTripSection } from '@/components/home/CompletedTripSection';
import { NextTripSection } from '@/components/home/NextTripSection';
import { ContinuePlanningSection } from '@/components/home/ContinuePlanningSection';
import { ContinueShoppingSection } from '@/components/home/ContinueShoppingSection';
import { RecentlyViewedSection } from '@/components/home/RecentlyViewedSection';
import { MySalesSection } from '@/components/home/MySalesSection';
import { RecommendedItinerariesSection } from '@/components/home/RecommendedItinerariesSection';
import { TrendingDestinationsSection } from '@/components/home/TrendingDestinationsSection';
import { SimilarTravelersSection } from '@/components/home/SimilarTravelersSection';
import { TopCreatorsSection } from '@/components/home/TopCreatorsSection';

interface HomeScreenProps {
  onRecommendedItineraryClick: (item: RecommendedItinerary) => void;
  onSeeAllItineraries?: (title: string, items: RecommendedItinerary[]) => void;
  onSearchSubmit?: (query: string) => void;
  onCategoryClick?: (tagId: string) => void;
  onNotificationsClick?: () => void;
  onDestinationClick?: (destination: TrendingDestination) => void;
  onTravelerClick?: (traveler: SimilarTraveler) => void;
  onSeeAllTravelers?: () => void;
  onCreatorClick?: (creator: TopCreator) => void;
  onSeeAllCreators?: () => void;
  /** Abre um roteiro do usuário (viagens e planejamento); `day` abre direto naquele dia. */
  onOpenTrip?: (itinerary: UserItinerary, day?: number) => void;
  /** Abre um roteiro à venda; `resumeCheckout` retoma a compra. */
  onOpenListedItinerary?: (itinerary: PublicItinerarySearchRow, options?: { resumeCheckout?: boolean }) => void;
  onSeeAllPurchases?: () => void;
  onMySalesListingClick?: (itineraryId: string) => void;
  onSeeAllMySales?: () => void;
  /** "Impulsionar venda" do roteiro centralizado no carrossel de "Seus roteiros à venda". */
  onBoostListing?: (itineraryId: string) => void;
}

const RECOMMENDED_TITLE = 'Roteiros para você';

export function HomeScreen({
  onRecommendedItineraryClick,
  onSeeAllItineraries,
  onSearchSubmit,
  onCategoryClick,
  onNotificationsClick,
  onDestinationClick,
  onTravelerClick,
  onSeeAllTravelers,
  onCreatorClick,
  onSeeAllCreators,
  onOpenTrip,
  onOpenListedItinerary,
  onSeeAllPurchases,
  onMySalesListingClick,
  onSeeAllMySales,
  onBoostListing,
}: HomeScreenProps) {
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();
  const { unreadCount } = useNotifications();
  const { itineraries: recommended, loading: recommendedLoading } = useRecommendedItineraries(10);
  const { destinations, loading: destinationsLoading } = useTrendingDestinations(8);
  const { creators, loading: creatorsLoading } = useTopCreators(10);
  const { modules, loading: modulesLoading } = useHomeModules();
  const { listings: mySalesListings } = useMySalesListings();

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Viajante';

  const renderModule = (module: HomeModule) => {
    switch (module.kind) {
      case 'ongoingTrip':
        return <OngoingTripSection key="ongoingTrip" itineraries={module.itineraries} onOpenDay={(it, day) => onOpenTrip?.(it, day)} />;
      case 'completedTrip':
        return (
          <CompletedTripSection
            key={`completedTrip-${module.demoted}`}
            trips={module.itineraries}
            onItineraryClick={(it) => onOpenTrip?.(it)}
          />
        );
      case 'nextTrip':
        return <NextTripSection key="nextTrip" itineraries={module.itineraries} onItineraryClick={(it) => onOpenTrip?.(it)} />;
      case 'continueEditing':
        return <ContinuePlanningSection key="continueEditing" itineraries={module.itineraries} onItineraryClick={(it) => onOpenTrip?.(it)} />;
      case 'continueShopping':
        return (
          <ContinueShoppingSection
            key="continueShopping"
            itineraries={module.itineraries}
            onResume={(it) => onOpenListedItinerary?.(it, { resumeCheckout: true })}
            onSeeAll={onSeeAllPurchases}
          />
        );
      case 'recentlyViewed':
        return <RecentlyViewedSection key="recentlyViewed" itineraries={module.itineraries} onItineraryClick={(it) => onOpenListedItinerary?.(it)} />;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F2F2F2] pb-[120px]">
      <HomeHeader
        firstName={firstName}
        loading={currentUserLoading}
        hasUnreadNotifications={unreadCount > 0}
        onNotificationsClick={onNotificationsClick}
        onSearchSubmit={onSearchSubmit}
      />

      <HomeCategories onCategoryClick={onCategoryClick} />

      {/* Seções com carrossel sangram à direita (sem padding direito) */}
      <main className="flex flex-col gap-8 pl-4 py-4">
        {/* Módulos voláteis (máx. 2, ordem de prioridade — ver lib/homeModules) */}
        {!modulesLoading && modules.map(renderModule)}

        {/* Módulo fixo logo abaixo dos voláteis */}
        <MySalesSection
          listings={mySalesListings}
          onListingClick={onMySalesListingClick}
          onSeeAll={onSeeAllMySales}
          onBoost={onBoostListing}
        />

        <RecommendedItinerariesSection
          itineraries={recommended}
          loading={recommendedLoading}
          onItineraryClick={onRecommendedItineraryClick}
          onSeeAll={onSeeAllItineraries ? () => onSeeAllItineraries(RECOMMENDED_TITLE, recommended) : undefined}
        />

        <TrendingDestinationsSection
          destinations={destinations}
          loading={destinationsLoading}
          onDestinationClick={(d) => onDestinationClick?.(d)}
        />

        <SimilarTravelersSection onTravelerClick={onTravelerClick} onSeeAll={onSeeAllTravelers} />

        <TopCreatorsSection
          creators={creators}
          loading={creatorsLoading}
          onCreatorClick={onCreatorClick}
          onSeeAll={onSeeAllCreators}
        />
      </main>
    </div>
  );
}
