import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DaySelector } from './DaySelector';
import { TimePickerSheet } from './TimePickerSheet';

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

  const handleSave = () => {
    if (!isValid) return;
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
                <button
                  onClick={() => setShowStartPicker(true)}
                  className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium text-foreground"
                  style={{ background: '#F2F2F2' }}
                >
                  <Icon name="schedule" size={16} className="text-muted-foreground" />
                  {startTime}
                </button>
                <span className="text-[13px] text-muted-foreground font-medium">até</span>
                <button
                  onClick={() => setShowEndPicker(true)}
                  className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium text-foreground"
                  style={{ background: '#F2F2F2' }}
                >
                  <Icon name="schedule" size={16} className="text-muted-foreground" />
                  {endTime}
                </button>
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
        onConfirm={(h, m) => { setStartTime(`${h}:${m}`); setShowStartPicker(false); }}
        initialHora={startTime.split(':')[0]}
        initialMinuto={startTime.split(':')[1]}
        label="Horário de início"
      />
      <TimePickerSheet
        isOpen={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(h, m) => { setEndTime(`${h}:${m}`); setShowEndPicker(false); }}
        initialHora={endTime.split(':')[0]}
        initialMinuto={endTime.split(':')[1]}
        label="Horário de término"
      />
    </>
  );
}
