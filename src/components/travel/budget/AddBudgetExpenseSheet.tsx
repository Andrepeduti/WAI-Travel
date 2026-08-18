import React, { useState, useEffect } from 'react';
import { X, MapPin, ChevronRight, Trash2, Check, ChevronDown } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';
import { SplitBudgetExpenseSheet, SplitResult } from './SplitBudgetExpenseSheet';

export interface BudgetExpense {
  id: string;
  name: string;
  description?: string;
  category: 'hospedagem' | 'transporte' | 'alimentacao' | 'atividade' | 'outros';
  amountBRL: number;
  amountEUR?: number;
  assignedTo: string[];
  splitType?: 'equal' | 'custom' | 'none';
  customSplits?: Record<string, number>;
  activityId?: string | number;
  activityName?: string;
}

export interface ActivityOption {
  id: string | number;
  name: string;
  category?: string;
  price?: string;
  day?: number;
  date?: Date;
}

interface AddBudgetExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (expense: BudgetExpense) => void;
  onDelete?: (id: string) => void;
  editingExpense?: BudgetExpense | null;
  people: BudgetPerson[];
  activities?: ActivityOption[];
}

const categoryOptions = [
  { key: 'atividade', label: 'Atividade' },
  { key: 'hospedagem', label: 'Hospedagem' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'alimentacao', label: 'Alimentação' },
  { key: 'outros', label: 'Outros' },
] as const;

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function AddBudgetExpenseSheet({
  open,
  onClose,
  onSave,
  onDelete,
  editingExpense,
  people,
  activities = [],
}: AddBudgetExpenseSheetProps) {
  // Form fields
  const [name, setName] = useState('');
  const [activityName, setActivityName] = useState('');
  const [activityId, setActivityId] = useState<string | number | undefined>(undefined);
  const [category, setCategory] = useState<BudgetExpense['category']>('atividade');
  const [amountInput, setAmountInput] = useState('');

  // Cost splitting state
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'none'>('equal');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [isSplitExplicitlyConfigured, setIsSplitExplicitlyConfigured] = useState(false);

  // Sub-modal state
  const [showSplitSubSheet, setShowSplitSubSheet] = useState(false);

  // Category dropdown open state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  const formatCurrency = (rawDigits: string): string => {
    const digits = rawDigits.replace(/\D/g, '');
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getNumericAmount = (formatted: string): number => {
    const clean = formatted.replace(/[^\d,]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Sync initial values when editing or opening
  useEffect(() => {
    if (open) {
      if (editingExpense) {
        setName(editingExpense.name || '');
        setActivityName(editingExpense.activityName || '');
        setActivityId(editingExpense.activityId);
        setCategory(editingExpense.category || 'atividade');

        const cents = Math.round((editingExpense.amountBRL || 0) * 100);
        setAmountInput(cents > 0 ? formatCurrency(String(cents)) : '');

        setSplitType(editingExpense.splitType || (editingExpense.assignedTo?.length ? 'equal' : 'none'));
        setAssignedTo(editingExpense.assignedTo?.length ? editingExpense.assignedTo : people.map(p => p.id));
        setCustomSplits(editingExpense.customSplits || {});
        // Only consider configured if editing an expense that explicitly has multiple participants or custom split
        setIsSplitExplicitlyConfigured(Boolean(
          (editingExpense.assignedTo && editingExpense.assignedTo.length > 1) ||
          editingExpense.splitType === 'custom'
        ));
      } else {
        setName('');
        setActivityName('');
        setActivityId(undefined);
        setCategory('atividade');
        setAmountInput('');
        setSplitType('equal');
        setAssignedTo(people.map(p => p.id));
        setCustomSplits({});
        setIsSplitExplicitlyConfigured(false);
      }
      setShowSplitSubSheet(false);
      setShowCategoryPicker(false);
      setShowActivityPicker(false);
    }
  }, [open, editingExpense, people]);

  if (!open) return null;

  const currentNumericAmount = getNumericAmount(amountInput);

  const handleSelectActivity = (act: ActivityOption) => {
    const displayName = act.day ? `${act.name} - Dia ${act.day}` : act.name;
    setActivityName(displayName);
    setActivityId(act.id);
    if (!name.trim() || name === activityName) {
      setName(act.name);
    }
    if (act.category) {
      const lower = act.category.toLowerCase();
      if (lower.includes('hosped') || lower.includes('hotel') || lower.includes('airbnb')) setCategory('hospedagem');
      else if (lower.includes('transp') || lower.includes('voo') || lower.includes('carro') || lower.includes('trem') || lower.includes('metro')) setCategory('transporte');
      else if (lower.includes('rest') || lower.includes('comida') || lower.includes('alimen') || lower.includes('café') || lower.includes('bar')) setCategory('alimentacao');
      else setCategory('atividade');
    }
    if (act.price && (!amountInput || amountInput === '0,00')) {
      const digits = act.price.replace(/\D/g, '');
      if (digits) {
        setAmountInput(formatCurrency(digits.length <= 3 ? digits + '00' : digits));
      }
    }
    setShowActivityPicker(false);
  };

  const handleSplitConfirmed = (result: SplitResult) => {
    setSplitType(result.splitType);
    setAssignedTo(result.assignedTo);
    setCustomSplits(result.customSplits);
    // Explicitly mark as configured so label changes and avatars appear
    setIsSplitExplicitlyConfigured(true);
    setShowSplitSubSheet(false);
  };

  const handleSave = () => {
    if (!name.trim() || currentNumericAmount <= 0) return;

    const finalAssignedTo = assignedTo.length > 0 ? assignedTo : people.map(p => p.id);

    const expense: BudgetExpense = {
      id: editingExpense?.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      description: editingExpense?.description || '',
      category,
      amountBRL: currentNumericAmount,
      amountEUR: currentNumericAmount * 0.1792,
      assignedTo: finalAssignedTo,
      splitType,
      customSplits: splitType === 'custom' ? customSplits : {},
      activityId,
      activityName: activityName.trim() || undefined,
    };

    onSave(expense);
    onClose();
  };

  const selectedPeopleObjects = assignedTo
    .map(id => people.find(p => p.id === id))
    .filter((p): p is BudgetPerson => Boolean(p));

  // Only show the split state (label change + avatars) once the user has configured the split or for existing split expenses
  const isSplitActive = isSplitExplicitlyConfigured && selectedPeopleObjects.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Main Sheet */}
        <div
          className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-[24px] p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
          style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
        >
          {/* Top Bar with Close Button */}
          <div className="flex items-center justify-end mb-3">
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
          <div className="mb-6">
            <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] mb-1.5">
              {editingExpense ? 'Editar gasto' : 'Adicionar orçamento'}
            </h2>
            <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
              Preencha as informações do gasto para o planejamento da viagem.
            </p>
          </div>

          {/* Form Fields Stack */}
          <div className="space-y-4 mb-6">
            {/* Field 1: Nome */}
            <div className="bg-[#EDEDED] rounded-[12px] h-[54px] px-3 py-2 flex items-center gap-3 border border-transparent focus-within:border-[#949494] transition-all">
              <MapPin size={16} className="text-[#7F7F7F] flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Summit NYC"
                  className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none placeholder:text-[#949494]"
                />
              </div>
            </div>

            {/* Field 2: Vincule à uma atividade (opcional) */}
            <div className="relative">
              <div
                onClick={() => activities.length > 0 && setShowActivityPicker(prev => !prev)}
                className={`bg-[#EDEDED] rounded-[12px] h-[54px] px-3 py-2 flex items-center gap-3 border border-transparent transition-all ${activities.length > 0 ? 'cursor-pointer hover:bg-[#E5E5E5]' : ''
                  }`}
              >
                <MapPin size={16} className="text-[#7F7F7F] flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Vincule à uma atividade do roteiro (opcional)
                  </label>
                  {activities.length > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] truncate block">
                        {activityName || 'Selecionar atividade do roteiro'}
                      </span>
                      <ChevronDown size={16} className={`text-[#7F7F7F] transition-transform ${showActivityPicker ? 'rotate-180' : ''}`} />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      placeholder="Ex: Passeio no Central Park"
                      className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none placeholder:text-[#949494]"
                    />
                  )}
                </div>
              </div>

              {/* Activity dropdown picker if activities exist */}
              {showActivityPicker && activities.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-border shadow-xl p-2 z-30 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 space-y-1">
                  <button
                    type="button"
                    onClick={() => { setActivityName(''); setActivityId(undefined); setShowActivityPicker(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[13px] font-medium text-[#7F7F7F] hover:bg-muted/50 transition-colors"
                  >
                    Nenhuma atividade (gasto avulso)
                  </button>
                  {activities.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => handleSelectActivity(act)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors flex items-center justify-between gap-2 ${activityId === act.id ? 'bg-[#141530]/5 text-[#141530] font-bold' : 'hover:bg-muted/50 text-[#141530] font-medium'
                        }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{act.name}</span>
                        <span className="text-[11px] text-[#7F7F7F] capitalize">
                          {act.category ? act.category : 'Atividade'}
                          {act.day ? ` • Dia ${act.day}` : ''}
                        </span>
                      </div>
                      {activityId === act.id && <Check size={16} className="text-[#10B981] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Field 3: Categoria */}
            <div className="relative">
              <div
                onClick={() => setShowCategoryPicker(prev => !prev)}
                className="bg-[#EDEDED] rounded-[12px] h-[54px] px-3 py-2 flex items-center gap-3 border border-transparent hover:bg-[#E5E5E5] cursor-pointer transition-all"
              >
                <MapPin size={16} className="text-[#7F7F7F] flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Categoria
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] capitalize block truncate">
                      {categoryOptions.find(c => c.key === category)?.label || 'Atividade'}
                    </span>
                    <ChevronDown size={16} className={`text-[#7F7F7F] transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Category Dropdown Picker */}
              {showCategoryPicker && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-card rounded-2xl border border-border shadow-xl p-2 z-30 animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-2 gap-1.5">
                    {categoryOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setCategory(opt.key);
                          setShowCategoryPicker(false);
                        }}
                        className={`px-3 py-2.5 rounded-xl text-[13px] font-semibold text-left transition-colors flex items-center justify-between ${category === opt.key ? 'bg-[#1A1C40] text-white' : 'text-[#141530] hover:bg-muted/50'
                          }`}
                      >
                        <span>{opt.label}</span>
                        {category === opt.key && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field 4: Valor */}
            <div className="bg-[#EDEDED] rounded-[12px] h-[54px] px-3 py-2 flex items-center gap-3 border border-transparent focus-within:border-[#949494] transition-all">
              <MapPin size={16} className="text-[#7F7F7F] flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                  Valor
                </label>
                <div className="flex items-center">
                  <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] mr-1">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(formatCurrency(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none placeholder:text-[#949494]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Cost Splitting Row */}
          <div className="mb-6 pt-1">
            <button
              type="button"
              onClick={() => setShowSplitSubSheet(true)}
              className="w-full flex items-center justify-between py-2 px-1 text-left rounded-xl hover:bg-muted/30 transition-colors group"
            >
              {isSplitActive && selectedPeopleObjects.length > 0 ? (
                /* Configured state with Stacked Avatars (Image 2) */
                <div className="flex items-center justify-between w-full">
                  <span className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#141530]">
                    {splitType === 'custom'
                      ? 'Gasto dividido por valor específico entre:'
                      : 'Gasto dividido igualmente entre:'}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center -space-x-2">
                      {selectedPeopleObjects.slice(0, 3).map((p, idx) => {
                        const initials = p.initials || p.name.slice(0, 2).toUpperCase();
                        return p.avatar ? (
                          <img
                            key={p.id}
                            src={p.avatar}
                            alt={p.name}
                            className="w-[26px] h-[26px] rounded-full object-cover ring-2 ring-background border border-white"
                          />
                        ) : (
                          <div
                            key={p.id}
                            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-background border border-white shadow-xs"
                            style={{ backgroundColor: p.color || defaultColors[idx % defaultColors.length] }}
                          >
                            {initials}
                          </div>
                        );
                      })}
                      {selectedPeopleObjects.length > 3 && (
                        <div className="w-[26px] h-[26px] rounded-full bg-[#E5E7EB] text-[#4B5563] ring-2 ring-background border border-white flex items-center justify-center text-[10px] font-bold">
                          +{selectedPeopleObjects.length - 3}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-[#141530] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ) : (
                /* Initial state (Image 1) */
                <div className="flex items-center justify-between w-full">
                  <span className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#141530]">
                    Dividir gasto com outros viajantes
                  </span>
                  <ChevronRight size={18} className="text-[#141530] group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </button>
          </div>

          {/* Delete Option (if editing) */}
          {editingExpense && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(editingExpense.id);
                onClose();
              }}
              className="w-full py-2.5 flex items-center justify-center gap-2 mb-4 text-[#EF4444] hover:bg-[#FEF2F2] rounded-xl transition-colors font-medium text-[14px]"
            >
              <Trash2 size={16} />
              <span>Remover gasto</span>
            </button>
          )}

          {/* Main Action Button: 48px, #9DCC36, border-radius 16px, 16px font-bold #141530 */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || currentNumericAmount <= 0}
            className="w-full h-[48px] px-6 rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {editingExpense ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Sub-Bottom Sheet: Dividir Gasto (Preserves all form state) */}
      <SplitBudgetExpenseSheet
        open={showSplitSubSheet}
        onClose={() => setShowSplitSubSheet(false)}
        onBack={() => setShowSplitSubSheet(false)}
        onConfirm={handleSplitConfirmed}
        people={people}
        targetTotalBRL={currentNumericAmount}
        initialSplitType={splitType}
        initialAssignedTo={assignedTo}
        initialCustomSplits={customSplits}
      />
    </>
  );
}
