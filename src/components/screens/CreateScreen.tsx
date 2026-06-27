import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { SuccessToast } from '@/components/travel/SuccessToast';

interface CreateScreenProps {
  onClose: () => void;
}

const suggestedDestinations = [
  { id: 1, name: 'Praga', country: 'República Tcheca', emoji: '🏰' },
  { id: 2, name: 'Budapeste', country: 'Hungria', emoji: '🏛️' },
  { id: 3, name: 'Viena', country: 'Áustria', emoji: '🎻' },
  { id: 4, name: 'Cracóvia', country: 'Polônia', emoji: '🏰' },
];

interface TripDay {
  id: number;
  title: string;
  places: string[];
}

export function CreateScreen({ onClose }: CreateScreenProps) {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [tripData, setTripData] = useState({
    destination: '',
    duration: 7,
    style: [] as string[],
  });
  const [days, setDays] = useState<TripDay[]>([
    { id: 1, title: 'Dia 1', places: [] },
  ]);

  const styles = [
    { id: 'culture', emoji: '🏛️', label: 'Cultura' },
    { id: 'gastronomy', emoji: '🍷', label: 'Gastronomia' },
    { id: 'adventure', emoji: '🏔️', label: 'Aventura' },
    { id: 'relaxation', emoji: '🧘', label: 'Relaxamento' },
    { id: 'romantic', emoji: '💕', label: 'Romântico' },
    { id: 'photography', emoji: '📸', label: 'Fotografia' },
  ];

  const toggleStyle = (styleId: string) => {
    setTripData((prev) => ({
      ...prev,
      style: prev.style.includes(styleId)
        ? prev.style.filter((s) => s !== styleId)
        : [...prev.style, styleId],
    }));
  };

  const addDay = () => {
    const newDay: TripDay = {
      id: days.length + 1,
      title: `Dia ${days.length + 1}`,
      places: [],
    };
    setDays([...days, newDay]);
  };

  const removeDay = (id: number) => {
    if (days.length > 1) {
      setDays(days.filter((day) => day.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-5 py-4 flex items-center justify-between">
          <button onClick={onClose} className="btn-icon shadow-none bg-transparent">
            <Icon name="close" size={20} />
          </button>
          <h1 className="text-lg font-bold">Criar Roteiro</h1>
          <div className="w-10" />
        </div>

        {/* Progress Bar */}
        <div className="px-5 pb-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Passo {step} de 3</p>
        </div>
      </header>

      {/* Content */}
      <main className="px-5 pt-6 pb-32 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Para onde você vai?</h2>
            <p className="text-muted-foreground mb-6">
              Escolha o destino principal da sua viagem
            </p>

            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-4 bg-secondary rounded-2xl mb-6">
              <Icon name="location_on" size={20} className="text-muted-foreground" />
              <input
                type="text"
                value={tripData.destination}
                onChange={(e) => setTripData({ ...tripData, destination: e.target.value })}
                placeholder="Digite o destino..."
                className="flex-1 bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Suggested Destinations */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3">Sugestões</p>
              <div className="grid grid-cols-2 gap-3">
                {suggestedDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => setTripData({ ...tripData, destination: dest.name })}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      tripData.destination === dest.name
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'card-elevated hover:shadow-elevated'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{dest.emoji}</span>
                    <h4 className="font-semibold">{dest.name}</h4>
                    <p className="text-xs text-muted-foreground">{dest.country}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Detalhes da viagem</h2>
            <p className="text-muted-foreground mb-6">
              Configure a duração e estilo
            </p>

            {/* Duration */}
            <div className="mb-8">
              <label className="text-sm font-semibold mb-3 block">Duração (dias)</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTripData({ ...tripData, duration: Math.max(1, tripData.duration - 1) })}
                  className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl font-bold"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-bold">{tripData.duration}</span>
                  <p className="text-sm text-muted-foreground">dias</p>
                </div>
                <button
                  onClick={() => setTripData({ ...tripData, duration: Math.min(30, tripData.duration + 1) })}
                  className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Travel Style */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Estilo de viagem</label>
              <div className="grid grid-cols-3 gap-2">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => toggleStyle(style.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      tripData.style.includes(style.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <span className="text-xl mb-1 block">{style.emoji}</span>
                    <span className="text-xs font-medium">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Monte seu roteiro</h2>
            <p className="text-muted-foreground mb-6">
              Organize os dias da sua viagem
            </p>

            {/* AI Suggestion Banner */}
            <button className="w-full p-4 ai-gradient rounded-2xl text-white text-left mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon name="auto_awesome" size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold">Gerar com IA</h4>
                  <p className="text-sm text-white/80">Deixe a IA sugerir lugares</p>
                </div>
                <Icon name="chevron_right" size={20} className="text-white" />
              </div>
            </button>

            {/* Days List */}
            <div className="space-y-3 mb-4">
              {days.map((day) => (
                <div key={day.id} className="card-elevated p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon name="more_vert" size={16} className="text-muted-foreground" />
                      <span className="font-semibold">{day.title}</span>
                    </div>
                    {days.length > 1 && (
                      <button
                        onClick={() => removeDay(day.id)}
                        className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center"
                      >
                        <Icon name="delete" size={16} className="text-destructive" />
                      </button>
                    )}
                  </div>
                  
                  <button className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
                    <Icon name="add" size={16} />
                    Adicionar lugar
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addDay}
              className="w-full py-3 bg-secondary rounded-xl text-sm font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1"
            >
              <Icon name="add" size={16} />
              Adicionar dia
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background border-t border-border safe-bottom">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex-1"
            >
              Voltar
            </button>
          )}
          <button
            onClick={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                setIsCreating(true);
                setTimeout(() => {
                  setIsCreating(false);
                  setShowSuccessToast(true);
                }, 2000);
              }
            }}
            disabled={(step === 1 && !tripData.destination) || isCreating}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            style={{
              background: (step === 1 && !tripData.destination) ? '#D1D5DB' : '#9DCC36',
              color: (step === 1 && !tripData.destination) ? '#FFFFFF' : '#1A1C40',
            }}
          >
            {step === 3 && isCreating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Criando roteiro...
              </>
            ) : (
              step === 3 ? 'Criar Roteiro' : 'Continuar'
            )}
          </button>
        </div>
      </div>
      <SuccessToast 
        isVisible={showSuccessToast} 
        onClose={() => {
          setShowSuccessToast(false);
          onClose();
        }} 
      />
    </div>
  );
}
