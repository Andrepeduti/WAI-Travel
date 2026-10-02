import { Icon } from '@/components/ui/Icon';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DaySelectorProps {
  selectedDay: number;
  totalDays: number;
  onChange: (day: number) => void;
  startDate?: Date;
  transparent?: boolean;
}

export function DaySelector({ selectedDay, totalDays, onChange, startDate, transparent }: DaySelectorProps) {
  const formatDayLabel = (day: number) => {
    const padded = String(day).padStart(2, '0');
    if (startDate) {
      const date = addDays(startDate, day - 1);
      const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
      const capitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      return `Dia ${padded} (${format(date, 'dd/MM')} - ${capitalized})`;
    }
    return `Dia ${padded}`;
  };

  return (
    <div>
      <div className="relative">
        <select
          value={selectedDay}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full appearance-none ${transparent ? 'bg-transparent px-0 py-0' : 'rounded-xl px-4 py-3'} text-[14px] font-medium text-foreground outline-none pr-6 cursor-pointer`}
          style={transparent ? undefined : { background: '#F2F2F2' }}
        >
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
            <option key={day} value={day}>
              {formatDayLabel(day)}
            </option>
          ))}
        </select>
        <div className={`absolute ${transparent ? 'right-0 -mt-[2px]' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none`}>
          <Icon name="expand_more" size={20} className="text-[#141530]" />
        </div>
      </div>
    </div>
  );
}
