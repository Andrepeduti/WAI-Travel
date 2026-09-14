import React from 'react';
import { formatCurrency } from '@/lib/currencyUtils';

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
  currency?: string;
  className?: string;
}

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function TravelerBudgetCard({ person, amount, currency = 'BRL', className = '' }: TravelerBudgetCardProps) {
  const initials = person.initials || (
    person.name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'VI'
  );

  return (
    <div
      className={`box-border flex flex-col items-start p-4 gap-4 w-[181px] bg-[#FFFFFF] border border-[#EBEBEB] rounded-[16px] select-none flex-shrink-0 ${className}`}
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >
      <div className="flex flex-row items-center gap-2 w-full h-[25px]">
        {person.avatar ? (
          <img
            src={person.avatar}
            alt={person.name}
            className="w-[26px] h-[25px] rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-[26px] h-[25px] rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: person.color || defaultColors[0] }}
          >
            {initials}
          </div>
        )}
        <div className="flex flex-col items-start gap-[8px] flex-1">
          <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767] truncate w-full">
            {person.name}
          </span>
        </div>
      </div>

      <div className="font-['Urbanist'] font-bold text-[18px] leading-[22px] text-[#141530] flex-shrink-0">
        {formatCurrency(amount, currency)}
      </div>
    </div>
  );
}
