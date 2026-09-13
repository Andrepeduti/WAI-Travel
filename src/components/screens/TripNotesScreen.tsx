import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, GripVertical, CheckCircle2 } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { LuggageIllustration } from '@/components/ui/LuggageIllustration';
import { AddTripNoteSheet } from '@/components/travel/AddTripNoteSheet';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';
import { Reorder, useDragControls } from 'framer-motion';

export interface TripNote {
  id: string;
  author: string;
  authorImage: string;
  title: string;
  summary: string;
}

interface TripNotesScreenProps {
  onBack: () => void;
  destination?: string;
  notes?: TripNote[];
  onNotesChange?: (notes: TripNote[]) => void;
}

const noteActions = [
  { icon: 'edit', label: 'Editar' },
  { icon: 'content_copy', label: 'Duplicar' },
  { icon: 'delete', label: 'Excluir', destructive: true },
];

const NoteItemComponent = ({ note, currentUser, onClick }: { note: TripNote, currentUser: any, onClick: () => void }) => {
  const dragControls = useDragControls();
  const isCurrentUserAuthor = note.author === 'Você' || note.author === currentUser.name;
  const authorAvatar =
    isCurrentUserAuthor || !note.authorImage || note.authorImage.includes('photo-1494790108377')
      ? currentUser.avatar || ''
      : note.authorImage;

  return (
    <Reorder.Item
      value={note}
      dragListener={true}
      className="bg-white rounded-[16px] p-6 border border-[#EBEBEB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-4 w-full"
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 10 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          
          <div 
            className="flex-1 min-w-0 flex flex-col gap-2 cursor-pointer" 
            onClick={onClick}
          >
            <h3 className="font-['Urbanist'] font-semibold text-[16px] leading-[19px] text-[#141530] line-clamp-1 my-0">
              {note.title}
            </h3>
            {note.summary ? (
              <p className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767] line-clamp-2 my-0">
                {note.summary}
              </p>
            ) : null}
          </div>
        </div>
        
        <ChevronRight 
          size={20} 
          strokeWidth={1.5} 
          className="text-[#7F7F7F] shrink-0 mt-0.5 cursor-pointer" 
          onClick={onClick}
        />
      </div>

      <div className="flex items-center gap-2 cursor-pointer" onClick={onClick}>
        <UserAvatar
          src={authorAvatar}
          alt={note.author}
          size={26}
          className="w-[26px] h-[26px] rounded-full object-cover shrink-0"
        />
        <span className="font-['Urbanist'] font-medium text-[14px] leading-[17px] text-[#676767]">
          {isCurrentUserAuthor ? 'Criado por você' : `Criado por ${note.author}`}
        </span>
      </div>
    </Reorder.Item>
  );
};

