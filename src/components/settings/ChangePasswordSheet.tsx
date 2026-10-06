import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FormSheet, FormField } from '@/components/settings/FormSheet';

interface ChangePasswordSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

const MIN_LENGTH = 8;
const EMPTY = { current: '', next: '', confirm: '' };

export function ChangePasswordSheet({ open, onOpenChange, email }: ChangePasswordSheetProps) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof EMPTY) => (value: string) => {
    setError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) { setForm(EMPTY); setError(null); }
    onOpenChange(next);
  };

  const canSave = form.current !== '' && form.next !== '' && form.confirm !== '' && !saving;

  const handleSave = async () => {
    if (form.next.length < MIN_LENGTH) { setError(`A nova senha precisa ter ao menos ${MIN_LENGTH} caracteres.`); return; }
    if (form.next !== form.confirm) { setError('A confirmação não é igual à nova senha.'); return; }
    if (form.next === form.current) { setError('A nova senha deve ser diferente da atual.'); return; }

    setSaving(true);
    // Confirma a senha atual antes de permitir a troca.
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: form.current });
    if (authError) {
      setSaving(false);
      setError('Senha atual incorreta.');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: form.next });
    setSaving(false);
    if (updateError) {
      setError('Não foi possível alterar a senha. Tente novamente.');
      return;
    }
    toast.success('Senha alterada com sucesso.');
    handleOpenChange(false);
  };

  return (
    <FormSheet open={open} onOpenChange={handleOpenChange} title="Alterar senha" description="Por segurança, confirme sua senha atual.">
      <div className="space-y-4">
        <FormField label="Senha atual" type="password" value={form.current} onChange={setField('current')} autoComplete="current-password" />
        <FormField label="Nova senha" type="password" value={form.next} onChange={setField('next')} autoComplete="new-password" />
        <FormField label="Confirmar nova senha" type="password" value={form.confirm} onChange={setField('confirm')} autoComplete="new-password" />
        {error && (
          <p className="text-destructive" style={{ fontSize: 'var(--text-xs)' }}>{error}</p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="btn-primary w-full disabled:opacity-50"
          style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          {saving ? 'Salvando...' : 'Alterar senha'}
        </button>
      </div>
    </FormSheet>
  );
}
