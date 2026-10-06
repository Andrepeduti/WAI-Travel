import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../ui/Icon';
import { ShoppingBag, Star, Heart, Plus } from 'lucide-react';
import { resolveTripThumbnailImages } from '@/lib/coverImageResolver';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { type UserItinerary, ITINERARIES_CHANGED_EVENT } from '@/lib/itinerariesApi';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PURCHASES_CHANGED_EVENT } from '@/lib/purchasesApi';
import { ItineraryListSkeleton } from '@/components/ui/LoadingShimmers';
import { TripThumbnail } from '@/components/travel/TripThumbnail';

// Referências estáveis para quando as consultas ainda não retornaram.
const EMPTY_SALES_COUNTS: Record<string, number> = {};
const EMPTY_LISTINGS: Record<string, { status: string; priceCents: number | null; title: string | null }> = {};

interface StoreScreenProps {
  /** Rascunhos de venda abrem no planner. */
  onUserItineraryClick: (itinerary: UserItinerary) => void;
  /** Roteiros publicados abrem no dashboard do criador. */
  onUserPublicItineraryClick: (itinerary: UserItinerary) => void;
  onCreateItinerary: (type: 'seller') => void;
}

export function StoreScreen({
  onUserItineraryClick,
  onUserPublicItineraryClick,
  onCreateItinerary,
}: StoreScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { user: authUser } = useAuth();
  const { itineraries: userItineraries, loading: itinerariesLoading } = useMyItineraries();

  const queryClient = useQueryClient();
  const userId = authUser?.id ?? null;

  // Vendas por roteiro (como vendedor).
  const { data: salesByItineraryData } = useQuery({
    queryKey: ['store-sales', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itinerary_sales')
        .select('itinerary_id')
        .eq('seller_id', userId!);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { itinerary_id: string }[]) {
        counts[row.itinerary_id] = (counts[row.itinerary_id] ?? 0) + 1;
      }
      return counts;
    },
  });
  const salesByItinerary = salesByItineraryData ?? EMPTY_SALES_COUNTS;

  useEffect(() => {
    const handler = () => queryClient.invalidateQueries({ queryKey: ['store-sales'] });
    window.addEventListener(PURCHASES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, handler);
  }, [queryClient]);

  // Listings da loja do próprio vendedor. Roteiros pessoais publicados na loja
  // continuam com is_personal = true; o que os identifica é o listing.
  const { data: listingsData } = useQuery({
    queryKey: ['store-listings', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itinerary_store_listing')
        .select('itinerary_id, status, price_cents, listed_title')
        .eq('seller_id', userId!);
      if (error) throw error;
      const map: Record<string, { status: string; priceCents: number | null; title: string | null }> = {};
      for (const row of (data ?? []) as any[]) {
        map[row.itinerary_id] = {
          status: row.status,
          priceCents: row.price_cents ?? null,
          title: row.listed_title ?? null,
        };
      }
      return map;
    },
  });
  const listingsByItinerary = listingsData ?? EMPTY_LISTINGS;

  // Agrupa rajadas de eventos (cada save do planner emite um) num único refetch.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries({ queryKey: ['store-listings'] });
      }, 300);
    };
    window.addEventListener(ITINERARIES_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(ITINERARIES_CHANGED_EVENT, handler);
      if (timer) clearTimeout(timer);
    };
  }, [queryClient]);

  // Roteiros publicados ou rascunhos de venda (apenas roteiros do próprio autor logado)
  const storeItems = useMemo(() => {
    return userItineraries
      .filter(
        (ui) =>
          ui.userId === authUser?.id &&
          !ui.deletedAt &&
          (ui.isPersonal === false || !!listingsByItinerary[ui.id]),
      )
      .map((ui) => {
        const validImages = ui.images.filter((image) => image && !image.startsWith('blob:'));
        const images = validImages.length > 0 ? validImages : resolveTripThumbnailImages(ui.destinations);
        const listing = listingsByItinerary[ui.id];

        let status: 'Ativo' | 'Rascunho' | 'Pausado' = 'Ativo';
        if (ui.status === 'suspended' || ui.isPaused || (listing && listing.status !== 'active')) {
          status = 'Pausado';
        } else if (ui.status === 'draft' && !listing) {
          status = 'Rascunho';
        }

        return {
          id: ui.id as string | number,
          title: listing?.title || ui.title,
          images,
          priceCents: listing?.priceCents ?? ui.priceCents,
          salesCount: salesByItinerary[ui.id] ?? 0,
          rating: 0,
          likesCount: 0,
          status,
          _userItinerary: ui,
        };
      });
  }, [userItineraries, salesByItinerary, listingsByItinerary, authUser?.id]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return storeItems;
    const q = searchQuery.toLowerCase().trim();
    return storeItems.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item._userItinerary?.destinations?.some((d: string) => d.toLowerCase().includes(q)),
    );
  }, [storeItems, searchQuery]);

  const handleItemClick = (itinerary: UserItinerary) => {
    if (itinerary.status === 'draft') {
      onUserItineraryClick(itinerary);
    } else {
      onUserPublicItineraryClick(itinerary);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-28 bg-[#FFFFFF] font-sans">
      <header
        className="px-6 pb-8 flex items-center justify-between"
        style={{ paddingTop: 'calc(max(24px, env(safe-area-inset-top) + 16px))' }}
      >
        <h1 className="text-[26px] font-bold text-[#1A1C40] tracking-tight">Minha loja</h1>
        <button
          onClick={() => onCreateItinerary('seller')}
          aria-label="Criar roteiro para venda"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#9ecc3b] text-[#1A1C40] hover:opacity-90 active:scale-95 transition-all shadow-sm flex-shrink-0"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </header>

      {(storeItems.length > 0 || searchQuery) && (
        <div className="px-6 pb-3">
          <div className="flex items-center bg-field border border-transparent rounded-[10px] px-3.5 py-2.5 transition-colors focus-within:border-primary">
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
        </div>
      )}

      <main className="px-6 pt-2">
        {itinerariesLoading ? (
          <ItineraryListSkeleton count={3} />
        ) : filteredList.length === 0 ? (
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
                  Tente buscar por outro termo.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 mt-6">
                <div className="flex items-center justify-center">
                  <img src="/empty-store.png" alt="Nenhum roteiro" className="w-[126px] h-[168px] object-contain scale-x-[-1]" />
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <h3 className="text-[18px] font-semibold text-[#141530] leading-[22px]">
                      Você ainda não tem roteiros à venda
                    </h3>
                    <p className="text-[14px] font-medium text-[#7F7F7F] max-w-[249px] text-center leading-[16px]">
                      Crie um roteiro para sua loja e publique quando estiver pronto para vender.
                    </p>
                  </div>

                  <button
                    onClick={() => onCreateItinerary('seller')}
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
            {filteredList.map((item) => (
              <PublishedItineraryCard
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item._userItinerary)}
              />
            ))}
          </div>
        )}
      </main>
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