export function TripNotesScreen({ onBack, notes: externalNotes, onNotesChange }: TripNotesScreenProps) {
  const { user: currentUser } = useCurrentUser();
  const [internalNotes, setInternalNotes] = useState<TripNote[]>([]);
  const notes = externalNotes ?? internalNotes;
  const setNotes = (updater: TripNote[] | ((prev: TripNote[]) => TripNote[])) => {
    const newVal = typeof updater === 'function' ? updater(notes) : updater;
    if (onNotesChange) onNotesChange(newVal);
    else setInternalNotes(newVal);
  };
  const [selectedNote, setSelectedNote] = useState<TripNote | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<TripNote | null>(null);

  const isEmpty = notes.length === 0;

  return (
    <div
      className="min-h-[100dvh] bg-[#F3F3F3] flex flex-col relative"
      style={{ fontFamily: 'var(--font-family-primary, "Urbanist", sans-serif)' }}
    >


      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#F3F3F3] px-6 pt-5 pb-3">
        <div
          className="flex items-center gap-3"
          style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 8px)' }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="p-1 -ml-1 text-[#171F2C] hover:opacity-70 active:scale-95 transition-all flex items-center justify-center"
          >
            <ChevronLeft size={22} strokeWidth={2.5} className="text-[#171F2C]" />
          </button>
          <h1 className="font-['Urbanist'] font-bold text-[20px] leading-[24px] text-[#171F2C] my-0">
            Observações
          </h1>
        </div>
      </header>

      {/* Main Content */}
      {isEmpty ? (
        /* Empty State */
        <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-12 text-center">
          <div className="w-full max-w-[345px] flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-4">
              <LuggageIllustration width={119} height={113} />

              <div className="flex flex-col items-center gap-2 max-w-[293px]">
                <h2 className="font-['Urbanist'] font-semibold text-[18px] leading-[22px] text-[#171F2C] my-0">
                  Nenhuma observação adicionada
                </h2>

                <p className="font-['Urbanist'] font-medium text-[14px] leading-[16px] text-[#7F7F7F] my-0">
                  Anote informações importantes para consultar durante a viagem.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddNote(true)}
              className="w-[146px] h-[48px] rounded-[16px] border border-[#141530] bg-transparent text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] active:scale-[0.98] transition-all flex items-center justify-center hover:bg-[#141530]/5"
            >
              Adicionar observação
            </button>
          </div>
        </main>
      ) : (
        /* Filled State (Notes list) */
        <main className="flex-1 overflow-y-auto px-6 pt-0 pb-[120px] space-y-4 w-full">
          <Reorder.Group axis="y" values={notes} onReorder={setNotes} className="flex flex-col gap-4">
            {notes.map((note) => (
              <NoteItemComponent 
                key={note.id} 
                note={note} 
                currentUser={currentUser} 
                onClick={() => {
                  setSelectedNote(note);
                  setShowActions(true);
                }} 
              />
            ))}
          </Reorder.Group>
        </main>
      )}

      {/* Fixed Bottom Button */}
      {!isEmpty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#F3F3F3] border-t border-[#B6B6B6] px-4 py-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAddNote(true)}
            className="w-[361px] max-w-full h-[48px] rounded-[16px] bg-[#9DCC36] text-[#141530] font-['Urbanist'] font-bold text-[16px] leading-[19px] active:scale-[0.98] transition-all flex items-center justify-center pointer-events-auto"
          >
            Adicionar observação
          </button>
        </div>
      )}

      {/* Actions Bottom Sheet */}
      {showActions && selectedNote && (
        <div className="fixed inset-0 z-50 flex justify-center font-['Urbanist',sans-serif]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => {
              setShowActions(false);
              setSelectedNote(null);
            }}
          />

          <div
            className="relative w-full mt-auto rounded-t-[24px] bg-[#FFFFFF] shadow-2xl flex flex-col items-start p-0 animate-in slide-in-from-bottom duration-300 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top close button bar */}
            <div className="w-full flex items-center justify-end px-6 pt-6 pb-3">
              <button
                type="button"
                onClick={() => {
                  setShowActions(false);
                  setSelectedNote(null);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all text-[#000000]"
                aria-label="Fechar"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Content area: Title and actions */}
            <div className="w-full px-6 pb-8 flex flex-col gap-6">
              <h3 className="font-['Urbanist'] font-semibold text-[22px] leading-[26px] text-[#171F2C] my-0">
                {selectedNote.title}
              </h3>

              <div className="flex flex-col gap-5 w-full">
                {noteActions.map((action, idx) => (
                  <div key={action.label} className="w-full flex flex-col gap-5">
                    <button
                      className="w-full flex items-center gap-3 text-left group active:opacity-70 transition-opacity"
                      onClick={() => {
                        if (action.icon === 'edit') {
                          setEditingNote(selectedNote);
                          setShowAddNote(true);
                          setShowActions(false);
                          return;
                        }

                        if (action.icon === 'content_copy') {
                          const newNote = {
                            ...selectedNote,
                            id: Date.now().toString(),
                            title: `${selectedNote.title} (Cópia)`,
                          };
                          setNotes((prev) => [newNote, ...prev]);
                          toast.success('Observação duplicada com sucesso!');
                        } else if (action.destructive) {
                          const noteIndex = notes.findIndex(n => n.id === selectedNote.id);
                          if (noteIndex !== -1) {
                            setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
                            toast.success('Observação excluída', {
                              action: {
                                label: 'Desfazer',
                                onClick: () => {
                                  setNotes((prev) => {
                                    const arr = [...prev];
                                    arr.splice(noteIndex, 0, selectedNote);
                                    return arr;
                                  });
                                }
                              }
                            });
                          }
                        }

                        setShowActions(false);
                        setSelectedNote(null);
                      }}
                    >
                      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        <Icon
                          name={action.icon}
                          size={20}
                          className={action.destructive ? 'text-destructive' : 'text-[#141530]'}
                        />
                      </div>
                      <span className={`flex-1 font-['Urbanist'] font-medium text-[16px] leading-[19px] ${
                        action.destructive ? 'text-destructive' : 'text-[#141530]'
                      }`}>
                        {action.label}
                      </span>
                      <ChevronRight 
                        size={20} 
                        strokeWidth={1.5} 
                        className={action.destructive ? 'text-destructive' : 'text-[#7F7F7F]'} 
                      />
                    </button>
                    {idx < noteActions.length - 1 && (
                      <div className="w-full h-0 border-b border-[#F2F2F2]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Note Sheet */}
      <AddTripNoteSheet
        open={showAddNote}
        onClose={() => {
          setShowAddNote(false);
          setEditingNote(null);
          setSelectedNote(null);
        }}
        editingNote={editingNote ? { title: editingNote.title, content: editingNote.summary } : null}
        onSave={(note) => {
          try {
            if (editingNote) {
              setNotes((prev) =>
                prev.map((n) =>
                  n.id === editingNote.id ? { ...n, title: note.title, summary: note.content } : n,
                ),
              );
              toast.success('Observação atualizada com sucesso!');
            } else {
              const newNote: TripNote = {
                id: Date.now().toString(),
                author: currentUser.name || 'Você',
                authorImage: currentUser.avatar || '',
                title: note.title || 'Sem título',
                summary: note.content || '',
              };
              setNotes((prev) => [newNote, ...prev]);
              toast.success('Observação salva com sucesso!');
            }
          } catch (err) {
            toast.error('Erro ao salvar a observação. Tente novamente.');
          }
          setShowAddNote(false);
          setEditingNote(null);
          setSelectedNote(null);
        }}
      />
    </div>
  );
}
