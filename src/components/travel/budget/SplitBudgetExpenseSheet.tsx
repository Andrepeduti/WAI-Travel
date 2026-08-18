import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, X, Check, AlertCircle } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';

export interface SplitResult {
  splitType: 'equal' | 'custom' | 'none';
  assignedTo: string[];
  customSplits: Record<string, number>;
}

interface SplitBudgetExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: (result: SplitResult) => void;
  people: BudgetPerson[];
  targetTotalBRL: number;
  initialSplitType?: 'equal' | 'custom' | 'none';
  initialAssignedTo?: string[];
  initialCustomSplits?: Record<string, number>;
}

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function SplitBudgetExpenseSheet({
  open,
  onClose,
  onBack,
  onConfirm,
  people,
  targetTotalBRL,
  initialSplitType = 'equal',
  initialAssignedTo,
  initialCustomSplits = {},
}: SplitBudgetExpenseSheetProps) {
  const [splitType, setSplitType] = useState<'equal' | 'custom'>(
    initialSplitType === 'custom' ? 'custom' : 'equal'
  );

  // Selected people for 'equal' split
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialAssignedTo && initialAssignedTo.length > 0) {
      return initialAssignedTo;
    }
    return people.map(p => p.id);
  });

  // Custom amounts formatted string per person
  const [customInputValues, setCustomInputValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    people.forEach(p => {
      const val = initialCustomSplits[p.id];
      if (val !== undefined && val !== null) {
        map[p.id] = (val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (targetTotalBRL > 0 && people.length > 0 && initialSplitType === 'custom') {
        const share = targetTotalBRL / people.length;
        map[p.id] = share.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        map[p.id] = '';
      }
    });
    return map;
  });

  // Sync with initial values when opening
  useEffect(() => {
    if (open) {
      setSplitType(initialSplitType === 'custom' ? 'custom' : 'equal');
      if (initialAssignedTo && initialAssignedTo.length > 0) {
        setSelectedIds(initialAssignedTo);
      } else {
        setSelectedIds(people.map(p => p.id));
      }

      const map: Record<string, string> = {};
      people.forEach(p => {
        const val = initialCustomSplits[p.id];
        if (val !== undefined && val !== null && val > 0) {
          map[p.id] = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (initialSplitType === 'custom' && targetTotalBRL > 0 && people.length > 0) {
          const share = targetTotalBRL / people.length;
          map[p.id] = share.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
          map[p.id] = '';
        }
      });
      setCustomInputValues(map);
    }
  }, [open, initialSplitType, initialAssignedTo, JSON.stringify(initialCustomSplits), targetTotalBRL]);

  const parseCurrencyInput = (raw: string): number => {
    if (!raw) return 0;
    const clean = raw.replace(/[^\d,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  };

  const formatCurrencyInput = (rawDigits: string): string => {
    const digits = rawDigits.replace(/\D/g, '');
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Toggle traveler in 'equal' tab
  const handleTogglePerson = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  // Calculate sum in 'custom' tab
  const customSum = useMemo(() => {
    return people.reduce((acc, p) => {
      const val = parseCurrencyInput(customInputValues[p.id] || '');
      return acc + val;
    }, 0);
  }, [people, customInputValues]);

  const customDifference = Math.round((targetTotalBRL - customSum) * 100) / 100;
  const isCustomValid = targetTotalBRL <= 0 || Math.abs(customDifference) <= 0.05;

  const isFormValid = splitType === 'equal'
    ? selectedIds.length > 0
    : isCustomValid && customSum > 0;

  // Auto-distribute remainder among travelers with 0 or evenly
  const handleAutoDistribute = () => {
    if (targetTotalBRL <= 0 || people.length === 0) return;
    const share = Math.floor((targetTotalBRL / people.length) * 100) / 100;
    const remainder = Math.round((targetTotalBRL - (share * people.length)) * 100) / 100;

    const newValues: Record<string, string> = {};
    people.forEach((p, idx) => {
      const val = idx === 0 ? share + remainder : share;
      newValues[p.id] = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
    setCustomInputValues(newValues);
  };

  const handleConfirm = () => {
    if (splitType === 'equal') {
      onConfirm({
        splitType: 'equal',
        assignedTo: selectedIds,
        customSplits: {},
      });
    } else {
      const customSplits: Record<string, number> = {};
      const activeIds: string[] = [];
      people.forEach(p => {
        const val = parseCurrencyInput(customInputValues[p.id] || '');
        if (val > 0) {
          customSplits[p.id] = val;
          activeIds.push(p.id);
        }
      });

      onConfirm({
        splitType: 'custom',
        assignedTo: activeIds.length > 0 ? activeIds : people.map(p => p.id),
        customSplits,
      });
    }
  };

  const equalShare = selectedIds.length > 0 && targetTotalBRL > 0
    ? targetTotalBRL / selectedIds.length
    : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Modal */}
      <div
        className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-[24px] p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
        style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
      >
        {/* Header with Back Arrow and Close Button */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/60 transition-colors -ml-1"
            aria-label="Voltar"
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#171F2C] hover:bg-muted/60 transition-colors -mr-1"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-5">
          <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] mb-1">
            Dividir gasto
          </h2>
          <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
            Escolha os viajantes envolvidos nesse gasto.
          </p>
        </div>

        {/* Toggle / Tabs: [Igualmente] [Valor específico] */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSplitType('equal')}
            className={`h-[24px] px-3 rounded-[9px] font-['Urbanist'] font-medium text-[12px] leading-[14px] transition-all flex items-center justify-center border ${
              splitType === 'equal'
                ? 'bg-[#141530] text-[#FEFEFE] border-[#141530] shadow-xs'
                : 'bg-transparent text-[#141530] border-[#141530] hover:bg-muted/30'
            }`}
          >
            Igualmente
          </button>

          <button
            type="button"
            onClick={() => setSplitType('custom')}
            className={`h-[24px] px-3 rounded-[9px] font-['Urbanist'] font-medium text-[12px] leading-[14px] transition-all flex items-center justify-center border ${
              splitType === 'custom'
                ? 'bg-[#141530] text-[#FEFEFE] border-[#141530] shadow-xs'
                : 'bg-transparent text-[#141530] border-[#141530] hover:bg-muted/30'
            }`}
          >
            Valor específico
          </button>
        </div>

        {/* Tab 1: Igualmente */}
        {splitType === 'equal' && (
          <div className="space-y-3.5 mb-6 flex-1">
            {people.map((person, idx) => {
              const isChecked = selectedIds.includes(person.id);
              const initials = person.initials || person.name.slice(0, 2).toUpperCase();

              return (
                <div
                  key={person.id}
                  onClick={() => handleTogglePerson(person.id)}
                  className="flex items-center justify-between py-2 px-1 rounded-xl cursor-pointer select-none hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt={person.name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 border border-white"
                        style={{ backgroundColor: person.color || defaultColors[idx % defaultColors.length] }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] truncate">
                        {person.name}
                      </span>
                      {isChecked && targetTotalBRL > 0 && (
                        <span className="font-['Urbanist'] text-[12px] text-[#7F7F7F]">
                          R$ {equalShare.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Custom Checkbox (26px, #141530 with checkmark) */}
                  <div
                    className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center border transition-all ${
                      isChecked
                        ? 'bg-[#141530] border-[#141530] text-white shadow-xs'
                        : 'border-[#141530]/30 bg-background'
                    }`}
                  >
                    {isChecked && <Check size={16} strokeWidth={2.8} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Valor específico */}
        {splitType === 'custom' && (
          <div className="space-y-3 mb-6 flex-1">
            {people.map((person, idx) => {
              const initials = person.initials || person.name.slice(0, 2).toUpperCase();

              return (
                <div
                  key={person.id}
                  className="flex items-center justify-between gap-3 py-1 px-1"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt={person.name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 border border-white"
                        style={{ backgroundColor: person.color || defaultColors[idx % defaultColors.length] }}
                      >
                        {initials}
                      </div>
                    )}
                    <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] truncate">
                      {person.name}
                    </span>
                  </div>

                  {/* Custom amount card: #EDEDED, border-radius 12px, 54px */}
                  <div className="w-[140px] bg-[#EDEDED] rounded-[12px] px-3 py-1.5 flex flex-col justify-center border border-transparent focus-within:border-[#949494] transition-all">
                    <span className="font-['Urbanist'] font-medium text-[11px] leading-[14px] text-[#949494] block">
                      Valor
                    </span>
                    <div className="flex items-center">
                      <span className="font-['Urbanist'] font-medium text-[13px] text-[#141530] mr-1">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={customInputValues[person.id] || ''}
                        onChange={(e) => {
                          const val = formatCurrencyInput(e.target.value);
                          setCustomInputValues(prev => ({ ...prev, [person.id]: val }));
                        }}
                        className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] text-[#141530] outline-none placeholder:text-[#949494]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Validation & helper row */}
            {targetTotalBRL > 0 && (
              <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#7F7F7F]">Total informado no gasto:</span>
                  <span className="font-bold text-[#141530]">
                    R$ {targetTotalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#7F7F7F]">Soma das partes:</span>
                  <span className={`font-bold ${isCustomValid ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    R$ {customSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {!isCustomValid && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-[12px] text-[#DC2626]">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>
                        {customDifference > 0
                          ? `Faltam R$ ${customDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `Ultrapassou em R$ ${Math.abs(customDifference).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoDistribute}
                      className="text-[11px] font-bold text-[#141530] underline ml-2 hover:opacity-80"
                    >
                      Ajustar igual
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Button: Confirmar (48px, #9DCC36, border-radius 16px, 16px font-bold #141530) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isFormValid}
            className="w-full h-[48px] px-6 rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
