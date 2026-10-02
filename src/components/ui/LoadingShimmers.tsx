import { Skeleton } from '@/components/ui/skeleton';

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

/** Cards grandes de resultado de busca (capa com título, detalhes e preço por cima) */
export function SearchResultsSkeleton({ count = 3 }: { count?: number }) {
  const bar = 'bg-[#E6E7EB] rounded-full';
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Carregando resultados">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[158px] rounded-2xl bg-[#CFCFD4] animate-pulse p-3 flex flex-col justify-end gap-2">
          <div className={`h-3.5 w-[55%] ${bar}`} />
          <div className={`h-3.5 w-[72%] ${bar}`} />
          <div className="flex items-center justify-between gap-6">
            <div className={`h-3.5 flex-1 ${bar}`} />
            <div className={`h-3.5 w-14 ${bar}`} />
          </div>
        </div>
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
