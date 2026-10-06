import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { SocialConnectSheet } from '@/components/settings/SocialConnectSheet';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PersonalInfoScreenProps {
  onBack: () => void;
}

type SocialKey = 'instagram' | 'tiktok' | 'youtube';

const SOCIALS: { key: SocialKey; label: string; icon: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: '/icons/instagram.svg', placeholder: 'seuusuario' },
  { key: 'tiktok', label: 'TikTok', icon: '/icons/tiktok.svg', placeholder: 'seuusuario' },
  { key: 'youtube', label: 'YouTube', icon: '/icons/youtube.svg', placeholder: 'seucanal' },
];

const BIO_MAX = 150;
const NAME_MAX = 15;

/** O banco guarda um único `name`; na tela ele é dividido em nome e sobrenome. */
const splitName = (full: string) => {
  const [first = '', ...rest] = full.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(' ') };
};

const stripDigits = (value: string) => value.replace(/[0-9]/g, '').slice(0, NAME_MAX);
const cleanHandle = (value: string) => (value ?? '').replace(/^@/, '').trim();

const buildForm = (user: ReturnType<typeof useCurrentUser>['user']) => ({
  ...splitName(user.name ?? ''),
  username: cleanHandle(user.username).toLowerCase(),
  bio: user.bio ?? '',
  instagram: cleanHandle(user.instagram),
  tiktok: cleanHandle(user.tiktok),
  youtube: cleanHandle(user.youtube),
});

export function PersonalInfoScreen({ onBack }: PersonalInfoScreenProps) {
  const { user, update, refresh, loading } = useCurrentUser();
  const { user: authUser } = useAuth();

  const [form, setForm] = useState(() => buildForm(user));
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [editingSocial, setEditingSocial] = useState<SocialKey | null>(null);

  // Sincroniza com o perfil quando ele termina de carregar.
  useEffect(() => { setForm(buildForm(user)); }, [user]);

  const setField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const original = buildForm(user);
  const hasChanges = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k].trim() !== original[k].trim());
  const canSave = hasChanges && !saving && form.firstName.trim() !== '';

  const handleSave = async () => {
    setUsernameError(null);
    const newUsername = form.username.trim().toLowerCase();
    const usernameChanged = newUsername !== original.username;

    if (usernameChanged) {
      if (!newUsername) { setUsernameError('Escolha um nome de usuário.'); return; }
      if (!/^[a-z0-9_.]+$/.test(newUsername)) { setUsernameError('Use apenas letras, números, ponto ou underline.'); return; }
    }

    setSaving(true);
    try {
      if (usernameChanged) {
        const { data: taken } = await supabase
          .from('profiles_public')
          .select('user_id')
          .ilike('username', newUsername)
          .neq('user_id', authUser?.id ?? '')
          .maybeSingle();
        if (taken) { setUsernameError('Esse nome de usuário já está em uso.'); return; }
      }

      const patch: Record<string, string> = {
        name: [form.firstName, form.lastName].map((p) => p.trim()).filter(Boolean).join(' '),
        bio: form.bio.trim(),
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube: form.youtube,
      };
      if (usernameChanged) patch.username = newUsername;
      await update(patch);
      await refresh();
      toast.success('Informações atualizadas');
      onBack();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === '23505' || (e?.message ?? '').includes('profiles_username_key')) {
        setUsernameError('Esse nome de usuário já está em uso.');
      } else {
        toast.error('Não foi possível salvar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors';
  const labelClass = 'block text-muted-foreground mb-1.5';
  const labelStyle = { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' } as const;

  const activeSocial = SOCIALS.find((s) => s.key === editingSocial);

  return (
    <div className="min-h-[100dvh] bg-background pb-32">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Informações pessoais
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="px-5 pt-4 space-y-5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="px-5 pt-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Nome</label>
              <input
                type="text"
                value={form.firstName}
                maxLength={NAME_MAX}
                onChange={(e) => setField('firstName', stripDigits(e.target.value.replace(/\s/g, '')))}
                className={inputClass}
                style={{ fontSize: 'var(--text-base)' }}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Sobrenome</label>
              <input
                type="text"
                value={form.lastName}
                maxLength={NAME_MAX}
                onChange={(e) => setField('lastName', stripDigits(e.target.value))}
                className={inputClass}
                style={{ fontSize: 'var(--text-base)' }}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Nome de usuário</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" style={{ fontSize: 'var(--text-base)' }}>@</span>
              <input
                type="text"
                value={form.username}
                maxLength={20}
                onChange={(e) => {
                  setUsernameError(null);
                  setField('username', e.target.value.replace(/^@/, '').toLowerCase().slice(0, 20));
                }}
                placeholder="seunome"
                className={`${inputClass} pl-9 ${usernameError ? 'border-destructive focus:border-destructive' : ''}`}
                style={{ fontSize: 'var(--text-base)' }}
              />
            </div>
            {usernameError && (
              <p className="text-destructive mt-1.5" style={{ fontSize: 'var(--text-xs)' }}>{usernameError}</p>
            )}
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Sobre mim</label>
            <textarea
              value={form.bio}
              onChange={(e) => { if (e.target.value.length <= BIO_MAX) setField('bio', e.target.value); }}
              placeholder="Conte um pouco sobre você e seu estilo de viajar..."
              rows={3}
              className={`${inputClass} bg-field resize-none`}
              style={{ fontSize: 'var(--text-base)' }}
            />
            <div className="flex justify-end mt-1 text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
              {form.bio.length}/{BIO_MAX}
            </div>
          </div>

          <div>
            <h2 className="text-foreground mb-1" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
              Redes sociais
            </h2>
            {SOCIALS.map((social, idx) => {
              const handle = form[social.key];
              return (
                <div
                  key={social.key}
                  className="flex items-center gap-3 py-3"
                  style={{ borderBottom: idx < SOCIALS.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
                >
                  <img src={social.icon} alt="" className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                      {social.label}
                    </span>
                    {handle && (
                      <span className="block text-muted-foreground truncate" style={{ fontSize: 'var(--text-xs)' }}>@{handle}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSocial(social.key)}
                    className="px-3 py-1.5 rounded-xl border border-border text-foreground flex-shrink-0"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    {handle ? 'Editar' : 'Conectar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-background border-t border-border px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] z-30">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="btn-primary w-full disabled:opacity-60"
          style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <SocialConnectSheet
        open={editingSocial !== null}
        onOpenChange={(open) => { if (!open) setEditingSocial(null); }}
        networkLabel={activeSocial?.label ?? ''}
        placeholder={activeSocial?.placeholder ?? ''}
        value={editingSocial ? form[editingSocial] : ''}
        onSave={(handle) => { if (editingSocial) setField(editingSocial, handle.replace(/^@/, '').trim()); }}
      />
    </div>
  );
}
