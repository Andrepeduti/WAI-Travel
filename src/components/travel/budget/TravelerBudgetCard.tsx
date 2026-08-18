import React from 'react';

export interface BudgetPerson {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  avatar?: string;
}

interface TravelerBudgetCardProps {
  person: BudgetPerson;
  amount: number;
  onClick?: () => void;
  className?: string;
}

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function TravelerBudgetCard({ person, amount, onClick, className = '' }: TravelerBudgetCardProps) {
  const initials = person.initials || (
    person.name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'VI'
  );

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`flex-shrink-0 bg-card rounded-2xl p-4 min-w-[145px] max-w-[170px] border border-border/50 shadow-xs cursor-pointer active:scale-[0.98] hover:border-border transition-all select-none ${className}`}
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        {person.avatar ? (
          <img
            src={person.avatar}
            alt={person.name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-border/20"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-xs"
            style={{ backgroundColor: person.color || defaultColors[0] }}
          >
            {initials}
          </div>
        )}
        <span className="text-[13px] font-semibold text-[#171F2C] truncate block flex-1">
          {person.name}
        </span>
      </div>

      <span className="text-[15px] font-bold text-[#171F2C] block tracking-tight">
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
