import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export interface DayReservation {
  placeName: string;
  date: string;
  time: string;
  people: string;
  link: string;
  notes: string;
}

interface AddReservationSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DayReservation) => void;
  dayNumber: number;
}

export function AddReservationSheet({ open, onClose, onSave, dayNumber }: AddReservationSheetProps) {
  const [placeName, setPlaceName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [people, setPeople] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const handleSave = () => {
    if (!placeName.trim()) return;
    onSave({
      placeName: placeName.trim(),
      date: date.trim(),
      time: time.trim(),
      people: people.trim(),
      link: link.trim(),
      notes: notes.trim(),
    });
    setPlaceName('');
    setDate('');
    setTime('');
    setPeople('');
    setLink('');
    setNotes('');
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
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-foreground">Adicionar reserva</h2>
            <span className="text-[12px] text-muted-foreground">Dia {dayNumber}</span>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 space-y-4 overflow-y-auto flex-1">
          {/* Place name */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Nome do lugar
            </label>
            <div className="rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
              <input
                type="text"
                placeholder="Ex: Hotel Le Marais"
                value={placeName}
                onChange={e => setPlaceName(e.target.value)}
                className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Date + Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Data
              </label>
              <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
                <Icon name="calendar_today" size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="dd/mm/aaaa"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
            <div className="w-28">
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Horário
              </label>
              <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
                <Icon name="schedule" size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="00:00"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
          </div>

          {/* People */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Número de pessoas
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
              <Icon name="group" size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Ex: 2"
                value={people}
                onChange={e => setPeople(e.target.value)}
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Link da reserva (opcional)
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F2F2F2' }}>
              <Icon name="link" size={18} className="text-muted-foreground" />
              <input
                type="url"
                placeholder="https://..."
                value={link}
                onChange={e => setLink(e.target.value)}
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Notas (opcional)
            </label>
            <textarea
              placeholder="Observações sobre a reserva..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none resize-none"
              style={{ background: '#F2F2F2' }}
            />
          </div>
        </div>

        {/* Footer button */}
        <div className="px-5 pb-8 pt-3 border-t border-border/40">
          <button
            onClick={handleSave}
            disabled={!placeName.trim()}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground transition-colors"
          >
            Salvar reserva
          </button>
        </div>
      </div>
    </div>
  );
}
