import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const categories = [
  { id: 'food', label: 'Comida', icon: 'restaurant' },
  { id: 'transport', label: 'Transporte', icon: 'directions_bus' },
  { id: 'ticket', label: 'Ingresso', icon: 'confirmation_number' },
  { id: 'other', label: 'Outro', icon: 'more_horiz' },
] as const;

type ExpenseCategory = typeof categories[number]['id'];

export interface DayExpense {
  description: string;
  amount: string;
  currency: string;
  category: ExpenseCategory;
}

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DayExpense) => void;
  dayNumber: number;
}

export function AddExpenseSheet({ open, onClose, onSave, dayNumber }: AddExpenseSheetProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [category, setCategory] = useState<ExpenseCategory>('food');

  if (!open) return null;

  const handleSave = () => {
    if (!description.trim() || !amount.trim()) return;
    onSave({ description: description.trim(), amount: amount.trim(), currency, category });
    setDescription('');
    setAmount('');
    setCurrency('EUR');
    setCategory('food');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-foreground">Adicionar gasto</h2>
            <span className="text-[12px] text-muted-foreground">Dia {dayNumber}</span>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 space-y-5 overflow-y-auto flex-1">
          {/* Description */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Descrição do gasto
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
              <input
                type="text"
                placeholder="Ex: Jantar no restaurante"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Valor
              </label>
              <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
                <input
                  type="text"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
            <div className="w-24">
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Moeda
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-xl px-3 py-3 text-[14px] text-foreground outline-none appearance-none"
                style={{ background: '#F2F2F2' }}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Categoria
            </label>
            <div className="flex gap-2 flex-wrap">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-colors ${
                    category === c.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-secondary/50'
                  }`}
                >
                  <Icon name={c.icon} size={18} className={category === c.id ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`text-[13px] font-medium ${category === c.id ? 'text-primary' : 'text-foreground'}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer button */}
        <div className="px-5 pb-8 pt-3 border-t border-border/40">
          <button
            onClick={handleSave}
            disabled={!description.trim() || !amount.trim()}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground transition-colors"
          >
            Salvar gasto
          </button>
        </div>
      </div>
    </div>
  );
}
