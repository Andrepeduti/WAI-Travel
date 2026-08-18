import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { X, MapPin, ChevronDown, Check } from 'lucide-react';
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
        <div className="bg-white rounded-t-[32px] w-full shadow-2xl p-6 pointer-events-auto animate-in slide-in-from-bottom duration-300 max-w-lg mx-auto">
          
          {/* Top Bar with Close Button */}
          <div className="flex items-center justify-end pb-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F4F4F5] text-[#1A1C40] hover:bg-[#ECECED] transition-colors -mr-1"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <div className="pb-3 border-b border-[#F4F4F5]">
            <h2 className="text-[20px] font-bold text-[#1A1C40]">
              {activityName ? `Anotação para ${activityName}` : 'Adicionar anotação pessoal'}
            </h2>
          </div>

          <div className="space-y-4 pt-4">
            {/* Day Selector - only displayed for standalone notes not bound to an existing activity */}
            {!activityName && !activityId && (
              <div>
                <label className="text-[12px] font-medium text-[#8E8E93] block mb-1.5">
                  Escolha o dia
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#F4F4F5] rounded-2xl text-[14px] font-semibold text-[#1A1C40] text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-[#8E8E93]" />
                      <span>{formattedDayStr}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
                  </button>

                  {isDayDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E5E7] rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-[#F4F4F5]">
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
                                className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center justify-between ${
                                  selectedDay === d.day
                                    ? 'bg-[#F5F3FF] text-[#7C3AED] font-bold'
                                    : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
                                }`}
                              >
                                <span>{str}</span>
                                {selectedDay === d.day && <Check className="w-4 h-4" />}
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
                              className={`w-full px-4 py-2.5 text-left text-[13px] ${
                                selectedDay === i + 1
                                  ? 'bg-[#F5F3FF] text-[#7C3AED] font-bold'
                                  : 'text-[#1A1C40] hover:bg-[#F4F4F5]'
                              }`}
                            >
                              Dia {i + 1}
                            </button>
                          ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Note Textarea */}
            <div className="bg-[#F4F4F5] rounded-2xl p-3.5 relative">
              <textarea
                value={text}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setText(e.target.value);
                  }
                }}
                rows={5}
                placeholder="Escreva sua anotação pessoal..."
                className="w-full bg-transparent text-[14px] text-[#1A1C40] placeholder:text-[#8E8E93] focus:outline-none resize-none"
              />
              <div className="text-right text-[11px] font-medium text-[#8E8E93] mt-1">
                {text.length}/500
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!text.trim()}
                className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-all shadow-sm flex items-center justify-center ${
                  text.trim()
                    ? 'bg-[#9ecc3b] text-[#1A1C40] hover:opacity-95 active:scale-[0.99]'
                    : 'bg-[#E5E5E7] text-[#8E8E93] cursor-not-allowed'
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
