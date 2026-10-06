import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      setDeleting(false);
      toast.error('Não foi possível excluir a conta. Tente novamente.');
      return;
    }
    // A sessão já não existe no servidor; o signOut limpa o estado local.
    await signOut();
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!deleting) onOpenChange(next); }}>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            Sua conta, roteiros e coleções serão apagados. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="btn-outline flex-1"
            style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center disabled:opacity-60"
            style={{ height: '41px', borderRadius: 'var(--radius-button)', background: 'hsl(var(--destructive))', color: 'white', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            {deleting ? 'Excluindo...' : 'Excluir conta'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
