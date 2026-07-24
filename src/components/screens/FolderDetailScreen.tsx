import { useState } from 'react';
import { Icon } from '../ui/Icon';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { ShareCollectionSheet } from '../travel/ShareCollectionSheet';
import { BackButton } from '@/components/ui/BackButton';

interface Place {
  id: number;
  name: string;
  rating: number;
  reviewCount: string;
  address: string;
  category: string;
  image: string;
  lat: number;
  lng: number;
  filter?: string;
}

interface FolderDetailScreenProps {
  folderId: string;
  folderName: string;
  places: Place[];
  onBack: () => void;
  onRemoveFromFolder: (placeId: number) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddPlace?: () => void;
  onAddVideo?: () => void;
  onCreateFolder?: () => void;
  onShowActivityDetail?: (place: Place) => void;
  onAddToItinerary?: (place: Place) => void;
  onViewMap?: (place: Place) => void;
  onMoveToFolder?: (place: Place) => void;
  onDeletePlace?: (place: Place) => void;
}

export function FolderDetailScreen({
  folderId,
  folderName,
  places,
  onBack,
  onRemoveFromFolder,
  onRenameFolder,
  onDeleteFolder,
  onAddPlace,
  onAddVideo,
  onCreateFolder,
  onShowActivityDetail,
  onAddToItinerary,
  onViewMap,
  onMoveToFolder,
  onDeletePlace,
}: FolderDetailScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Folder actions
  const [folderActionsOpen, setFolderActionsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(folderName);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSelectedIds, setShareSelectedIds] = useState<string[]>([]);
  const [fabSheetOpen, setFabSheetOpen] = useState(false);

  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRename = () => {
    if (renameValue.trim()) {
      onRenameFolder(folderId, renameValue.trim());
      setRenameOpen(false);
    }
  };

  const handleDelete = () => {
    onDeleteFolder(folderId);
    setDeleteConfirmOpen(false);
  };

  return (
    <div className="min-h-screen pb-24 bg-white relative">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white px-5 pt-5 pb-3">
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1
            className="text-xl font-bold leading-tight flex-1 truncate"
            style={{ color: '#1A1C40' }}
          >
            {folderName}
          </h1>
          <button
            onClick={() => setFolderActionsOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-full active:scale-95 transition-all"
            style={{ background: '#F2F2F2' }}
          >
            <Icon name="more_horiz" size={22} style={{ color: '#1A1C40' }} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-5 pt-1 pb-2">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: '#999' }}
          />
          <input
            type="text"
            placeholder="Buscar nessa pasta"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[48px] pl-11 pr-4 text-[14px] font-medium rounded-full outline-none transition-colors"
            style={{
              background: '#F7F7F7',
              color: '#1A1C40',
              border: '1px solid #EBEBEB',
            }}
          />
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-5 pt-2 pb-1">
        <p className="text-[14px] font-medium" style={{ color: '#6B7280' }}>
          {places.length} {places.length === 1 ? 'lugar' : 'lugares'}
        </p>
      </div>

      {/* Places List */}
      <div className="px-5 pt-1">
        {filteredPlaces.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
              <Icon name="folder" size={24} style={{ color: '#999' }} />
            </div>
            <h3 className="text-[16px] font-bold mt-4" style={{ color: '#1A1C40' }}>
              Pasta vazia
            </h3>
            <p className="text-[13px] font-medium text-center mt-1 max-w-[240px]" style={{ color: '#999' }}>
              Mova lugares para esta pasta usando o menu de opções
            </p>
          </div>
        )}
        {filteredPlaces.map((place) => (
          <div
            key={place.id}
            className="flex gap-3.5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => { setSelectedPlace(place); setSheetOpen(true); }}
          >
            <div className="flex-shrink-0">
              <img
                src={place.image}
                alt={place.name}
                className="w-[88px] h-[88px] rounded-2xl object-cover bg-muted"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <h3
                  className="font-bold text-[15px] leading-tight truncate"
                  style={{ color: '#1A1C40' }}
                >
                  {place.name}
                </h3>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Icon name="star" size={13} filled className="text-amber-400" />
                  <span className="text-[12px] font-semibold" style={{ color: '#1A1C40' }}>
                    {place.rating}
                  </span>
                </div>
              </div>
              <p className="text-[13px] font-medium mt-1" style={{ color: '#6B7280' }}>
                {place.address}
              </p>
              <div className="mt-2.5">
                <span
                  className="inline-flex px-3 py-1 text-[11px] font-semibold rounded-full"
                  style={{ background: '#f0f0f0', color: '#555' }}
                >
                  {place.category}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 self-start pt-1">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                onClick={() => { setSelectedPlace(place); setSheetOpen(true); }}
              >
                <Icon name="more_vert" size={22} style={{ color: '#1A1C40' }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Place Options Bottom Sheet */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="bg-white rounded-t-3xl w-full mx-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="w-10" />
            <h2
              className="text-[16px] font-bold text-center flex-1 truncate"
              style={{ color: '#1A1C40' }}
            >
              {selectedPlace?.name}
            </h2>
            <button
              onClick={() => setSheetOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={22} style={{ color: '#1A1C40' }} />
            </button>
          </div>

          <div className="px-6 pb-8">
            {/* Ver detalhes */}
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); if (selectedPlace && onShowActivityDetail) onShowActivityDetail(selectedPlace); }}
            >
              <Icon name="info" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Ver detalhes
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); if (selectedPlace && onAddToItinerary) onAddToItinerary(selectedPlace); }}
            >
              <Icon name="add_circle" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Adicionar ao roteiro
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); if (selectedPlace && onViewMap) onViewMap(selectedPlace); }}
            >
              <Icon name="map" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Ver no mapa
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); if (selectedPlace && onMoveToFolder) onMoveToFolder(selectedPlace); }}
            >
              <Icon name="drive_file_move" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Mover para pasta
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            {selectedPlace?.lat !== undefined && selectedPlace?.lng !== undefined && (
              <>
                <button
                  className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
                  onClick={() => { window.open(`https://maps.google.com/?q=${selectedPlace.lat},${selectedPlace.lng}`, '_blank'); setSheetOpen(false); }}
                >
                  <Icon name="directions" size={22} style={{ color: '#1A1C40' }} />
                  <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                    Como chegar
                  </span>
                  <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
                </button>
                <div className="h-px" style={{ background: '#F0F0F0' }} />
              </>
            )}

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => {
                if (selectedPlace) onRemoveFromFolder(selectedPlace.id);
                setSheetOpen(false);
              }}
            >
              <Icon name="drive_file_move" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Remover da pasta
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); if (selectedPlace && onDeletePlace) onDeletePlace(selectedPlace); }}
            >
              <Icon name="delete" size={22} style={{ color: '#DA501F' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#DA501F' }}>
                Excluir
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Folder Actions Bottom Sheet */}
      <Drawer open={folderActionsOpen} onOpenChange={setFolderActionsOpen}>
        <DrawerContent className="bg-white rounded-t-3xl w-full mx-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-[16px] font-bold" style={{ color: '#1A1C40' }}>
              {folderName}
            </h2>
            <button
              onClick={() => setFolderActionsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="px-6 pb-8">
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => {
                setFolderActionsOpen(false);
                setRenameValue(folderName);
                setTimeout(() => setRenameOpen(true), 300);
              }}
            >
              <Icon name="edit" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Renomear
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => {
                setFolderActionsOpen(false);
                setTimeout(() => setDeleteConfirmOpen(true), 300);
              }}
            >
              <Icon name="delete" size={22} style={{ color: '#DA501F' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#DA501F' }}>
                Excluir pasta
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Rename Bottom Sheet */}
      <Drawer open={renameOpen} onOpenChange={setRenameOpen}>
        <DrawerContent className="bg-white rounded-t-3xl w-full mx-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-[16px] font-bold" style={{ color: '#1A1C40' }}>
              Renomear pasta
            </h2>
            <button
              onClick={() => setRenameOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="px-6 pb-8">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value.slice(0, 250))}
              maxLength={250}
              autoFocus
              className="w-full h-[52px] px-4 text-[16px] font-medium rounded-xl border outline-none transition-colors"
              style={{
                borderColor: renameValue.trim() ? '#9DCC36' : '#EBEBEB',
                color: '#1A1C40',
              }}
              placeholder="Nome da pasta"
            />
            <button
              onClick={handleRename}
              disabled={!renameValue.trim()}
              className="w-full h-[52px] rounded-2xl text-[15px] font-bold mt-4 transition-all active:scale-[0.98]"
              style={{
                background: renameValue.trim() ? '#9DCC36' : '#e8e8e8',
                color: renameValue.trim() ? '#1A1C40' : '#bbb',
              }}
            >
              Salvar
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirm Bottom Sheet */}
      <Drawer open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DrawerContent className="bg-white rounded-t-3xl w-full mx-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-[16px] font-bold" style={{ color: '#1A1C40' }}>
              Excluir pasta
            </h2>
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="px-6 pb-8">
            <p className="text-[14px] font-medium mb-6" style={{ color: '#6B7280' }}>
              Tem certeza que deseja excluir a pasta "{folderName}"? Os lugares serão mantidos na coleção.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 h-[52px] rounded-2xl text-[15px] font-bold border-2 transition-all active:scale-[0.98]"
                style={{ borderColor: '#1A1C40', color: '#1A1C40' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-[52px] rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98]"
                style={{ background: '#9DCC36', color: '#1A1C40' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Floating action button */}
      <div className="fixed right-5 md:right-[calc(50%-215px+20px)] z-30" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <div className="relative flex flex-col items-end gap-3">
          {fabSheetOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFabSheetOpen(false)} />
              <div className="z-50 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {onAddVideo && (
                  <button
                    className="flex items-center gap-3 px-5 py-3 bg-white rounded-full hover:bg-muted/50 transition-colors"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
                    onClick={() => { setFabSheetOpen(false); onAddVideo(); }}
                  >
                    <Icon name="videocam" size={20} style={{ color: '#1A1C40' }} />
                    <span className="text-[14px] font-medium whitespace-nowrap" style={{ color: '#1A1C40' }}>
                      Extrair de vídeo
                    </span>
                  </button>
                )}
                {onAddPlace && (
                  <button
                    className="flex items-center gap-3 px-5 py-3 bg-white rounded-full hover:bg-muted/50 transition-colors"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
                    onClick={() => { setFabSheetOpen(false); onAddPlace(); }}
                  >
                    <Icon name="add_location" size={20} style={{ color: '#1A1C40' }} />
                    <span className="text-[14px] font-medium whitespace-nowrap" style={{ color: '#1A1C40' }}>
                      Adicionar local
                    </span>
                  </button>
                )}
                {onCreateFolder && (
                  <button
                    className="flex items-center gap-3 px-5 py-3 bg-white rounded-full hover:bg-muted/50 transition-colors"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
                    onClick={() => { setFabSheetOpen(false); onCreateFolder(); }}
                  >
                    <Icon name="create_new_folder" size={20} style={{ color: '#1A1C40' }} />
                    <span className="text-[14px] font-medium whitespace-nowrap" style={{ color: '#1A1C40' }}>
                      Criar pasta
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
          <button
            onClick={() => setFabSheetOpen(!fabSheetOpen)}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-50"
            style={{ background: fabSheetOpen ? '#1A1C40' : '#9DCC36' }}
          >
            <Icon
              name={fabSheetOpen ? 'close' : 'add'}
              size={28}
              style={{ color: fabSheetOpen ? '#FFFFFF' : '#1A1C40' }}
            />
          </button>
        </div>
      </div>

      {/* Share Sheet */}
      <ShareCollectionSheet
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        selectedIds={shareSelectedIds}
        onToggle={(id) => setShareSelectedIds(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )}
      />
    </div>
  );
}
