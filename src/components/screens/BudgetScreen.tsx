import React, { useState, useEffect, useMemo } from 'react';
import { Search, Mic, SlidersHorizontal, UserPlus, X } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { LuggageIllustration } from '@/components/travel/reservas/LuggageIllustration';
import { TravelerBudgetCard, BudgetPerson } from '@/components/travel/budget/TravelerBudgetCard';
import { ExpenseCard, ExpenseItem } from '@/components/travel/budget/ExpenseCard';
import { AddBudgetExpenseSheet, ActivityOption } from '@/components/travel/budget/AddBudgetExpenseSheet';
import { ManageBudgetTravelersSheet } from '@/components/travel/budget/ManageBudgetTravelersSheet';
import { BudgetFilterSheet } from '@/components/travel/budget/BudgetFilterSheet';

export type Expense = ExpenseItem & {
  description: string;
  category: 'hospedagem' | 'transporte' | 'alimentacao' | 'atividade' | 'outros';
  amountEUR: number;
};

export interface BudgetParticipant {
  id: string;
  name: string;
  avatar?: string;
}

export interface BudgetExtraPerson {
  id: string;
  name: string;
  color: string;
}

interface BudgetScreenProps {
  onBack: () => void;
  expenses: Expense[];
  onExpensesChange: (expenses: Expense[] | ((prev: Expense[]) => Expense[])) => void;
  autoOpenAdd?: boolean;
  participants?: BudgetParticipant[];
  extraPeople?: BudgetExtraPerson[];
  onExtraPeopleChange?: (people: BudgetExtraPerson[]) => void;
  activities?: ActivityOption[];
  isLoading?: boolean;
}

const personColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

const getInitialsFromName = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const buildPeopleFromParticipants = (participants: BudgetParticipant[] = []): BudgetPerson[] =>
  participants.map((p, i) => ({
    id: p.id,
    name: p.name,
    initials: getInitialsFromName(p.name),
    color: personColors[i % personColors.length],
    avatar: p.avatar,
  }));

const buildPeopleFromExtras = (extras: BudgetExtraPerson[] = [], offset: number): BudgetPerson[] =>
  extras.map((p, i) => ({
    id: p.id,
    name: p.name,
    initials: getInitialsFromName(p.name),
    color: p.color || personColors[(offset + i) % personColors.length],
  }));

