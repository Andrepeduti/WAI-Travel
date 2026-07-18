import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { useFavorites } from '@/contexts/FavoritesContext';

export interface ItineraryListItem {
  id: number;
  title: string;
  image: string;
  rating: number;
  places: number;
  days: number;
  author: string;
  authorImage: string;
  price: number;
  category?: string;
  /** UUID do roteiro no banco (roteiros recomendados do banco, sem dataset estático) */
  itineraryUuid?: string;
  /** ID do dataset estático (sourceDatasetId) se disponível */
  sourceDatasetId?: number | null;
}

interface ItineraryListScreenProps {
  title: string;
  items: ItineraryListItem[];
  onBack: () => void;
  onItineraryClick: (id: number) => void;
  /** Chamado quando o item tem UUID (roteiro do banco sem dataset estático) */
  onPublicItineraryClick?: (uuid: string, item: ItineraryListItem) => void;
  onGoToExplore?: () => void;
}

export function ItineraryListScreen({ title, items, onBack, onItineraryClick, onPublicItineraryClick, onGoToExplore }: ItineraryListScreenProps) {
  const { toggleFavorite, isFavorite } = useFavorites();

  const toggleSave = (item: ItineraryListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({
      id: item.id,
      title: item.title,
      image: item.image,
      rating: item.rating,
      places: item.places,
      days: item.days,
      author: item.author,
      authorImage: item.authorImage,
      price: item.price,
    } as any);
  };

  return (
    <div className="min-h-screen flex flex-col pb-8" style={{ backgroundColor: '#F2F2F2' }}>
      <header className="sticky top-0 z-20 px-4 pb-3" style={{ backgroundColor: '#F2F2F2' }}>
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1
            className="text-foreground"
            style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}
          >
            {title}
          </h1>
        </div>
      </header>

      <div className="flex-1 px-4 pt-2">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <button
              key={item.itineraryUuid ?? item.id}
              onClick={() => {
                if (item.itineraryUuid && item.sourceDatasetId == null && onPublicItineraryClick) {
                  onPublicItineraryClick(item.itineraryUuid, item);
                } else if (item.sourceDatasetId != null) {
                  onItineraryClick(item.sourceDatasetId);
                } else {
                  onItineraryClick(item.id);
                }
              }}
              className="w-full flex flex-col text-left bg-card rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}
            >
              <div className="relative w-full aspect-[16/6] overflow-hidden p-2">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-xl" />
                {item.category && (
                  <div className="absolute top-4 left-4 flex items-center gap-1 bg-white rounded-full pl-2 pr-2.5 py-1 shadow-sm">
                    <span className="text-[11px] font-semibold text-foreground">{item.category}</span>
                  </div>
                )}
                <button
                  onClick={(e) => toggleSave(item, e)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
                >
                  <Icon
                    name="favorite"
                    size={18}
                    filled={isFavorite(item.id)}
                    className={isFavorite(item.id) ? 'text-florida' : ''}
                    style={!isFavorite(item.id) ? { color: '#1E293B' } : undefined}
                  />
                </button>
              </div>
              <div className="px-4 pt-1 pb-4 flex flex-col gap-2">
                <h3 className="font-bold text-[15px] text-foreground leading-tight">{item.title}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Icon name="star" size={14} className="text-[#F2B90C]" />
                    <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="location_on" size={14} style={{ color: '#1E293B' }} />
                    <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.places} locais</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="schedule" size={14} style={{ color: '#1E293B' }} />
                    <span className="text-[12px] font-medium" style={{ color: '#171F2C' }}>{item.days} dias</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <img src={item.authorImage} alt={item.author} className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-[13px] font-medium" style={{ color: '#171F2C' }}>{item.author}</span>
                  </div>
                  <span className="text-[15px] font-bold text-foreground">R$ {item.price}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {onGoToExplore && items.length > 0 && (
          <div className="mt-10 pt-8 border-t border-border/50 flex flex-col items-center text-center px-4 pb-4">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-4">
              <Icon name="explore" size={26} className="text-primary" />
            </div>
            <h3 className="text-[17px] font-bold text-foreground mb-2">Você chegou ao fim</h3>
            <p className="text-[13px] text-muted-foreground max-w-[300px] mb-5 leading-relaxed">
              Essas são as opções selecionadas para você. Quer descobrir mais? Explore todos os roteiros disponíveis.
            </p>
            <button
              onClick={onGoToExplore}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-semibold active:scale-95 transition-transform"
            >
              <Icon name="search" size={18} />
              Explorar mais roteiros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
