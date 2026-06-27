import { Skeleton } from '@/components/ui/skeleton';

/** Linha-card de viajante na tela "Viajantes com mesmo interesse" */
export function SimilarTravelerCardSkeleton() {
  return (
    <div
      className="bg-card rounded-2xl p-3 border border-border/60"
      style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-2/5 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
        <Skeleton className="h-[32px] w-[78px] rounded-xl flex-shrink-0" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Card de roteiro nas listas "Meus roteiros" / "À venda" — layout horizontal igual ao real */
export function ItineraryCardSkeleton() {
  return (
    <div
      className="flex gap-4 items-stretch bg-white rounded-2xl p-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
    >
      <Skeleton className="w-24 h-24 rounded-2xl flex-shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-7 w-20 rounded-2xl" />
          <Skeleton className="h-7 w-7 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** Lista vertical de cards de roteiro com shimmer */
export function ItineraryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ItineraryCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Lista vertical de cards de viajante com shimmer */
export function SimilarTravelersListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <SimilarTravelerCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Card horizontal (240x150) usado no carrossel da Home */
export function SimilarTravelerHorizontalCardSkeleton() {
  return (
    <div
      className="w-[240px] h-[150px] bg-card rounded-2xl p-3 flex flex-col flex-shrink-0"
      style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Carrossel horizontal de cards de viajante na Home */
export function SimilarTravelersCarouselSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <SimilarTravelerHorizontalCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Item de notificação na lista */
export function NotificationItemSkeleton() {
  return (
    <div className="w-full flex items-start gap-3 px-5 py-3.5">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-4/5 rounded" />
        <Skeleton className="h-3 w-1/4 rounded" />
      </div>
    </div>
  );
}

/** Lista de notificações com shimmer */
export function NotificationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col divide-y divide-[hsl(var(--divider))]">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}
