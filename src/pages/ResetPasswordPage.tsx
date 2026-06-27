import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase auto-parses the recovery hash and fires PASSWORD_RECOVERY.
  useEffect(() => {
    let resolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session && window.location.hash.includes('type=recovery'))) {
        resolved = true;
        setValidLink(true);
        setReady(true);
      }
    });

    // Fallback: if a session already exists when the page loads (after parse)
    // and the URL hash contained a recovery token, accept it.
    supabase.auth.getSession().then(({ data }) => {
      if (resolved) return;
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const hasRecoveryToken =
        hash.includes('type=recovery') ||
        search.includes('type=recovery') ||
        hash.includes('access_token');
      if (data.session && hasRecoveryToken) {
        setValidLink(true);
      } else if (data.session) {
        // user already logged in but not from a recovery link: still allow changing password
        setValidLink(true);
      } else {
        setValidLink(false);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const passwordValid = password.length >= 8;
  const matches = password.length > 0 && password === confirm;
  const canSubmit = passwordValid && matches && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('weak') || msg.includes('pwned') || msg.includes('compromised')) {
        toast.error('Essa senha não é segura. Escolha outra para continuar.');
      } else if (msg.includes('same') || msg.includes('different')) {
        toast.error('A nova senha precisa ser diferente da anterior.');
      } else {
        toast.error(`Não foi possível alterar a senha: ${error.message}`);
      }
      return;
    }
    setDone(true);
    toast.success('Sua senha foi alterada com sucesso.');
    // Sign out the recovery session and redirect to login
    setTimeout(async () => {
      try { await supabase.auth.signOut(); } catch { /* noop */ }
      navigate('/login', { replace: true });
    }, 1500);
  };

  if (!ready) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#F2F2F2]">
        <Loader2 className="animate-spin text-[#1A1C40]" size={28} />
      </div>
    );
  }

  if (!validLink) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#F2F2F2] px-6">
        <div className="w-full max-w-[400px] bg-white rounded-[28px] p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
          <h1 className="text-[22px] font-bold text-[#1A1C40] tracking-[-0.02em]">Link inválido ou expirado</h1>
          <p className="mt-2 text-[14px] text-[#0A0A0A]/65 leading-relaxed">
            O link de redefinição de senha não é mais válido. Solicite um novo link para continuar.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 w-full h-13 rounded-2xl bg-[#9DCC36] text-[#0A0A0A] font-bold text-[15px] active:scale-[0.99] transition-all"
            style={{ height: 52 }}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[#F2F2F2] px-6">
      <div className="w-full max-w-[400px] bg-white rounded-[28px] p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#9DCC36]/15 flex items-center justify-center">
              <CheckCircle2 className="text-[#5C7A2A]" size={30} />
            </div>
            <h1 className="mt-4 text-[20px] font-bold text-[#1A1C40] tracking-[-0.02em]">
              Senha alterada com sucesso
            </h1>
            <p className="mt-2 text-[14px] text-[#0A0A0A]/65">
              Redirecionando para o login…
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-bold text-[#1A1C40] tracking-[-0.02em] leading-[1.1]">
              Redefinir senha
            </h1>
            <p className="mt-2 text-[14px] text-[#0A0A0A]/65 leading-relaxed">
              Escolha uma nova senha para sua conta. Use pelo menos 8 caracteres.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="rp-pw" className="block text-[12.5px] font-semibold text-[#0A0A0A]">
                  Nova senha
                </label>
                <div className="relative">
                  <Input
                    id="rp-pw"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="rounded-2xl bg-[#F4F5F7] border-0 px-4 pr-12 text-[#0A0A0A] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-[#9DCC36] focus-visible:ring-offset-0"
                    style={{ fontSize: '16px', height: '52px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#0A0A0A]/55"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {password.length > 0 && !passwordValid && (
                  <p className="text-[12px] text-destructive font-medium">A senha precisa ter ao menos 8 caracteres.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="rp-confirm" className="block text-[12.5px] font-semibold text-[#0A0A0A]">
                  Confirmar nova senha
                </label>
                <Input
                  id="rp-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={cn(
                    'rounded-2xl bg-[#F4F5F7] border-0 px-4 text-[#0A0A0A] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-offset-0',
                    confirm.length > 0 && !matches
                      ? 'focus-visible:ring-destructive ring-1 ring-destructive/40'
                      : 'focus-visible:ring-[#9DCC36]'
                  )}
                  style={{ fontSize: '16px', height: '52px' }}
                />
                {confirm.length > 0 && !matches && (
                  <p className="text-[12px] text-destructive font-medium">As senhas não coincidem.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'w-full mt-2 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all active:scale-[0.99] flex items-center justify-center gap-2',
                  canSubmit
                    ? 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
                    : 'bg-[#F4F5F7] text-[#0A0A0A]/35 cursor-not-allowed'
                )}
                style={{ height: 56 }}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Salvar nova senha
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
