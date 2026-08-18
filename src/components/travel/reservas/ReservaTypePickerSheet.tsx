import React, { useState, useEffect } from 'react';
import { X, BedDouble, DollarSign, Ticket } from 'lucide-react';

export type ReservaTipoChoice = 'hospedagem' | 'transporte' | 'atividade';

interface ReservaTypePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (selectedType: ReservaTipoChoice) => void;
  initialType?: ReservaTipoChoice | null;
}

interface TypeOption {
  id: ReservaTipoChoice;
  title: string;
  description: string;
  icon: (isSelected: boolean) => React.ReactNode;
}

const typeOptions: TypeOption[] = [
  {
    id: 'hospedagem',
    title: 'Hospedagem',
    description: 'Adicione reservas de hotel, Airbnb, hostel',
    icon: (isSelected) => (
      <BedDouble
        size={24}
        strokeWidth={1.5}
        className={isSelected ? 'text-[#3F550E]' : 'text-[#1A1C40]'}
      />
    ),
  },
  {
    id: 'transporte',
    title: 'Transporte',
    description: 'Adicione reservas de voo, trem, ônibus, carro',
    icon: (isSelected) => (
      <DollarSign
        size={24}
        strokeWidth={2}
        className={isSelected ? 'text-[#3F550E]' : 'text-[#1A1C40]'}
      />
    ),
  },
  {
    id: 'atividade',
    title: 'Atividade',
    description: 'Adicione ingressos, tour, experiências',
    icon: (isSelected) => (
      <Ticket
        size={24}
        strokeWidth={1.5}
        className={isSelected ? 'text-[#3F550E]' : 'text-[#1A1C40]'}
      />
    ),
  },
];

export function ReservaTypePickerSheet({
  isOpen,
  onClose,
  onContinue,
  initialType = null,
}: ReservaTypePickerSheetProps) {
  const [selected, setSelected] = useState<ReservaTipoChoice | null>(initialType);

  useEffect(() => {
    if (isOpen) {
      setSelected(initialType);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (selected) {
      onContinue(selected);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[90] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
        style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
      >
        <div className="bg-white rounded-t-[24px] w-full max-w-lg pointer-events-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
          {/* Top Bar (Height 54px, padding 24px 24px 12px) */}
          <div className="flex items-center justify-end px-6 pt-6 pb-3">
            <button
              onClick={onClose}
              className="w-[18px] h-[18px] flex items-center justify-center text-[#141530] hover:opacity-70 transition-opacity"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Block (padding 16px 24px 32px) */}
          <div className="px-6 pt-2 pb-8">
            {/* Title: 22px semibold #171F2C */}
            <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] mb-6">
              Qual o tipo de documento que você deseja adicionar?
            </h2>

            {/* Options List (gap 16px, cards height 62px, padding 16px, radius 16px) */}
            <div className="space-y-4 mb-6">
              {typeOptions.map((opt) => {
                const isSelected = selected === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelected(opt.id)}
                    className={`flex items-center justify-between p-4 h-[62px] rounded-[16px] border transition-all cursor-pointer select-none box-border ${
                      isSelected
                        ? 'bg-[#F4FDDF] border-[#86B61F]'
                        : 'bg-white border-[#EBEBEB] hover:bg-muted/30'
                    }`}
                  >
                    {/* Left: Icon + Texts */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {opt.icon(isSelected)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-['Urbanist'] font-semibold text-[14px] leading-[17px] text-[#1A1C40] truncate">
                          {opt.title}
                        </h3>
                        <p className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#676767] truncate mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    {/* Radio Indicator (19px x 19px) */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-[19px] h-[19px] rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-[#86B61F] bg-transparent'
                            : 'border-[#7F7F7F] bg-transparent'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-[9px] h-[9px] rounded-full bg-[#86B61F]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Button (width 100%, height 48px, bg #9DCC36, radius 16px, 16px bold #141530) */}
            <button
              onClick={handleContinue}
              disabled={!selected}
              className={`w-full h-[48px] rounded-[16px] font-['Urbanist'] font-bold text-[16px] leading-[19px] transition-all shadow-xs flex items-center justify-center ${
                selected
                  ? 'bg-[#9DCC36] text-[#141530] active:scale-[0.99]'
                  : 'bg-[#9DCC36]/40 text-[#141530]/40 cursor-not-allowed'
              }`}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
