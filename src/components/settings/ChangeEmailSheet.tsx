import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FormSheet, FormField } from '@/components/settings/FormSheet';

interface ChangeEmailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ChangeEmailSheet({ open, onOpenChange, currentEmail }: ChangeEmailSheetProps) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setEmail('');
    onOpenChange(next);
  };

  const normalized = email.trim().toLowerCase();
  const canSave = EMAIL_RE.test(normalized) && normalized !== currentEmail.toLowerCase() && !saving;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: normalized });
    setSaving(false);
    if (error) {
      toast.error('Não foi possível alterar o e-mail. Tente novamente.');
      return;
    }
    toast.success('Enviamos um link de confirmação para o novo e-mail.');
    handleOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Alterar e-mail"
      description="Enviaremos um link de confirmação para o novo endereço. O e-mail só muda depois da confirmação."
    >
      <div className="space-y-4">
        <FormField label="Novo e-mail" type="email" value={email} onChange={setEmail} placeholder={currentEmail} autoComplete="email" />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="btn-primary w-full disabled:opacity-50"
          style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          {saving ? 'Enviando...' : 'Alterar e-mail'}
        </button>
      </div>
    </FormSheet>
  );
}
