import { useState, useEffect } from 'react';
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
    <div className="fixed inset-0 z-[210] flex items-end justify-center" onClick={handleClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />
      <div
        className="relative bg-white rounded-t-[24px] w-full shadow-2xl p-6 pointer-events-auto animate-in slide-in-from-bottom duration-300 flex flex-col z-10"
        style={{ maxHeight: '90vh', fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar with Close Button */}
        <div className="flex items-center justify-end pb-2">
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-[#171F2C] hover:opacity-70 active:scale-95 transition-all flex items-center justify-center -mr-1"
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={2} className="text-[#171F2C]" />
          </button>
        </div>

        {/* Title and Subtitle */}
        <div className="flex flex-col gap-2 pb-2">
          <h2 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] my-0">
            {editingNote ? 'Editar observação' : 'Adicionar observação'}
          </h2>
        </div>

        {/* Form */}
        <div className="pt-2 pb-2 space-y-4 overflow-y-auto flex-1">
          {/* Title Field with Pin Icon: bg #EDEDED, radius 12px, padding 8px 12px, h 54px */}
          <div className="bg-[#EDEDED] rounded-[12px] px-3 py-2 h-[54px] flex items-center gap-3">
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <span className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#949494] block">
                Titulo
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da observação"
                className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#949494] outline-none"
              />
            </div>
          </div>

          {/* Content Field (Textarea): bg #EDEDED, radius 16px, padding 24px, h 181px */}
          <div className="flex flex-col gap-2">
            <div className="bg-[#EDEDED] rounded-[16px] p-6 flex flex-col min-h-[181px]">
              <textarea
                value={content}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setContent(e.target.value);
                  }
                }}
                placeholder="Escreva sua observação aqui..."
                rows={6}
                className="w-full bg-transparent font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#141530] placeholder:text-[#B6B6B6] focus:outline-none resize-none flex-1"
              />
            </div>
            {/* Character counter aligned bottom-left: 12px, color #676767 */}
            <span className="font-['Urbanist'] font-medium text-[12px] leading-[16px] text-[#676767] block text-left">
              {content.length}/500
            </span>
          </div>
        </div>

        {/* Action Button: 48px, bg #9DCC36, radius 16px, 16px bold #141530 */}
        <div className="pt-4 pb-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className={`w-full h-[48px] rounded-[16px] font-['Urbanist'] font-bold text-[16px] leading-[19px] transition-all shadow-xs flex items-center justify-center ${
              title.trim()
                ? 'bg-[#9DCC36] text-[#141530] hover:opacity-95 active:scale-[0.98]'
                : 'bg-[#E5E5E7] text-[#8E8E93] cursor-not-allowed'
            }`}
          >
            {editingNote ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
