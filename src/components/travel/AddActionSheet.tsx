import { Icon } from '@/components/ui/Icon';

interface AddActionSheetProps {
  open: boolean;
  onClose: () => void;
  onAddPlace: () => void;
  onAddNote: () => void;
}

export function AddActionSheet({ open, onClose, onAddPlace, onAddNote }: AddActionSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl px-5 pt-4 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
        <h3 className="text-[17px] font-bold text-foreground mb-5">Adicionar ao dia</h3>

        <div className="space-y-2">
          <button
            onClick={() => { onClose(); onAddPlace(); }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 active:scale-[0.98] transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="location_on" size={22} className="text-primary" />
            </div>
            <div className="text-left">
              <span className="text-[15px] font-semibold text-foreground block">Adicionar lugar</span>
              <span className="text-[12px] text-muted-foreground">Buscar por restaurantes, museus, pontos turísticos...</span>
            </div>
            <Icon name="chevron_right" size={20} className="text-muted-foreground ml-auto" />
          </button>

          <button
            onClick={() => { onClose(); onAddNote(); }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 active:scale-[0.98] transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-accent/60 flex items-center justify-center">
              <Icon name="description" size={22} className="text-foreground" />
            </div>
            <div className="text-left">
              <span className="text-[15px] font-semibold text-foreground block">Adicionar anotação</span>
              <span className="text-[12px] text-muted-foreground">Dicas, lembretes, observações...</span>
            </div>
            <Icon name="chevron_right" size={20} className="text-muted-foreground ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}
