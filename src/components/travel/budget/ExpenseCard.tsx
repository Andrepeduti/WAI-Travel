import React from 'react';
import { ChevronRight, Building2, Plane, UtensilsCrossed, Ticket, CircleDot } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';

export interface ExpenseItem {
  id: string;
  name: string;
  description?: string;
  category: 'hospedagem' | 'transporte' | 'alimentacao' | 'atividade' | string;
  amountBRL: number;
  amountEUR?: number;
  assignedTo: string[];
  splitType?: 'equal' | 'custom' | 'none';
  customSplits?: Record<string, number>;
  activityId?: string | number;
}

interface ExpenseCardProps {
  expense: ExpenseItem;
  people: BudgetPerson[];
  onClick?: () => void;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  hospedagem: 'Hospedagem',
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  atividade: 'Atividade',
  outros: 'Outros',
};

const categoryIcons: Record<string, typeof Building2> = {
  hospedagem: Building2,
  transporte: Plane,
  alimentacao: UtensilsCrossed,
  atividade: Ticket,
};

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function ExpenseCard({ expense, people, onClick, className = '' }: ExpenseCardProps) {
  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const categoryLabel = categoryLabels[expense.category] || expense.category || 'Gasto';
  
  // Find assigned people objects
  const assignedPeople = expense.assignedTo && expense.assignedTo.length > 0
    ? expense.assignedTo.map(id => people.find(p => p.id === id)).filter((p): p is BudgetPerson => Boolean(p))
    : [];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`group flex items-center justify-between py-3.5 px-3 rounded-2xl bg-card hover:bg-muted/30 border border-transparent hover:border-border/40 transition-all cursor-pointer select-none active:scale-[0.99] ${className}`}
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >
      {/* Left section: Icon + Title & Category */}
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        {/* Concentric / Category stylish icon */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-border/70 bg-[#F8F9FA] group-hover:border-[#1A1C40]/20 transition-colors">
          <CircleDot size={20} strokeWidth={1.75} className="text-[#171F2C]" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[15px] font-bold text-[#171F2C] block truncate leading-tight">
            {expense.name || 'Sem nome'}
          </span>
          <span className="text-[12px] font-medium text-[#7F7F7F] block truncate mt-0.5">
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* Right section: Price, Stacked Avatars & Chevron */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="flex flex-col items-end">
          <span className="text-[14px] font-bold text-[#171F2C] block tracking-tight">
            {formatBRL(expense.amountBRL)}
          </span>

          {/* Stacked traveler avatars */}
          {assignedPeople.length > 0 && (
            <div className="flex items-center -space-x-1.5 mt-1">
              {assignedPeople.slice(0, 3).map((person, idx) => {
                const initials = person.initials || person.name.slice(0, 2).toUpperCase();
                return person.avatar ? (
                  <img
                    key={person.id}
                    src={person.avatar}
                    alt={person.name}
                    className="w-5 h-5 rounded-full object-cover ring-2 ring-background"
                  />
                ) : (
                  <div
                    key={person.id}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-background"
                    style={{ backgroundColor: person.color || defaultColors[idx % defaultColors.length] }}
                  >
                    {initials}
                  </div>
                );
              })}
              {assignedPeople.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-[#E5E7EB] text-[#4B5563] ring-2 ring-background flex items-center justify-center text-[8px] font-bold">
                  +{assignedPeople.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        <ChevronRight size={18} className="text-[#9CA3AF] group-hover:text-[#171F2C] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </div>
  );
}
