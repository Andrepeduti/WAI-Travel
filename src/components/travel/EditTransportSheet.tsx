import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';

const transportTypes = [
  { id: 'walk', label: 'Caminhada', icon: 'directions_walk' },
  { id: 'bus', label: 'Ônibus', icon: 'directions_bus' },
  { id: 'metro', label: 'Metrô', icon: 'directions_subway' },
  { id: 'car', label: 'Carro', icon: 'directions_car' },
] as const;

type TransportType = typeof transportTypes[number]['id'];

export interface TransportData {
  type: TransportType;
  duration: string;
  cost?: string;
}

interface EditTransportSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TransportData) => void;
  onDelete: () => void;
  transport: TransportData;
  fromName?: string;
  toName?: string;
  distanceKm?: number;
  recommendedType?: TransportType;
}

const defaultDuration: Record<TransportType, string> = {
  walk: '15 min',
  bus: '10 min',
  metro: '8 min',
  car: '5 min',
};

const currencies = ['BRL', 'EUR', 'USD', 'GBP'] as const;
type Currency = typeof currencies[number];
const currencySymbols: Record<Currency, string> = { BRL: 'R$', EUR: '€', USD: '$', GBP: '£' };

export function EditTransportSheet({ open, onClose, onSave, onDelete, transport, fromName, toName, distanceKm, recommendedType }: EditTransportSheetProps) {
  const [type, setType] = useState<TransportType>(transport.type);
  const [cost, setCost] = useState(transport.cost || '');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    onSave({ type, duration: defaultDuration[type], cost: cost.trim() || undefined });
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
    onClose();
  };

  const footer = (
    <button
      onClick={handleSave}
      className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground transition-colors"
    >
      Salvar
    </button>
  );

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Editar locomoção"
        zIndex={210}
        footer={footer}
      >
        <div className="space-y-5 pb-2">
          {/* Transport type */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-2 block">
              Tipo de locomoção
            </label>
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

          {/* AI Route Insight */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(53, 135, 242, 0.08)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(53, 135, 242, 0.15)' }}>
              <Icon name="lightbulb" size={16} style={{ color: '#3587F2' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] leading-relaxed font-medium" style={{ color: '#2A6BC6' }}>
                {(() => {
                  const recType = recommendedType || 'walk';
                  const recLabel = transportTypes.find(t => t.id === recType)?.label || 'Caminhada';

                  if (fromName && toName && distanceKm !== undefined) {
                    const roadKm = distanceKm * 1.3;
                    const dist = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${roadKm.toFixed(1)} km`;
                    if (roadKm <= 1.2) return `${dist} até ${toName}. Recomendamos ${recLabel.toLowerCase()} — é a forma mais rápida e econômica para esse trecho.`;
                    if (roadKm <= 5) return `${dist} até ${toName}. Recomendamos ${recLabel.toLowerCase()} — melhor custo-benefício para essa distância.`;
                    if (roadKm <= 15) return `${dist} até ${toName}. Recomendamos ${recLabel.toLowerCase()} — evita trânsito e é o mais rápido.`;
                    return `${dist} até ${toName}. Recomendamos ${recLabel.toLowerCase()} — o meio mais eficiente para esse percurso.`;
                  }
                  const destination = toName ? ` até ${toName}` : '';
                  return `Recomendamos ${recLabel.toLowerCase()}${destination} — a melhor opção para este trecho.`;
                })()}
              </p>
            </div>
          </div>

          {/* Cost */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
              Valor (opcional)
            </label>
            <div className="w-full bg-[#F2F2F2] rounded-xl px-4 h-12 flex items-center gap-1">
              <span className="text-[14px] font-medium text-muted-foreground">R$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={cost}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                  if (!digits) { setCost(''); return; }
                  const n = parseInt(digits, 10) / 100;
                  setCost(n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }}
                className="flex-1 bg-transparent text-[14px] font-medium text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[220]" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-200 px-5 pb-8 pt-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-4" />
            <h3 className="text-[17px] font-bold text-foreground mb-1">Excluir locomoção?</h3>
            <p className="text-[14px] text-muted-foreground mb-5">Essa ação não pode ser desfeita.</p>
            <div className="space-y-3">
              <button
                onClick={handleDelete}
                className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition-colors"
                style={{ backgroundColor: '#9DCC36', color: '#1A1C40' }}
              >
                Excluir
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3 rounded-2xl text-[14px] font-medium transition-colors border"
                style={{ color: '#1A1C40', borderColor: '#1A1C40' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
