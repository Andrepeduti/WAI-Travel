import React from 'react';
import { ChevronRight, Building2, Plane, UtensilsCrossed, Ticket, CircleDot } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';
import { formatCurrency } from '@/lib/currencyUtils';

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
  currency?: string;
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

export function ExpenseCard({ expense, people, currency = 'BRL', onClick, className = '' }: ExpenseCardProps) {
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
      className={`group flex flex-col items-start w-[345px] gap-[25px] pb-5 pt-3 mx-auto cursor-pointer select-none active:scale-[0.99] transition-all ${className}`}
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >
      <div className="flex flex-row items-start gap-4 w-[345px]">
        {/* Left section: Icon */}
        <div className="flex flex-row items-center gap-2 flex-1">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-[#141530]">
            <CircleDot size={24} strokeWidth={2} />
          </div>

          <div className="flex flex-col items-start gap-1 flex-1">
            <span className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#1A1C40] block truncate">
              {expense.name || 'Sem nome'}
            </span>
            <span className="font-['Urbanist'] font-medium text-[12px] leading-[14px] text-[#7F7F7F] block truncate">
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* Right section: Price & Avatars */}
        <div className="flex flex-col items-end justify-center gap-1">
          <div className="font-['Urbanist'] font-bold text-[15px] leading-[18px] text-[#171F2C]">
            {formatCurrency(expense.amountBRL, currency)}
          </div>

          {/* Stacked traveler avatars */}
          {assignedPeople.length > 0 && (
            <div className="flex items-center -space-x-1.5 flex-shrink-0">
              {assignedPeople.slice(0, 3).map((person, idx) => {
                const initials = person.initials || person.name.slice(0, 2).toUpperCase();
                return person.avatar ? (
                  <img
                    key={person.id}
                    src={person.avatar}
                    alt={person.name}
                    className="w-[26px] h-[26px] rounded-full object-cover border-[1px] border-white"
                  />
                ) : (
                  <div
                    key={person.id}
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[10px] font-bold border-[1px] border-white"
                    style={{ backgroundColor: person.color || defaultColors[idx % defaultColors.length] }}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Divider */}
      <div className="w-[345px] border-t border-[#F2F2F2]" />
    </div>
  );
}
