import React from 'react';
import { X, Check } from 'lucide-react';
import { BudgetPerson } from './TravelerBudgetCard';

interface BudgetFilterSheetProps {
  open: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedTravelerId: string | null;
  onSelectTravelerId: (id: string | null) => void;
  people: BudgetPerson[];
}

const categories = [
  { id: 'todos', label: 'Todas as categorias' },
  { id: 'hospedagem', label: 'Hospedagem' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'atividade', label: 'Atividade' },
  { id: 'outros', label: 'Outros' },
];

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export function BudgetFilterSheet({
  open,
  onClose,
  selectedCategory,
  onSelectCategory,
  selectedTravelerId,
  onSelectTravelerId,
  people,
}: BudgetFilterSheetProps) {
  if (!open) return null;

  const handleReset = () => {
    onSelectCategory('todos');
    onSelectTravelerId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div
        className="relative w-full max-w-lg bg-background rounded-t-[32px] p-6 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
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
            <X size={20} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-5">
          <h3 className="text-[22px] font-bold text-[#171F2C]">Filtrar Gastos</h3>
        </div>

        {/* Categories Section */}
        <div className="mb-6">
          <label className="text-[12px] font-bold text-[#7F7F7F] uppercase tracking-wider block mb-3">
            Categoria
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`p-3 rounded-2xl text-[13px] font-semibold text-left transition-all border flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1A1C40] text-white border-[#1A1C40] shadow-xs'
                      : 'bg-card text-[#171F2C] border-border hover:bg-muted/30'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Traveler Section */}
        {people.length > 1 && (
          <div className="mb-6">
            <label className="text-[12px] font-bold text-[#7F7F7F] uppercase tracking-wider block mb-3">
              Por Viajante
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onSelectTravelerId(null)}
                className={`w-full p-3 rounded-2xl text-[13px] font-semibold text-left transition-all border flex items-center justify-between ${
                  selectedTravelerId === null
                    ? 'bg-[#1A1C40] text-white border-[#1A1C40] shadow-xs'
                    : 'bg-card text-[#171F2C] border-border hover:bg-muted/30'
                }`}
              >
                <span>Todos os viajantes</span>
                {selectedTravelerId === null && <Check size={14} />}
              </button>

              {people.map((person, idx) => {
                const isSelected = selectedTravelerId === person.id;
                const initials = person.initials || person.name.slice(0, 2).toUpperCase();

                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => onSelectTravelerId(person.id)}
                    className={`w-full p-2.5 px-3 rounded-2xl text-[13px] font-semibold text-left transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#1A1C40] text-white border-[#1A1C40] shadow-xs'
                        : 'bg-card text-[#171F2C] border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: person.color || defaultColors[idx % defaultColors.length] }}
                        >
                          {initials}
                        </div>
                      )}
                      <span className="truncate">{person.name}</span>
                    </div>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 h-14 rounded-2xl border border-border text-[#171F2C] text-[15px] font-bold hover:bg-muted/40 transition-colors"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl bg-[#9DCC36] text-[#141530] text-[15px] font-bold shadow-xs active:scale-[0.99] transition-all"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
