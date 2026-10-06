import { Icon } from '@/components/ui/Icon';
import { useBackHandler } from '@/lib/backStack';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type SortOption = 'az' | 'za' | 'days-asc' | 'days-desc' | 'recent' | 'oldest';
type OriginFilter = 'all' | 'mine' | 'shared' | 'purchased';

interface TripsFilterScreenProps {
  onClose: () => void;
  initialSortBy: SortOption;
  initialOriginFilter: OriginFilter;
  onApply: (sortBy: SortOption, originFilter: OriginFilter) => void;
}

const originOptions: { id: OriginFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'mine', label: 'Criados por mim' },
  { id: 'shared', label: 'Compartilhados comigo' },
  { id: 'purchased', label: 'Comprados' },
];

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'days-desc', label: 'Dias restantes: maior → menor' },
  { id: 'days-asc', label: 'Dias restantes: menor → maior' },
  { id: 'recent', label: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigos' },
  { id: 'az', label: 'Ordem alfabética (A–Z)' },
  { id: 'za', label: 'Ordem alfabética (Z–A)' },
];

export function TripsFilterScreen({ onClose, initialSortBy, initialOriginFilter, onApply }: TripsFilterScreenProps) {
  // Arrastar da borda esquerda executa o mesmo que a seta de voltar.
  useBackHandler(onClose);
  const [originFilter, setOriginFilter] = useState<OriginFilter>(initialOriginFilter);
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy);

  // Determine active filters count for the button (default values don't count)
  let activeCount = 0;
  if (originFilter !== 'all') activeCount++;
  if (sortBy !== 'recent') activeCount++;

  const handleApply = () => {
    onApply(sortBy, originFilter);
    onClose();
  };

  const handleClear = () => {
    setOriginFilter('all');
    setSortBy('recent');
  };

  return (
    <div
      className="fixed inset-0 w-full flex flex-col z-50 bg-[#F3F3F3]"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <header
        className="flex items-center px-4 py-[24px] gap-4 bg-[#F3F3F3]"
        style={{ paddingTop: 'max(24px, env(safe-area-inset-top, 24px))' }}
      >
        <button onClick={onClose} className="p-1 active:scale-95 transition-transform flex-shrink-0">
          <Icon name="chevron_left" size={24} className="text-[#171F2C]" />
        </button>
        <h1 className="text-[20px] font-bold text-[#171F2C] leading-[24px] font-['Urbanist']">Filtros</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 flex flex-col gap-6">
        <div className="bg-white rounded-[16px] p-4 flex flex-col gap-4">
            <h2 className="text-[16px] font-semibold text-[#141530] leading-[19px] font-['Urbanist'] mb-2">Mostrar</h2>
            <div className="flex flex-col">
              {originOptions.map((opt, index) => (
                <div key={opt.id} className="flex flex-col">
                  <button onClick={() => setOriginFilter(opt.id)} className="w-full flex items-center justify-between py-[8px] active:opacity-70 transition-opacity">
                    <span className="text-[14px] font-medium text-[#141530] leading-[17px] font-['Urbanist']">{opt.label}</span>
                    <div className={cn("w-[20px] h-[20px] rounded-full flex items-center justify-center", originFilter === opt.id ? "border-[1.5px] border-[#9DCC36]" : "border-[1.5px] border-[#7F7F7F]")}>
                      {originFilter === opt.id && <div className="w-[10px] h-[10px] rounded-full bg-[#9DCC36]" />}
                    </div>
                  </button>
                  {index < originOptions.length - 1 && <div className="h-[1px] bg-[#F2F2F2] w-full my-2" />}
                </div>
              ))}
            </div>
          </div>

        <div className="bg-white rounded-[16px] p-4 flex flex-col gap-4">
          <h2 className="text-[16px] font-semibold text-[#141530] leading-[19px] font-['Urbanist'] mb-2">Ordenar por</h2>
          <div className="flex flex-col">
            {sortOptions.map((opt, index) => (
              <div key={opt.id} className="flex flex-col">
                <button onClick={() => setSortBy(opt.id)} className="w-full flex items-center justify-between py-[8px] active:opacity-70 transition-opacity">
                  <span className="text-[14px] font-medium text-[#141530] leading-[17px] font-['Urbanist']">{opt.label}</span>
                  <div className={cn("w-[20px] h-[20px] rounded-full flex items-center justify-center", sortBy === opt.id ? "border-[1.5px] border-[#9DCC36]" : "border-[1.5px] border-[#7F7F7F]")}>
                    {sortBy === opt.id && <div className="w-[10px] h-[10px] rounded-full bg-[#9DCC36]" />}
                  </div>
                </button>
                {index < sortOptions.length - 1 && <div className="h-[1px] bg-[#F2F2F2] w-full my-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="fixed bottom-0 left-0 w-full z-30 bg-white border-t border-[#B6B6B6]"
        style={{
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="px-4 pt-[24px] flex items-center gap-6">
          <button
            onClick={handleClear}
            className="flex-shrink-0 text-[14px] font-bold text-[#141530] hover:opacity-80 transition-opacity font-['Urbanist']"
          >
            Limpar tudo
          </button>

          <button
            onClick={handleApply}
            className="flex-1 h-[48px] rounded-[16px] bg-[#9DCC36] font-bold text-[16px] text-[#141530] transition-transform active:scale-[0.99] flex items-center justify-center font-['Urbanist']"
          >
            Aplicar filtros {activeCount > 0 && `(${activeCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
