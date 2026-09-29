import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { format } from 'date-fns';

export interface DayDataOption {
  day: number;
  date?: Date | string;
}

interface MoveActivityToDaySheetProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  activityName?: string;
  currentDay: number;
  daysData: DayDataOption[];
  isFlexibleDates?: boolean;
  getActivityCount?: (day: number) => number;
  onConfirm: (targetDay: number) => void;
}

export function MoveActivityToDaySheet({
  open,
  onClose,
  onBack,
  activityName,
  currentDay,
  daysData,
  isFlexibleDates = false,
  getActivityCount,
  onConfirm,
}: MoveActivityToDaySheetProps) {
  // Find initial default day (first available day that is not currentDay)
  const getInitialDay = () => {
    const otherDays = daysData.filter((d) => d.day !== currentDay);
    if (otherDays.length > 0) {
      // Prefer next day if available
      const nextDay = otherDays.find((d) => d.day > currentDay);
      return nextDay ? nextDay.day : otherDays[0].day;
    }
    return currentDay;
  };

  const [selectedDay, setSelectedDay] = useState<number>(getInitialDay);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedDay(getInitialDay());
      setIsDropdownOpen(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, currentDay, daysData]);

  if (!open) return null;

  const formatDayLabel = (dayOption: DayDataOption) => {
    const dayPadded = String(dayOption.day).padStart(2, '0');
    let dateStr = '';

    if (!isFlexibleDates && dayOption.date) {
      try {
        const d = typeof dayOption.date === 'string' ? new Date(dayOption.date) : dayOption.date;
        if (!isNaN(d.getTime())) {
          dateStr = ` - ${format(d, 'dd/MM')}`;
        }
      } catch (e) {
        // ignore date parse errors
      }
    }

    const count = getActivityCount ? getActivityCount(dayOption.day) : 0;
    const countStr = ` (${count} ${count === 1 ? 'atividade' : 'atividades'})`;

    return `Dia ${dayPadded}${dateStr}${countStr}`;
  };

  const selectedDayItem = daysData.find((d) => d.day === selectedDay) || { day: selectedDay };

  const handleSave = () => {
    if (selectedDay !== currentDay) {
      onConfirm(selectedDay);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Bottom Sheet Modal */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-[24px] overflow-hidden flex flex-col z-10"
        style={{
          fontFamily: "'Urbanist', sans-serif",
          animation: 'slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Back and Close buttons */}
        <div className="w-full px-6 pt-6 pb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack || onClose}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#141530] hover:bg-black/5 active:scale-95 transition-all"
            aria-label="Voltar"
          >
            <Icon name="chevron_left" size={22} className="text-[#141530]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-[#141530] hover:bg-black/5 active:scale-95 transition-all"
            aria-label="Fechar"
          >
            <Icon name="close" size={20} className="text-[#141530]" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-2 pb-5">
          <h2 className="text-[22px] font-semibold leading-[26px] text-[#171F2C]">
            Mover para outro dia
          </h2>
        </div>

        {/* Day Selector Box */}
        <div className="px-6 w-full relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-full h-[60px] bg-field rounded-[12px] px-3.5 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] hover:bg-[#E5E5E5] border border-transparent focus:outline-none"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Calendar Icon */}
              <div className="w-5 h-5 flex items-center justify-center text-[#141530] shrink-0">
                <Icon name="calendar_today" size={18} className="text-[#141530]" />
              </div>

              {/* Text Container */}
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <span className="text-[12px] font-medium leading-[16px] text-[#949494]">
                  Mover para o dia
                </span>
                <span className="text-[14px] font-medium leading-[16px] text-[#141530] truncate">
                  {formatDayLabel(selectedDayItem)}
                </span>
              </div>
            </div>

            {/* Chevron down */}
            <div className="w-5 h-5 flex items-center justify-center text-[#141530] shrink-0">
              <Icon
                name="chevron_down"
                size={18}
                className={`text-[#141530] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Dropdown Options List */}
          {isDropdownOpen && (
            <div className="mt-2 w-full bg-white rounded-[16px] border border-black/10 shadow-xl py-1.5 max-h-[220px] overflow-y-auto z-30 animate-in fade-in zoom-in-95 duration-150 divide-y divide-border/20">
              {daysData.map((d) => {
                const isCurrent = d.day === currentDay;
                const isSelected = d.day === selectedDay;
                return (
                  <button
                    key={d.day}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => {
                      setSelectedDay(d.day);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'opacity-40 cursor-not-allowed bg-muted/20'
                        : isSelected
                        ? 'bg-[#9DCC36]/15 font-semibold text-[#141530]'
                        : 'hover:bg-muted/40 text-[#141530]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        name="calendar_today"
                        size={16}
                        className={isSelected ? 'text-[#141530]' : 'text-muted-foreground'}
                      />
                      <span className="text-[14px] leading-tight">
                        {formatDayLabel(d)}
                        {isCurrent && (
                          <span className="ml-2 text-[11px] text-muted-foreground font-normal italic">
                            (Dia atual)
                          </span>
                        )}
                      </span>
                    </div>
                    {isSelected && (
                      <Icon name="check" size={18} className="text-[#141530] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button: Salvar */}
        <div
          className="px-6 pt-6 pb-6 w-full"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={selectedDay === currentDay}
            className="w-full h-[48px] bg-[#9DCC36] hover:bg-[#90BE2F] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-[16px] flex items-center justify-center font-bold text-[16px] leading-[19px] text-[#141530] transition-all shadow-xs"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
