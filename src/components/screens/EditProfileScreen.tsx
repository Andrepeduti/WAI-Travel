import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useCurrentUser } from '@/hooks/use-current-user';
import { BackButton } from '@/components/ui/BackButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EditInterestsSheet, INTEREST_CATALOG, type Interest } from '@/components/travel/EditInterestsSheet';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';

interface EditProfileScreenProps {
  onBack: () => void;
  onSave: () => void;
}

type VerificationStatus = 'unverified' | 'pending' | 'verified';

const VERIFICATION_KEY = 'wai-travel-verification-status';

export function EditProfileScreen({ onBack, onSave }: EditProfileScreenProps) {
  const { user, update, refresh } = useCurrentUser();
  const { user: authUser } = useAuth();

  const [formData, setFormData] = useState({
    name: user.name ?? '',
    username: (user.username ?? '').replace(/^@/, ''),
    location: user.location ?? '',
    bio: user.bio ?? '',
    instagram: user.instagram ?? '',
    tiktok: user.tiktok ?? '',
    youtube: user.youtube ?? '',
  });
  const [avatar, setAvatar] = useState<string>(user.avatar ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyStep, setVerifyStep] = useState<0 | 1 | 2 | 3>(0);
  const [docFileName, setDocFileName] = useState<string | null>(null);
  const [selfieTaken, setSelfieTaken] = useState(false);
  const [verification, setVerification] = useState<VerificationStatus>(() => {
    if (typeof window === 'undefined') return 'unverified';
    return (localStorage.getItem(VERIFICATION_KEY) as VerificationStatus) || 'unverified';
  });

  // Interesses — espelham o `profiles.interests` (string[]) e abrem o
  // mesmo bottom sheet usado em outras telas. Onboarding já grava esse
  // campo; aqui o usuário pode editar a qualquer momento.
  const interestsFromProfile = useMemo<Interest[]>(() => {
    const catalogMap = new Map(INTEREST_CATALOG.map((i) => [i.label.toLowerCase(), i]));
    return (user.interests ?? []).map((label) => {
      const found = catalogMap.get(label.toLowerCase());
      return found ?? { label, icon: 'tag' };
    });
  }, [user.interests]);
  const [interests, setInterests] = useState<Interest[]>(interestsFromProfile);
  const [interestsSheetOpen, setInterestsSheetOpen] = useState(false);

  useEffect(() => {
    setInterests(interestsFromProfile);
  }, [interestsFromProfile]);

  // Autocomplete de cidades para o campo Localização (Google)
  const [locationInput, setLocationInput] = useState<string>(user.location ?? '');
  const [locationResults, setLocationResults] = useState<Array<{ label: string; sub: string; full: string }>>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Sincroniza o formulário com os dados reais do perfil quando carregam
  useEffect(() => {
    setFormData({
      name: user.name ?? '',
      username: (user.username ?? '').replace(/^@/, ''),
      location: user.location ?? '',
      bio: user.bio ?? '',
      instagram: user.instagram ?? '',
      tiktok: user.tiktok ?? '',
      youtube: user.youtube ?? '',
    });
    setLocationInput(user.location ?? '');
    setAvatar(user.avatar ?? '');
  }, [user.name, user.username, user.location, user.avatar, user.bio, user.instagram, user.tiktok, user.youtube]);

  // Busca cidades via Google Places com debounce
  useEffect(() => {
    const query = locationInput.trim();
    if (!showLocationSuggestions) return;
    if (query.length < 2 || query === (formData.location ?? '').trim()) {
      setLocationResults([]);
      setIsSearchingLocation(false);
      return;
    }
    setIsSearchingLocation(true);
    let active = true;
    const timeout = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(query, ['(cities)']);
        
        const mapped = predictions.map(p => ({
            label: p.name,
            sub: p.location || '',
            full: p.location ? `${p.name}, ${p.location}` : p.name
        }));
        
        if (active) setLocationResults(mapped);
      } catch (err) {
        if (active) setLocationResults([]);
      } finally {
        if (active) setIsSearchingLocation(false);
      }
    }, 1000);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [locationInput, showLocationSuggestions, formData.location]);

  const handleSelectCity = (full: string) => {
    setFormData((prev) => ({ ...prev, location: full }));
    setLocationInput(full);
    setShowLocationSuggestions(false);
    setLocationResults([]);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarPick = (file: File | null) => {
    if (!file) return;
    // Preview local imediato (objectURL — não vai pro banco)
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);
    setAvatarFile(file);
  };

  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!avatarFile || !authUser) return null;
    const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
    const path = `${authUser.id}/${Date.now()}.${safeExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || 'image/jpeg' });
    if (uploadError) {
      console.error('[EditProfile] avatar upload error:', uploadError);
      throw uploadError;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (saving) return;
    setUsernameError(null);

    const currentUsername = (user.username ?? '').replace(/^@/, '').trim().toLowerCase();
    const newUsername = formData.username.replace(/^@/, '').trim().toLowerCase();
    const usernameChanged = newUsername !== currentUsername;

    // Pré-validações de username
    if (usernameChanged) {
      if (!newUsername) {
        setUsernameError('Escolha um nome de usuário.');
        toast.error('Escolha um nome de usuário.');
        return;
      }
      if (!/^[a-z0-9_.]+$/.test(newUsername)) {
        setUsernameError('Use apenas letras, números, ponto ou underline.');
        toast.error('Nome de usuário inválido.');
        return;
      }
    }

    setSaving(true);
    try {
      // Checa disponibilidade antes de tentar gravar (apenas se mudou)
      if (usernameChanged) {
        const { data: taken, error: checkErr } = await supabase
          .from('profiles_public')
          .select('user_id')
          .ilike('username', newUsername)
          .neq('user_id', authUser?.id ?? '')
          .maybeSingle();
        if (checkErr) {
          console.error('[EditProfile] username check error:', checkErr);
        }
        if (taken) {
          setUsernameError('Esse nome de usuário já está em uso.');
          toast.error('Esse nome de usuário já está em uso. Escolha outro.');
          setSaving(false);
          return;
        }
      }

      // 1) Salva campos de texto — só inclui username se mudou
      const patch: Record<string, string> = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        instagram: formData.instagram.trim(),
        tiktok: formData.tiktok.trim(),
        youtube: formData.youtube.trim(),
      };
      if (usernameChanged) patch.username = newUsername;
      await update(patch);
      // Interesses (string[]) — espelha o que foi escolhido no sheet
      await update({ interests: interests.map((i) => i.label) });

      // 2) Faz upload da foto e salva apenas a URL pública
      let avatarError: unknown = null;
      if (avatarFile) {
        try {
          const publicUrl = await uploadAvatarIfNeeded();
          if (publicUrl) {
            await update({ avatar: publicUrl });
            setAvatarFile(null);
          }
        } catch (err) {
          avatarError = err;
        }
      }

      await refresh();

      if (avatarError) {
        toast.error('Perfil salvo, mas a foto não pôde ser enviada. Tente novamente.');
      } else {
        toast.success('Perfil atualizado', {
          icon: <Icon name="check_circle" size={20} style={{ color: 'hsl(var(--primary))' }} />,
        });
      }
      onSave();
    } catch (err: unknown) {
      console.error('[EditProfile] save error:', err);
      const e = err as { code?: string; message?: string };
      if (e?.code === '23505' || (e?.message ?? '').includes('profiles_username_key')) {
        setUsernameError('Esse nome de usuário já está em uso.');
        toast.error('Esse nome de usuário já está em uso. Escolha outro.');
      } else {
        toast.error('Não foi possível salvar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const startVerification = () => {
    setVerification('pending');
    if (typeof window !== 'undefined') {
      localStorage.setItem(VERIFICATION_KEY, 'pending');
    }
    setVerifyOpen(false);
    toast.success('Solicitação enviada', {
      description: 'Vamos analisar seus dados em até 48h.',
      icon: <Icon name="check_circle" size={20} style={{ color: 'hsl(var(--primary))' }} />,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header — padrão sub-page (sticky branco com BackButton) */}
      <div className="sticky top-0 z-20 bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 py-4">
          <BackButton onClick={onBack} />
          <h1
            className="text-foreground"
            style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}
          >
            Editar perfil
          </h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            {avatar ? (
              <img
                src={avatar}
                alt="Foto de perfil"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <UserAvatar src={null} alt="Sem foto de perfil" size={96} />
            )}
            <label
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-sm"
              style={{ background: 'hsl(var(--primary))' }}
            >
              <Icon name="photo_camera" size={16} style={{ color: 'hsl(var(--primary-foreground))' }} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarPick(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <span
            className="text-muted-foreground"
            style={{ fontSize: 'var(--text-xs)' }}
          >
            Alterar foto
          </span>
        </div>

        {/* Form — somente campos essenciais */}
        <div className="space-y-5">
          <div>
            <label
              className="block text-muted-foreground mb-1.5"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              Nome
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
              style={{ fontSize: 'var(--text-base)' }}
            />
          </div>

          <div>
            <label
              className="block text-muted-foreground mb-1.5"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              Nome de usuário
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                style={{ fontSize: 'var(--text-base)' }}
              >
                @
              </span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  if (usernameError) setUsernameError(null);
                  handleChange('username', e.target.value.replace(/^@/, '').toLowerCase());
                }}
                placeholder="seunome"
                className={`w-full rounded-xl border bg-background pl-9 pr-4 py-3 text-foreground outline-none transition-colors ${
                  usernameError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'
                }`}
                style={{ fontSize: 'var(--text-base)' }}
              />
            </div>
            {usernameError && (
              <p
                className="text-destructive mt-1.5"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                {usernameError}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-muted-foreground mb-1.5"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              Localização
            </label>
            <div className="relative">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setShowLocationSuggestions(true);
                }}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                placeholder="Buscar cidade..."
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
                style={{ fontSize: 'var(--text-base)' }}
                autoComplete="off"
              />
              {showLocationSuggestions && locationInput.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-background shadow-lg max-h-64 overflow-y-auto">
                  {isSearchingLocation && locationResults.length === 0 && (
                    <div
                      className="px-4 py-3 text-muted-foreground"
                      style={{ fontSize: 'var(--text-sm)' }}
                    >
                      Buscando...
                    </div>
                  )}
                  {!isSearchingLocation && locationResults.length === 0 && (
                    <div
                      className="px-4 py-3 text-muted-foreground"
                      style={{ fontSize: 'var(--text-sm)' }}
                    >
                      Nenhuma cidade encontrada
                    </div>
                  )}
                  {locationResults.map((r) => (
                    <button
                      key={r.full}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectCity(r.full)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 flex items-center gap-2 border-b border-border last:border-b-0"
                    >
                      <Icon name="location_on" size={18} className="text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div
                          className="text-foreground truncate"
                          style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
                        >
                          {r.label}
                        </div>
                        {r.sub && (
                          <div
                            className="text-muted-foreground truncate"
                            style={{ fontSize: 'var(--text-xs)' }}
                          >
                            {r.sub}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              className="block text-muted-foreground mb-1.5"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => {
                if (e.target.value.length <= 150) handleChange('bio', e.target.value);
              }}
              placeholder="Conte um pouco sobre você e seu estilo de viajar..."
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary transition-colors resize-none"
              style={{ fontSize: 'var(--text-base)' }}
            />
            <div
              className="flex justify-end mt-1 text-muted-foreground"
              style={{ fontSize: 'var(--text-xs)' }}
            >
              {formData.bio.length}/150
            </div>
          </div>

        </div>

        {/* Interesses — hidden */}

        {/* Redes sociais */}
        <div className="mt-8">
          <h2
            className="text-foreground mb-3"
            style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}
          >
            Redes sociais
          </h2>
          <div className="space-y-3">
            {([
              { key: 'instagram', label: 'Instagram', icon: '/icons/instagram.svg', placeholder: '@seuusuario', prefix: '@' },
              { key: 'tiktok', label: 'TikTok', icon: '/icons/tiktok.svg', placeholder: '@seuusuario', prefix: '@' },
              { key: 'youtube', label: 'YouTube', icon: '/icons/youtube.svg', placeholder: '@seucanal', prefix: '@' },
            ] as const).map((social) => (
              <div key={social.key}>
                <label
                  className="block text-muted-foreground mb-1.5"
                  style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}
                >
                  {social.label}
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    style={{ fontSize: 'var(--text-base)' }}
                  >
                    {social.prefix}
                  </span>
                  <input
                    type="text"
                    value={(formData[social.key] ?? '').replace(/^@/, '')}
                    onChange={(e) => handleChange(social.key, e.target.value.replace(/^@/, '').replace(/\s+/g, ''))}
                    placeholder={social.placeholder.replace(/^@/, '')}
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-3 text-foreground outline-none focus:border-primary transition-colors"
                    style={{ fontSize: 'var(--text-base)' }}
                    autoComplete="off"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verificação de identidade */}
        <div className="mt-8">
          <h2
            className="text-foreground mb-3"
            style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}
          >
            Verificação de identidade
          </h2>

          <button
            type="button"
            onClick={() => { if (verification !== 'verified') { setVerifyStep(0); setDocFileName(null); setSelfieTaken(false); setVerifyOpen(true); } }}
            disabled={verification === 'verified'}
            className="w-full text-left rounded-2xl border border-border bg-card p-4 flex items-start gap-3 transition-colors hover:bg-muted/40 disabled:cursor-default disabled:hover:bg-card"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#1D9BF0' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 1.5l2.39 2.05 3.13-.36.79 3.06 2.84 1.42-1.4 2.83.79 3.07-2.84 1.41-.79 3.07-3.13-.36L12 19.74l-2.39-2.05-3.13.36-.79-3.07L2.85 13.57l1.4-2.83-.79-3.07L6.3 6.25l.79-3.06 3.13.36L12 1.5z"
                  fill="#FFFFFF"
                />
                <path
                  d="M9 12.2l2.1 2.1L15.5 9.9"
                  stroke="#1D9BF0"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-foreground"
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {verification === 'verified'
                    ? 'Conta verificada'
                    : verification === 'pending'
                      ? 'Verificação em análise'
                      : 'Conquistar selo verificado'}
                </span>
                {verification !== 'verified' && (
                  <Icon
                    name="chevron_right"
                    size={20}
                    className="text-muted-foreground flex-shrink-0"
                  />
                )}
              </div>
              <p
                className="text-muted-foreground mt-1"
                style={{ fontSize: 'var(--text-xs)', lineHeight: 1.4 }}
              >
                {verification === 'verified'
                  ? 'Você ganhou o selo oficial. Agora viajantes confiam ainda mais nos seus roteiros.'
                  : verification === 'pending'
                    ? 'Sua solicitação está em análise. Você receberá uma notificação em até 48h.'
                    : 'Mostre que é você de verdade e ganhe o selo azul. Criadores verificados têm mais alcance e credibilidade.'}
              </p>
            </div>
          </button>
        </div>

      </div>

      {/* Footer fixo — Salvar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background border-t border-border px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] z-30">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full disabled:opacity-60"
          style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Bottom Sheet — Verificação */}
      {verifyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setVerifyOpen(false)}
        >
          <div
            className="w-full max-w-[430px] bg-background rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2">
              <div className="flex items-center gap-2">
                {verifyStep > 0 && verifyStep < 3 && (
                  <button
                    type="button"
                    onClick={() => setVerifyStep((s) => (s - 1) as 0 | 1 | 2)}
                    className="w-8 h-8 -ml-2 rounded-full flex items-center justify-center hover:bg-muted"
                    aria-label="Voltar"
                  >
                    <Icon name="chevron_left" size={20} className="text-foreground" />
                  </button>
                )}
                <h3
                  className="text-foreground"
                  style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}
                >
                  Verificação de identidade
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted"
                aria-label="Fechar"
              >
                <Icon name="close" size={20} className="text-foreground" />
              </button>
            </div>

            {/* Step indicator */}
            {verifyStep < 3 && (
              <div className="px-5 pt-1 pb-2">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        background:
                          i <= verifyStep ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                      }}
                    />
                  ))}
                </div>
                <p
                  className="text-muted-foreground mt-2"
                  style={{ fontSize: 'var(--text-xs)' }}
                >
                  Passo {verifyStep + 1} de 3
                </p>
              </div>
            )}

            <div className="px-5 pt-2">
              {/* STEP 0 — Intro */}
              {verifyStep === 0 && (
                <>
                  <div className="flex flex-col items-center text-center py-4">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mb-3 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" fill="#1D9BF0"/>
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p
                      className="text-foreground"
                      style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      Ganhe o selo verificado
                    </p>
                    <p
                      className="text-muted-foreground mt-1 max-w-[300px]"
                      style={{ fontSize: 'var(--text-sm)', lineHeight: 1.45 }}
                    >
                      Confirme que é você e ganhe credibilidade na plataforma.
                    </p>
                  </div>

                  <div className="space-y-3 mt-2">
                    {[
                      { icon: 'description', title: 'Documento oficial', desc: 'Envie uma foto do seu RG, CNH ou passaporte.' },
                      { icon: 'photo_camera', title: 'Selfie ao vivo', desc: 'Tire uma selfie para confirmar que é você no documento.' },
                      { icon: 'schedule', title: 'Análise em até 48h', desc: 'Avisamos por notificação assim que o selo estiver ativo.' },
                    ].map((step) => (
                      <div
                        key={step.title}
                        className="flex items-start gap-3 rounded-2xl border border-border p-4"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'hsl(var(--muted))' }}
                        >
                          <Icon name={step.icon} size={18} style={{ color: 'hsl(var(--secondary))' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-foreground"
                            style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}
                          >
                            {step.title}
                          </p>
                          <p
                            className="text-muted-foreground mt-0.5"
                            style={{ fontSize: 'var(--text-xs)', lineHeight: 1.4 }}
                          >
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setVerifyStep(1)}
                    className="btn-primary w-full mt-6"
                    style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    Iniciar verificação
                  </button>
                  <p
                    className="text-center text-muted-foreground mt-3"
                    style={{ fontSize: 'var(--text-xs)' }}
                  >
                    Seus dados são usados apenas para validação e protegidos por criptografia.
                  </p>
                </>
              )}

              {/* STEP 1 — Documento */}
              {verifyStep === 1 && (
                <>
                  <div className="py-2">
                    <p
                      className="text-foreground"
                      style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      Envie um documento oficial
                    </p>
                    <p
                      className="text-muted-foreground mt-1"
                      style={{ fontSize: 'var(--text-sm)', lineHeight: 1.45 }}
                    >
                      Aceitamos RG, CNH ou passaporte. A foto precisa estar legível e sem reflexos.
                    </p>
                  </div>

                  <label
                    className="mt-4 block rounded-2xl border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => setDocFileName(e.target.files?.[0]?.name ?? null)}
                    />
                    <div
                      className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2"
                      style={{ background: 'hsl(var(--muted))' }}
                    >
                      <Icon name="attach_file" size={22} style={{ color: 'hsl(var(--secondary))' }} />
                    </div>
                    <p
                      className="text-foreground"
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      {docFileName ?? 'Enviar foto do documento'}
                    </p>
                    <p
                      className="text-muted-foreground mt-1"
                      style={{ fontSize: 'var(--text-xs)' }}
                    >
                      {docFileName ? 'Tocar para substituir' : 'JPG, PNG ou PDF até 10 MB'}
                    </p>
                  </label>

                  <button
                    type="button"
                    disabled={!docFileName}
                    onClick={() => setVerifyStep(2)}
                    className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    Continuar
                  </button>
                </>
              )}

              {/* STEP 2 — Selfie */}
              {verifyStep === 2 && (
                <>
                  <div className="py-2">
                    <p
                      className="text-foreground"
                      style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      Tire uma selfie ao vivo
                    </p>
                    <p
                      className="text-muted-foreground mt-1"
                      style={{ fontSize: 'var(--text-sm)', lineHeight: 1.45 }}
                    >
                      Mantenha o rosto centralizado em um ambiente bem iluminado.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelfieTaken(true)}
                    className="mt-4 w-full rounded-2xl border-2 border-dashed border-border p-6 text-center hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2"
                      style={{ background: selfieTaken ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
                    >
                      <Icon
                        name={selfieTaken ? 'check' : 'photo_camera'}
                        size={22}
                        style={{ color: 'hsl(var(--secondary))' }}
                      />
                    </div>
                    <p
                      className="text-foreground"
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}
                    >
                      {selfieTaken ? 'Selfie capturada' : 'Capturar selfie'}
                    </p>
                    <p
                      className="text-muted-foreground mt-1"
                      style={{ fontSize: 'var(--text-xs)' }}
                    >
                      {selfieTaken ? 'Tocar para refazer' : 'Vamos abrir a câmera frontal'}
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!selfieTaken}
                    onClick={() => { setVerifyStep(3); setTimeout(() => startVerification(), 1500); }}
                    className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    Enviar para análise
                  </button>
                </>
              )}

              {/* STEP 3 — Processing */}
              {verifyStep === 3 && (
                <div className="flex flex-col items-center text-center py-10">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-spin"
                    style={{ background: 'hsl(var(--primary))' }}
                  >
                    <Icon name="refresh" size={28} style={{ color: 'hsl(var(--secondary))' }} />
                  </div>
                  <p
                    className="text-foreground"
                    style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    Enviando para análise…
                  </p>
                  <p
                    className="text-muted-foreground mt-1 max-w-[280px]"
                    style={{ fontSize: 'var(--text-sm)', lineHeight: 1.45 }}
                  >
                    Não feche esta tela. Vai ser rapidinho.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <EditInterestsSheet
        open={interestsSheetOpen}
        onOpenChange={setInterestsSheetOpen}
        selected={interests}
        onSave={(next) => setInterests(next)}
      />
    </div>
  );
}
