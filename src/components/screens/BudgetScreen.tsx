import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Building2, Plane, UtensilsCrossed, Ticket, Pencil, X, Plus, Trash2 } from 'lucide-react';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { AddBudgetExpenseSheet } from '@/components/travel/AddBudgetExpenseSheet';
import { BackButton } from '@/components/ui/BackButton';

export interface Expense {
  id: string;
  name: string;
  description: string;
  category: 'hospedagem' | 'transporte' | 'alimentacao' | 'atividade';
  amountBRL: number;
  amountEUR: number;
  assignedTo: string[];
}

interface Person {
  id: string;
  initials: string;
  name: string;
  color: string;
  avatar?: string;
}

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
  onExpensesChange: (expenses: Expense[]) => void;
  autoOpenAdd?: boolean;
  participants?: BudgetParticipant[];
  extraPeople?: BudgetExtraPerson[];
  onExtraPeopleChange?: (people: BudgetExtraPerson[]) => void;
}

const personColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

const getInitialsFromName = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const buildPeopleFromParticipants = (participants: BudgetParticipant[] = []): Person[] =>
  participants.map((p, i) => ({
    id: p.id,
    name: p.name,
    initials: getInitialsFromName(p.name),
    color: personColors[i % personColors.length],
    avatar: p.avatar,
  }));

const buildPeopleFromExtras = (extras: BudgetExtraPerson[] = [], offset: number): Person[] =>
  extras.map((p, i) => ({
    id: p.id,
    name: p.name,
    initials: getInitialsFromName(p.name),
    color: p.color || personColors[(offset + i) % personColors.length],
  }));

const categoryConfig = {
  hospedagem: { label: 'Hospedagem', icon: Building2, color: '#10B981' },
  transporte: { label: 'Transporte', icon: Plane, color: '#3B82F6' },
  alimentacao: { label: 'Alimentação', icon: UtensilsCrossed, color: '#F59E0B' },
  atividade: { label: 'Atividade', icon: Ticket, color: '#8B5CF6' },
};

type CategoryFilter = 'todos' | 'transporte' | 'hospedagem' | 'alimentacao' | 'atividade';

