import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { X } from 'lucide-react';

interface AddTripNoteSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string }) => void;
  editingNote?: { title: string; content: string } | null;
}

export function AddTripNoteSheet({ open, onClose, onSave, editingNote }: AddTripNoteSheetProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open && editingNote) {
      setTitle(editingNote.title);
      setContent(editingNote.content);
    } else if (!open) {
      setTitle('');
      setContent('');
    }
  }, [open, editingNote]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), content: content.trim() });
    setTitle('');
    setContent('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210]" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-foreground">{editingNote ? 'Editar nota' : 'Nova nota'}</h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#F2F2F2' }}
          >
            <Icon name="close" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Melhores restaurantes em Paris"
              className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed"
              style={{ background: '#F2F2F2' }}
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Conteúdo
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva sua nota aqui..."
              rows={6}
              className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
              style={{ background: '#F2F2F2' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-border/40">
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition-colors disabled:bg-[#D1D5DB] disabled:text-white"
            style={title.trim() ? { backgroundColor: '#9DCC36', color: '#141530' } : undefined}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