export function BudgetScreen({
  onBack,
  expenses = [],
  onExpensesChange,
  autoOpenAdd = false,
  participants = [],
  extraPeople = [],
  onExtraPeopleChange,
  activities = [],
  isLoading = false,
}: BudgetScreenProps) {
  const setExpenses = onExpensesChange;

  // Build unified people list
  const participantPeople = useMemo(() => buildPeopleFromParticipants(participants), [participants]);
  const participantIds = useMemo(() => new Set(participantPeople.map(p => p.id)), [participantPeople]);
  const initialExtras = useMemo(() => buildPeopleFromExtras(extraPeople, participantPeople.length), [extraPeople, participantPeople.length]);

  const [people, setPeople] = useState<BudgetPerson[]>(() => {
    const list = [...participantPeople, ...initialExtras];
    return list.length > 0 ? list : [{ id: 'user-default', name: 'Você', initials: 'VO', color: '#3B82F6' }];
  });

  // Re-sync when props change
  useEffect(() => {
    const pp = buildPeopleFromParticipants(participants);
    const ee = buildPeopleFromExtras(extraPeople, pp.length);
    const combined = [...pp, ...ee];
    if (combined.length > 0) {
      setPeople(combined);
    }
  }, [JSON.stringify(participants), JSON.stringify(extraPeople)]);

  // Modals & UI States
  const [showAddExpense, setShowAddExpense] = useState(autoOpenAdd);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showManageTravelers, setShowManageTravelers] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('todos');
  const [selectedTravelerFilter, setSelectedTravelerFilter] = useState<string | null>(null);

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  }>({ title: '', description: '' });

  const showToast = (title: string, description: string, actionLabel?: string, onAction?: () => void) => {
    setToastMessage({ title, description, actionLabel, onAction });
    setToastVisible(true);
  };

  const syncExtras = (allPeople: BudgetPerson[]) => {
    if (!onExtraPeopleChange) return;
    const extras = allPeople
      .filter(p => !participantIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, color: p.color || personColors[0] }));
    onExtraPeopleChange(extras);
  };

  // Traveler management callbacks
  const handleAddPerson = (name: string) => {
    const newPerson: BudgetPerson = {
      id: `extra-${Date.now()}`,
      initials: getInitialsFromName(name),
      name: name.trim(),
      color: personColors[people.length % personColors.length],
    };
    const next = [...people, newPerson];
    setPeople(next);
    syncExtras(next);
    showToast('Viajante adicionado', `${name.trim()} foi adicionado ao orçamento.`);
  };

  const handleEditPerson = (id: string, name: string) => {
    const next = people.map(p =>
      p.id === id ? { ...p, name: name.trim(), initials: getInitialsFromName(name) } : p
    );
    setPeople(next);
    syncExtras(next);
    showToast('Viajante atualizado', `${name.trim()} foi atualizado com sucesso.`);
  };

  const handleDeletePerson = (id: string) => {
    if (participantIds.has(id)) {
      showToast('Ação não permitida', 'Membros do roteiro não podem ser removidos.');
      return;
    }
    const person = people.find(p => p.id === id);
    const next = people.filter(p => p.id !== id);
    setPeople(next);
    syncExtras(next);
    showToast('Viajante removido', `${person?.name || 'Viajante'} foi removido.`);
  };

  // Expense management callbacks
  const handleSaveExpense = (savedExpense: any) => {
    if (editingExpense) {
      setExpenses(prev => (Array.isArray(prev) ? prev : expenses).map(e => e.id === savedExpense.id ? savedExpense : e));
      showToast('Gasto atualizado', `"${savedExpense.name}" foi salvo.`);
    } else {
      setExpenses(prev => [...(Array.isArray(prev) ? prev : expenses), savedExpense]);
      showToast('Gasto adicionado', `"${savedExpense.name}" foi adicionado com sucesso.`);
    }
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) return;
    const index = expenses.findIndex(e => e.id === id);

    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);

    showToast(
      'Gasto removido',
      `"${expenseToDelete.name}" foi removido do orçamento.`,
      'Desfazer',
      () => {
        setExpenses(prev => {
          const current = Array.isArray(prev) ? prev : updated;
          if (current.some(e => e.id === expenseToDelete.id)) return current;
          const restored = [...current];
          if (index >= 0 && index <= restored.length) {
            restored.splice(index, 0, expenseToDelete);
          } else {
            restored.push(expenseToDelete);
          }
          return restored;
        });
      }
    );
  };

  // Calculations
  const totalBRL = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amountBRL || 0), 0);
  }, [expenses]);

  const calculatePersonTotal = (personId: string): number => {
    return expenses.reduce((sum, e) => {
      if (people.length === 1) return sum + (e.amountBRL || 0);

      // If custom split is defined
      if (e.splitType === 'custom' && e.customSplits && e.customSplits[personId] !== undefined) {
        return sum + e.customSplits[personId];
      }

      // If assigned specifically or equal
      if (e.assignedTo && e.assignedTo.includes(personId)) {
        const count = e.assignedTo.length || 1;
        return sum + (e.amountBRL / count);
      }

      // If assignedTo is empty, it divides among all people
      if (!e.assignedTo || e.assignedTo.length === 0) {
        return sum + (e.amountBRL / (people.length || 1));
      }

      return sum;
    }, 0);
  };

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = e.name?.toLowerCase().includes(q);
        const matchesCategory = e.category?.toLowerCase().includes(q);
        const matchesActivity = e.activityName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesActivity) return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'todos') {
        if (e.category !== selectedCategoryFilter) return false;
      }

      // Traveler filter
      if (selectedTravelerFilter !== null) {
        if (people.length > 1 && e.assignedTo?.length > 0 && !e.assignedTo.includes(selectedTravelerFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategoryFilter, selectedTravelerFilter, people.length]);

  const filteredTotalBRL = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amountBRL || 0), 0);
  }, [filteredExpenses]);

  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const hasFilterActive = selectedCategoryFilter !== 'todos' || selectedTravelerFilter !== null;
  const isEmpty = expenses.length === 0;

  return (
    <div
      className={`min-h-screen flex flex-col justify-between ${isEmpty ? 'bg-[#F3F3F3]' : 'bg-background'}`}
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >
      {/* ─── Topbar Header ─── */}
      <header className={`sticky top-0 z-20 ${isEmpty ? 'bg-[#F3F3F3]' : 'bg-background/95 backdrop-blur-md border-b border-border/20'} px-6 pb-4`}>
        <div
          className="flex items-center justify-between"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 8px)' }}
        >
          <div className="flex items-center gap-4">
            <BackButton onClick={onBack} />
            <h1 className="font-['Urbanist'] font-bold text-[20px] leading-[24px] text-[#171F2C] my-0">
              Orçamento
            </h1>
          </div>

          {/* Top-right Action (Add traveler button in filled state) */}
          {!isEmpty && (
            <button
              type="button"
              onClick={() => setShowManageTravelers(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/50 transition-colors active:scale-95"
              aria-label="Adicionar viajante"
            >
              <UserPlus size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      {isLoading ? (
        /* Loading Skeleton State */
        <div className="flex-1 px-6 pt-6 pb-28 animate-pulse space-y-6">
          <div>
            <div className="h-4 w-28 bg-muted rounded-md mb-2" />
            <div className="h-9 w-48 bg-muted rounded-xl" />
          </div>

          <div className="flex gap-3 overflow-hidden">
            <div className="h-24 w-36 bg-muted rounded-2xl flex-shrink-0" />
            <div className="h-24 w-36 bg-muted rounded-2xl flex-shrink-0" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="h-5 w-20 bg-muted rounded-md mb-3" />
            <div className="h-12 w-full bg-muted rounded-2xl" />
            <div className="h-16 w-full bg-muted rounded-2xl" />
            <div className="h-16 w-full bg-muted rounded-2xl" />
          </div>
        </div>
      ) : isEmpty ? (
        /* ─── 1. Empty State (Exact Figma CSS: bg #F3F3F3, 345px width, 119x113.32px group, #171F2C 18px, #7F7F7F 14px, #9DCC36 button) ─── */
        <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-10 text-center select-none bg-[#F3F3F3]">
          <div className="w-full max-w-[345px] flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-4 max-w-[293px]">
              {/* Group 481513: 119px x 113.32px */}
              <LuggageIllustration width={119} height={113} />

              {/* Frame 1321316333: 293px x 62px, gap 8px */}
              <div className="flex flex-col items-center gap-2">
                <h2 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C] my-0">
                  Nenhum gasto adicionado
                </h2>
                <p className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#7F7F7F] my-0 text-center">
                  Registre seus gastos para acompanhar quanto você está gastando na viagem.
                </p>
              </div>
            </div>

            {/* Main Button: 154px - 195px x 48px, #9DCC36, border-radius 16px */}
            <button
              type="button"
              onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}
              className="h-[48px] px-6 rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.98] transition-all flex items-center justify-center"
            >
              Adicionar gasto
            </button>
          </div>
        </main>
      ) : (
        /* ─── 2. Filled State (Estado Preenchido) ─── */
        <main className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
          {/* Top Summary: Orçamento Total */}
          <div className="mb-5">
            <span className="text-[14px] font-medium text-[#7F7F7F] block mb-1">
              Orçamento total
            </span>
            <div className="text-[30px] md:text-[34px] font-extrabold text-[#171F2C] tracking-tight">
              {formatBRL(totalBRL)}
            </div>
          </div>

          {/* Horizontal Traveler Cards */}
          <div className="mb-6 -mx-5 px-5 flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-1">
            {people.map(person => (
              <TravelerBudgetCard
                key={person.id}
                person={person}
                amount={calculatePersonTotal(person.id)}
                onClick={() => setShowManageTravelers(true)}
              />
            ))}
          </div>

          {/* Section: Gastos */}
          <section className="mt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-[#171F2C] my-0">
                Gastos
              </h2>
            </div>

            {/* Search Bar + Filter Options Button */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-[#F3F4F6] rounded-2xl flex items-center px-3.5 py-2.5 gap-2.5 focus-within:ring-2 focus-within:ring-border transition-all">
                <Search size={18} className="text-[#9CA3AF] flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busque por um gasto..."
                  className="w-full bg-transparent text-[14px] font-medium text-[#171F2C] outline-none placeholder:text-[#9CA3AF]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#9CA3AF] hover:text-[#171F2C]"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <Mic size={18} className="text-[#9CA3AF] flex-shrink-0" />
                )}
              </div>

              {/* Filter button */}
              <button
                type="button"
                onClick={() => setShowFilterSheet(true)}
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all relative flex-shrink-0 ${
                  hasFilterActive
                    ? 'bg-[#1A1C40] text-white border-[#1A1C40]'
                    : 'bg-card text-[#171F2C] border-border/70 hover:bg-muted/40'
                }`}
                aria-label="Filtrar gastos"
              >
                <SlidersHorizontal size={18} />
                {hasFilterActive && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#9DCC36] ring-2 ring-background" />
                )}
              </button>
            </div>

            {/* Subtotal Label */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[13px] font-medium text-[#7F7F7F]">
                Total: <strong className="text-[#171F2C] font-bold">{formatBRL(filteredTotalBRL)}</strong>
              </span>

              {hasFilterActive && (
                <button
                  type="button"
                  onClick={() => { setSelectedCategoryFilter('todos'); setSelectedTravelerFilter(null); }}
                  className="text-[12px] font-bold text-[#1A1C40] underline hover:opacity-80"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Expense Cards List */}
            <div className="space-y-1 divide-y divide-border/20">
              {filteredExpenses.map(expense => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  people={people}
                  onClick={() => {
                    setEditingExpense(expense);
                    setShowAddExpense(true);
                  }}
                />
              ))}

              {filteredExpenses.length === 0 && (
                <div className="py-12 text-center text-[#7F7F7F] text-[14px]">
                  Nenhum gasto encontrado para os filtros selecionados.
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {/* ─── Fixed Bottom Button (Filled State) ─── */}
      {!isEmpty && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md px-5 pt-3 border-t border-border/20"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
        >
          <button
            type="button"
            onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}
            className="w-full h-14 rounded-2xl bg-[#9DCC36] text-[#141530] font-bold text-[16px] shadow-xs active:scale-[0.99] transition-all flex items-center justify-center"
          >
            Adicionar gasto
          </button>
        </div>
      )}

      {/* ─── Add / Edit Expense Bottom Sheet ─── */}
      <AddBudgetExpenseSheet
        open={showAddExpense}
        onClose={() => { setShowAddExpense(false); setEditingExpense(null); }}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        editingExpense={editingExpense}
        people={people}
        activities={activities}
      />

      {/* ─── Manage Travelers Sheet ─── */}
      <ManageBudgetTravelersSheet
        open={showManageTravelers}
        onClose={() => setShowManageTravelers(false)}
        people={people}
        onAddPerson={handleAddPerson}
        onEditPerson={handleEditPerson}
        onDeletePerson={handleDeletePerson}
        expenses={expenses}
        participantIds={participantIds}
      />

      {/* ─── Filter Sheet ─── */}
      <BudgetFilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        selectedCategory={selectedCategoryFilter}
        onSelectCategory={setSelectedCategoryFilter}
        selectedTravelerId={selectedTravelerFilter}
        onSelectTravelerId={setSelectedTravelerFilter}
        people={people}
      />

      {/* ─── Success Toast ─── */}
      <SuccessToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        title={toastMessage.title}
        description={toastMessage.description}
        actionLabel={toastMessage.actionLabel}
        onAction={toastMessage.onAction}
        duration={5000}
      />
    </div>
  );
}
