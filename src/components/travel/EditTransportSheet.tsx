import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getCurrencySymbol } from '@/lib/currencyUtils';
import { TransportType, TransportBetween } from './DraggableActivityList';

const transportTypes = [
  { id: 'none', label: 'Nenhum' },
  { id: 'train', label: 'Trem' },
  { id: 'walk', label: 'Caminhada' },
  { id: 'bus', label: 'Ônibus' },
  { id: 'car', label: 'Carro' },
  { id: 'bike', label: 'Bicicleta' },
  { id: 'other', label: 'Outros' },
] as const;

export interface EditTransportSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TransportBetween) => void;
  onDelete: () => void;
  transport: TransportBetween;
  fromName?: string;
  toName?: string;
  distanceKm?: number;
  currency?: string;
}

export function EditTransportSheet({ 
  open, 
  onClose, 
  onSave, 
  onDelete, 
  transport, 
  fromName, 
  toName, 
  distanceKm, 
  currency = 'BRL' 
}: EditTransportSheetProps) {
  const [type, setType] = useState<TransportType>(transport.type === 'metro' ? 'train' : transport.type || 'none');
  const [duration, setDuration] = useState(transport.duration || '');
  const [cost, setCost] = useState(transport.cost || '');
  const [distanceInput, setDistanceInput] = useState(transport.distance || '');

  // Keep track of user manual edit to avoid overriding when type changes? 
  // Figma says: "e ai a ideia é vc recalcular com o meio de transporte que ele selecionou"
  // So we recalculate whenever type changes, except maybe on first mount?
  // We can use a flag to only recalculate if the user clicks a chip (so on type change AFTER mount)
  const [hasUserChangedType, setHasUserChangedType] = useState(false);

  useEffect(() => {
    if (!hasUserChangedType) return;
    
    if (type === 'none') {
      setDuration('');
      return;
    }

    if (distanceKm !== undefined) {
      const roadKm = distanceKm * 1.3;
      let mins = 0;
      switch(type) {
        case 'walk': mins = Math.max(3, Math.round((roadKm / 5) * 60)); break;
        case 'bike': mins = Math.max(3, Math.round((roadKm / 15) * 60)); break;
        case 'bus': mins = Math.max(8, Math.round((roadKm / 18) * 60)); break;
        case 'train':
        case 'metro': mins = Math.max(10, Math.round((roadKm / 30) * 60)); break;
        case 'car': mins = Math.max(10, Math.round((roadKm / 40) * 60)); break;
        case 'other': mins = Math.max(10, Math.round((roadKm / 30) * 60)); break;
      }
      if (mins > 0) {
        setDuration(`${mins} min`);
      }
    }
  }, [type, distanceKm, hasUserChangedType]);

  // When bottomsheet opens, reset internal states if transport changes
  useEffect(() => {
    if (open) {
      setType(transport.type === 'metro' ? 'train' : transport.type || 'none');
      setDuration(transport.duration || '');
      setCost(transport.cost || '');

      let initDist = transport.distance || '';
      if (!initDist && distanceKm !== undefined) {
        const roadKm = distanceKm * 1.3;
        initDist = roadKm < 1 ? `${Math.round(roadKm * 1000)} m` : `${roadKm.toFixed(1)} km`;
      }
      setDistanceInput(initDist);

      setHasUserChangedType(false);
    }
  }, [open, transport, distanceKm]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ 
      type, 
      duration: duration.trim(), 
      cost: cost.trim() || undefined,
      distance: distanceInput.trim() || undefined
    });
    onClose();
  };

  const footer = (
    <div className="w-full px-6 pb-6 pt-0">
      <button
        onClick={handleSave}
        className="w-full h-[48px] rounded-[16px] flex items-center justify-center transition-colors active:scale-[0.98]"
        style={{ backgroundColor: '#9DCC36' }}
      >
        <span className="font-bold text-[16px] leading-[19px] text-[#141530]" style={{ fontFamily: 'Urbanist' }}>
          Salvar
        </span>
      </button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <h2 className="text-[#171F2C] font-semibold text-[24px] leading-[29px]" style={{ fontFamily: 'Urbanist' }}>
          Locomoção
        </h2>
      }
      zIndex={210}
      footer={footer}
      bodyClassName="px-6 pb-[32px]"
    >
      <div className="w-full flex flex-col items-start gap-[24px]">
              
              {/* Chips */}
              <div className="w-full flex flex-col items-start gap-[1px]">
                <div className="w-full flex flex-row flex-wrap items-start content-start gap-[12px]">
                  {transportTypes.map(t => {
                    const active = type === t.id || (type === 'metro' && t.id === 'train');
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setType(t.id);
                          setHasUserChangedType(true);
                        }}
                        className="box-border flex flex-row items-center justify-center px-4 py-2 gap-4 h-[33px] rounded-[16px] transition-all active:scale-[0.97]"
                        style={
                          active
                            ? { backgroundColor: '#141530', border: '1px solid #141530' }
                            : { backgroundColor: 'transparent', border: '1px solid #141530' }
                        }
                      >
                        <span 
                          className="font-medium text-[14px] leading-[17px] text-center"
                          style={{ 
                            fontFamily: 'Urbanist',
                            color: active ? '#FEFEFE' : '#141530'
                          }}
                        >
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inputs */}
              <div className="w-full flex flex-col items-start gap-4">
                
                {/* Tempo & Distância */}
                <div className="flex flex-row items-center px-[12px] py-[12px] gap-[12px] w-full h-[60px] bg-[#EEEEEE] rounded-[12px] relative focus-within:ring-1 focus-within:ring-[#141530]/20">
                  <div className="flex items-center justify-center w-[16px] h-[16px] flex-shrink-0 relative">
                    <Icon name="schedule" size={16} className="text-[#141530]" />
                  </div>
                  <div className="flex flex-row items-center gap-[12px] flex-1 min-w-0">
                    <div className="flex flex-col justify-center items-start gap-[1px] flex-1">
                      <span className="font-medium text-[12px] leading-[16px] text-[#949494]" style={{ fontFamily: 'Urbanist' }}>
                        Tempo (Opcional)
                      </span>
                      <input
                        type="text"
                        placeholder="Ex: 10 min"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#9E9E9E] p-0 h-[16px]"
                        style={{ fontFamily: 'Urbanist' }}
                      />
                    </div>
                    <div className="w-[1px] h-[30px] bg-[#D6D6D6] flex-shrink-0" />
                    <div className="flex flex-col justify-center items-start gap-[1px] flex-1">
                      <span className="font-medium text-[12px] leading-[16px] text-[#949494]" style={{ fontFamily: 'Urbanist' }}>
                        KM (Opcional)
                      </span>
                      <input
                        type="text"
                        placeholder="Ex: 5 km"
                        value={distanceInput}
                        onChange={e => setDistanceInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#9E9E9E] p-0 h-[16px]"
                        style={{ fontFamily: 'Urbanist' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Valor */}
                <div className="flex flex-row items-center px-[12px] py-[12px] gap-[12px] w-full h-[60px] bg-[#EEEEEE] rounded-[12px] relative focus-within:ring-1 focus-within:ring-[#141530]/20">
                  <div className="flex items-center justify-center w-[16px] h-[16px] flex-shrink-0 relative">
                    <Icon name="attach_money" size={16} className="text-[#141530]" />
                  </div>
                  <div className="flex flex-col justify-center items-start gap-[1px] flex-1 min-w-0">
                    <span className="font-medium text-[12px] leading-[16px] text-[#949494]" style={{ fontFamily: 'Urbanist' }}>
                      Valor (Opcional)
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Adicione o valor"
                      value={cost ? cost.replace(new RegExp(`^${getCurrencySymbol(currency)}\\s*`), '').replace(/^R\$\s*/, '') : ''}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                        if (!digits) { setCost(''); return; }
                        const n = parseInt(digits, 10) / 100;
                        setCost(n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                      }}
                      className="w-full bg-transparent border-none outline-none font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#9E9E9E] p-0 h-[16px]"
                      style={{ fontFamily: 'Urbanist' }}
                    />
                  </div>
                </div>

              </div>
            </div>
    </BottomSheet>
  );
}
