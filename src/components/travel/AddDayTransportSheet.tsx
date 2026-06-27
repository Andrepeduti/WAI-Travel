import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DaySelector } from './DaySelector';

const transportTypes = [
  { id: 'walk', label: 'Caminhada', icon: 'directions_walk' },
  { id: 'public', label: 'Transporte público', icon: 'directions_bus' },
  { id: 'car', label: 'Carro', icon: 'directions_car' },
  { id: 'bike', label: 'Bicicleta', icon: 'directions_bike' },
] as const;

type TransportType = typeof transportTypes[number]['id'];

export interface DayTransport {
  type: TransportType;
  duration: string;
  cost: string;
  day: number;
}

interface AddDayTransportSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DayTransport) => void;
  dayNumber: number;
  totalDays: number;
  startDate?: Date;
}

export function AddDayTransportSheet({ open, onClose, onSave, dayNumber, totalDays, startDate }: AddDayTransportSheetProps) {
  const [type, setType] = useState<TransportType>('walk');
  const [duration, setDuration] = useState('');
  const [cost, setCost] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayNumber);
  useEffect(() => { setSelectedDay(dayNumber); }, [dayNumber]);

  if (!open) return null;

  const handleSave = () => {
    if (!duration.trim()) return;
    onSave({ type, duration: duration.trim(), cost: cost.trim(), day: selectedDay });
    setType('walk');
    setDuration('');
    setCost('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-foreground">Adicionar transporte</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 space-y-5 overflow-y-auto flex-1">
          {/* Day selector */}
          <DaySelector selectedDay={selectedDay} totalDays={totalDays} onChange={setSelectedDay} startDate={startDate} />

          {/* Transport type */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-2 block">
              Tipo de transporte
            </label>
            <div className="flex flex-wrap gap-2">
              {transportTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                    type === t.id
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  <Icon name={t.icon} size={16} className="text-current" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
              Custo (opcional)
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
              <Icon name="attach_money" size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Ex: €3,20"
                value={cost}
                onChange={e => setCost(e.target.value)}
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer button */}
        <div className="px-5 pb-8 pt-3 border-t border-border/40">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground transition-colors"
          >
            Salvar transporte
          </button>
        </div>
      </div>
    </div>
  );
}
