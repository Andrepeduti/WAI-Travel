import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

interface AIHistoryScreenProps {
  onBack: () => void;
  onSelectChat: (id: string) => void;
}

export function AIHistoryScreen({ onBack }: AIHistoryScreenProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'hsl(var(--divider))' }}
      >
        <BackButton onClick={onBack} />
        <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Histórico de conversas
        </span>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'hsl(260 60% 94%)' }}
        >
          <Icon name="history" size={26} style={{ color: 'hsl(260 50% 55%)' }} />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
          Sem conversas salvas
        </h3>
        <p className="text-sm max-w-[260px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Em breve você poderá retomar conversas antigas com o assistente por aqui.
        </p>
      </div>
    </div>
  );
}
