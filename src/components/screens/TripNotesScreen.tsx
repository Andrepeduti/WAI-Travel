import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FileText } from 'lucide-react';
import { AddTripNoteSheet } from '@/components/travel/AddTripNoteSheet';
import { BackButton } from '@/components/ui/BackButton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
  { icon: 'edit', label: 'Editar nota' },
  { icon: 'content_copy', label: 'Duplicar nota' },
  { icon: 'share', label: 'Compartilhar' },
  { icon: 'delete', label: 'Excluir nota', destructive: true },
];

export function TripNotesScreen({ onBack, destination, notes: externalNotes, onNotesChange }: TripNotesScreenProps) {
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

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-4 pt-5 pb-3">
        <div className="flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Notas</h1>
        </div>
      </header>

      {notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
            <FileText size={30} strokeWidth={1.5} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground my-0 mt-[24px] mb-2">Nenhuma nota</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[280px]">
            Adicione notas para organizar dicas e informações da sua viagem.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4" style={{ paddingBottom: '120px' }}>
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl bg-card border border-border/40 p-4 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <img
                        src={note.authorImage}
                        alt={note.author}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {note.author}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold leading-snug mb-1 line-clamp-1">
                      {note.title}
                    </h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                      {note.summary}
                    </p>
                  </div>
                  <button
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors mt-0.5"
                    onClick={() => {
                      setSelectedNote(note);
                      setShowActions(true);
                    }}
                  >
                    <Icon name="more_vert" size={18} style={{ color: '#1A1C40' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed bottom: add button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full w-full z-30 bg-background">
        <div className="px-6 pb-8 pt-3 safe-bottom">
          <button
            onClick={() => setShowAddNote(true)}
            className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
            style={{ background: '#9DCC36', color: '#1A1C40' }}
          >
            <Icon name="add" size={20} />
            Adicionar nota
          </button>
        </div>
      </div>

      {/* Actions Bottom Sheet */}
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base text-left">
              {selectedNote?.title}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-1">
            {noteActions.map((action) => (
              <button
                key={action.label}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-muted/60 ${
                  action.destructive ? 'text-destructive' : 'text-foreground'
                }`}
                onClick={() => {
                  if (!selectedNote) return;

                  if (action.icon === 'edit') {
                    setEditingNote(selectedNote);
                    setShowAddNote(true);
                    setShowActions(false);
                    return; // keep selectedNote so we know which one to update
                  }

                  if (action.icon === 'content_copy') {
                    const newNote = { ...selectedNote, id: Date.now().toString(), title: `${selectedNote.title} (Cópia)` };
                    setNotes(prev => [newNote, ...prev]);
                  } else if (action.destructive) {
                    setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
                  }
                  
                  setShowActions(false);
                  setSelectedNote(null);
                }}
              >
                <Icon
                  name={action.icon}
                  size={20}
                  className={action.destructive ? 'text-destructive' : 'text-muted-foreground'}
                />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Note Sheet */}
      <AddTripNoteSheet
        open={showAddNote}
        onClose={() => {
          setShowAddNote(false);
          setEditingNote(null);
          setSelectedNote(null);
        }}
        editingNote={editingNote ? { title: editingNote.title, content: editingNote.summary } : null}
        onSave={(note) => {
          if (editingNote) {
            setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, title: note.title, summary: note.content } : n));
          } else {
            const newNote: TripNote = {
              id: Date.now().toString(),
              author: 'Você',
              authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
              title: note.title || 'Sem título',
              summary: note.content || '',
            };
            setNotes(prev => [newNote, ...prev]);
          }
        }}
      />
    </div>
  );
}
