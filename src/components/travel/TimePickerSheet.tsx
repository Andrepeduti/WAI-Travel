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

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutos = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function WheelColumn({
  items,
  selectedValue,
  onChange,
}: {
  items: string[];
  selectedValue: string;
  onChange: (val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const selectedIndex = items.indexOf(selectedValue);

  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      containerRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isScrollingRef.current = true;

    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

      containerRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      });

      onChange(items[clampedIndex]);
      isScrollingRef.current = false;
    }, 80);
  }, [items, onChange]);

  return (
    <div className="relative h-[220px] w-20 overflow-hidden">
      {/* Selection highlight */}
      <div
        className="absolute left-0 right-0 rounded-xl bg-muted/60 pointer-events-none z-10"
        style={{
          top: CENTER_INDEX * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
        }}
      />
      {/* Fade top */}
      <div className="absolute top-0 left-0 right-0 h-[88px] bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
      {/* Fade bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[88px] bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide"
        onScroll={handleScroll}
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: CENTER_INDEX * ITEM_HEIGHT,
          paddingBottom: CENTER_INDEX * ITEM_HEIGHT,
        }}
      >
        {items.map((item, i) => {
          const isSelected = item === selectedValue;
          return (
            <div
              key={`${item}-${i}`}
              className={cn(
                'flex items-center justify-center transition-all duration-150',
                isSelected
                  ? 'text-foreground font-bold text-xl'
                  : 'text-muted-foreground/60 text-lg font-medium'
              )}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'start',
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
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
      <div className="fixed inset-0 bg-black/40 z-[70] transition-opacity" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[80] flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300">
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

            {/* Wheels */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <WheelColumn items={horas} selectedValue={hora} onChange={setHora} />
              <span className="text-2xl font-bold text-foreground">:</span>
              <WheelColumn items={minutos} selectedValue={minuto} onChange={setMinuto} />
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
