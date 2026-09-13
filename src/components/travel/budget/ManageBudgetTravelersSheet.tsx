import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, UserPlus, Receipt, ArrowLeft } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';
import { BudgetExpense } from './AddBudgetExpenseSheet';

interface ManageBudgetTravelersSheetProps {
  open: boolean;
  onClose: () => void;
  people: BudgetPerson[];
  onAddPerson: (name: string) => void;
  onEditPerson: (id: string, name: string) => void;
  onDeletePerson: (id: string) => void;
  expenses: BudgetExpense[];
  participantIds: Set<string>;
}

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function ManageBudgetTravelersSheet({
  open,
  onClose,
  people,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  expenses,
  participantIds,
}: ManageBudgetTravelersSheetProps) {
  const [selectedPersonDetail, setSelectedPersonDetail] = useState<BudgetPerson | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [editingPerson, setEditingPerson] = useState<BudgetPerson | null>(null);
  const [personNameInput, setPersonNameInput] = useState('');

  if (!open) return null;

  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSavePerson = () => {
    if (!personNameInput.trim()) return;
    if (editingPerson) {
      onEditPerson(editingPerson.id, personNameInput.trim());
      setEditingPerson(null);
    } else {
      onAddPerson(personNameInput.trim());
      setIsAddingPerson(false);
    }
    setPersonNameInput('');
  };

  const getPersonExpenses = (personId: string) => {
    const isSole = people.length === 1;
    return expenses.filter(e => {
      if (isSole) return true;
      return e.assignedTo?.includes(personId);
    });
  };

  const getPersonTotal = (personId: string) => {
    const personExpenses = getPersonExpenses(personId);
    return personExpenses.reduce((sum, e) => {
      if (people.length === 1) return sum + e.amountBRL;
      if (e.splitType === 'custom' && e.customSplits && e.customSplits[personId] !== undefined) {
        return sum + e.customSplits[personId];
      }
      const count = e.assignedTo?.length || 1;
      return sum + (e.amountBRL / count);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div
        className="relative w-full max-w-lg bg-background rounded-t-[32px] p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
        style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
      >
        {/* Detail view of individual traveler */}
        {selectedPersonDetail ? (
          <div>
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setSelectedPersonDetail(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/60 transition-colors -ml-1"
                aria-label="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/60 transition-colors -mr-1"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5">
              <h3 className="text-[20px] font-bold text-[#171F2C]">Extrato individual</h3>
            </div>

            <div className="flex items-center gap-3.5 mb-5 p-4 rounded-2xl bg-muted/40 border border-border/40">
              {selectedPersonDetail.avatar ? (
                <img
                  src={selectedPersonDetail.avatar}
                  alt={selectedPersonDetail.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-bold shadow-xs"
                  style={{ backgroundColor: selectedPersonDetail.color || defaultColors[0] }}
                >
                  {selectedPersonDetail.initials || selectedPersonDetail.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[16px] font-bold text-[#171F2C] block truncate">
                  {selectedPersonDetail.name}
                </span>
                <span className="text-[12px] text-[#7F7F7F] block">
                  Total atribuído: <strong className="text-[#171F2C]">{formatBRL(getPersonTotal(selectedPersonDetail.id))}</strong>
                </span>
              </div>
            </div>

            {/* List of expenses for this person */}
            <div className="space-y-2.5 mb-4">
              <span className="text-[13px] font-bold text-[#7F7F7F] uppercase tracking-wider block px-1">
                Gastos atribuídos
              </span>
              {getPersonExpenses(selectedPersonDetail.id).length === 0 ? (
                <div className="py-8 text-center text-[#7F7F7F] text-[13px]">
                  Nenhum gasto atribuído a este viajante.
                </div>
              ) : (
                getPersonExpenses(selectedPersonDetail.id).map(e => {
                  let share = e.amountBRL;
                  if (people.length > 1) {
                    if (e.splitType === 'custom' && e.customSplits && e.customSplits[selectedPersonDetail.id] !== undefined) {
                      share = e.customSplits[selectedPersonDetail.id];
                    } else {
                      const count = e.assignedTo?.length || 1;
                      share = e.amountBRL / count;
                    }
                  }

                  return (
                    <div
                      key={e.id}
                      className="p-3.5 rounded-2xl bg-card border border-border/40 flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[14px] font-semibold text-[#171F2C] block truncate">
                          {e.name}
                        </span>
                        <span className="text-[12px] text-[#7F7F7F] capitalize block">
                          {e.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[14px] font-bold text-[#171F2C] block">
                          {formatBRL(share)}
                        </span>
                        {share !== e.amountBRL && (
                          <span className="text-[10px] text-[#7F7F7F] block">
                            de {formatBRL(e.amountBRL)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : isAddingPerson || editingPerson ? (
          /* Add / Edit person form */
          <div>
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => { setIsAddingPerson(false); setEditingPerson(null); setPersonNameInput(''); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/60 transition-colors -ml-1"
                aria-label="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/60 transition-colors -mr-1"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-[20px] font-bold text-[#171F2C]">
                {editingPerson ? 'Editar viajante' : 'Adicionar viajante'}
              </h3>
            </div>

            <div className="bg-[#F0F0F0] rounded-2xl p-3.5 px-4 mb-5 border border-transparent focus-within:border-border transition-all">
              <label className="text-[11px] font-semibold text-[#7F7F7F] block uppercase tracking-wider leading-none mb-1">
                Nome do viajante
              </label>
              <input
                type="text"
                value={personNameInput}
                onChange={(e) => setPersonNameInput(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full bg-transparent text-[14px] font-semibold text-[#171F2C] outline-none placeholder:text-[#9CA3AF]"
                autoFocus
              />
            </div>

            <button
              type="button"
              onClick={handleSavePerson}
              disabled={!personNameInput.trim()}
              className="w-full h-14 rounded-2xl bg-[#9DCC36] text-[#141530] text-[16px] font-bold shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {editingPerson ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        ) : (
          /* Main travelers list */
          <div>
            {/* Top Bar */}
            <div className="flex items-center justify-end mb-3">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/60 transition-colors -mr-1"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5">
              <h3 className="text-[22px] font-bold text-[#171F2C] leading-tight mb-1">
                Viajantes do Orçamento
              </h3>
              <p className="text-[13px] font-medium text-[#7F7F7F]">
                Gerencie os participantes para divisão de gastos.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {people.map((person, idx) => {
                const initials = person.initials || person.name.slice(0, 2).toUpperCase();
                const total = getPersonTotal(person.id);
                const isPermanent = participantIds.has(person.id);

                return (
                  <div
                    key={person.id}
                    className="p-3.5 rounded-2xl bg-card border border-border/40 flex items-center justify-between gap-3 hover:border-border transition-all"
                  >
                    <div
                      onClick={() => setSelectedPersonDetail(person)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                          style={{ backgroundColor: person.color || defaultColors[idx % defaultColors.length] }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-semibold text-[#171F2C] block truncate">
                          {person.name}
                        </span>
                        <span className="text-[12px] font-bold text-[#7F7F7F] block">
                          {formatBRL(total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPerson(person);
                          setPersonNameInput(person.name);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#7F7F7F] hover:text-[#171F2C] hover:bg-muted/50 transition-colors"
                        title="Editar nome"
                      >
                        <Pencil size={15} />
                      </button>

                      {!isPermanent && (
                        <button
                          type="button"
                          onClick={() => onDeletePerson(person.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => { setIsAddingPerson(true); setPersonNameInput(''); }}
              className="w-full h-14 rounded-2xl bg-[#9DCC36] text-[#141530] text-[16px] font-bold shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              Adicionar viajante
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
