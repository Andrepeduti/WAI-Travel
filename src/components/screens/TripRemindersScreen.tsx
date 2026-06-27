import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface TripRemindersScreenProps {
  onBack: () => void;
}

interface CheckItem {
  id: number;
  label: string;
  checked: boolean;
}

export function TripRemindersScreen({ onBack }: TripRemindersScreenProps) {
  const [documents, setDocuments] = useState<CheckItem[]>([
    { id: 1, label: 'Passaporte válido', checked: false },
    { id: 2, label: 'Visto (se necessário)', checked: false },
    { id: 3, label: 'Seguro viagem', checked: false },
    { id: 4, label: 'Reserva de hotel', checked: false },
    { id: 5, label: 'Passagem aérea', checked: false },
    { id: 6, label: 'Cartão de vacinação', checked: false },
  ]);

  const [packing, setPacking] = useState<CheckItem[]>([
    { id: 1, label: 'Casaco impermeável', checked: false },
    { id: 2, label: 'Roupas em camadas', checked: false },
    { id: 3, label: 'Sapato confortável para caminhada', checked: false },
    { id: 4, label: 'Cachecol e luvas', checked: false },
    { id: 5, label: 'Adaptador de tomada (tipo C/F)', checked: false },
  ]);

  const toggleDoc = (id: number) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, checked: !d.checked } : d));
  };

  const togglePacking = (id: number) => {
    setPacking(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const weatherTips = [
    { icon: 'thermostat', text: 'Temperatura média: 8°C – 12°C' },
    { icon: 'water_drop', text: 'Chuvas frequentes, leve guarda-chuva' },
    { icon: 'wb_sunny', text: 'Dias curtos, escurece por volta das 17h' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <div>
            <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Amsterdam</h1>
            <p className="text-sm text-muted-foreground">Faltam 15 dias para sua viagem!</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 pb-8 space-y-6">
        {/* AI Insight Banner */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(53, 135, 242, 0.08)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(53, 135, 242, 0.15)' }}>
            <Icon name="auto_awesome" size={20} style={{ color: '#3587F2' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Dica da IA</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
              Amsterdam em março pode ser fria e chuvosa. Prepare-se com roupas em camadas e calçados impermeáveis!
            </p>
          </div>
        </div>

        {/* Weather */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Clima previsto</h2>
          <div className="space-y-2.5">
            {weatherTips.map((tip, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(53, 135, 242, 0.12)' }}>
                  <Icon name={tip.icon} size={18} style={{ color: '#3587F2' }} />
                </div>
                <span className="text-sm text-foreground">{tip.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Documents Checklist */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Documentos</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {documents.map((doc, i) => (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/30 transition-colors ${i < documents.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${doc.checked ? 'bg-[#3587F2]' : 'border-2 border-muted-foreground/30'}`}>
                  {doc.checked && <Icon name="check" size={14} className="text-white" />}
                </div>
                <span className={`text-sm ${doc.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{doc.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Packing List */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">O que levar na mala</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {packing.map((item, i) => (
              <button
                key={item.id}
                onClick={() => togglePacking(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/30 transition-colors ${i < packing.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${item.checked ? 'bg-[#3587F2]' : 'border-2 border-muted-foreground/30'}`}>
                  {item.checked && <Icon name="check" size={14} className="text-white" />}
                </div>
                <span className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}