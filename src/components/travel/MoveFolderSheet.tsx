import { Icon } from '@/components/ui/Icon';

interface Folder {
  id: string;
  name: string;
  placeIds: number[];
}

interface MoveFolderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onSelect: (folderId: string) => void;
  placeName?: string;
  selectedCount?: number;
  onCreateFolder?: () => void;
}

export function MoveFolderSheet({ isOpen, onClose, folders, onSelect, placeName, selectedCount, onCreateFolder }: MoveFolderSheetProps) {
  if (!isOpen) return null;

  const isMulti = (selectedCount ?? 0) > 1;
  const subtitle = isMulti
    ? `Selecione a pasta para ${selectedCount} lugares`
    : placeName
      ? `Selecione a pasta para "${placeName}"`
      : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-white rounded-t-[20px] w-full w-full flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-[4px] bg-muted-foreground/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-[17px] font-bold text-foreground">
              Mover para pasta
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors"
            >
              <Icon name="close" size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-[13px] font-medium text-muted-foreground px-6">
              {subtitle}
            </p>
          )}

          {/* Folder list */}
          <div
            className="px-6 pt-4"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
          >
            {folders.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: '#F2F2F2' }}
                >
                  <Icon name="folder" size={22} style={{ color: '#999' }} />
                </div>
                <p className="text-[14px] font-medium mt-3" style={{ color: '#999' }}>
                  Nenhuma pasta criada ainda
                </p>
                {onCreateFolder && (
                  <button
                    onClick={() => {
                      onClose();
                      onCreateFolder();
                    }}
                    className="w-full mt-4 h-[52px] rounded-2xl text-[15px] font-bold transition-all duration-200 active:scale-[0.98]"
                    style={{
                      background: '#1A1C40',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 16px rgba(26, 28, 64, 0.2)',
                    }}
                  >
                    Criar nova pasta
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1 pb-2">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => onSelect(folder.id)}
                    className="w-full flex items-center gap-4 py-3.5 px-2 rounded-xl active:bg-muted/30 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(26, 28, 64, 0.08)' }}
                    >
                      <Icon name="folder" size={18} style={{ color: '#1A1C40' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="block text-[15px] font-semibold" style={{ color: '#1A1C40' }}>
                        {folder.name}
                      </span>
                      <span className="block text-[12px] font-medium" style={{ color: '#999' }}>
                        {folder.placeIds.length} {folder.placeIds.length === 1 ? 'lugar' : 'lugares'}
                      </span>
                    </div>
                    <Icon name="chevron_right" size={18} style={{ color: '#ccc' }} />
                  </button>
                ))}

                {/* Create folder option at bottom of list */}
                {onCreateFolder && (
                  <button
                    onClick={() => {
                      onClose();
                      onCreateFolder();
                    }}
                    className="w-full flex items-center gap-4 py-3.5 px-2 rounded-xl active:bg-muted/30 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(26, 28, 64, 0.08)' }}
                    >
                      <Icon name="add" size={20} style={{ color: '#1A1C40' }} />
                    </div>
                    <span className="text-[15px] font-semibold" style={{ color: '#1A1C40' }}>
                      Criar nova pasta
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
