import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface CountryAlbumProps {
  photos: string[];
  countryName: string;
  onAddPhoto?: (url: string) => void;
  onRemovePhoto?: (index: number) => void;
  onReplacePhoto?: (index: number, url: string) => void;
  editable?: boolean;
}

export function CountryAlbum({
  photos,
  countryName,
  onAddPhoto,
  onRemovePhoto,
  onReplacePhoto,
  editable = true,
}: CountryAlbumProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  const readFileAsDataUrl = (file: File, onLoad: (result: string) => void) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        onLoad(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onAddPhoto) return;

    Array.from(files).forEach((file) => {
      readFileAsDataUrl(file, onAddPhoto);
    });

    e.target.value = '';
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replaceIndex === null || !onReplacePhoto) return;

    readFileAsDataUrl(file, (result) => onReplacePhoto(replaceIndex, result));
    setReplaceIndex(null);
    e.target.value = '';
  };

  const handleAddUrl = () => {
    if (urlValue.trim() && onAddPhoto) {
      onAddPhoto(urlValue.trim());
      setUrlValue('');
      setShowUrlInput(false);
    }
  };

  const triggerReplace = (index: number) => {
    setReplaceIndex(index);
    replaceFileInputRef.current?.click();
  };

  return (
    <div className="relative">
      {editable && (
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => addFileInputRef.current?.click()} className="btn-outline px-3 py-2 flex items-center gap-1.5">
            <Icon name="image" size={16} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
              Adicionar foto
            </span>
          </button>
          <button onClick={() => setShowUrlInput((prev) => !prev)} className="btn-outline px-3 py-2 flex items-center gap-1.5">
            <Icon name="link" size={16} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
              Adicionar link
            </span>
          </button>
        </div>
      )}

      {showUrlInput && (
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="Cole o link da imagem..."
            className="form-input flex-1"
            style={{ fontSize: 'var(--text-sm)' }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
          />
          <button onClick={handleAddUrl} className="btn-primary px-4 py-2" style={{ fontSize: 'var(--text-sm)' }}>
            Adicionar
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo}-${i}`}
            className="relative flex-shrink-0 w-[200px] h-[140px] rounded-xl overflow-hidden snap-center"
          >
            <img
              src={photo}
              alt={`${countryName} - foto ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {editable && (
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {onReplacePhoto && (
                  <button
                    onClick={() => triggerReplace(i)}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'hsl(var(--foreground) / 0.72)' }}
                    aria-label={`Substituir foto ${i + 1}`}
                  >
                    <Icon name="edit" size={14} className="text-background" />
                  </button>
                )}

                {onRemovePhoto && (
                  <button
                    onClick={() => onRemovePhoto(i)}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'hsl(var(--foreground) / 0.72)' }}
                    aria-label={`Excluir foto ${i + 1}`}
                  >
                    <Icon name="delete" size={14} className="text-background" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <input
        ref={addFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddFiles}
      />

      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {photos.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
