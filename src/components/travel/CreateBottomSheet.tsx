import { Icon } from '@/components/ui/Icon';

interface CreateOption {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const createOptions: CreateOption[] = [
  {
    id: 'itinerary',
    icon: 'edit',
    title: 'Criar roteiro do zero',
    description: 'Planeje dia a dia manualmente'
  },
  {
    id: 'video',
    icon: 'video_call',
    title: 'Extrair de vídeo',
    description: 'Transforme vídeos em roteiros ou coleções'
  },
  {
    id: 'collection',
    icon: 'add_box',
    title: 'Criar coleção',
    description: 'Organize seus itens favoritos'
  },
];

interface CreateBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOptionSelect: (optionId: string) => void;
}

export function CreateBottomSheet({ isOpen, onClose, onOptionSelect }: CreateBottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          
          {/* Options */}
          <div className="px-6 space-y-2">
            {createOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onOptionSelect(option.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Icon name={option.icon} size={24} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {option.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
