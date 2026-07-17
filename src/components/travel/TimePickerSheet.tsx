import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface TimePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hora: string, minuto: string) => void;
  initialHora?: string;
  initialMinuto?: string;
  label?: string;
}



export function TimePickerSheet({
  isOpen,
  onClose,
  onConfirm,
  initialHora = '14',
  initialMinuto = '00',
  label = 'Horário',
}: TimePickerSheetProps) {
  const [hora, setHora] = useState(initialHora);
  const [minuto, setMinuto] = useState(initialMinuto);

  useEffect(() => {
    if (isOpen) {
      setHora(initialHora);
      setMinuto(initialMinuto);
    }
  }, [isOpen, initialHora, initialMinuto]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200] transition-opacity" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[210] flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full w-full pb-8 animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="px-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{label}</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
                <Icon name="close" size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Inputs */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hora</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={hora} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length > 2) setHora(val.slice(-2));
                    else setHora(val);
                  }}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value || '0', 10);
                    if (isNaN(val)) val = 0;
                    if (val > 23) val = 23;
                    setHora(String(val).padStart(2, '0'));
                  }}
                  className="w-24 h-20 text-center text-4xl font-bold bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-primary-official focus:bg-background transition-colors"
                />
              </div>
              <span className="text-4xl font-bold text-muted-foreground mt-6">:</span>
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Minuto</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={minuto} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length > 2) setMinuto(val.slice(-2));
                    else setMinuto(val);
                  }}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value || '0', 10);
                    if (isNaN(val)) val = 0;
                    if (val > 59) val = 59;
                    setMinuto(String(val).padStart(2, '0'));
                  }}
                  className="w-24 h-20 text-center text-4xl font-bold bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-primary-official focus:bg-background transition-colors"
                />
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={() => onConfirm(hora, minuto)}
              className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center"
              style={{ background: '#9DCC36', color: '#1A1C40' }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
