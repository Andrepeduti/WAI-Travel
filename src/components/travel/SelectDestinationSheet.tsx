import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

type DestinationType = 'itinerary' | 'collection';

interface ExistingItem {
  id: string;
  name: string;
  destination?: string;
  itemCount?: number;
  coverImage?: string;
}

interface SelectDestinationSheetProps {
  isOpen: boolean;
  type: DestinationType;
  onClose: () => void;
  onBack: () => void;
  onSelectExisting: (item: ExistingItem) => void;
  onCreateNew: () => void;
}

// Mock data - would come from API/state in real app
const mockItineraries: ExistingItem[] = [
  { id: '1', name: '7 dias em Paris', destination: 'Paris, França', coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop' },
  { id: '2', name: 'Roteiro Japão 2024', destination: 'Tokyo, Japão', coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&h=200&fit=crop' },
  { id: '3', name: 'Aventura na Tailândia', destination: 'Bangkok, Tailândia', coverImage: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=200&h=200&fit=crop' },
];

const mockCollections: ExistingItem[] = [
  { id: '1', name: 'Restaurantes em Paris', itemCount: 12 },
  { id: '2', name: 'Cafés em Tokyo', itemCount: 8 },
  { id: '3', name: 'Praias do Brasil', itemCount: 15 },
];

export function SelectDestinationSheet({ 
  isOpen, 
  type, 
  onClose, 
  onBack, 
  onSelectExisting, 
  onCreateNew 
}: SelectDestinationSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const items = type === 'itinerary' ? mockItineraries : mockCollections;
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const title = type === 'itinerary' ? 'Selecionar Roteiro' : 'Selecionar Coleção';
  const createLabel = type === 'itinerary' ? 'Criar novo roteiro' : 'Criar nova coleção';
  const emptyLabel = type === 'itinerary' ? 'Nenhum roteiro encontrado' : 'Nenhuma coleção encontrada';
  const iconName = type === 'itinerary' ? 'description' : 'bookmark';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[60] transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[70] flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="px-6 pb-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
            <BackButton onClick={onBack} />
            <h2 className="text-xl font-bold text-foreground my-0 mt-[24px]">{title}</h2>
          </div>

          {/* Search */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Icon 
                name="search" 
                size={20} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" 
              />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 text-base rounded-2xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 flex-1 overflow-y-auto">
            {/* Create New Option */}
            <button
              onClick={onCreateNew}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-primary/30 hover:bg-primary/5 transition-colors mb-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="add" size={24} className="text-primary" />
              </div>
              <div className="text-left">
                <span className="text-base font-semibold text-foreground">{createLabel}</span>
                <p className="text-sm text-muted-foreground">Começar do zero</p>
              </div>
            </button>

            {/* Existing Items */}
            {filteredItems.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {type === 'itinerary' ? 'Seus roteiros' : 'Suas coleções'}
                </span>
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectExisting(item)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon name={iconName} size={22} className="text-foreground" />
                        </div>
                      )}
                      <div className="text-left flex-1">
                        <span className="text-base font-semibold text-foreground">{item.name}</span>
                        <p className="text-sm text-muted-foreground">
                          {item.destination || `${item.itemCount} itens`}
                        </p>
                      </div>
                      <Icon name="chevron_right" size={20} className="text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name={iconName} size={40} className="text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">{emptyLabel}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
