import { useEffect, useMemo, useState } from 'react';
import { format, subDays, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import { Icon } from '@/components/ui/Icon';
import { type ItineraryCardData } from '@/components/travel/ItineraryCard';
import { EditPublishSheet } from '@/components/travel/EditPublishSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveTripThumbnailImages } from '@/lib/coverImageResolver';
import { updateItinerary, updateStoreListing, duplicateItinerary } from '@/lib/itinerariesApi';
import { shareItinerary } from '@/lib/shareItinerary';
import type { UserItinerary } from '@/lib/itinerariesApi';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DeleteConfirmSheet } from '@/components/travel/DeleteConfirmSheet';
import { UnpublishConfirmSheet } from '@/components/travel/UnpublishConfirmSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  onViewAd?: () => void;
  onEdit?: (itinerary: UserItinerary) => void;
  onItineraryUpdated?: (patch: Partial<UserItinerary>) => void;
  onUnpublished?: () => void;
  onDelete?: () => void;
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
  onViewAd,
  onEdit,
  onItineraryUpdated,
  onUnpublished,
  onDelete,
}: CreatorItineraryDashboardScreenProps) {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [buyers, setBuyers] = useState<Record<string, BuyerProfile>>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<number>(30);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showDuplicateSheet, setShowDuplicateSheet] = useState(false);
  const [duplicateType, setDuplicateType] = useState<'personal' | 'store'>('personal');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const navigate = useNavigate();

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

  const filteredSales = useMemo(() => {
    if (timeRange === 1) {
      const cutoff = startOfDay(new Date());
      return sales.filter(s => new Date(s.created_at) >= cutoff);
    } else {
      const cutoff = startOfDay(subDays(new Date(), timeRange - 1));
      return sales.filter(s => new Date(s.created_at) >= cutoff);
    }
  }, [sales, timeRange]);

  // KPIs
  const totals = useMemo(() => {
    const count = filteredSales.length;
    const gross = filteredSales.reduce((s, r) => s + (r.gross_cents ?? 0), 0);
    const fee = filteredSales.reduce((s, r) => s + (r.fee_cents ?? 0), 0);
    const net = filteredSales.reduce((s, r) => s + (r.net_cents ?? 0), 0);
    return { count, gross, fee, net };
  }, [filteredSales]);

  // Chart data
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const buckets: { date: Date; key: string; label: string; count: number; revenue: number }[] = [];
    const days = timeRange === 1 ? 1 : timeRange;
    
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = subDays(today, i);
      buckets.push({
        date: d,
        key: format(d, 'yyyy-MM-dd'),
        label: timeRange === 1 ? 'Hoje' : format(d, 'dd/MM'),
        count: 0,
        revenue: 0,
      });
    }
    const index: Record<string, (typeof buckets)[number]> = {};
    for (const b of buckets) index[b.key] = b;
    for (const s of filteredSales) {
      const key = format(startOfDay(new Date(s.created_at)), 'yyyy-MM-dd');
      const b = index[key];
      if (b) {
        b.count += 1;
        b.revenue += s.gross_cents;
      }
    }
    return buckets;
  }, [filteredSales, timeRange]);

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
  }) => {
    const { coverUrl, ...rest } = patch;
    const updates: Partial<UserItinerary> = { ...rest };
    if (coverUrl !== undefined) {
      const nextImages = [coverUrl, ...(localItinerary.images ?? []).slice(1)];
      updates.images = nextImages;
    }
    await updateItinerary(localItinerary.id, updates);
    // Preço, descrição e tags pertencem ao listing da loja.
    await updateStoreListing(localItinerary.id, {
      listedTitle: rest.title,
      listedDescription: rest.description,
      tags: rest.tags,
      priceCents: rest.priceCents,
    });
    const next = { ...localItinerary, ...updates };
    setLocalItinerary(next);
    onItineraryUpdated?.(updates);
  };

  const [isPaused, setIsPaused] = useState(itinerary.isPaused ?? false);
  useEffect(() => setIsPaused(itinerary.isPaused ?? false), [itinerary.isPaused]);

  const handleUnpublish = async () => {
    await updateItinerary(localItinerary.id, { isPublic: false });
    toast.success('Roteiro removido do marketplace');
    onUnpublished?.();
  };

  const handleTogglePause = async (next: boolean) => {
    setIsPaused(next);
    await handleSave({ ...localItinerary, isPaused: next } as any);
  };

  const computedDays = useMemo(() => {
    if (itinerary.isFlexible) {
      return itinerary.durationDays || 'Vários';
    }
    if (itinerary.startDate && itinerary.endDate) {
      // Usar startOfDay para normalizar as datas e evitar diferenças de fuso
      const diff = differenceInDays(
        startOfDay(new Date(itinerary.endDate)),
        startOfDay(new Date(itinerary.startDate))
      );
      // Se start == end, diff = 0. Normalmente em turismo a diária conta como +1 ou apenas diff. 
      // O usuário deu exemplo: 03 a 10 de maio = 07 dias (diff exato).
      return diff > 0 ? diff : 1; 
    }
    return itinerary.durationDays || 'Vários';
  }, [itinerary]);

  const handleDuplicate = async (asPublic: boolean) => {
    setShowDuplicateSheet(false);
    try {
      const duplicated = await duplicateItinerary(localItinerary, asPublic);
      if (duplicated) {
        toast.success(asPublic ? 'Roteiro duplicado para sua loja!' : 'Roteiro duplicado para suas viagens!');
        navigate(`/trips/${duplicated.id}`);
      }
    } catch (err) {
      toast.error('Erro ao duplicar roteiro.');
    }
  };

  const handleShare = () => {
    setShowOptionsSheet(false);
    shareItinerary({
      title: localItinerary.title,
      description: localItinerary.description,
      datasetId: localItinerary.sourceDatasetId ?? undefined,
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#F6F6F6]">
      {/* Imagem de Capa e Header Overlay */}
      <div className="relative w-full h-[294px]">
        <img
          src={cardData.image}
          alt={cardData.title}
          className="w-full h-full object-cover"
        />
        {/* Overlay Escuro conforme o Figma */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0, 0, 0, 0.26) 0%, rgba(0, 0, 0, 0.8) 65.98%)',
          }}
        />

        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-12">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-[#FEFEFE] rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-[0px_4px_20px_rgba(0,0,0,0.1)]"
          >
            <Icon name="arrow_back" size={24} className="text-[#141530]" />
          </button>
          <button
            onClick={() => setShowOptionsSheet(true)}
            className="w-10 h-10 bg-[#FEFEFE] rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-[0px_4px_20px_rgba(0,0,0,0.1)]"
          >
            <Icon name="more_horiz" size={24} className="text-[#141530]" />
          </button>
        </div>

        {/* Informações do Roteiro */}
        <div className="absolute bottom-10 left-4 right-4 flex flex-col gap-3 text-[#F2F2F2]">
          <h1 className="font-['Urbanist'] font-bold text-[24px] leading-[29px]" style={{ filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))' }}>
            {cardData.title}
          </h1>
          <p className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#E7E7EE] flex items-center gap-2">
            {cardData.cities} {cardData.cities === 1 ? 'local' : 'locais'}
            <span className="font-medium text-[16px] leading-[19px] text-[#FEFEFE]">|</span>
            Duração: {computedDays} {computedDays === 1 ? 'dia' : 'dias'}
          </p>
          <div className="flex items-center gap-4 mt-1">
            <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px] text-[#FEFEFE]">
              R$ {cardData.price.toFixed(2).replace('.', ',')}
            </span>
            <div className="flex gap-2">
              <span
                className="px-3 py-1 rounded-[9px] text-[12px] font-medium text-[#FEFEFE] flex items-center justify-center"
                style={{
                  backgroundColor: isPaused ? '#E0B400' : '#3C8622',
                  border: `1px solid ${isPaused ? '#E0B400' : '#3C8622'}`,
                }}
              >
                {isPaused ? 'Pausado' : 'Ativo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 pb-10 bg-[#F6F6F6]">
        {/* Ações (Carrossel) */}
        <div className="flex flex-col gap-4 pt-6 px-4">
          <h2 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C]">
            O que você deseja fazer?
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setEditOpen(true)}
              className="flex-shrink-0 w-[151px] h-[118px] bg-white rounded-[16px] p-4 flex flex-col justify-between items-start active:scale-[0.98] transition-transform shadow-sm"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Icon name="edit" size={24} className="text-[#141530]" />
              </div>
              <span className="font-['Urbanist'] font-semibold text-[16px] leading-[120%] text-[#141530] text-left">
                Editar publicação
              </span>
            </button>
            <button
              onClick={onViewAd}
              className="flex-shrink-0 w-[151px] h-[118px] bg-white rounded-[16px] p-4 flex flex-col justify-between items-start active:scale-[0.98] transition-transform shadow-sm"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Icon name="visibility" size={24} className="text-[#141530]" />
              </div>
              <span className="font-['Urbanist'] font-semibold text-[16px] leading-[120%] text-[#141530] text-left">
                Visualizar anúncio
              </span>
            </button>
            <button
              onClick={onPreview}
              className="flex-shrink-0 w-[151px] h-[118px] bg-white rounded-[16px] p-4 flex flex-col justify-between items-start active:scale-[0.98] transition-transform shadow-sm"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Icon name="map" size={24} className="text-[#141530]" />
              </div>
              <span className="font-['Urbanist'] font-semibold text-[16px] leading-[120%] text-[#141530] text-left">
                Exibir itinerário
              </span>
            </button>
          </div>
        </div>

        {/* Analytics Group */}
        <div className="flex flex-col gap-4">
          {/* KPIs e Desempenho */}
          <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C]">
              Desempenho do roteiro
            </h2>
            
            {/* Time Filter Select */}
            <div className="relative">
              <select
                className="w-full h-[46px] bg-field border border-[#B6B6B6] focus:border-primary focus:outline-none rounded-[8px] px-3 font-['Urbanist'] font-semibold text-[14px] text-[#1A1C40] appearance-none"
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
              >
                <option value={1}>Hoje</option>
                <option value={5}>Últimos 5 dias</option>
                <option value={15}>Últimos 15 dias</option>
                <option value={30}>Últimos 30 dias</option>
              </select>
              <div className="absolute right-3 top-0 bottom-0 flex items-center pointer-events-none">
                <Icon name="chevron_right" size={20} className="rotate-90 text-[#1A1C40]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <KpiCard
              icon="payments"
              label="Receita bruta"
              value={formatBRL(totals.gross)}
              trend="+0%"
              trendDays={timeRange}
            />
            <KpiCard
              icon="account_balance_wallet"
              label="Receita líquida"
              value={formatBRL(totals.net)}
              trend="+0%"
              trendDays={timeRange}
            />
            <KpiCard
              icon="shopping_bag"
              label="Roteiros vendidos"
              value={totals.count.toLocaleString('pt-BR')}
              trend="+0%"
              trendDays={timeRange}
            />
            <KpiCard
              icon="favorite"
              label="Favoritados"
              value="0" // Mocked
              trend="+0%"
              trendDays={timeRange}
            />
            <KpiCard
              icon="share"
              label="Compartilhamentos"
              value="0" // Mocked
              trend="+0%"
              trendDays={timeRange}
            />
            <KpiCard
              icon="visibility"
              label="Visualização"
              value="0" // Mocked
              trend="+0%"
              trendDays={timeRange}
            />
          </div>
        </div>

        {/* Chart */}
        <div className="px-4">
          <div className="bg-transparent border border-[#CACAD0] rounded-[16px] p-4 flex flex-col gap-3 h-[231px]">
            <h3 className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#141530]">
              Evolução da receita bruta
            </h3>
            
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#141530', fontWeight: 500, fontFamily: 'Urbanist' }}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#141530', fontWeight: 600, fontFamily: 'Urbanist' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    tickFormatter={(val) => val > 0 ? (val / 1000 >= 1 ? `${val / 1000}k` : val) : '0'}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(121, 135, 255, 0.12)' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: 12,
                    }}
                    formatter={(value: any) => [formatBRL(value), '']}
                    labelFormatter={(label: any) => timeRange === 1 ? label : `Dia ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#7987FF" radius={[100, 100, 100, 100]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent sales */}
        <div className="px-4">
          <div className="bg-transparent border border-[#CACAD0] rounded-[16px] p-4">
            <h3 className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#141530] mb-4">
              Vendas recentes
            </h3>
            {loading ? (
              <p className="text-muted-foreground text-xs">Carregando…</p>
            ) : filteredSales.length === 0 ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Icon name="shopping_bag" size={24} className="text-muted-foreground text-xs" />
                </div>
                <p className="text-foreground font-semibold text-[13px] mb-1">
                  Você ainda não teve vendas no período
                </p>
                <p className="text-muted-foreground text-xs max-w-[240px]">
                  Quando alguém comprar este roteiro, a venda aparecerá aqui.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {filteredSales.slice(0, 10).map(s => {
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
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#F3F3F3] flex items-center justify-center">
                          <span className="text-[14px] font-semibold text-[#141530]">
                            {initials}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#141530] truncate">
                          {buyer?.name || 'Comprador'}
                        </p>
                        <p className="text-[#7F7F7F] text-[12px] font-medium">
                          {format(new Date(s.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-[14px] font-semibold text-[#141530]">
                        {formatBRL(s.gross_cents)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
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
        onDelete={onDelete}
      />

      <BottomSheet
        isOpen={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        title={null}
        bodyClassName="p-0"
      >
        <div className="flex flex-col items-start px-4 w-full bg-white">
          <div className="flex flex-col items-start gap-[32px] w-full">
            <h2 className="font-['Urbanist'] font-semibold text-[24px] leading-[29px] text-[#171F2C]">
              Configurações da publicação
            </h2>
            
            {/* Item 1 */}
            <button
              className="w-full flex flex-col items-start gap-4 active:opacity-70 transition-opacity"
              onClick={() => setShowOptionsSheet(false)}
            >
              <div className="w-full flex justify-between items-center h-[24px]">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Icon name="star" size={24} className="text-[#141530]" />
                  </div>
                  <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                    Destacar
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-row justify-center items-center py-1 px-3 gap-1 h-[24px] bg-[#141530] rounded-[9px]">
                    <Icon name="star" size={12} className="text-white" />
                    <span className="font-['Urbanist'] font-medium text-[12px] leading-[14px] text-white">
                      Pro
                    </span>
                  </div>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Icon name="chevron_right" size={20} className="text-[#7F7F7F]" />
                  </div>
                </div>
              </div>
              <div className="w-full border-t border-[#F2F2F2]" />
            </button>
            
            {/* Item 2 */}
            <button
              className="w-full flex flex-col items-start gap-4 active:opacity-70 transition-opacity"
              onClick={() => {
                setShowOptionsSheet(false);
                setShowDuplicateSheet(true);
              }}
            >
              <div className="w-full flex justify-between items-center h-[24px]">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Icon name="content_copy" size={24} className="text-[#141530]" />
                  </div>
                  <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                    Duplicar roteiro
                  </span>
                </div>
                <div className="w-5 h-5 flex items-center justify-center">
                  <Icon name="chevron_right" size={20} className="text-[#7F7F7F]" />
                </div>
              </div>
              <div className="w-full border-t border-[#F2F2F2]" />
            </button>

            {/* Item 3 */}
            <button
              className="w-full flex flex-col items-start gap-4 active:opacity-70 transition-opacity"
              onClick={handleShare}
            >
              <div className="w-full flex justify-between items-center h-[24px]">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Icon name="share" size={24} className="text-[#141530]" />
                  </div>
                  <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
                    Compartilhar
                  </span>
                </div>
                <div className="w-5 h-5 flex items-center justify-center">
                  <Icon name="chevron_right" size={20} className="text-[#7F7F7F]" />
                </div>
              </div>
              <div className="w-full border-t border-[#F2F2F2]" />
            </button>

            {/* Item 4 */}
            <button
              className="w-full flex flex-col items-start gap-4 active:opacity-70 transition-opacity"
              onClick={() => {
                setShowOptionsSheet(false);
                setShowUnpublishConfirm(true);
              }}
            >
              <div className="w-full flex justify-between items-center h-[24px]">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Icon name="delete" size={24} className="text-[#D00004]" />
                  </div>
                  <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#D00004]">
                    Excluir
                  </span>
                </div>
                <div className="w-5 h-5 flex items-center justify-center">
                  <Icon name="chevron_right" size={20} className="text-[#D00004]" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showDuplicateSheet}
        onClose={() => setShowDuplicateSheet(false)}
        title={null}
        bodyClassName="p-0"
      >
        <div className="flex flex-col items-start px-4 pt-4 gap-6 w-full bg-white">
          <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-2 w-full">
              <h2 className="font-['Urbanist'] font-semibold text-[24px] leading-[28px] text-[#141530]">
                Como você quer usar o roteiro?
              </h2>
              <p className="font-['Urbanist'] font-medium text-[14px] leading-[18px] text-[#7F7F7F]">
                Escolha como usar uma cópia deste roteiro.
              </p>
            </div>
            
            <div className="flex flex-col gap-4 w-full">
              {/* Selection Card 1 */}
              <button
                onClick={() => setDuplicateType('personal')}
                className={cn(
                  "flex flex-col items-start p-4 w-full rounded-[16px] transition-colors",
                  duplicateType === 'personal'
                    ? "bg-[#F4FDDF] border border-[#9DCC36]"
                    : "bg-white border border-[#EBEBEB]"
                )}
              >
                <div className="flex flex-row items-center gap-4 w-full">
                  <div className="flex flex-row gap-3 flex-1 items-start h-full">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <Icon name="person" size={24} className="text-[#141530]" />
                    </div>
                    <div className="flex flex-col gap-1 items-start justify-center flex-1 h-full">
                      <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#1A1C40]">
                        Viagem pessoal
                      </span>
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#676767] text-left">
                        Para planejar sua própria viagem.
                      </span>
                    </div>
                  </div>
                  {/* Radio Button */}
                  <div className="w-8 h-8 flex items-center justify-center p-[6.4px] shrink-0">
                    <div className={cn(
                      "w-[20px] h-[20px] rounded-full flex items-center justify-center bg-transparent",
                      duplicateType === 'personal' ? "border-2 border-[#9DCC36]" : "border-2 border-[#9E9E9E]"
                    )}>
                      {duplicateType === 'personal' && <div className="w-[10px] h-[10px] bg-[#9DCC36] rounded-full" />}
                    </div>
                  </div>
                </div>
              </button>

              {/* Selection Card 2 */}
              <button
                onClick={() => setDuplicateType('store')}
                className={cn(
                  "flex flex-col items-start p-4 w-full rounded-[16px] transition-colors",
                  duplicateType === 'store'
                    ? "bg-[#F4FDDF] border border-[#9DCC36]"
                    : "bg-white border border-[#EBEBEB]"
                )}
              >
                <div className="flex flex-row items-center gap-4 w-full">
                  <div className="flex flex-row gap-3 flex-1 items-start h-full">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <Icon name="storefront" size={24} className="text-[#141530]" />
                    </div>
                    <div className="flex flex-col gap-1 items-start justify-center flex-1 h-full">
                      <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#1A1C40]">
                        Novo anúncio (rascunho)
                      </span>
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767] text-left">
                        Cópia em rascunho para editar e publicar depois.
                      </span>
                    </div>
                  </div>
                  {/* Radio Button */}
                  <div className="w-8 h-8 flex items-center justify-center p-[6.4px] shrink-0">
                    <div className={cn(
                      "w-[20px] h-[20px] rounded-full flex items-center justify-center bg-transparent",
                      duplicateType === 'store' ? "border-2 border-[#9DCC36]" : "border-2 border-[#9E9E9E]"
                    )}>
                      {duplicateType === 'store' && <div className="w-[10px] h-[10px] bg-[#9DCC36] rounded-full" />}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          <button
            onClick={() => {
              setShowDuplicateSheet(false);
              handleDuplicate(duplicateType === 'store');
            }}
            className="flex flex-row justify-center items-center py-3 px-4 w-full h-[48px] bg-[#9DCC36] rounded-[16px] active:scale-[0.99] transition-transform"
          >
            <span className="font-['Urbanist'] font-bold text-[16px] leading-[19px] text-[#141530]">
              Confirmar
            </span>
          </button>
        </div>
      </BottomSheet>

      <UnpublishConfirmSheet
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={() => {
          setShowUnpublishConfirm(false);
          handleUnpublish();
        }}
      />

      {onDelete && (
        <DeleteConfirmSheet
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Excluir roteiro?"
          description="Tem certeza que deseja excluir este roteiro da sua loja? Esta ação não poderá ser desfeita."
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete();
          }}
        />
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  trend,
  trendDays
}: {
  icon: string;
  label: string;
  value: string;
  trend?: string;
  trendDays?: number;
}) {
  return (
    <div className="bg-transparent border border-[#B6B6B6] rounded-[16px] p-4 flex flex-col justify-between h-[129px]">
      <div className="flex flex-col gap-2">
        <div className="w-[17px] h-[17px] flex items-center justify-center text-[#141530]">
          <Icon name={icon} size={17} />
        </div>
        <p className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#141530]">
          {label}
        </p>
      </div>
      
      <div className="flex flex-col gap-2">
        <span className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530]">
          {value}
        </span>
        <div className="flex items-center gap-1">
          <span className="font-['Urbanist'] font-semibold text-[12px] leading-[14px] text-[#389222]">
            {trend}
          </span>
          <span className="font-['Urbanist'] font-medium text-[12px] leading-[14px] text-[#7F7F7F]">
            vs {trendDays === 1 ? 'hoje' : `${trendDays} dias`}
          </span>
        </div>
      </div>
    </div>
  );
}
