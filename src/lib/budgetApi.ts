/**
 * Budget (despesas do roteiro) persistido no Lovable Cloud.
 * Mesma estratégia bulk replace usada em `plannerApi`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Expense } from '@/components/screens/BudgetScreen';

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function rowToExpense(row: any): Expense {
  return {
    id: row.client_id ?? row.id,
    name: row.metadata?.name ?? row.description ?? '',
    description: row.description ?? '',
    category: (row.category as Expense['category']) ?? 'atividade',
    amountBRL: Number(row.amount_cents ?? 0) / 100,
    amountEUR: Number(row.metadata?.amountEUR ?? 0),
    assignedTo: Array.isArray(row.metadata?.assignedTo) ? row.metadata.assignedTo : [],
  };
}

export async function loadBudget(itineraryId: string): Promise<Expense[] | null> {
  if (!isUuid(itineraryId)) return null;
  const { data, error } = await supabase
    .from('itinerary_expenses')
    .select('*')
    .eq('itinerary_id', itineraryId)
    .order('position', { ascending: true });
  if (error) {
    console.error('[budgetApi] loadBudget failed', error);
    return null;
  }
  return (data ?? []).map(rowToExpense);
}

export async function saveBudget(itineraryId: string, expenses: Expense[]): Promise<void> {
  if (!isUuid(itineraryId)) return;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const rows = expenses.map((e, position) => ({
    itinerary_id: itineraryId,
    user_id: userId,
    client_id: String(e.id),
    category: e.category,
    description: e.description ?? '',
    amount_cents: Math.round((e.amountBRL ?? 0) * 100),
    currency: 'BRL',
    assigned_to: [] as string[],
    position,
    metadata: {
      name: e.name,
      amountEUR: e.amountEUR ?? 0,
      assignedTo: Array.isArray(e.assignedTo) ? e.assignedTo : [],
    },
  }));

  const del = await supabase.from('itinerary_expenses').delete().eq('itinerary_id', itineraryId);
  if (del.error) {
    console.error('[budgetApi] delete expenses failed', del.error);
  }
  if (rows.length > 0) {
    const { error } = await supabase.from('itinerary_expenses').insert(rows);
    if (error) console.error('[budgetApi] insert expenses failed', error);
  }
}
