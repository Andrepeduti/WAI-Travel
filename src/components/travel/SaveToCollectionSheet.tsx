import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getUserCollections, saveUserCollection, UserCollection } from '@/components/screens/TripsScreen';
import { toast } from 'sonner';
import { collectionsListKey, collectionsDataKey, readJSON, writeJSON } from '@/lib/userScopedStorage';

export interface SavePlaceData {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
}

function addPlaceToCollection(collectionId: number, place: SavePlaceData) {
  try {
    const dataKey = collectionsDataKey();
    const listKey = collectionsListKey();
    if (!dataKey || !listKey) return;
    const all = readJSON<Record<number, { places: any[]; folders: any[] }>>(dataKey, {});
    const data = all[collectionId] ?? { places: [], folders: [] };

    // Avoid duplicates
    const exists = data.places.some((p: any) => p.name === place.name);
    if (!exists) {
      data.places.push({
        id: Date.now(),
        name: place.name,
        rating: place.rating,
        reviewCount: '–',
        address: '',
        category: place.category,
        image: place.image,
        lat: 0,
        lng: 0,
      });
    }

    all[collectionId] = data;
    writeJSON(dataKey, all);

    // Also update item count in collections metadata
    const cols = readJSON<any[]>(listKey, []);
    const col = cols.find((c: any) => c.id === collectionId);
    if (col) {
      col.itemCount = data.places.length;
      if (place.image && (!col.images || col.images.length < 4)) {
        col.images = col.images || [];
        col.images.push(place.image);
      }
      writeJSON(listKey, cols);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('collection:updated', { detail: { collectionId } }));
    }
  } catch { /* ignore */ }
}

interface SaveToCollectionSheetProps {
  open: boolean;
  onClose: () => void;
  place: SavePlaceData | null;
  onSaved?: (collectionTitle: string) => void;
}

export function SaveToCollectionSheet({ open, onClose, place, onSaved }: SaveToCollectionSheetProps) {
  const [collections] = useState<UserCollection[]>(() => getUserCollections());
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  if (!open || !place) return null;

  const handleSelectCollection = (collection: UserCollection) => {
    addPlaceToCollection(collection.id, place);
    toast.success(`Salvo em "${collection.title}"`, {
      description: place.name,
      duration: 3000,
    });
    onSaved?.(collection.title);
    onClose();
  };

  const handleCreateNew = () => {
    if (!newName.trim()) return;
    const newCollection: UserCollection = {
      id: -(Date.now()),
      title: newName.trim(),
      itemCount: 1,
      isFavorites: false,
      isPrivate: true,
      images: place.image ? [place.image] : [],
      participants: [],
    };
    saveUserCollection(newCollection);
    addPlaceToCollection(newCollection.id, place);
    toast.success(`Salvo em "${newCollection.title}"`, {
      description: place.name,
      duration: 3000,
    });
    onSaved?.(newCollection.title);
    setNewName('');
    setShowNewInput(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[430px] bg-card rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2">
          <h2 className="text-lg font-bold text-foreground">Salvar na coleção</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#F2F2F2' }}
          >
            <Icon name="close" size={18} className="text-foreground" />
          </button>
        </div>

        {/* Place being saved */}
        <div className="px-5 pb-4">
          <p className="text-sm text-muted-foreground">
            Salvando <span className="font-semibold text-foreground">{place.name}</span>
          </p>
        </div>

        {/* Collections list */}
        <div className="px-5 pb-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 220px)' }}>
          <div className="space-y-1">
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => handleSelectCollection(col)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98] hover:bg-muted/50"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {col.images[0] ? (
                    <img src={col.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                      <Icon name="collections_bookmark" size={20} style={{ color: '#1A1C40' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-foreground truncate">{col.title}</p>
                  <p className="text-xs text-muted-foreground">{col.itemCount} {col.itemCount === 1 ? 'lugar' : 'lugares'}</p>
                </div>
                <Icon name="chevron_right" size={18} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Create new */}
        <div className="px-5 pb-6 pt-2">
          {showNewInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da coleção"
                maxLength={250}
                autoFocus
                className="flex-1 h-12 rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
              />
              <button
                onClick={handleCreateNew}
                disabled={!newName.trim()}
                className="h-12 px-5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: '#9DCC36', color: '#141530' }}
              >
                Criar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98] hover:bg-muted/50"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(26, 28, 64, 0.08)' }}
              >
                <Icon name="add" size={22} style={{ color: '#1A1C40' }} />
              </div>
              <p className="font-semibold text-[15px]" style={{ color: '#1A1C40' }}>
                Criar nova coleção
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
