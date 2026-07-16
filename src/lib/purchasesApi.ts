import { supabase } from '@/integrations/supabase/client';

/**
 * Persistência de compras de roteiros no Lovable Cloud.
 *
 * O fluxo de marketplace ainda usa o `legacy_id` numérico do dataset
 * (`MarketplaceItineraryScreen.itineraryId: number`). Aqui resolvemos esse id
 * para o roteiro real publicado em `public.itineraries` (via `source_dataset_id`)
 * e gravamos a venda em `public.itinerary_sales`.
 *
 * Regras de plataforma:
 *  - taxa de serviço = 10% do bruto (definido em mem://project/platform-policies)
 *  - status default = 'completed' (pagamento simulado, sem gateway externo).
 */

const PLATFORM_FEE_RATE = 0.10;

export const PURCHASES_CHANGED_EVENT = 'itinerary-sales:changed';

export function emitPurchasesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
}

interface RecordPurchaseInput {
  /** ID numérico do dataset (legacy id mostrado na UI do marketplace). */
  datasetId: number;
  /** Preço bruto em reais (R$), conforme exibido no checkout. */
  priceBRL: number;
  /** Snapshot do roteiro estático (usado para criar a cópia do comprador quando não houver linha real em `itineraries`). */
  snapshot?: {
    title: string;
    destinations?: string[];
    images?: string[];
    places?: number;
    description?: string;
    tags?: string[];
    days?: number;
  };
}

interface RecordPurchaseResult {
  ok: boolean;
  saleId?: string;
  itineraryId?: string;
  /** Quando o roteiro não está publicado no banco (ex.: dataset estático sem owner real). */
  skipped?: boolean;
  error?: string;
}

/**
 * Registra a compra do roteiro identificado por `datasetId`.
 * Retorna `{ ok: false, skipped: true }` quando não há roteiro real no banco
 * — nesse caso o checkout segue funcionando como demo, sem persistir nada.
 */
export async function recordPurchase({ datasetId, priceBRL, snapshot }: RecordPurchaseInput): Promise<RecordPurchaseResult> {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return { ok: false, error: 'not-authenticated' };
  }
  const buyerId = authData.user.id;

  // Helper: cria (uma única vez) uma cópia privada do roteiro na conta do comprador,
  // marcando-o via `source_dataset_id` para que a UI consiga exibir a tag "Comprado".
  const ensureBuyerCopy = async () => {
    if (!snapshot) return;
    const { data: existingCopy } = await supabase
      .from('itineraries')
      .select('id')
      .eq('user_id', buyerId)
      .eq('source_dataset_id', datasetId)
      .eq('is_public', false)
      .limit(1)
      .maybeSingle();
    if (existingCopy) return;

    const today = new Date();
    const startIso = today.toISOString().slice(0, 10);
    const days = Math.max(1, snapshot.days ?? 1);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (days - 1));
    const endIso = endDate.toISOString().slice(0, 10);

    await supabase.from('itineraries').insert({
      user_id: buyerId,
      title: snapshot.title,
      destinations: snapshot.destinations ?? [],
      start_date: startIso,
      end_date: endIso,
      images: snapshot.images ?? [],
      participants: [],
      places_count: snapshot.places ?? 0,
      source_dataset_id: datasetId,
      is_public: false,
      price_cents: null,
      description: snapshot.description ?? '',
      tags: snapshot.tags ?? []
    });
  };

  // 1) Resolve o roteiro real a partir do legacy id (pode não existir para datasets estáticos).
  const { data: itinerary, error: itinErr } = await supabase
    .from('itineraries')
    .select('id, user_id, price_cents')
    .eq('source_dataset_id', datasetId)
    .eq('is_public', true)
    .maybeSingle();

  if (itinErr) return { ok: false, error: itinErr.message };

  // 2) Caso o roteiro publicado não exista (dataset estático), apenas cria a cópia local do comprador.
  if (!itinerary) {
    await ensureBuyerCopy();
    emitPurchasesChanged();
    return { ok: false, skipped: true };
  }

  if (itinerary.user_id === buyerId) {
    // Dono do roteiro não compra de si mesmo.
    return { ok: false, skipped: true };
  }

  // 3) Evita duplicar compra do mesmo roteiro pelo mesmo comprador.
  const { data: existing } = await supabase
    .from('itinerary_sales')
    .select('id')
    .eq('itinerary_id', itinerary.id)
    .eq('buyer_id', buyerId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    await ensureBuyerCopy();
    emitPurchasesChanged();
    return { ok: true, saleId: existing.id, itineraryId: itinerary.id };
  }

  // 4) Calcula bruto/fee/líquido em centavos.
  const grossCents = Math.max(0, Math.round((itinerary.price_cents ?? Math.round(priceBRL * 100)) || 0));
  const feeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
  const netCents = Math.max(0, grossCents - feeCents);

  const { data: inserted, error: insErr } = await supabase
    .from('itinerary_sales')
    .insert({
      itinerary_id: itinerary.id,
      buyer_id: buyerId,
      seller_id: itinerary.user_id,
      gross_cents: grossCents,
      fee_cents: feeCents,
      net_cents: netCents,
      status: 'completed',
    })
    .select('id')
    .single();

  if (insErr) return { ok: false, error: insErr.message };

  await ensureBuyerCopy();
  emitPurchasesChanged();
  return { ok: true, saleId: inserted.id, itineraryId: itinerary.id };
}