export function BudgetScreen({ onBack, expenses, onExpensesChange, autoOpenAdd = false, participants, extraPeople, onExtraPeopleChange }: BudgetScreenProps) {
  const setExpenses = onExpensesChange;
  const participantPeople = buildPeopleFromParticipants(participants);
  const participantIds = new Set(participantPeople.map(p => p.id));
  const initialExtras = buildPeopleFromExtras(extraPeople, participantPeople.length);
  const [people, setPeople] = useState<Person[]>([...participantPeople, ...initialExtras]);

  // Re-sync when participants/extras change from parent
  useEffect(() => {
    const pp = buildPeopleFromParticipants(participants);
    const ee = buildPeopleFromExtras(extraPeople, pp.length);
    setPeople([...pp, ...ee]);
  }, [JSON.stringify(participants), JSON.stringify(extraPeople)]);

  const hasParticipants = people.length > 0;
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('todos');
  const [showAddExpense, setShowAddExpense] = useState(autoOpenAdd);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newExpense, setNewExpense] = useState({
    name: '',
    description: '',
    category: 'hospedagem' as Expense['category'],
    amountBRL: '',
  });
  const [splitType, setSplitType] = useState<'none' | 'equal' | 'custom'>('none');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([...participantPeople, ...initialExtras].map(p => p.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [splitOpen, setSplitOpen] = useState(false);
  const [personMenuOpen, setPersonMenuOpen] = useState<string | null>(null);
  const [selectedPersonExtrato, setSelectedPersonExtrato] = useState<Person | null>(null);
  const [showEditPeople, setShowEditPeople] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  const showToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setToastVisible(true);
  };

  const totalBRL = expenses.reduce((sum, e) => sum + e.amountBRL, 0);

  const perPersonBRL = people.length > 0 ? totalBRL / people.length : 0;

  const filteredExpenses = activeFilter === 'todos'
    ? expenses
    : expenses.filter(e => e.category === activeFilter);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amountBRL, 0);

  const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const togglePerson = (id: string) => {
    setSelectedPeople(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleAddExpense = () => {
    if (!newExpense.name || !newExpense.amountBRL) return;
    const brl = parseFloat(newExpense.amountBRL.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(brl)) return;
    const eur = brl * 0.1792;

    if (editingExpense) {
      // Update existing expense
      setExpenses(expenses.map(e => e.id === editingExpense.id ? {
        ...e,
        name: newExpense.name,
        description: newExpense.description,
        category: newExpense.category,
        amountBRL: brl,
        amountEUR: eur,
        assignedTo: splitType === 'none' ? [] : selectedPeople,
      } : e));
      setEditingExpense(null);
    } else {
      // Add new expense
      const expense: Expense = {
        id: Date.now().toString(),
        name: newExpense.name,
        description: newExpense.description,
        category: newExpense.category,
        amountBRL: brl,
        amountEUR: eur,
        assignedTo: splitType === 'none' ? [] : selectedPeople,
      };
      setExpenses([...expenses, expense]);
    }

    setNewExpense({ name: '', description: '', category: 'hospedagem', amountBRL: '' });
    setSplitType('none');
    setSelectedPeople(people.map(p => p.id));
    setCustomAmounts({});
    setShowAddExpense(false);
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      name: expense.name,
      description: expense.description,
      category: expense.category,
      amountBRL: expense.amountBRL.toString().replace('.', ','),
    });
    setSplitType(expense.assignedTo.length > 0 ? 'equal' : 'none');
    setSelectedPeople(expense.assignedTo.length > 0 ? expense.assignedTo : people.map(p => p.id));
    setShowAddExpense(true);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const syncExtras = (allPeople: Person[]) => {
    if (!onExtraPeopleChange) return;
    const extras = allPeople
      .filter(p => !participantIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, color: p.color }));
    onExtraPeopleChange(extras);
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;
    const newPerson: Person = {
      id: `extra-${Date.now()}`,
      initials: getInitials(newPersonName),
      name: newPersonName.trim(),
      color: personColors[people.length % personColors.length],
    };
    const next = [...people, newPerson];
    setPeople(next);
    syncExtras(next);
    setSelectedPeople(prev => [...prev, newPerson.id]);
    setNewPersonName('');
    setShowAddPerson(false);
    showToast('Pessoa adicionada!', `${newPersonName.trim()} foi adicionada ao grupo`);
  };

  const handleEditPerson = () => {
    if (!editingPerson || !newPersonName.trim()) return;
    const next = people.map(p => p.id === editingPerson.id
      ? { ...p, name: newPersonName.trim(), initials: getInitials(newPersonName) }
      : p
    );
    setPeople(next);
    syncExtras(next);
    setNewPersonName('');
    setEditingPerson(null);
    showToast('Pessoa editada!', `${newPersonName.trim()} foi atualizada`);
  };

  const handleDeletePerson = (id: string) => {
    if (participantIds.has(id)) {
      showToast('Não é possível excluir', 'Convidados do roteiro não podem ser removidos aqui');
      return;
    }
    const person = people.find(p => p.id === id);
    const next = people.filter(p => p.id !== id);
    setPeople(next);
    syncExtras(next);
    setSelectedPeople(prev => prev.filter(p => p !== id));
    showToast('Pessoa excluída!', `${person?.name || 'Pessoa'} foi removida do grupo`);
  };
  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const filters: { key: CategoryFilter; label: string; icon?: typeof Building2 }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'transporte', label: 'Transporte', icon: Plane },
    { key: 'hospedagem', label: 'Hospedagem', icon: Building2 },
    { key: 'alimentacao', label: 'Alimentação', icon: UtensilsCrossed },
  ];

  return (
    <div className="min-h-screen pb-28 bg-background" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-4 pt-5 pb-3">
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Orçamento total</h1>
        </div>
      </header>

      {/* Total amounts - 40px spacing from header */}
      <div className="px-4 pb-6" style={{ marginTop: '40px' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🇧🇷</span>
          <span className="text-[28px] font-bold text-foreground">{formatBRL(totalBRL)}</span>
        </div>
      </div>

      {/* Per person — always visible, allows adding people for splitting */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold text-foreground">Por pessoa</span>
          {hasParticipants && (
            <button
              onClick={() => setShowEditPeople(true)}
              className="text-[12px] font-semibold text-foreground/80 px-2 py-1 rounded-md active:bg-muted"
            >
              Gerenciar
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {people.map(person => {
            const isSole = people.length === 1;
            const personExpenses = isSole
              ? expenses
              : expenses.filter(e => e.assignedTo.includes(person.id));
            const personTotal = personExpenses.reduce((sum, e) => {
              if (isSole) return sum + e.amountBRL;
              const assignedCount = e.assignedTo.length || 1;
              return sum + (e.amountBRL / assignedCount);
            }, 0);
            return (
              <div
                key={person.id}
                onClick={() => setSelectedPersonExtrato(person)}
                className="flex-shrink-0 bg-card rounded-2xl p-4 min-w-[140px] border border-border/30 cursor-pointer active:scale-[0.97] transition-transform"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
              >
                {person.avatar ? (
                  <img src={person.avatar} alt={person.name} className="w-8 h-8 rounded-full object-cover mb-2" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold mb-2"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.initials}
                  </div>
                )}
                <span className="text-[13px] font-semibold text-foreground block">{person.name}</span>
                <span className="text-[14px] font-bold text-foreground block">{formatBRL(personTotal)}</span>
              </div>
            );
          })}
          <button
            onClick={() => { setNewPersonName(''); setShowAddPerson(true); }}
            className="flex-shrink-0 rounded-2xl p-4 min-w-[140px] border border-dashed border-border flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{ background: '#F3F3F3' }}
          >
            <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center">
              <Plus size={16} className="text-foreground" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-foreground">Adicionar pessoa</span>
          </button>
        </div>
      </div>


      {/* Add/Edit person modal */}
      {(showAddPerson || editingPerson) && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAddPerson(false); setEditingPerson(null); }} />
          <div className="relative w-full max-w-[430px] bg-card rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-foreground">
                {editingPerson ? 'Editar pessoa' : 'Adicionar pessoa'}
              </h2>
              <button
                onClick={() => { setShowAddPerson(false); setEditingPerson(null); }}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="mb-5">
              <label className="text-[13px] font-medium text-foreground block mb-1.5">Nome</label>
              <input
                type="text"
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={editingPerson ? handleEditPerson : handleAddPerson}
              disabled={!newPersonName.trim()}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] disabled:bg-[#D1D5DB] disabled:text-white"
            >
              {editingPerson ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Expenses list */}
      <div className="px-4">
        <span className="text-[15px] font-semibold text-foreground block mb-3">Gastos</span>

        {/* Filter chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {filters.map(filter => {
            const isActive = activeFilter === filter.key;
            const FilterIcon = filter.icon;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-card text-foreground border border-border'
                }`}
              >
                {FilterIcon && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: isActive ? 'transparent' : '#F3F3F3' }}>
                    <FilterIcon size={12} strokeWidth={1.5} />
                  </div>
                )}
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Category total when filtered */}
        {activeFilter !== 'todos' && (
          <div className="mb-4 px-1">
            <span className="text-[13px] text-muted-foreground">Total {filters.find(f => f.key === activeFilter)?.label}:</span>
            <span className="text-[16px] font-bold text-foreground ml-2">{formatBRL(filteredTotal)}</span>
          </div>
        )}

        {/* Expense cards */}
        <div className="space-y-3 mb-6">
          {filteredExpenses.map(expense => {
            const cat = categoryConfig[expense.category];
            const CatIcon = cat.icon;
            return (
              <div key={expense.id} className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F3F3F3' }}>
                  <CatIcon size={18} strokeWidth={1.5} className="text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-semibold text-foreground block truncate">{expense.name}</span>
                  
                  <div className="flex items-center gap-1 mt-1">
                    {expense.assignedTo.slice(0, 3).map(pId => {
                      const person = people.find(p => p.id === pId);
                      if (!person) return null;
                      return person.avatar ? (
                        <img key={pId} src={person.avatar} alt={person.name} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div
                          key={pId}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.initials}
                        </div>
                      );
                    })}
                    {expense.assignedTo.length > 3 && (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                        +{expense.assignedTo.length - 3}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[14px] font-bold text-foreground block">{formatBRL(expense.amountBRL)}</span>
                </div>
                <button onClick={() => openEditExpense(expense)} className="ml-1" style={{ color: '#1A1C40' }}>
                  <Pencil size={16} strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
          {filteredExpenses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon name="receipt_long" size={24} className="text-muted-foreground" />
              </div>
              <span className="text-[16px] font-bold text-foreground mb-1">Nenhum gasto</span>
              <span className="text-[13px] text-muted-foreground text-center max-w-[240px]">
                Adicione seus gastos com hospedagem, transporte e atividades para controlar seu orçamento.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for fixed footer */}
      <div className="h-24" />

      {/* Fixed Footer Button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background px-5 pt-3 border-t border-border" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        <button
          onClick={() => setShowAddExpense(true)}
          className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
          style={{ background: '#9DCC36', color: '#1A1C40' }}
        >
          <Icon name="add" size={20} />
          Adicionar gasto
        </button>
      </div>

      {/* Add expense bottom sheet */}
      <AddBudgetExpenseSheet
        open={showAddExpense}
        onClose={() => { setShowAddExpense(false); setEditingExpense(null); }}
        onSave={(expense) => {
          if (editingExpense) {
            setExpenses(expenses.map(e => e.id === expense.id ? expense : e));
          } else {
            setExpenses([...expenses, expense]);
          }
          setEditingExpense(null);
          setNewExpense({ name: '', description: '', category: 'hospedagem', amountBRL: '' });
          setSplitType('none');
          setSelectedPeople(people.map(p => p.id));
          setCustomAmounts({});
        }}
        onDelete={(id) => {
          handleDeleteExpense(id);
          setEditingExpense(null);
          setNewExpense({ name: '', description: '', category: 'hospedagem', amountBRL: '' });
        }}
        editingExpense={editingExpense}
        people={people}
      />

      {/* Edit people sheet */}
      {showEditPeople && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditPeople(false)} />
          <div className="relative w-full max-w-[430px] bg-card rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-foreground">Editar pessoas</h2>
              <button onClick={() => setShowEditPeople(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              {people.map(person => (
                <div key={person.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  {person.avatar ? (
                    <img src={person.avatar} alt={person.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ backgroundColor: person.color }}>
                      {person.initials}
                    </div>
                  )}
                  <span className="text-[14px] font-medium text-foreground flex-1">{person.name}</span>
                  <button onClick={() => { setEditingPerson(person); setNewPersonName(person.name); setShowEditPeople(false); }} className="w-8 h-8 rounded-full flex items-center justify-center">
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDeletePerson(person.id)} className="w-8 h-8 rounded-full flex items-center justify-center">
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowEditPeople(false); setNewPersonName(''); setShowAddPerson(true); }}
              className="w-full py-4 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2"
              style={{ background: '#9DCC36', color: '#1A1C40' }}
            >
              <Plus size={18} />
              Adicionar pessoa
            </button>
          </div>
        </div>
      )}

      {/* Person extrato sheet */}
      {selectedPersonExtrato && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedPersonExtrato(null)} />
          <div className="relative w-full max-w-[430px] bg-card rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: selectedPersonExtrato.color }}>
                {selectedPersonExtrato.initials}
              </div>
              <div className="flex-1">
                <h2 className="text-[18px] font-bold text-foreground">{selectedPersonExtrato.name}</h2>
                <span className="text-[13px] text-muted-foreground">Extrato de gastos</span>
              </div>
              <button onClick={() => setSelectedPersonExtrato(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X size={18} className="text-foreground" />
              </button>
            </div>

            {(() => {
              const isSole = people.length === 1;
              const personExpenses = isSole
                ? expenses
                : expenses.filter(e => e.assignedTo.includes(selectedPersonExtrato.id));
              const personTotal = personExpenses.reduce((sum, e) => {
                if (isSole) return sum + e.amountBRL;
                const assignedCount = e.assignedTo.length || 1;
                return sum + (e.amountBRL / assignedCount);
              }, 0);

              return (
                <>
                  <div className="bg-muted/30 rounded-2xl p-4 mb-5">
                    <span className="text-[13px] text-muted-foreground block mb-1">Total individual</span>
                    <span className="text-[24px] font-bold text-foreground">{formatBRL(personTotal)}</span>
                  </div>

                  {personExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Icon name="receipt_long" size={22} className="text-muted-foreground" />
                      </div>
                      <span className="text-[14px] font-semibold text-foreground mb-1">Sem gastos</span>
                      <span className="text-[13px] text-muted-foreground text-center">Nenhum gasto atribuído a {selectedPersonExtrato.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {personExpenses.map(expense => {
                        const cat = categoryConfig[expense.category];
                        const CatIcon = cat.icon;
                        const assignedCount = isSole ? 1 : (expense.assignedTo.length || 1);
                        const individualAmount = expense.amountBRL / assignedCount;
                        return (
                          <div key={expense.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F3F3F3' }}>
                              <CatIcon size={16} strokeWidth={1.5} className="text-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-semibold text-foreground block truncate">{expense.name}</span>
                              <span className="text-[11px] text-muted-foreground block">{expense.description}</span>
                              {assignedCount > 1 && (
                                <span className="text-[10px] text-muted-foreground">Dividido entre {assignedCount} pessoas</span>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[13px] font-bold text-foreground block">{formatBRL(individualAmount)}</span>
                              {assignedCount > 1 && (
                                <span className="text-[10px] text-muted-foreground block">de {formatBRL(expense.amountBRL)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <SuccessToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        title={toastMessage.title}
        description={toastMessage.description}
      />
    </div>
  );
}
