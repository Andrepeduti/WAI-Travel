import React, { useState, useEffect } from 'react';
import { X, MapPin, ChevronRight, Trash2, Check, ChevronDown, CircleDot } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';
import { SplitBudgetExpenseSheet, SplitResult } from './SplitBudgetExpenseSheet';
import { SoleTravelerInfoSheet } from './SoleTravelerInfoSheet';

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
  onSoleTravelerInvite?: () => void;
  isHidden?: boolean;
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
  onSoleTravelerInvite,
  isHidden = false,
}: AddBudgetExpenseSheetProps) {
  // Form fields
  const [name, setName] = useState('');
  const [activityName, setActivityName] = useState('');
  const [activityId, setActivityId] = useState<string | number | undefined>(undefined);
  const [category, setCategory] = useState<BudgetExpense['category'] | ''>('');
  const [amountInput, setAmountInput] = useState('');

  // Cost splitting state
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'none'>('equal');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [isSplitExplicitlyConfigured, setIsSplitExplicitlyConfigured] = useState(false);

  // Sub-modal state
  const [showSplitSubSheet, setShowSplitSubSheet] = useState(false);
  const [showSoleInfo, setShowSoleInfo] = useState(false);

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
        setCategory(editingExpense.category || '');

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
        setCategory('');
        setAmountInput('');
        setSplitType('equal');
        setAssignedTo(people.map(p => p.id));
        setCustomSplits({});
        setIsSplitExplicitlyConfigured(false);
      }
      setShowSplitSubSheet(false);
      setShowSoleInfo(false);
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
      const matches = String(act.price).match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?|\d+(?:\.\d{2})?/g);
      if (matches && matches.length > 0) {
        // Pega o último número assumindo que, se houver conversão (ex: € 26 (~R$ 170)), o BRL está no fim
        const lastMatch = matches[matches.length - 1];
        let num = 0;
        if (lastMatch.includes(',')) {
          num = parseFloat(lastMatch.replace(/\./g, '').replace(',', '.'));
        } else {
          num = parseFloat(lastMatch);
        }
        if (!isNaN(num) && num > 0) {
          setAmountInput(formatCurrency(Math.round(num * 100).toString()));
        }
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
    if (!name.trim() || currentNumericAmount <= 0 || !category) return;

    const finalAssignedTo = assignedTo.length > 0 ? assignedTo : people.map(p => p.id);

    const expense: BudgetExpense = {
      id: editingExpense?.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      description: editingExpense?.description || '',
      category: category as BudgetExpense['category'],
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
      <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ display: isHidden ? 'none' : undefined }}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Main Sheet */}
        <div
          className="relative w-full bg-[#FFFFFF] rounded-t-[24px] overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl flex flex-col"
          style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)', display: (showSplitSubSheet || showSoleInfo) ? 'none' : 'flex' }}
        >
          {/* Top Bar with Close Button */}
          <div className="flex flex-row justify-end items-center px-6 pt-6 pb-3 w-full h-[54px] bg-[#FFFFFF]">
            <button
              type="button"
              onClick={onClose}
              className="w-[18px] h-[18px] flex items-center justify-center text-[#000000] transition-colors"
              aria-label="Fechar"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* Main Content Block */}
          <div className="flex flex-col items-start px-6 py-4 gap-10 w-full bg-[#FFFFFF] overflow-y-auto max-h-[85vh]">
            
            <div className="flex flex-col items-start gap-6 w-full">
              {/* Title & Subtitle */}
              <div className="flex flex-col items-start gap-2 w-full">
                <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C]">
                  {editingExpense ? 'Editar gasto' : 'Adicionar gasto'}
                </h2>
                <p className="font-['Urbanist'] font-medium text-[14px] leading-[20px] text-[#7F7F7F]">
                  Preencha as informações do gasto para o planejamento da viagem.
                </p>
              </div>

          {/* Form Fields Stack */}
          <div className="flex flex-col gap-6 w-full mb-6">
            {/* Field 1: Nome */}
            <div className="bg-[#EEEEEE] rounded-[12px] h-[60px] p-3 flex flex-row items-center gap-3 border border-transparent focus-within:border-[#949494] transition-all w-full">
              <div className="w-4 h-4 flex items-center justify-center text-[#141530] flex-shrink-0">
                <CircleDot size={16} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center items-start gap-1">
                <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                  Descrição
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dê um nome para este gasto..."
                  className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none placeholder:text-[#949494]"
                />
              </div>
            </div>

            {/* Field 2: Vincule à uma atividade (opcional) */}
            <div className="relative w-full">
              <div
                onClick={() => activities.length > 0 && setShowActivityPicker(prev => !prev)}
                className={`bg-[#EEEEEE] rounded-[12px] h-[60px] p-3 flex flex-row items-center gap-3 border border-transparent transition-all w-full ${activities.length > 0 ? 'cursor-pointer active:bg-[#E5E5E5]' : ''
                  }`}
              >
                <div className="w-4 h-4 flex items-center justify-center text-[#141530] flex-shrink-0">
                  <MapPin size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center items-start gap-1">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Vincular à atividade (opcional)
                  </label>
                  {activities.length > 0 ? (
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-['Urbanist'] font-medium text-[14px] leading-[16px] truncate block ${activityName ? 'text-[#141530]' : 'text-[#949494]'}`}>
                        {activityName || 'Selecione uma atividade do roteiro'}
                      </span>
                      <ChevronRight size={16} className={`text-[#141530] transition-transform ${showActivityPicker ? 'rotate-90' : ''}`} />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      placeholder="Selecione uma atividade do roteiro"
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
            <div className="relative w-full">
              <div
                onClick={() => setShowCategoryPicker(prev => !prev)}
                className="bg-[#EEEEEE] rounded-[12px] h-[60px] p-3 flex flex-row items-center gap-3 border border-transparent active:bg-[#E5E5E5] cursor-pointer transition-all w-full"
              >
                <div className="w-4 h-4 flex items-center justify-center text-[#141530] flex-shrink-0">
                  <CircleDot size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center items-start gap-1">
                  <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                    Categoria
                  </label>
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-['Urbanist'] font-medium text-[14px] leading-[16px] capitalize block truncate ${category ? 'text-[#141530]' : 'text-[#949494]'}`}>
                      {category ? categoryOptions.find(c => c.key === category)?.label : 'Selecione uma categoria'}
                    </span>
                    <ChevronRight size={16} className={`text-[#141530] transition-transform ${showCategoryPicker ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Category Dropdown Picker */}
              {showCategoryPicker && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-border shadow-xl p-2 z-30 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 space-y-1">
                  {categoryOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setCategory(opt.key);
                        setShowCategoryPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors flex items-center justify-between gap-2 ${category === opt.key ? 'bg-[#9DCC36]/20 text-[#141530] font-bold' : 'hover:bg-muted/50 text-[#141530] font-medium'
                        }`}
                    >
                      <span>{opt.label}</span>
                      {category === opt.key && <Check size={16} className="text-[#86B32D] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Field 4: Valor */}
            <div className="bg-[#EEEEEE] rounded-[12px] h-[60px] p-3 flex flex-row items-center gap-3 border border-transparent focus-within:border-[#949494] transition-all w-full">
              <div className="w-4 h-4 flex items-center justify-center text-[#141530] flex-shrink-0">
                <CircleDot size={16} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center items-start gap-1">
                <label className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                  Valor
                </label>
                <div className="flex flex-row items-center w-full gap-1">
                  <span className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530]">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(formatCurrency(e.target.value))}
                    placeholder="Digite um valor"
                    className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] outline-none placeholder:text-[#949494]"
                  />
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Dynamic Cost Splitting Row */}
          <div className="w-full">
            <button
              type="button"
              disabled={currentNumericAmount <= 0}
              onClick={() => {
                if (people.length === 1) {
                  setShowSoleInfo(true);
                } else {
                  setShowSplitSubSheet(true);
                }
              }}
              className="w-full flex items-center justify-between text-left rounded-xl hover:bg-muted/30 transition-colors group h-[26px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSplitActive && selectedPeopleObjects.length > 0 ? (
                <div className="flex items-center justify-between w-full">
                  <span className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#1A1C40]">
                    Gasto dividido entre:
                  </span>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="flex items-center -space-x-1.5 h-[26px]">
                      {selectedPeopleObjects.slice(0, 3).map((p, idx) => {
                        const initials = p.initials || p.name.slice(0, 2).toUpperCase();
                        return p.avatar ? (
                          <img
                            key={p.id}
                            src={p.avatar}
                            alt={p.name}
                            className="w-[26px] h-[26px] rounded-full object-cover border-[1px] border-white"
                          />
                        ) : (
                          <div
                            key={p.id}
                            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[10px] font-bold border-[1px] border-white"
                            style={{ backgroundColor: p.color || defaultColors[idx % defaultColors.length] }}
                          >
                            {initials}
                          </div>
                        );
                      })}
                      {selectedPeopleObjects.length > 3 && (
                        <div className="w-[26px] h-[26px] rounded-full bg-[#E5E7EB] text-[#4B5563] border-[1px] border-white flex items-center justify-center text-[10px] font-bold">
                          +{selectedPeopleObjects.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="w-4 h-4 flex items-center justify-center bg-[#141530] text-white rounded-full">
                      <ChevronRight size={12} strokeWidth={2} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#1A1C40]">
                    Dividir gasto com outros viajantes
                  </span>
                  <div className="w-4 h-4 flex items-center justify-center bg-[#141530] text-white rounded-full">
                    <ChevronRight size={12} strokeWidth={2} />
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Delete Option (if editing) */}
          {editingExpense && onDelete && (
            <>
              {/* Divider */}
              <div className="w-full border-t border-[#F2F2F2]" />
              
              <button
                type="button"
                onClick={() => {
                  onDelete(editingExpense.id);
                  onClose();
                }}
                className="w-full flex items-center justify-start gap-3 text-[#D00004] hover:bg-[#FEF2F2] transition-colors group h-[20px]"
              >
                <div className="w-5 h-5 flex items-center justify-center border-[1.25px] border-[#D00004] rounded-[4px]">
                  <Trash2 size={12} strokeWidth={2} />
                </div>
                <span className="font-['Urbanist'] font-medium text-[16px] leading-[19px]">
                  Excluir
                </span>
              </button>
            </>
          )}

          {/* Main Action Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || currentNumericAmount <= 0 || !category}
            className="w-full h-[48px] px-[24px] py-[12px] rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] shadow-xs active:scale-[0.99] transition-all disabled:opacity-100 disabled:bg-[#E5E5E5] disabled:text-[#949494] disabled:cursor-not-allowed flex items-center justify-center"
          >
            {editingExpense ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
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

      {/* Sub-Bottom Sheet: Sole Traveler Info */}
      <SoleTravelerInfoSheet
        open={showSoleInfo}
        onClose={() => setShowSoleInfo(false)}
        onInvite={() => {
          setShowSoleInfo(false);
          if (onSoleTravelerInvite) onSoleTravelerInvite();
        }}
      />
    </>
  );
}
