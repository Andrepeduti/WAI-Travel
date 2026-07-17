import { Plane, Building2, TicketCheck } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';

export type DocType = 'transporte' | 'hospedagem' | 'ingresso';

interface DocTypePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: DocType) => void;
}

const options: { tipo: DocType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    tipo: 'hospedagem',
    label: 'Hospedagem',
    description: 'Hotel, hostel, Airbnb...',
    icon: <Building2 size={22} strokeWidth={1.5} />,
  },
  {
    tipo: 'transporte',
    label: 'Transporte',
    description: 'Voo, trem, ônibus, carro',
    icon: <Plane size={22} strokeWidth={1.5} />,
  },
  {
    tipo: 'ingresso',
    label: 'Atividade',
    description: 'Ingresso, tour, experiência',
    icon: <TicketCheck size={22} strokeWidth={1.5} />,
  },
];

export function DocTypePickerSheet({ isOpen, onClose, onSelect }: DocTypePickerSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[110] flex justify-center" style={{ fontFamily: 'var(--font-family-primary)' }}>
        <div className="bg-card rounded-t-3xl w-full w-full pb-8 animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="px-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-bold text-foreground">Que tipo de documento?</h3>
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                <Icon name="close" size={18} className="text-foreground" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {options.map((opt) => (
                <button
                  key={opt.tipo}
                  onClick={() => onSelect(opt.tipo)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-muted/40 transition-colors text-left"
                  style={{ background: '#F8F8F8' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#EBEBEB' }}
                  >
                    <span className="text-foreground">{opt.icon}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[15px] font-semibold text-foreground block">{opt.label}</span>
                    <span className="text-[12px] text-muted-foreground">{opt.description}</span>
                  </div>
                  <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
