import { useEffect, useMemo, useState } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import { BackButton } from '@/components/ui/BackButton';
import { Icon } from '@/components/ui/Icon';
import { type ItineraryCardData } from '@/components/travel/ItineraryCard';
import { EditPublishSheet } from '@/components/travel/EditPublishSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveTripThumbnailImages } from '@/lib/coverImageResolver';
import { updateItinerary } from '@/lib/itinerariesApi';
import type { UserItinerary } from '@/lib/itinerariesApi';
import { isItineraryPaused, setItineraryPaused } from '@/lib/itineraryPauseState';

interface SaleRow {
  id: string;
  buyer_id: string;
  gross_cents: number;
  fee_cents: number;
  net_cents: number;
  created_at: string;
}

interface BuyerProfile {
  user_id: string;
  name: string;
  avatar_url: string;
}

interface CreatorItineraryDashboardScreenProps {
  itinerary: UserItinerary;
  onBack: () => void;
  onPreview: () => void;
  onEdit?: (itinerary: UserItinerary) => void;
  onItineraryUpdated?: (patch: Partial<UserItinerary>) => void;
  onUnpublished?: () => void;
}

const formatBRL = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function CreatorItineraryDashboardScreen({
  itinerary,
  onBack,
  onPreview,
  onEdit,
  onItineraryUpdated,
  onUnpublished,
}: CreatorItineraryDashboardScreenProps) {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [buyers, setBuyers] = useState<Record<string, BuyerProfile>>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // Local copy to refresh card after edits without round-tripping the parent
  const [localItinerary, setLocalItinerary] = useState(itinerary);
  useEffect(() => setLocalItinerary(itinerary), [itinerary]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('itinerary_sales')
        .select('id, buyer_id, gross_cents, fee_cents, net_cents, created_at')
        .eq('itinerary_id', itinerary.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setSales([]);
        setLoading(false);
        return;
      }
      const rows = data as SaleRow[];
      setSales(rows);

      // Lookup buyer profiles
      const buyerIds = Array.from(new Set(rows.map(r => r.buyer_id)));
      if (buyerIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles_public')
          .select('user_id, name, avatar_url')
          .in('user_id', buyerIds);
        if (!cancelled && profs) {
          const map: Record<string, BuyerProfile> = {};
          for (const p of profs as BuyerProfile[]) map[p.user_id] = p;
          setBuyers(map);
        }
      }
      setLoading(false);
    };
    setLoading(true);
    load();

    // Realtime: novas vendas refletem imediatamente no dashboard.
    const channel = supabase
      .channel(`creator-dashboard-sales:${itinerary.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_sales', filter: `itinerary_id=eq.${itinerary.id}` },
        () => load(),
      )
      .subscribe();

    // Mesma aba: o checkout dispara um evento sintético para atualização instantânea.
    const handleLocal = () => load();
    window.addEventListener('itinerary-sales:changed', handleLocal);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener('itinerary-sales:changed', handleLocal);
    };
  }, [itinerary.id]);

  // KPIs
  const totals = useMemo(() => {
    const count = sales.length;
    const gross = sales.reduce((s, r) => s + (r.gross_cents ?? 0), 0);
    const fee = sales.reduce((s, r) => s + (r.fee_cents ?? 0), 0);
    const net = sales.reduce((s, r) => s + (r.net_cents ?? 0), 0);
    return { count, gross, fee, net };
  }, [sales]);

  // Last 30 days chart data
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const buckets: { date: Date; key: string; label: string; count: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = subDays(today, i);
      buckets.push({
        date: d,
        key: format(d, 'yyyy-MM-dd'),
        label: format(d, 'dd/MM'),
        count: 0,
        revenue: 0,
      });
    }
    const index: Record<string, (typeof buckets)[number]> = {};
    for (const b of buckets) index[b.key] = b;
    for (const s of sales) {
      const key = format(startOfDay(new Date(s.created_at)), 'yyyy-MM-dd');
      const b = index[key];
      if (b) {
        b.count += 1;
        b.revenue += s.gross_cents;
      }
    }
    return buckets;
  }, [sales]);

  const last30Total = useMemo(
    () => chartData.reduce((sum, b) => sum + b.count, 0),
    [chartData],
  );

  // ItineraryCardData (Home pattern)
  const cardData: ItineraryCardData = useMemo(() => {
    const validImage = localItinerary.images.find(img => img && !img.startsWith('blob:'));
    const cover =
      validImage ?? resolveTripThumbnailImages(localItinerary.destinations)[0] ?? '';
    return {
      id: 0,
      title: localItinerary.title || 'Roteiro',
      subtitle: (localItinerary.destinations || []).join(' · ') || '—',
      image: cover,
      rating: 0,
      reviewCount: 0,
      price: localItinerary.priceCents != null ? localItinerary.priceCents / 100 : 0,
      author: user?.user_metadata?.name || 'Você',
      authorImage: user?.user_metadata?.avatar_url || '',
      duration: '',
      cities: localItinerary.destinations?.length ?? 0,
    };
  }, [localItinerary, user]);

  const handleSave = async (patch: {
    title?: string;
    coverUrl?: string;
    priceCents?: number;
    description?: string;
    tags?: string[];
    mainTag?: string;
  }) => {
    const { coverUrl, ...rest } = patch;
    const updates: Partial<UserItinerary> = { ...rest };
    if (coverUrl !== undefined) {
      const nextImages = [coverUrl, ...(localItinerary.images ?? []).slice(1)];
      updates.images = nextImages;
    }
    await updateItinerary(localItinerary.id, updates);
    const next = { ...localItinerary, ...updates };
    setLocalItinerary(next);
    onItineraryUpdated?.(updates);
  };

  const [isPaused, setIsPaused] = useState(() => isItineraryPaused(itinerary.id));
  useEffect(() => setIsPaused(isItineraryPaused(itinerary.id)), [itinerary.id]);

  const handleUnpublish = async () => {
    await updateItinerary(localItinerary.id, { isPublic: false });
    toast.success('Roteiro removido do marketplace');
    onUnpublished?.();
  };

  const handleTogglePause = (next: boolean) => {
    setIsPaused(next);
    setItineraryPaused(localItinerary.id, next);
  };

  return (
    <div className="min-h-screen" style={{ background: '#F2F2F2' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-20" style={{ background: '#F2F2F2' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <BackButton onClick={onBack} />
          <h1
            className="text-foreground"
            style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}
          >
            Painel de vendas
          </h1>
        </div>
      </div>

      <div className="px-5 pt-5 pb-10 flex flex-col gap-5">
        {/* Itinerary card */}
        <div>
          <p className="text-muted-foreground text-xs font-medium mb-2 uppercase tracking-wide">
            Seu roteiro publicado
          </p>
          <button
            onClick={onPreview}
            className="relative w-full h-[220px] rounded-2xl overflow-hidden text-left group"
            style={{ boxShadow: '0 12px 32px -8px rgba(20, 21, 48, 0.35)' }}
          >
            <img
              src={cardData.image}
              alt={cardData.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Strong readability gradient */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
              }}
            />
            {/* Status + price chips */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[#F2F2F2]"
                style={{ color: isPaused ? '#8A6D00' : '#3F7A0F' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isPaused ? '#E0B400' : '#3F7A0F' }} />
                {isPaused ? 'Pausado' : 'Ativo'}
              </span>
              <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-[12px] font-bold text-foreground">
                  R$ {cardData.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
            <div
              className="absolute inset-0 p-5 flex flex-col justify-end text-white"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                {cardData.authorImage ? (
                  <img
                    src={cardData.authorImage}
                    alt={cardData.author}
                    className="w-7 h-7 rounded-full object-cover border-2 border-white/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-white">
                      {(cardData.author || '?').slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-white/95">{cardData.author}</span>
              </div>
              <h3 className="text-xl font-bold mb-2 leading-tight line-clamp-2">
                {cardData.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <div className="flex items-center gap-1">
                  <Icon name="location_on" size={16} className="text-white/90" />
                  <span>
                    {cardData.cities} {cardData.cities === 1 ? 'cidade' : 'cidades'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon name="visibility" size={16} className="text-white/90" />
                  <span>Toque para visualizar</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditOpen(true)}
          className="w-full h-12 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          style={{ background: '#9DCC36', color: '#141530' }}
        >
          <Icon name="edit" size={18} />
          Editar publicação
        </button>

        {/* KPIs */}
        <div>
          <p className="text-muted-foreground text-xs font-medium mb-2 uppercase tracking-wide">
            Resumo
          </p>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon="shopping_bag"
              label="Vendas"
              value={totals.count.toLocaleString('pt-BR')}
              tint="#9DCC36"
            />
            <KpiCard
              icon="payments"
              label="Receita líquida"
              value={formatBRL(totals.net)}
              tint="#1A1C40"
            />
            <KpiCard
              icon="trending_up"
              label="Receita bruta"
              value={formatBRL(totals.gross)}
              tint="#3B82F6"
            />
            <KpiCard
              icon="percent"
              label="Taxa (10%)"
              value={formatBRL(totals.fee)}
              tint="#DA501F"
            />
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl bg-card p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Vendas — últimos 30 dias</h3>
              <p className="text-muted-foreground text-xs font-medium">
                {last30Total} {last30Total === 1 ? 'venda no período' : 'vendas no período'}
              </p>
            </div>
          </div>
          <div className="w-full" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#8E8E93' }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#8E8E93' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(157,204,54,0.12)' }}
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 12,
                  }}
                  formatter={(value: any) => [`${value} vendas`, '']}
                  labelFormatter={(label: any) => `Dia ${label}`}
                />
                <Bar dataKey="count" fill="#9DCC36" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent sales */}
        <div className="rounded-2xl bg-card p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 className="text-[14px] font-bold text-foreground mb-3">Vendas recentes</h3>
          {loading ? (
            <p className="text-muted-foreground text-xs">Carregando…</p>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <Icon name="shopping_bag" size={24} className="text-muted-foreground text-xs" />
              </div>
              <p className="text-foreground font-semibold text-[13px] mb-1">
                Você ainda não teve vendas
              </p>
              <p className="text-muted-foreground text-xs max-w-[240px]">
                Quando alguém comprar este roteiro, a venda aparecerá aqui.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {sales.slice(0, 10).map(s => {
                const buyer = buyers[s.buyer_id];
                const initials = (buyer?.name || '?')
                  .split(' ')
                  .map(p => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    {buyer?.avatar_url ? (
                      <img
                        src={buyer.avatar_url}
                        alt={buyer?.name ?? ''}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-[12px] font-semibold text-muted-foreground">
                          {initials}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {buyer?.name || 'Comprador'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(s.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="text-[13px] font-bold text-foreground">
                      {formatBRL(s.gross_cents)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <EditPublishSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        itineraryId={localItinerary.id}
        startDate={localItinerary.startDate}
        endDate={localItinerary.endDate}
        initialTitle={localItinerary.title}
        initialCoverUrl={localItinerary.images?.[0] ?? ''}
        initialPriceCents={localItinerary.priceCents ?? null}
        initialDescription={localItinerary.description ?? ''}
        initialTags={localItinerary.tags ?? []}
        initialMainTag={localItinerary.mainTag ?? ''}
        onSave={handleSave}
        onUnpublish={handleUnpublish}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        onEditItinerary={() => {
          setEditOpen(false);
          onEdit?.(localItinerary);
        }}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: string;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div
      className="rounded-2xl bg-card p-3 flex flex-col gap-1.5"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: `${tint}1A` }}
      >
        <Icon name={icon} size={16} style={{ color: tint }} />
      </div>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-foreground font-bold text-[15px] leading-tight">{value}</p>
    </div>
  );
}
