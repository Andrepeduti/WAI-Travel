import { useEffect, useState } from 'react';
import { FormSheet } from '@/components/settings/FormSheet';

interface SocialConnectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  networkLabel: string;
  placeholder: string;
  /** Usuário atual da rede (sem @); vazio quando não conectada. */
  value: string;
  onSave: (handle: string) => void;
}

const normalizeHandle = (raw: string) => raw.replace(/^@/, '').replace(/\s+/g, '');

export function SocialConnectSheet({ open, onOpenChange, networkLabel, placeholder, value, onSave }: SocialConnectSheetProps) {
  const [handle, setHandle] = useState(value);

  useEffect(() => {
    if (open) setHandle(value);
  }, [open, value]);

  const handleSave = () => {
    onSave(handle);
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Conectar ${networkLabel}`}
      description={`Informe seu usuário do ${networkLabel} para exibir no seu perfil.`}
    >
      <div className="space-y-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" style={{ fontSize: 'var(--text-base)' }}>@</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(normalizeHandle(e.target.value))}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
            style={{ fontSize: 'var(--text-base)' }}
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={handle.trim() === ''}
          className="btn-primary w-full disabled:opacity-50"
          style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          Conectar
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onSave(''); onOpenChange(false); }}
            className="w-full text-center"
            style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--destructive))' }}
          >
            Desconectar
          </button>
        )}
      </div>
    </FormSheet>
  );
}
