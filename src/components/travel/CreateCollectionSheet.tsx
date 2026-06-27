import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ShareCollectionSheet, mockPeople } from './ShareCollectionSheet';

interface CreateCollectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, sharedWithIds: string[]) => void;
  hideShare?: boolean;
}

export function CreateCollectionSheet({ isOpen, onClose, onSubmit, hideShare = false }: CreateCollectionSheetProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = name.trim().length > 0;
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit(name.trim(), sharedWith);
    setName('');
    setSharedWith([]);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setSharedWith([]);
    onClose();
  };

  const handleToggleShare = (id: string) => {
    setSharedWith(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clearName = () => {
    setName('');
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={handleClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-white rounded-t-[20px] w-full max-w-[430px] flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-[4px] bg-muted-foreground/20 rounded-full" />
          </div>

          {/* Header — Title + Close */}
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-[17px] font-bold text-foreground">
              Nova coleção
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors"
            >
              <Icon name="close" size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pt-5 pb-4 space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label
                className="text-[13px] font-semibold tracking-wide"
                style={{ color: '#999' }}
              >
                Nome da coleção
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ex: Eurotrip 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[52px] px-4 pr-10 text-[16px] font-medium rounded-xl border transition-colors outline-none bg-white"
                  style={{
                    borderColor: name ? '#1A1C40' : '#e5e5e5',
                    color: '#1A1C40',
                    caretColor: '#1A1C40',
                  }}
                />
                {name && (
                  <button
                    onClick={clearName}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center"
                  >
                    <Icon name="close" size={14} className="text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Share option */}
            {!hideShare && (
            <button
              className="w-full flex items-center gap-4 py-3 rounded-xl transition-colors hover:bg-muted/40"
              onClick={() => setShowShareSheet(true)}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(26, 28, 64, 0.08)' }}
              >
                <Icon name="person_add" size={18} style={{ color: '#1A1C40' }} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="block text-[14px] font-semibold" style={{ color: '#1A1C40' }}>
                  Compartilhar com outras pessoas
                </span>
                {sharedWith.length > 0 ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex -space-x-2">
                      {sharedWith.slice(0, 5).map(id => {
                        const person = mockPeople.find(p => p.id === id);
                        if (!person) return null;
                        return person.photo ? (
                          <img
                            key={id}
                            src={person.photo}
                            alt={person.name}
                            className="w-7 h-7 rounded-full border-2 border-white object-cover"
                          />
                        ) : (
                          <div
                            key={id}
                            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: person.color }}
                          >
                            {person.initials}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: '#999' }}>
                      {sharedWith.length === 1
                        ? mockPeople.find(p => p.id === sharedWith[0])?.name
                        : `${sharedWith.length} pessoas`}
                    </span>
                  </div>
                ) : (
                  <span className="block text-[12px] font-medium" style={{ color: '#999' }}>
                    Convide pessoas para salvar itens juntos
                  </span>
                )}
              </div>
              <Icon name="chevron_right" size={18} style={{ color: '#ccc' }} className="ml-auto flex-shrink-0" />
            </button>
            )}
          </div>

          {/* Footer Button */}
          <div
            className="px-6 pt-2"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
          >
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="w-full h-[52px] rounded-2xl text-[15px] font-bold transition-all duration-200 active:scale-[0.98]"
              style={{
                background: isValid ? '#9DCC36' : '#e8e8e8',
                color: isValid ? '#1A1C40' : '#bbb',
                boxShadow: isValid ? '0 4px 16px rgba(157, 204, 54, 0.3)' : 'none',
              }}
            >
              Criar coleção
            </button>
          </div>
        </div>
      </div>

      {!hideShare && (
        <ShareCollectionSheet
          isOpen={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          selectedIds={sharedWith}
          onToggle={handleToggleShare}
        />
      )}
    </>
  );
}
