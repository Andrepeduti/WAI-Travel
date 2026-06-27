import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/ui/BackButton';

interface SelectDaySheetProps {
  isOpen: boolean;
  itineraryName: string;
  totalDays: number;
  startDate?: Date;
  onClose: () => void;
  onBack: () => void;
  onSelectDay: (day: number) => void;
}

export function SelectDaySheet({
  isOpen,
  itineraryName,
  totalDays,
  startDate,
  onClose,
  onBack,
  onSelectDay,
}: SelectDaySheetProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (!isOpen) return null;

  const formatDayLabel = (day: number) => {
    if (startDate) {
      const date = addDays(startDate, day - 1);
      const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
      const capitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      return format(date, 'dd/MM') + ' - ' + capitalized;
    }
    return null;
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[80] transition-opacity"
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[90] flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4">
            <BackButton onClick={onBack} />
            <h2 className="text-xl font-bold text-foreground my-0 mt-[24px]">Selecionar dia</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Em qual dia de <span className="font-semibold text-foreground">{itineraryName}</span> deseja adicionar?
            </p>
          </div>

          {/* Days List */}
          <div className="px-6 flex-1 overflow-y-auto">
            <div className="space-y-2">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isSelected = selectedDay === day;
                const dateLabel = formatDayLabel(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/30 border-2 border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {String(day).padStart(2, '0')}
                    </div>
                    <div className="text-left flex-1">
                      <span className="text-base font-semibold text-foreground">
                        Dia {String(day).padStart(2, '0')}
                      </span>
                      {dateLabel && (
                        <p className="text-sm text-muted-foreground">{dateLabel}</p>
                      )}
                    </div>
                    {isSelected && (
                      <Icon name="check_circle" size={24} className="text-primary" filled />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="px-6 pt-4 flex-shrink-0">
            <Button
              onClick={() => selectedDay && onSelectDay(selectedDay)}
              disabled={!selectedDay}
              className="w-full h-14 rounded-2xl text-base font-semibold"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
