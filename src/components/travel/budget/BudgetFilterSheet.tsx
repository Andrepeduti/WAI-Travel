import React, { useState, useEffect } from 'react';
import { ChevronLeft, CircleDot, ChevronDown } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';

interface BudgetFilterSheetProps {
  open: boolean;
  onClose: () => void;
  selectedCategories: string[];
  selectedTravelers: string[];
  dateRange: { start: string; end: string };
  valueRange: { min: string; max: string };
  onApplyFilters: (
    categories: string[],
    travelers: string[],
    dateRange: { start: string; end: string },
    valueRange: { min: string; max: string }
  ) => void;
  people: BudgetPerson[];
}

const categoriesList = [
  { id: 'hospedagem', label: 'Hospedagem' },
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'atividade', label: 'Atividades' },
  { id: 'outros', label: 'Outros' },
];

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function BudgetFilterSheet({
  open,
  onClose,
  selectedCategories,
  selectedTravelers,
  dateRange,
  valueRange,
  onApplyFilters,
  people,
}: BudgetFilterSheetProps) {
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [localTravelers, setLocalTravelers] = useState<string[]>([]);
  const [localStartDate, setLocalStartDate] = useState<string>('');
  const [localEndDate, setLocalEndDate] = useState<string>('');
  const [localMinValue, setLocalMinValue] = useState<string>('');
  const [localMaxValue, setLocalMaxValue] = useState<string>('');

  // Prevent body scroll when filter is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setLocalCategories(selectedCategories);
      setLocalTravelers(selectedTravelers);
      setLocalStartDate(dateRange.start);
      setLocalEndDate(dateRange.end);
      setLocalMinValue(valueRange.min);
      setLocalMaxValue(valueRange.max);
    }
  }, [open, selectedCategories, selectedTravelers, dateRange, valueRange]);

  if (!open) return null;

  const handleToggleCategory = (id: string) => {
    setLocalCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleToggleTraveler = (id: string) => {
    setLocalTravelers(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleReset = () => {
    setLocalCategories([]);
    setLocalTravelers([]);
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalMinValue('');
    setLocalMaxValue('');
  };

  const handleApply = () => {
    onApplyFilters(
      localCategories,
      localTravelers,
      { start: localStartDate, end: localEndDate },
      { min: localMinValue, max: localMaxValue }
    );
    onClose();
  };

  const activeFiltersCount = 
    localCategories.length + 
    localTravelers.length + 
    (localStartDate || localEndDate ? 1 : 0) + 
    (localMinValue || localMaxValue ? 1 : 0);

  // SVG for Target Icon (Selected / Unselected)
  const TargetIcon = ({ selected }: { selected: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={selected ? "#FEFEFE" : "#141530"} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" fill={selected ? "#FEFEFE" : "transparent"} stroke={selected ? "#FEFEFE" : "#141530"} strokeWidth="1.5"/>
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in slide-in-from-bottom duration-300 w-full h-[100dvh]" style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}>
      {/* Top Header */}
      <div className="flex items-center px-4 pt-14 pb-4 w-full">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-[#171F2C]"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-[20px] font-bold text-[#171F2C] ml-2">Filtros</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 w-full">
        {/* Categoria */}
        <div className="flex flex-col gap-4 w-full">
          <h3 className="text-[16px] font-semibold text-[#171F2C]">Categoria</h3>
          <div className="flex flex-row flex-wrap gap-3">
            {categoriesList.map((cat) => {
              const isSelected = localCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className={`flex flex-row items-center px-4 py-2 gap-2 h-10 rounded-2xl transition-all ${
                    isSelected 
                      ? 'bg-[#141530] text-[#FEFEFE]' 
                      : 'bg-transparent border border-[#141530] text-[#141530]'
                  }`}
                >
                  <TargetIcon selected={isSelected} />
                  <span className="font-medium text-[14px] leading-[17px]">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full border-t-2 border-[#F2F2F2] my-6" />

        {/* Viajantes */}
        <div className="flex flex-col gap-4 w-full">
          <h3 className="text-[16px] font-semibold text-[#171F2C]">Viajantes</h3>
          <div className="flex flex-row flex-wrap gap-3">
            {people.map((person, idx) => {
              const isSelected = localTravelers.includes(person.id);
              const initials = person.initials || person.name.slice(0, 2).toUpperCase();
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleToggleTraveler(person.id)}
                  className={`flex flex-row items-center px-4 py-2 gap-2 h-10 rounded-2xl transition-all ${
                    isSelected 
                      ? 'bg-[#141530] text-[#FEFEFE]' 
                      : 'bg-transparent border border-[#141530] text-[#141530]'
                  }`}
                >
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: person.color || defaultColors[idx % defaultColors.length] }}
                    >
                      {initials}
                    </div>
                  )}
                  <span className="font-medium text-[14px] leading-[17px]">{person.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full border-t-2 border-[#F2F2F2] my-6" />

        {/* Valor do gasto */}
        <div className="flex flex-col gap-4 w-full">
          <h3 className="text-[16px] font-semibold text-[#171F2C]">Valor do gasto</h3>
          <div className="flex flex-row gap-4 w-full">
            {/* A partir de */}
            <div className="flex-1 flex flex-row items-center px-2 py-3 gap-2 bg-field border border-transparent focus-within:border-primary transition-colors rounded-xl h-[60px]">
              <div className="flex flex-col flex-1">
                <span className="font-medium text-[12px] text-[#949494]">A partir de</span>
                <div className="flex items-center">
                  <span className="font-medium text-[14px] text-[#141530] mr-1">R$</span>
                  <input 
                    type="number" 
                    value={localMinValue}
                    onChange={(e) => setLocalMinValue(e.target.value)}
                    placeholder="0,00"
                    className="bg-transparent border-none outline-none font-medium text-[14px] text-[#141530] w-full p-0 h-4"
                  />
                </div>
              </div>
            </div>

            {/* Até */}
            <div className="flex-1 flex flex-row items-center px-2 py-3 gap-2 bg-field border border-transparent focus-within:border-primary transition-colors rounded-xl h-[60px]">
              <div className="flex flex-col flex-1">
                <span className="font-medium text-[12px] text-[#949494]">Até</span>
                <div className="flex items-center">
                  <span className="font-medium text-[14px] text-[#141530] mr-1">R$</span>
                  <input 
                    type="number" 
                    value={localMaxValue}
                    onChange={(e) => setLocalMaxValue(e.target.value)}
                    placeholder="0,00"
                    className="bg-transparent border-none outline-none font-medium text-[14px] text-[#141530] w-full p-0 h-4"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md px-4 py-6 border-t border-[#B6B6B6] flex flex-row items-center justify-between gap-6 w-full">
        <button
          type="button"
          onClick={handleReset}
          className="font-bold text-[14px] text-[#141530] py-2 w-[78px] text-center shrink-0"
        >
          Limpar tudo
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 h-12 bg-[#9DCC36] rounded-2xl flex items-center justify-center text-[#141530] font-bold text-[16px] transition-all active:scale-95"
        >
          Aplicar filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
        </button>
      </div>
    </div>
  );
}

