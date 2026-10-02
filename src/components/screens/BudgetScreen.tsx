import React, { useState, useEffect, useMemo } from 'react';
import { Search, Mic, SlidersHorizontal, UserPlus, X } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { LuggageIllustration } from '@/components/travel/reservas/LuggageIllustration';
import { TravelerBudgetCard, BudgetPerson } from '@/components/travel/budget/TravelerBudgetCard';
import { ExpenseCard, ExpenseItem } from '@/components/travel/budget/ExpenseCard';
import { AddBudgetExpenseSheet, ActivityOption } from '@/components/travel/budget/AddBudgetExpenseSheet';
import { ShareItinerarySheet } from '@/components/travel/ShareItinerarySheet';
import { BudgetFilterSheet } from '@/components/travel/budget/BudgetFilterSheet';
import { formatCurrency, getCurrencySymbol } from '@/lib/currencyUtils';

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
  currency?: string;
  onInvite?: () => void;
  isShareSheetOpen?: boolean;
  itineraryId?: string;
  ownerId?: string;
  readOnlyMode?: boolean;
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
  currency = 'BRL',
  onInvite,
  isShareSheetOpen = false,
  itineraryId,
  ownerId,
  readOnlyMode,
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

  // Lock body scroll when overlay is active
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Modals & UI States
  const [showAddExpense, setShowAddExpense] = useState(autoOpenAdd);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTravelers, setSelectedTravelers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [valueRange, setValueRange] = useState<{ min: string; max: string }>({ min: '', max: '' });

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    actionLabel?: string;
    onAction?: () => void;
  }>({ title: '' });

  const showToast = (title: string, actionLabel?: string, onAction?: () => void) => {
    setToastMessage({ title, actionLabel, onAction });
    setToastVisible(true);
  };

  const syncExtras = (allPeople: BudgetPerson[]) => {
    if (!onExtraPeopleChange) return;
    const extras = allPeople
      .filter(p => !participantIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, color: p.color || personColors[0] }));
    onExtraPeopleChange(extras);
  };

  // Expense management callbacks
  const handleSaveExpense = (savedExpense: any) => {
    if (editingExpense) {
      setExpenses(prev => (Array.isArray(prev) ? prev : expenses).map(e => e.id === savedExpense.id ? savedExpense : e));
      showToast('Gasto atualizado');
    } else {
      setExpenses(prev => [...(Array.isArray(prev) ? prev : expenses), savedExpense]);
      showToast('Gasto adicionado');
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
        const matchesActivity = (e as any).activityName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesActivity) return false;
      }

      // Categories filter (multi-select)
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(e.category)) return false;
      }

      // Travelers filter (multi-select)
      if (selectedTravelers.length > 0) {
        if (!e.assignedTo || !e.assignedTo.some(tId => selectedTravelers.includes(tId))) {
          // If no one is explicitly assigned, it's shared by everyone, so it should match
          // unless assignedTo is explicitly empty (which might mean everyone or no one).
          // Assuming empty assignedTo = all people, so it matches any traveler filter.
          if (e.assignedTo && e.assignedTo.length > 0) {
             return false;
          }
        }
      }
      
      // Value Range filter
      if (valueRange.min) {
        if (e.amountBRL < parseFloat(valueRange.min)) return false;
      }
      if (valueRange.max) {
        if (e.amountBRL > parseFloat(valueRange.max)) return false;
      }

      // Date Range filter
      // (Requires e.date to exist in future implementations)

      return true;
    });
  }, [expenses, searchQuery, selectedCategories, selectedTravelers, valueRange, people.length]);

  const filteredTotalBRL = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amountBRL || 0), 0);
  }, [filteredExpenses]);

  // Use dynamic currency formatting
  const formattedTotal = formatCurrency(totalBRL, currency);
  const formattedFilteredTotal = formatCurrency(filteredTotalBRL, currency);

  const hasFilterActive = selectedCategories.length > 0 || selectedTravelers.length > 0 || dateRange.start || dateRange.end || valueRange.min || valueRange.max;
  const isEmpty = expenses.length === 0;

  return (
    <div
      className={`min-h-[100dvh] flex flex-col justify-between ${isEmpty ? 'bg-[#F3F3F3]' : 'bg-background'}`}
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >
      {/* ─── Topbar Header ─── */}
      <header className={`sticky top-0 z-20 ${isEmpty ? 'bg-[#F3F3F3]' : 'bg-background/95 backdrop-blur-md border-b border-border/20'} px-6 pb-4`}>
        <div
          className="flex items-center justify-between"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 8px)' }}
        >
          <div className="flex items-center gap-4">
            <BackButton onClick={onBack} className="bg-transparent shadow-none" />
            <h1 className="font-['Urbanist'] font-bold text-[20px] leading-[24px] text-[#171F2C] my-0">
              Orçamento
            </h1>
          </div>

          {/* Top-right Action (Add traveler button in filled state) */}
          {!isEmpty && (
            <button
              type="button"
              onClick={() => {
                setShowShareSheet(true);
              }}
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

            {/* Main Button: Auto width, #9DCC36, border-radius 16px */}
            {!readOnlyMode && (
              <button
                type="button"
                onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}
                className="box-border flex flex-row justify-center items-center py-[12px] px-[24px] gap-2 h-[48px] border border-[#141530] rounded-2xl flex-none bg-transparent text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] whitespace-nowrap active:scale-[0.98] transition-all"
              >
                Adicionar gasto
              </button>
            )}
          </div>
        </main>
      ) : (
        /* ─── 2. Filled State (Estado Preenchido) ─── */
        <main className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
          {/* Top Summary: Orçamento Total */}
          <div className="mb-5 flex flex-col gap-2">
            <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767]">
              Orçamento total
            </span>
            <div className="font-['Urbanist'] font-bold text-[24px] leading-[29px] text-[#171F2C]">
              {formattedTotal}
            </div>
          </div>

          {/* Horizontal Traveler Cards */}
          <div className="mb-6 -mx-5 px-5 flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-1">
            {people.map(person => (
              <TravelerBudgetCard
                key={person.id}
                person={person}
                amount={calculatePersonTotal(person.id)}
                currency={currency}
              />
            ))}
          </div>

          {/* Section: Gastos */}
          <section className="mt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C] my-0">
                Gastos
              </h2>
            </div>

            {/* Search Bar + Filter Options Button */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 bg-field border border-transparent focus-within:border-primary transition-colors rounded-[10px] flex items-center px-3.5 py-2.5 gap-2.5 transition-all">
                <Search size={18} className="text-[#9CA3AF] flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busque por um gasto..."
                  className="w-full bg-transparent text-[14px] font-medium text-[#171F2C] outline-none placeholder:text-[#9CA3AF]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#9CA3AF] hover:text-[#171F2C]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter button */}
              <button
                type="button"
                onClick={() => setShowFilterSheet(true)}
                className="w-11 h-11 rounded-2xl border flex items-center justify-center transition-all relative flex-shrink-0 bg-card text-[#171F2C] border-border/70 hover:bg-muted/40"
                aria-label="Filtrar gastos"
              >
                <SlidersHorizontal size={18} />
                {hasFilterActive && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#1A1C40] ring-2 ring-background" />
                )}
              </button>
            </div>

            {/* Subtotal Label */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767]">
                Total: {formattedFilteredTotal}
              </span>
            </div>

            {/* Expense Cards List */}
            <div className="flex flex-col items-start gap-4 w-full">
              {filteredExpenses.map((expense, index) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  people={people}
                  currency={currency}
                  hideDivider={index === filteredExpenses.length - 1}
                  onClick={readOnlyMode ? undefined : () => {
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
      {!isEmpty && !readOnlyMode && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md px-4 py-6 border-t border-[#B6B6B6] flex flex-row items-center gap-6"
          style={{ paddingBottom: 'calc(24px + max(env(safe-area-inset-bottom), 0px))' }}
        >
          <button
            type="button"
            onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}
            className="flex-1 h-12 rounded-2xl bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.99] transition-all flex flex-row items-center justify-center py-3 pr-4 pl-6 gap-2"
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
        onSoleTravelerInvite={onInvite}
        isHidden={isShareSheetOpen}
      />

      {/* ─── Share Itinerary Sheet ─── */}
      <ShareItinerarySheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        itineraryId={itineraryId || ''}
        ownerId={ownerId || ''}
      />

      {/* ─── Filter Sheet ─── */}
      <BudgetFilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        selectedCategories={selectedCategories}
        selectedTravelers={selectedTravelers}
        dateRange={dateRange}
        valueRange={valueRange}
        onApplyFilters={(cats, travs, dRange, vRange) => {
          setSelectedCategories(cats);
          setSelectedTravelers(travs);
          setDateRange(dRange);
          setValueRange(vRange);
        }}
        people={people}
      />

      {/* ─── Success Toast ─── */}
      <SuccessToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        title={toastMessage.title}
        description=""
        actionLabel={toastMessage.actionLabel}
        onAction={toastMessage.onAction}
        duration={5000}
        position="bottom"
      />
    </div>
  );
}
