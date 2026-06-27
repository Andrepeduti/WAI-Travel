import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SalesSummaryScreenProps {
  onBack: () => void;
}

type Period = '7days' | '30days' | '90days' | 'year';

interface SaleRow {
  id: string;
  itinerary_id: string;
  gross_cents: number;
  fee_cents: number;
  net_cents: number;
  created_at: string;
}

interface ItineraryNameMap {
  [id: string]: string;
}

const PERIOD_DAYS: Record<Period, number> = {
  '7days': 7,
  '30days': 30,
  '90days': 90,
  year: 365,
};

const PERIOD_LABEL: Record<Period, string> = {
  '7days': 'Últimos 7 dias',
  '30days': 'Últimos 30 dias',
  '90days': 'Últimos 90 dias',
  year: 'Este ano',
};

const formatBRL = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SalesSummaryScreen({ onBack }: SalesSummaryScreenProps) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('30days');
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [previousSales, setPreviousSales] = useState<SaleRow[]>([]);
  const [itineraryNames, setItineraryNames] = useState<ItineraryNameMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const days = PERIOD_DAYS[period];
      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);

      // Current period
      const { data: current } = await supabase
        .from('itinerary_sales')
        .select('id, itinerary_id, gross_cents, fee_cents, net_cents, created_at')
        .eq('seller_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', start.toISOString())
        .order('created_at', { ascending: false });

      // Previous period (same length, immediately before)
      const { data: previous } = await supabase
        .from('itinerary_sales')
        .select('id, gross_cents, net_cents, created_at, itinerary_id, fee_cents')
        .eq('seller_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', start.toISOString());

      const currentRows = (current ?? []) as SaleRow[];
      const previousRows = (previous ?? []) as SaleRow[];

      // Resolve itinerary titles
      const ids = Array.from(new Set(currentRows.map((s) => s.itinerary_id)));
      let names: ItineraryNameMap = {};
      if (ids.length > 0) {
        const { data: its } = await supabase
          .from('itineraries')
          .select('id, title')
          .in('id', ids);
        (its ?? []).forEach((it) => {
          names[it.id] = it.title || 'Roteiro sem título';
        });
      }

      if (!cancelled) {
        setSales(currentRows);
        setPreviousSales(previousRows);
        setItineraryNames(names);
        setLoading(false);
      }
    };

    setLoading(true);
    load();

    // Realtime: qualquer compra nova de roteiro deste vendedor recarrega os totais.
    const channel = supabase
      .channel(`sales-summary:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_sales', filter: `seller_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    const handleLocal = () => load();
    window.addEventListener('itinerary-sales:changed', handleLocal);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener('itinerary-sales:changed', handleLocal);
    };
  }, [user, period]);

  const totals = useMemo(() => {
    const grossCents = sales.reduce((s, r) => s + r.gross_cents, 0);
    const feeCents = sales.reduce((s, r) => s + r.fee_cents, 0);
    const netCents = sales.reduce((s, r) => s + r.net_cents, 0);
    const prevGross = previousSales.reduce((s, r) => s + r.gross_cents, 0);
    const prevNet = previousSales.reduce((s, r) => s + r.net_cents, 0);
    const prevCount = previousSales.length;

    const pctChange = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    return {
      count: sales.length,
      grossCents,
      feeCents,
      netCents,
      avgTicketCents: sales.length > 0 ? Math.round(grossCents / sales.length) : 0,
      countChange: pctChange(sales.length, prevCount),
      netChange: pctChange(netCents, prevNet),
      grossChange: pctChange(grossCents, prevGross),
    };
  }, [sales, previousSales]);

  const byItinerary = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sales: number; gross: number; net: number }>();
    sales.forEach((s) => {
      const existing = map.get(s.itinerary_id);
      const name = itineraryNames[s.itinerary_id] || 'Roteiro';
      if (existing) {
        existing.sales += 1;
        existing.gross += s.gross_cents;
        existing.net += s.net_cents;
      } else {
        map.set(s.itinerary_id, {
          id: s.itinerary_id,
          name,
          sales: 1,
          gross: s.gross_cents,
          net: s.net_cents,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [sales, itineraryNames]);

  const topThree = byItinerary.slice(0, 3);
  const feePercent =
    totals.grossCents > 0 ? Math.round((totals.feeCents / totals.grossCents) * 100) : 10;

  const ChangeBadge = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const positive = value > 0;
    return (
      <span
        className="px-2 py-1 rounded-full"
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-weight-medium)',
          background: positive ? 'hsl(var(--primary-light))' : 'hsl(var(--destructive) / 0.1)',
          color: positive ? 'hsl(var(--primary-dark))' : 'hsl(var(--destructive))',
        }}
      >
        {positive ? '+' : ''}
        {value}% vs período anterior
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <BackButton onClick={onBack} />
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                Resumo das Vendas
              </h1>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                {PERIOD_LABEL[period]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-4">
        {/* Period Selector */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="form-input mb-4"
        >
          <option value="7days">Últimos 7 dias</option>
          <option value="30days">Últimos 30 dias</option>
          <option value="90days">Últimos 90 dias</option>
          <option value="year">Este ano</option>
        </select>

        {loading ? (
          <div className="card-base p-8 text-center text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
            Carregando dados de vendas...
          </div>
        ) : sales.length === 0 ? (
          <div className="card-base p-8 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'hsl(var(--muted))' }}
            >
              <Icon name="shopping_bag" size={28} className="text-muted-foreground" />
            </div>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              Nenhuma venda ainda
            </p>
            <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--text-sm)' }}>
              Quando alguém comprar um dos seus roteiros, os dados aparecem aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Total Sales Card */}
            <div className="card-base p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'hsl(var(--primary-light))' }}
                >
                  <Icon name="shopping_bag" size={16} className="text-primary-dark" />
                </div>
                <span className="text-muted-foreground" style={{ fontSize: 'var(--text-base)' }}>
                  Total de Vendas
                </span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {totals.count} {totals.count === 1 ? 'venda' : 'vendas'}
                </span>
                <ChangeBadge value={totals.countChange} />
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="card-base p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Resumo Financeiro
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="attach_money" size={18} className="text-muted-foreground" />
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                      Valor Total em Vendas
                    </span>
                  </div>
                  <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {formatBRL(totals.grossCents)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="remove" size={18} className="text-muted-foreground" />
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                      Taxa ({feePercent}%)
                    </span>
                  </div>
                  <span className="text-destructive" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                    -{formatBRL(totals.feeCents)}
                  </span>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ background: 'hsl(var(--primary-light))' }}
                      >
                        <Icon name="wallet" size={14} className="text-primary-dark" />
                      </div>
                      <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                        Valor Líquido Recebido
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-primary" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                        {formatBRL(totals.netCents)}
                      </span>
                      {totals.netChange !== 0 && (
                        <p
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: totals.netChange > 0 ? 'hsl(var(--primary-dark))' : 'hsl(var(--destructive))',
                          }}
                        >
                          {totals.netChange > 0 ? '+' : ''}
                          {totals.netChange}% vs período anterior
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee Info */}
            <div
              className="p-4 rounded-xl mb-4"
              style={{ background: 'hsl(var(--sun-light))' }}
            >
              <div className="flex items-start gap-2">
                <Icon name="info" size={18} className="text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                    Sobre a taxa do app
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                    Cobramos 10% de taxa sobre cada venda para manter a plataforma funcionando, processar pagamentos e dar suporte aos criadores.
                  </p>
                </div>
              </div>
            </div>

            {/* Available Balance Card */}
            <div className="card-base p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                    Saldo Disponível para Saque
                  </p>
                  <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {formatBRL(totals.netCents)}
                  </span>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'hsl(var(--primary-light))' }}
                >
                  <Icon name="account_balance_wallet" size={24} className="text-primary-dark" />
                </div>
              </div>
              <button className="btn-primary w-full flex items-center justify-center gap-2">
                <Icon name="send" size={18} />
                Transferir via PIX
              </button>
            </div>

            {/* Insights */}
            <h2 className="mb-4" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Insights de Vendas
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Top 3 */}
              <div className="card-base p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="emoji_events" size={18} className="text-warning" />
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                    Top {topThree.length === 0 ? 3 : topThree.length} Roteiros
                  </span>
                </div>
                {topThree.length === 0 ? (
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                    Sem dados ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topThree.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span style={{ fontSize: 'var(--text-sm)' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="truncate"
                            style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
                          >
                            {item.name}
                          </p>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                            {item.sales} {item.sales === 1 ? 'venda' : 'vendas'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Avg Ticket */}
              <div className="card-base p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="receipt_long" size={18} className="text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                    Ticket Médio
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {formatBRL(totals.avgTicketCents)}
                </p>
                <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Média por venda no período
                </span>
              </div>
            </div>

            {/* Sales by Itinerary */}
            <h2 className="mb-4" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Vendas por Roteiro
            </h2>

            <div className="card-base overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-muted/30 border-b border-border">
                <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Roteiro
                </span>
                <span className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Vendas
                </span>
                <span className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Total
                </span>
                <span className="text-muted-foreground text-right" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Líquido
                </span>
              </div>

              {byItinerary.map((item) => (
                <div key={item.id} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border last:border-0">
                  <p className="self-center truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    {item.name}
                  </p>
                  <span className="text-center self-center" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    {item.sales}
                  </span>
                  <span className="text-center self-center" style={{ fontSize: 'var(--text-sm)' }}>
                    {formatBRL(item.gross)}
                  </span>
                  <span className="text-right self-center text-primary" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {formatBRL(item.net)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
