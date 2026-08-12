import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DaySelector } from './DaySelector';
import { TimePickerSheet } from './TimePickerSheet';
import { toast } from 'sonner';

export interface ManualActivityData {
  name: string;
  location: string;
  startTime: string;
  endTime: string;
  price: string;
  day: number;
}

interface AddManualActivitySheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ManualActivityData) => void;
  dayNumber: number;
  totalDays: number;
  startDate?: Date;
}

function timeToMinutes(t: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec((t || '').trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const categoryOptions = [
  { label: 'Restaurante', color: '#F59E0B', icon: 'restaurant' },
  { label: 'Ponto Turístico', color: '#10B981', icon: 'photo_camera' },
  { label: 'Museu', color: '#6366F1', icon: 'museum' },
  { label: 'Hotel', color: '#3B82F6', icon: 'hotel' },
  { label: 'Parque', color: '#22C55E', icon: 'park' },
  { label: 'Shopping', color: '#EC4899', icon: 'shopping_bag' },
  { label: 'Bar', color: '#8B5CF6', icon: 'local_bar' },
  { label: 'Outro', color: '#64748B', icon: 'place' },
];

export function AddManualActivitySheet({ open, onClose, onSave, dayNumber, totalDays, startDate }: AddManualActivitySheetProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayNumber);
  useEffect(() => { setSelectedDay(dayNumber); }, [dayNumber]);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  if (!open) return null;

  const isValid = name.trim().length > 0;

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const startMin = timeToMinutes(newStart);
    const endMin = timeToMinutes(endTime);
    if (startMin >= endMin) {
      setEndTime(minutesToTime(startMin + 60));
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const endMin = timeToMinutes(newEnd);
    const startMin = timeToMinutes(startTime);
    if (endMin <= startMin) {
      setStartTime(minutesToTime(Math.max(0, endMin - 60)));
    }
  };

  const handleSave = () => {
    if (!isValid) return;
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      toast.error('O horário de início deve ser anterior ao horário de término');
      return;
    }
    onSave({
      name: name.trim(),
      location: location.trim(),
      startTime,
      endTime,
      price: price.trim(),
      day: selectedDay,
    });
    // Reset
    setName('');
    setLocation('');
    setPrice('');
    setSelectedCategory(0);
    setStartTime('09:00');
    setEndTime('10:00');
    onClose();
  };

  const cat = categoryOptions[selectedCategory];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="bg-background rounded-t-3xl w-full w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center py-3 sticky top-0 bg-background z-10">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-foreground">Adicionar atividade</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Icon name="close" size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Form */}
          <div className="px-6 pb-6 space-y-5">
            {/* Day selector */}
            <DaySelector selectedDay={selectedDay} totalDays={totalDays} onChange={setSelectedDay} startDate={startDate} />

            {/* Category chips */}
            <div>
              <label className="text-[13px] font-semibold text-foreground mb-2 block">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedCategory(i)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-all"
                    style={{
                      background: selectedCategory === i ? opt.color : '#F2F2F2',
                      color: selectedCategory === i ? '#fff' : '#666',
                    }}
                  >
                    <Icon name={opt.icon} size={16} style={{ color: selectedCategory === i ? '#fff' : '#999' }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[13px] font-semibold text-foreground mb-2 block">Nome do local *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Coliseu, Trattoria da Luigi..."
                maxLength={100}
                className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                style={{ background: '#F2F2F2' }}
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-[13px] font-semibold text-foreground mb-2 block">Localização</label>
              <div className="relative">
                <Icon name="location_on" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Ex: Centro, Roma"
                  maxLength={200}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                  style={{ background: '#F2F2F2' }}
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="text-[13px] font-semibold text-foreground mb-2 block">Horário</label>
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium text-foreground relative overflow-hidden cursor-pointer"
                  style={{ background: '#F2F2F2' }}
                >
                  <Icon name="schedule" size={16} className="text-muted-foreground flex-shrink-0" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      if (e.target.value) handleStartTimeChange(e.target.value);
                    }}
                    className="flex-1 text-[14px] font-medium text-foreground bg-transparent border-none p-0 m-0 outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative z-10 w-full"
                  />
                </div>
                <span className="text-[13px] text-muted-foreground font-medium">até</span>
                <div
                  className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium text-foreground relative overflow-hidden cursor-pointer"
                  style={{ background: '#F2F2F2' }}
                >
                  <Icon name="schedule" size={16} className="text-muted-foreground flex-shrink-0" />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      if (e.target.value) handleEndTimeChange(e.target.value);
                    }}
                    className="flex-1 text-[14px] font-medium text-foreground bg-transparent border-none p-0 m-0 outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative z-10 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="text-[13px] font-semibold text-foreground mb-2 block">Valor</label>
              <div className="relative">
                <Icon name="payments" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Ex: €17, Grátis, R$ 50"
                  maxLength={50}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                  style={{ background: '#F2F2F2' }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-8 sticky bottom-0 bg-background">
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="w-full py-4 rounded-2xl text-[15px] font-semibold transition-colors"
              style={{
                background: isValid ? '#9DCC36' : '#D1D5DB',
                color: isValid ? '#1A1C40' : '#fff',
              }}
            >
              Adicionar atividade
            </button>
          </div>
        </div>
      </div>

      {/* Time pickers */}
      <TimePickerSheet
        isOpen={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(h, m) => { handleStartTimeChange(`${h}:${m}`); setShowStartPicker(false); }}
        initialHora={startTime.split(':')[0]}
        initialMinuto={startTime.split(':')[1]}
        label="Horário de início"
      />
      <TimePickerSheet
        isOpen={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(h, m) => { handleEndTimeChange(`${h}:${m}`); setShowEndPicker(false); }}
        initialHora={endTime.split(':')[0]}
        initialMinuto={endTime.split(':')[1]}
        label="Horário de término"
      />
    </>
  );
}
