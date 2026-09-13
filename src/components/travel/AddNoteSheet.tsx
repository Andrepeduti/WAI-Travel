import React, { useState, useEffect } from 'react';
import { X, MapPin, ChevronDown, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AddNoteSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    text: string;
    day: number;
    activityId?: number;
  }) => void;
  onDelete?: () => void;
  dayNumber: number;
  totalDays: number;
  daysData?: Array<{ day: number; date: Date }>;
  activityId?: number;
  activityName?: string;
  initialText?: string;
}

export function AddNoteSheet({
  open,
  onClose,
  onSave,
  onDelete,
  dayNumber,
  totalDays,
  daysData = [],
  activityId,
  activityName,
  initialText = '',
}: AddNoteSheetProps) {
  const [text, setText] = useState(initialText);
  const [selectedDay, setSelectedDay] = useState(dayNumber);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedDay(dayNumber);
      setText(initialText);
      setIsDayDropdownOpen(false);
    }
  }, [open, dayNumber, initialText]);

  if (!open) return null;

  const currentDayInfo = daysData.find((d) => d.day === selectedDay);
  const formattedDayStr = currentDayInfo?.date
    ? `Dia ${selectedDay} (${format(currentDayInfo.date, 'dd/MM - EEEE', { locale: ptBR })})`
    : `Dia ${selectedDay}`;

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({
      title: activityName ? `Nota sobre ${activityName}` : 'Anotação pessoal',
      text: text.trim(),
      day: selectedDay,
      activityId,
    });
    onClose();
  };

  const isEditing = Boolean(initialText || activityId);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col justify-end pointer-events-none">
        <div className="bg-white rounded-t-[24px] w-full shadow-2xl pointer-events-auto animate-in slide-in-from-bottom duration-300 overflow-hidden font-['Urbanist',sans-serif]">
          
          {/* Header Top Bar with Close Button */}
          <div className="flex items-center justify-end px-6 pt-6 pb-3">
            <button
              onClick={onClose}
              className="w-[18px] h-[18px] flex items-center justify-center text-[#000000] hover:opacity-70 transition-opacity"
              aria-label="Fechar"
            >
              <X className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>

          {/* Main Body */}
          <div className="px-6 pb-6 flex flex-col gap-6">
            
            {/* Title */}
            <div>
              <h2 className="text-[22px] font-semibold leading-[26px] text-[#171F2C]">
                {activityName ? `Anotação para ${activityName}` : 'Anotação pessoal'}
              </h2>
            </div>

            {/* Day Selector - only displayed for standalone notes not bound to an existing activity */}
            {!activityName && !activityId && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
                  className={`w-full min-h-[54px] px-3 py-2 bg-[#EDEDED] rounded-[12px] flex items-center justify-between gap-3 text-left transition-all hover:bg-[#E5E5E5] ${
                    isDayDropdownOpen ? 'ring-2 ring-[#9DCC36]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <MapPin className="w-4 h-4 text-[#7F7F7F] shrink-0" />
                    <div className="flex flex-col justify-center gap-[2px] min-w-0">
                      <span className="text-[12px] font-medium leading-[16px] text-[#949494]">
                        Escolha o dia
                      </span>
                      <span className="text-[14px] font-medium leading-[16px] text-[#141530] truncate">
                        {formattedDayStr}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#7F7F7F] shrink-0 transition-transform ${
                      isDayDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDayDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E5E5E7] rounded-[16px] shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-[#F4F4F5]">
                    {daysData.length > 0
                      ? daysData.map((d) => {
                          const str = `Dia ${d.day} (${format(d.date, 'dd/MM - EEEE', { locale: ptBR })})`;
                          return (
                            <button
                              key={d.day}
                              type="button"
                              onClick={() => {
                                setSelectedDay(d.day);
                                setIsDayDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-[14px] flex items-center justify-between transition-colors ${
                                selectedDay === d.day
                                  ? 'bg-[#9DCC36]/20 text-[#141530] font-bold'
                                  : 'text-[#141530] hover:bg-[#F4F4F5] font-medium'
                              }`}
                            >
                              <span>{str}</span>
                              {selectedDay === d.day && <Check className="w-4 h-4 text-[#4E7B06]" />}
                            </button>
                          );
                        })
                      : Array.from({ length: totalDays || 1 }).map((_, i) => (
                          <button
                            key={i + 1}
                            type="button"
                            onClick={() => {
                              setSelectedDay(i + 1);
                              setIsDayDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-[14px] transition-colors ${
                              selectedDay === i + 1
                                ? 'bg-[#9DCC36]/20 text-[#141530] font-bold'
                                : 'text-[#141530] hover:bg-[#F4F4F5] font-medium'
                            }`}
                          >
                            Dia {i + 1}
                          </button>
                        ))}
                  </div>
                )}
              </div>
            )}

            {/* Note Textarea Container */}
            <div className="bg-[#EDEDED] rounded-[16px] p-6 flex flex-col justify-between min-h-[181px] gap-4">
              <textarea
                value={text}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setText(e.target.value);
                  }
                }}
                rows={5}
                placeholder="Adicione uma anotação para este dia..."
                className="w-full bg-transparent text-[14px] font-medium leading-[20px] text-[#171F2C] placeholder:text-[#7F7F7F] focus:outline-none resize-none flex-1"
              />
              <div className="flex justify-end items-center">
                <span className="text-[12px] font-medium leading-[16px] text-[#676767]">
                  {text.length}/500
                </span>
              </div>
            </div>

            {/* Actions (Delete & Save) */}
            <div className="flex flex-col gap-4">
              {/* Delete Note Option */}
              {onDelete && isEditing && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex items-center gap-3 text-[#D00004] hover:opacity-80 transition-opacity py-1 w-fit group"
                >
                  <Trash2 className="w-5 h-5 text-[#D00004]" strokeWidth={1.8} />
                  <span className="text-[16px] font-medium leading-[19px] text-[#D00004]">
                    Excluir anotação
                  </span>
                </button>
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!text.trim()}
                className={`w-full h-[48px] rounded-[16px] px-6 py-3 text-[16px] font-bold leading-[19px] flex items-center justify-center transition-all ${
                  text.trim()
                    ? 'bg-[#9DCC36] text-[#141530] hover:brightness-95 active:scale-[0.99] shadow-sm'
                    : 'bg-[#EDEDED] text-[#949494] cursor-not-allowed'
                }`}
              >
                Salvar
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

