import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { loadPlannerData, savePlannerData, PlannerActivity } from '@/lib/plannerApi';
import { UserItinerary } from '@/lib/itinerariesApi';
import { toast } from 'sonner';

interface PlaceLike {
  id: number;
  name: string;
  category?: string;
  image?: string;
  rating?: number;
  lat?: number;
  lng?: number;
}

interface AddPlaceToItinerarySheetProps {
  open: boolean;
  onClose: () => void;
  place: PlaceLike | null;
}

function diffDays(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 1;
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 1;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function formatRange(start: string, end: string) {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
    return `${fmt(s)} — ${fmt(e)}`;
  } catch {
    return '';
  }
}

export function AddPlaceToItinerarySheet({ open, onClose, place }: AddPlaceToItinerarySheetProps) {
  const { itineraries, loading } = useMyItineraries();
  const [step, setStep] = useState<'itinerary' | 'day'>('itinerary');
  const [selectedItinerary, setSelectedItinerary] = useState<UserItinerary | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset on close
      setStep('itinerary');
      setSelectedItinerary(null);
      setSelectedDay(null);
      setSaving(false);
    }
  }, [open]);

  const dayCount = useMemo(
    () => (selectedItinerary ? diffDays(selectedItinerary.startDate, selectedItinerary.endDate) : 1),
    [selectedItinerary],
  );

  const handlePickItinerary = (it: UserItinerary) => {
    setSelectedItinerary(it);
    setSelectedDay(1);
    setStep('day');
  };

  const handleConfirm = async () => {
    if (!place || !selectedItinerary || !selectedDay) return;
    setSaving(true);
    try {
      const current = (await loadPlannerData(selectedItinerary.id)) ?? { activities: {}, transports: {} };
      const dayList = current.activities[selectedDay] ?? [];
      const newActivity: PlannerActivity = {
        id: Date.now(),
        type: 'activity',
        startTime: '09:00',
        endTime: '10:00',
        category: place.category || 'Lugar salvo',
        categoryColor: '#9DCC36',
        name: place.name,
        image: place.image || '',
        openHours: '',
        rating: place.rating ?? 0,
        price: '',
        lat: place.lat,
        lng: place.lng,
      };
      const next = {
        activities: { ...current.activities, [selectedDay]: [...dayList, newActivity] },
        transports: current.transports,
      };
      await savePlannerData(selectedItinerary.id, next);
      toast.success(`Adicionado ao Dia ${selectedDay} de "${selectedItinerary.title}"`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível adicionar ao roteiro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={step === 'itinerary' ? 'Adicionar ao roteiro' : 'Escolher dia'}
      headerExtra={
        step === 'day' ? (
          <button
            onClick={() => setStep('itinerary')}
            className="text-[13px] font-semibold"
            style={{ color: '#1A1C40' }}
          >
            Voltar
          </button>
        ) : undefined
      }
      footer={
        step === 'day' ? (
          <button
            onClick={handleConfirm}
            disabled={!selectedDay || saving}
            className="w-full h-12 rounded-full text-[14px] font-bold transition-all active:scale-[0.98]"
            style={{
              background: selectedDay && !saving ? '#9DCC36' : '#E5E5E5',
              color: selectedDay && !saving ? '#1A1C40' : '#999',
            }}
          >
            {saving ? 'Adicionando…' : 'Adicionar ao roteiro'}
          </button>
        ) : undefined
      }
    >
      {step === 'itinerary' ? (
        <div className="py-2">
          {loading ? (
            <div className="py-10 text-center text-[13px]" style={{ color: '#8A8A8A' }}>
              Carregando roteiros…
            </div>
          ) : itineraries.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: '#F2F2F2' }}
              >
                <Icon name="map" size={24} style={{ color: '#999' }} />
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: '#1A1C40' }}>
                Você ainda não tem roteiros
              </h3>
              <p className="text-[12px] mt-1 max-w-[260px]" style={{ color: '#8A8A8A' }}>
                Crie um roteiro para começar a adicionar lugares da sua coleção.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 pb-2">
              {itineraries.map(it => {
                const cover = it.images?.[0];
                const days = diffDays(it.startDate, it.endDate);
                const range = formatRange(it.startDate, it.endDate);
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => handlePickItinerary(it)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl active:bg-muted/40 transition-colors text-left"
                      style={{ background: '#F7F7F7' }}
                    >
                      <div
                        className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0"
                        style={{
                          backgroundImage: cover ? `url(${cover})` : undefined,
                          background: cover ? undefined : '#E5E7EB',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-bold truncate" style={{ color: '#1A1C40' }}>
                          {it.title}
                        </h4>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: '#8A8A8A' }}>
                          {range ? `${range} · ` : ''}
                          {days} {days === 1 ? 'dia' : 'dias'}
                        </p>
                      </div>
                      <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="py-2">
          {selectedItinerary && (
            <p className="text-[12px] mb-3" style={{ color: '#8A8A8A' }}>
              Em <span style={{ color: '#1A1C40', fontWeight: 700 }}>{selectedItinerary.title}</span>, escolha o dia em que deseja adicionar.
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map(d => {
              const active = selectedDay === d;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className="h-11 rounded-xl text-[13px] font-bold transition-colors"
                  style={{
                    background: active ? '#1A1C40' : '#F7F7F7',
                    color: active ? '#FFFFFF' : '#1A1C40',
                  }}
                >
                  Dia {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
