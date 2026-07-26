import { Skeleton } from '@/components/ui/skeleton';

export function MarketplaceSkeleton() {
  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background overflow-hidden relative">
      {/* Cover Image Skeleton */}
      <Skeleton className="w-full h-[65vh] rounded-none absolute top-0 left-0" />
      
      {/* Back button */}
      <div className="absolute top-12 left-5 z-20">
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>

      {/* Content Skeleton layered over */}
      <div className="absolute top-[50vh] left-0 w-full z-10 flex flex-col pt-12 pb-24 px-5 bg-background min-h-[50vh] rounded-t-[32px]">
        
        {/* Title */}
        <Skeleton className="h-8 w-3/4 mb-3" />
        
        {/* Subtitle */}
        <Skeleton className="h-5 w-1/2 mb-6" />

        {/* Rating/Price tags */}
        <div className="flex gap-2 mb-8">
           <Skeleton className="h-10 w-24 rounded-full" />
           <Skeleton className="h-10 w-20 rounded-full" />
        </div>

        {/* Author row */}
        <div className="flex items-center gap-3 py-4 border-y border-border/40">
           <Skeleton className="w-11 h-11 rounded-full" />
           <div className="flex flex-col gap-1.5 flex-1">
             <Skeleton className="h-4 w-32" />
             <Skeleton className="h-3 w-40" />
           </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2 mt-6">
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
