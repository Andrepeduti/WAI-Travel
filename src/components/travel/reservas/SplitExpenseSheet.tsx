import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';

export interface SplitPerson {
  id: string;
  initials: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface SplitConfig {
  type: 'none' | 'equal' | 'custom';
  assignedIds: string[];
  customAmounts: Record<string, string>;
}

interface SplitExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: SplitConfig) => void;
  initialConfig?: SplitConfig;
  people?: SplitPerson[];
  totalValueFormatted?: string;
}

const defaultPeople: SplitPerson[] = [
  { id: '1', initials: 'EU', name: 'Você', color: '#3B82F6' },
  { id: '2', initials: 'AN', name: 'Ana', color: '#10B981' },
  { id: '3', initials: 'BR', name: 'Bruno', color: '#8B5CF6' },
];

export function SplitExpenseSheet({
  isOpen,
  onClose,
  onConfirm,
  initialConfig,
  people = defaultPeople,
  totalValueFormatted = '',
}: SplitExpenseSheetProps) {
  const travelers = people && people.length > 0 ? people : defaultPeople;

  const [splitType, setSplitType] = useState<'none' | 'equal' | 'custom'>(
    initialConfig?.type || 'equal'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialConfig?.assignedIds?.length ? initialConfig.assignedIds : travelers.map((p) => p.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    initialConfig?.customAmounts || {}
  );

  useEffect(() => {
    if (isOpen) {
      setSplitType(initialConfig?.type || 'equal');
      setSelectedIds(
        initialConfig?.assignedIds?.length ? initialConfig.assignedIds : travelers.map((p) => p.id)
      );
      setCustomAmounts(initialConfig?.customAmounts || {});
    }
  }, [isOpen, initialConfig, travelers]);

  if (!isOpen) return null;

  const numericTotal = () => {
    const raw = totalValueFormatted.replace(/[^\d]/g, '');
    if (!raw) return 0;
    return parseInt(raw, 10) / 100;
  };

  const total = numericTotal();
  const equalShare = selectedIds.length > 0 ? total / selectedIds.length : 0;

  const handleTogglePerson = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  };

  const handleSave = () => {
    onConfirm({
      type: splitType,
      assignedIds: splitType === 'none' ? [] : selectedIds,
      customAmounts: splitType === 'custom' ? customAmounts : {},
    });
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[110] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[120] flex justify-center pointer-events-none"
        style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
      >
        <div className="bg-background rounded-t-[32px] w-full max-w-lg p-6 pb-8 pointer-events-auto shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
          {/* Top Bar with Close Button */}
          <div className="flex items-center justify-end mb-3">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#141530] hover:bg-muted/60 transition-colors -mr-1"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Title */}
          <div className="mb-4">
            <h3 className="text-[20px] font-bold text-[#141530]">
              Dividir gasto com outros viajantes
            </h3>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-muted/40 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setSplitType('equal')}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                splitType === 'equal'
                  ? 'bg-background text-[#141530] shadow-xs'
                  : 'text-muted-foreground hover:text-[#141530]'
              }`}
            >
              Igualmente
            </button>
            <button
              type="button"
              onClick={() => setSplitType('custom')}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                splitType === 'custom'
                  ? 'bg-background text-[#141530] shadow-xs'
                  : 'text-muted-foreground hover:text-[#141530]'
              }`}
            >
              Personalizado
            </button>
            <button
              type="button"
              onClick={() => setSplitType('none')}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                splitType === 'none'
                  ? 'bg-background text-[#141530] shadow-xs'
                  : 'text-muted-foreground hover:text-[#141530]'
              }`}
            >
              Não dividir
            </button>
          </div>

          {splitType !== 'none' && (
            <div className="space-y-2.5 mb-6">
              <div className="text-[13px] font-medium text-muted-foreground px-1 mb-1">
                Selecione quem irá dividir:
              </div>
              {travelers.map((person) => {
                const isSelected = selectedIds.includes(person.id);
                return (
                  <div
                    key={person.id}
                    onClick={() => handleTogglePerson(person.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#9DCC36] bg-[#F4F9E6]'
                        : 'border-border bg-background hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.initials}
                        </div>
                      )}
                      <span className="text-[14px] font-semibold text-[#141530]">
                        {person.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isSelected && splitType === 'equal' && total > 0 && (
                        <span className="text-[13px] font-bold text-[#141530]">
                          R${' '}
                          {equalShare.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}

                      {isSelected && splitType === 'custom' && (
                        <div
                          className="relative flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="absolute left-2.5 text-[12px] text-muted-foreground">
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0,00"
                            value={customAmounts[person.id] || ''}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              if (!digits) {
                                setCustomAmounts((prev) => ({ ...prev, [person.id]: '' }));
                                return;
                              }
                              const val = (parseInt(digits, 10) / 100).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });
                              setCustomAmounts((prev) => ({ ...prev, [person.id]: val }));
                            }}
                            className="w-24 pl-8 pr-2 py-1.5 rounded-xl border border-border bg-background text-[13px] font-medium text-foreground text-right outline-none focus:border-[#9DCC36]"
                          />
                        </div>
                      )}

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#9DCC36] border-[#9DCC36] text-[#141530]'
                            : 'border-muted-foreground/30 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 rounded-2xl bg-[#9DCC36] text-[#141530] text-[16px] font-bold shadow-sm active:scale-[0.99] transition-all"
          >
            Confirmar divisão
          </button>
        </div>
      </div>
    </>
  );
}