export interface PurchasedItineraryView {
  id: string; // sale id
  itineraryId: string;
  sourceDatasetId: number | null;
  title: string;
  image: string;
  author: string;
  authorImage: string;
  price: number;
  purchaseDate: string;
  rating: number | null;
  review: string;
  transactionId: string;
  paymentMethod: 'pix' | 'card';
  status: 'paid' | 'pending_payment';
}

/**
 * Busca todas as compras do usuário logado e cruza com a tabela de avaliações.
 */
export async function getUserPurchases(): Promise<PurchasedItineraryView[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return [];

  const { data, error } = await supabase
    .from('itinerary_sales')
    .select(`
      id,
      created_at,
      gross_cents,
      status,
      itineraries!itinerary_sales_itinerary_id_fkey (
        id,
        title,
        images,
        source_dataset_id,
        user_id
      )
    `)
    .eq('buyer_id', authData.user.id)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[purchasesApi] getUserPurchases error', error);
    return [];
  }

  // Fetch reviews of the user for these itineraries
  const itineraryIds = data.map(s => s.itineraries?.id).filter(Boolean);
  let reviewsMap: Record<string, any> = {};
  
  if (itineraryIds.length > 0) {
    const { data: revData } = await supabase
      .from('itinerary_reviews')
      .select('*')
      .eq('user_id', authData.user.id)
      .in('itinerary_id', itineraryIds);
      
    if (revData) {
      reviewsMap = revData.reduce((acc: any, row: any) => {
        acc[row.itinerary_id] = row;
        return acc;
      }, {});
    }
  }

  // Fetch profiles for the authors of these itineraries
  const authorIds = Array.from(new Set(data.map(s => s.itineraries?.user_id).filter(Boolean)));
  let profilesMap: Record<string, any> = {};
  
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, name, username, avatar_url')
      .in('user_id', authorIds);
      
    if (profiles) {
      profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
    }
  }

  return data.map((sale: any) => {
    const itinerary = sale.itineraries;
    const authorProfile = profilesMap[itinerary?.user_id];
    const reviewData = reviewsMap[itinerary?.id];

    return {
      id: sale.id,
      itineraryId: itinerary?.id,
      sourceDatasetId: itinerary?.source_dataset_id,
      title: itinerary?.title || 'Roteiro Comprado',
      image: itinerary?.images?.[0] || 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
      author: authorProfile?.name || authorProfile?.username || 'Autor',
      authorImage: authorProfile?.avatar_url || '',
      price: (sale.gross_cents ?? 0) / 100,
      purchaseDate: sale.created_at,
      rating: reviewData?.rating || null,
      review: reviewData?.comment || '',
      transactionId: sale.id.split('-')[0].toUpperCase(),
      paymentMethod: 'pix', // Mockado para Pix por enquanto
      status: sale.status === 'completed' ? 'paid' : 'pending_payment',
    };
  });
}

