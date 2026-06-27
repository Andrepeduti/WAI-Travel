import { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DaySelector } from '@/components/travel/DaySelector';

const transportTypes = [
  { id: 'walk', label: 'Caminhada', icon: 'directions_walk' },
  { id: 'bus', label: 'Ônibus', icon: 'directions_bus' },
  { id: 'metro', label: 'Metrô', icon: 'directions_subway' },
  { id: 'car', label: 'Carro', icon: 'directions_car' },
] as const;

type TransportType = typeof transportTypes[number]['id'];

export interface DeslocamentoData {
  type: TransportType;
  duration: string;
  positionIndex?: number;
  day?: number;
}

interface ActivitySlot {
  name: string;
  startTime?: string;
}

export interface PlaceCoord {
  name: string;
  lat: number;
  lng: number;
}

interface AddDeslocamentoSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DeslocamentoData) => void;
  totalDays: number;
  startDate?: Date;
  initialDay?: number;
  activitiesByDay: (day: number) => ActivitySlot[];
  places?: PlaceCoord[];
}

const defaultDuration: Record<TransportType, string> = {
  walk: '15 min',
  bus: '10 min',
  metro: '8 min',
  car: '5 min',
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRecommendation(fromName: string, toName: string, places: PlaceCoord[]): { type: TransportType; duration: string; distanceLabel: string } {
  const from = places.find(p => p.name.toLowerCase() === fromName.toLowerCase());
  const to = places.find(p => p.name.toLowerCase() === toName.toLowerCase());

  if (!from || !to) {
    // Fallback: recommend walking when no coords available
    return { type: 'walk', duration: '15 min', distanceLabel: '' };
  }

  const dist = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const roadKm = dist * 1.3;

  let type: TransportType;
  let mins: number;

  if (roadKm <= 1.2) {
    type = 'walk';
    mins = Math.max(5, Math.round((roadKm / 5) * 60));
  } else if (roadKm <= 5) {
    type = 'bus';
    mins = Math.max(8, Math.round((roadKm / 18) * 60));
  } else if (roadKm <= 15) {
    type = 'metro';
    mins = Math.max(10, Math.round((roadKm / 30) * 60));
  } else {
    type = 'car';
    mins = Math.max(10, Math.round((roadKm / 40) * 60));
  }

  const distanceLabel = roadKm < 1 ? `${Math.round(roadKm * 1000)} m` : `${roadKm.toFixed(1)} km`;

  return { type, duration: `${mins} min`, distanceLabel };
}

const transportLabel: Record<TransportType, string> = {
  walk: 'a pé',
  bus: 'de ônibus',
  metro: 'de metrô',
  car: 'de carro',
};

const transportIcon: Record<TransportType, string> = {
  walk: 'directions_walk',
  bus: 'directions_bus',
  metro: 'directions_subway',
  car: 'directions_car',
};

export function AddDeslocamentoSheet({ open, onClose, onSave, totalDays, startDate, initialDay = 1, activitiesByDay, places = [] }: AddDeslocamentoSheetProps) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [type, setType] = useState<TransportType>('walk');
  const [positionIndex, setPositionIndex] = useState<number | null>(null);

  if (!open) return null;

  const activities = activitiesByDay(selectedDay);
  const hasEnoughActivities = activities.length >= 2;

  const positions = hasEnoughActivities
    ? activities.slice(0, -1).map((act, i) => ({
        index: i,
        from: act,
        to: activities[i + 1],
      }))
    : [];

  // Compute recommendation for selected pair
  const selectedPair = positionIndex !== null ? positions.find(p => p.index === positionIndex) : null;
  const recommendation = selectedPair
    ? getRecommendation(selectedPair.from.name, selectedPair.to.name, places)
    : null;

  const handleClose = () => {
    setSelectedDay(initialDay);
    setType('walk');
    setPositionIndex(null);
    onClose();
  };

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
    setPositionIndex(null);
  };

  const handleSelectPosition = (index: number) => {
    setPositionIndex(index);
    // Auto-select recommended type
    const pair = positions.find(p => p.index === index);
    if (pair) {
      const rec = getRecommendation(pair.from.name, pair.to.name, places);
      if (rec) setType(rec.type);
    }
  };

  const handleSave = () => {
    if (positionIndex === null) return;
    onSave({
      type,
      duration: defaultDuration[type],
      positionIndex,
      day: selectedDay,
    });
    handleClose();
  };

  const canSave = hasEnoughActivities && positionIndex !== null;

  return (
    <div className="fixed inset-0 z-[210]" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-foreground">Adicionar deslocamento</h2>
          <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. Day */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Dia</label>
            <DaySelector
              selectedDay={selectedDay}
              totalDays={totalDays}
              onChange={handleDayChange}
              startDate={startDate}
            />
          </div>

          {/* 2. Trecho (select dropdown) */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Trecho</label>
            {!hasEnoughActivities ? (
              <div className="text-center py-4">
                <Icon name="info" size={28} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-[13px] text-muted-foreground">É preciso ter pelo menos 2 atividades neste dia.</p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={positionIndex ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    if (val !== null) {
                      handleSelectPosition(val);
                    } else {
                      setPositionIndex(null);
                    }
                  }}
                  className="w-full appearance-none rounded-xl px-4 py-3 text-[14px] font-medium text-foreground outline-none pr-10 cursor-pointer"
                  style={{ background: '#F2F2F2' }}
                >
                  <option value="">Selecione o trecho</option>
                  {positions.map(pos => (
                    <option key={pos.index} value={pos.index}>
                      {pos.from.name} → {pos.to.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Icon name="expand_more" size={20} className="text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* 3. Transport type */}
          {positionIndex !== null && (
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Tipo de locomoção</label>
              <div className="flex flex-wrap gap-2">
                {transportTypes.map(t => {
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors border ${
                        isSelected
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-transparent text-foreground border-border'
                      }`}
                    >
                      <Icon name={t.icon} size={16} className="text-current" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendation insight */}
          {positionIndex !== null && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30" style={{ background: 'rgba(157, 204, 54, 0.08)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(157, 204, 54, 0.15)' }}>
                <Icon name="lightbulb" size={18} style={{ color: '#7DAA2E' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">
                  Recomendamos ir {transportLabel[recommendation.type]}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {recommendation.distanceLabel ? `~${recommendation.distanceLabel} · ` : ''}{recommendation.duration} estimados
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-border/40">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition-colors disabled:bg-muted disabled:text-muted-foreground"
            style={canSave ? { background: '#9DCC36', color: '#141530' } : undefined}
          >
            Salvar deslocamento
          </button>
        </div>
      </div>
    </div>
  );
}
