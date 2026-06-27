import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Building2, Plane, UtensilsCrossed, Ticket, X, Trash2 } from 'lucide-react';

export interface BudgetExpense {
  id: string;
  name: string;
  description: string;
  category: 'hospedagem' | 'transporte' | 'alimentacao' | 'atividade';
  amountBRL: number;
  amountEUR: number;
  assignedTo: string[];
}

export interface BudgetPerson {
  id: string;
  initials: string;
  name: string;
  color: string;
}

const categoryConfig = {
  hospedagem: { label: 'Hospedagem', icon: Building2, color: '#10B981' },
  transporte: { label: 'Transporte', icon: Plane, color: '#3B82F6' },
  alimentacao: { label: 'Alimentação', icon: UtensilsCrossed, color: '#F59E0B' },
  atividade: { label: 'Atividade', icon: Ticket, color: '#8B5CF6' }
};

interface AddBudgetExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (expense: BudgetExpense) => void;
  onDelete?: (id: string) => void;
  editingExpense?: BudgetExpense | null;
  people: BudgetPerson[];
}

export function AddBudgetExpenseSheet({ open, onClose, onSave, onDelete, editingExpense, people }: AddBudgetExpenseSheetProps) {
  const [newExpense, setNewExpense] = useState({
    name: '',
    description: '',
    category: 'hospedagem' as BudgetExpense['category'],
    amountBRL: ''
  });
  const hasMultiple = people.length > 1;
  const [splitType, setSplitType] = useState<'none' | 'equal' | 'custom'>(hasMultiple ? 'equal' : 'none');
  const [selectedPeople, setSelectedPeople] = useState<string[]>(people.map((p) => p.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [splitOpen, setSplitOpen] = useState(false);

  const formatCurrency = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    if (open) {
      if (editingExpense) {
        const cents = Math.round((editingExpense.amountBRL || 0) * 100);
        setNewExpense({
          name: editingExpense.name,
          description: editingExpense.description,
          category: editingExpense.category,
          amountBRL: cents > 0 ? formatCurrency(String(cents)) : ''
        });
        setSplitType(editingExpense.assignedTo.length > 0 ? 'equal' : (hasMultiple ? 'equal' : 'none'));
        setSelectedPeople(editingExpense.assignedTo.length > 0 ? editingExpense.assignedTo : people.map((p) => p.id));
      } else {
        setNewExpense({ name: '', description: '', category: 'hospedagem', amountBRL: '' });
        setSplitType(hasMultiple ? 'equal' : 'none');
        setSelectedPeople(hasMultiple ? [] : people.map((p) => p.id));
        setCustomAmounts({});
        setSplitOpen(false);
      }
    }
  }, [open, editingExpense, people, hasMultiple]);

  if (!open) return null;

  const togglePerson = (id: string) => {
    setSelectedPeople((prev) =>
    prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!newExpense.name || !newExpense.amountBRL) return;
    if (hasMultiple && selectedPeople.length === 0) return;
    const brl = parseFloat(newExpense.amountBRL.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(brl)) return;
    const eur = brl * 0.1792;

    const assignedTo = hasMultiple ? selectedPeople : people.map((p) => p.id);

    const expense: BudgetExpense = {
      id: editingExpense?.id || Date.now().toString(),
      name: newExpense.name,
      description: newExpense.description,
      category: newExpense.category,
      amountBRL: brl,
      amountEUR: eur,
      assignedTo
    };

    onSave(expense);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-[430px] bg-card rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-bold text-foreground">{editingExpense ? 'Editar gasto' : 'Novo gasto'}</h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F2F2F2' }}>
            <X size={18} className="text-foreground" />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-[13px] font-medium text-foreground block mb-1.5">Nome</label>
          <input
            type="text"
            value={newExpense.name}
            onChange={(e) => setNewExpense((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Hotel Le Marais"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
          
        </div>

        {/* Description */}
        








        

        {/* Category */}
        <div className="mb-4">
          <label className="text-[13px] font-medium text-foreground block mb-1.5">Categoria</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const CatIcon = config.icon;
              const isSelected = newExpense.category === key;
              return (
                <button
                  key={key}
                  onClick={() => setNewExpense((prev) => ({ ...prev, category: key as BudgetExpense['category'] }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-colors border ${
                  isSelected ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border'}`
                  }>
                  
                  <CatIcon size={14} strokeWidth={1.5} />
                  {config.label}
                </button>);

            })}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label className="text-[13px] font-medium text-foreground block mb-1.5">Valor (R$)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground pointer-events-none">R$</span>
            <input
              type="text"
              value={newExpense.amountBRL}
              onChange={(e) => setNewExpense((prev) => ({ ...prev, amountBRL: formatCurrency(e.target.value) }))}
              placeholder="0,00"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              inputMode="numeric" />
          </div>
        </div>

        {/* Person assignment — only when there's more than 1 person */}
        {hasMultiple && (
          <div className="mb-6">
            <label className="text-[13px] font-medium text-foreground block mb-1.5">
              De quem é esse gasto? <span className="text-destructive">*</span>
            </label>

            <div className="space-y-2 mb-3">
              {people.map((person) => {
                const isSelected = selectedPeople.includes(person.id);
                const brlValue = newExpense.amountBRL ? parseFloat(newExpense.amountBRL.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0;
                const equalShare = selectedPeople.length > 0 ? brlValue / selectedPeople.length : 0;

                return (
                  <div
                    key={person.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                      isSelected ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50 border border-transparent'
                    }`}
                    onClick={() => togglePerson(person.id)}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: person.color }}>
                      {person.initials}
                    </div>
                    <span className="text-[13px] font-medium text-foreground flex-1">{person.name}</span>

                    {isSelected && splitType === 'equal' && brlValue > 0 &&
                      <span className="text-[12px] font-semibold" style={{ color: '#1A1C40' }}>
                        R$ {equalShare.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    }

                    {isSelected && splitType === 'custom' &&
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={customAmounts[person.id] || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          setCustomAmounts((prev) => ({ ...prev, [person.id]: e.target.value }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 px-2 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    }

                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    }`}>
                      {isSelected &&
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      }
                    </div>
                  </div>);
              })}
            </div>

            {selectedPeople.length === 0 &&
              <p className="text-[11px] text-destructive mb-2">Selecione ao menos uma pessoa</p>
            }

            {selectedPeople.length > 1 && (
              <>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5 mt-2">Como dividir</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitType('equal')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                      splitType === 'equal' ? 'bg-foreground text-background border-foreground' : 'bg-transparent border-border text-foreground'
                    }`}>
                    Igualmente
                  </button>
                  <button
                    onClick={() => setSplitType('custom')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                      splitType === 'custom' ? 'bg-foreground text-background border-foreground' : 'bg-transparent border-border text-foreground'
                    }`}>
                    Personalizado
                  </button>
                </div>
              </>
            )}
          </div>
        )}

          {editingExpense && onDelete &&
          <button
            onClick={() => {onDelete(editingExpense.id);onClose();}}
            className="w-full py-3 flex items-center justify-start gap-2 mt-2 mb-4">
              <Trash2 size={18} className="text-destructive" />
              <span className="text-destructive text-[15px] font-medium">Remover gasto</span>
            </button>
          }

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!newExpense.name || !newExpense.amountBRL || (hasMultiple && selectedPeople.length === 0)}
            className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] disabled:bg-[#D1D5DB] disabled:text-white">
            
            {editingExpense ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>);

}