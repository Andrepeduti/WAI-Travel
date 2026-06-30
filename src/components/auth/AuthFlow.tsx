import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { getRedirectUrl } from '@/lib/utils';
import heroImage from '@/assets/auth-welcome-hero.jpg';

type Mode = 'welcome' | 'login' | 'signup' | 'forgot';

interface AuthFlowProps {
  onLoginSuccess: () => void;
  onSignupSuccess: () => void;
}

export function AuthFlow({ onLoginSuccess, onSignupSuccess }: AuthFlowProps) {
  const [mode, setMode] = useState<Mode>('welcome');

  const handleGoogle = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/login`,
      });
      if (result.error) {
        console.error('Google Auth Error:', result.error);
        toast.error(`Erro Google: ${result.error.message || 'Tente novamente.'}`);
        return;
      }
      // If redirected, browser is leaving; otherwise tokens were set inline
      if (!result.redirected) {
        // Treat Google as an authenticated login and let the global onboarding
        // gate decide based on the existing profile state.
        onLoginSuccess();
      }
    } catch (e) {
      toast.error('Erro inesperado ao entrar com Google.');
    }
  };

  const handleApple = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: `${window.location.origin}/login`,
      });
      if (result.error) {
        console.error('Apple Auth Error:', result.error);
        toast.error(`Erro Apple: ${result.error.message || 'Tente novamente.'}`);
        return;
      }
      if (!result.redirected) {
        onLoginSuccess();
      }
    } catch (e) {
      toast.error('Erro inesperado ao entrar com a Apple.');
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-premium-navy">
      <motion.img
        src={heroImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        animate={{ scale: mode === 'welcome' ? 1 : 1.08 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-premium-navy/40 to-premium-navy"
        animate={{ opacity: mode === 'welcome' ? 0.85 : 1 }}
        transition={{ duration: 0.5 }}
      />

      <AnimatePresence>
        {mode === 'welcome' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="absolute top-12 left-0 right-0 px-6 flex justify-center z-10"
          >
            <span className="text-[13px] font-bold tracking-[0.3em] uppercase text-white/95">
              WAI Travel
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
        <AnimatePresence mode="wait">
          {mode === 'welcome' && (
            <WelcomeCard
              key="welcome"
              onSignup={() => setMode('signup')}
              onLogin={() => setMode('login')}
              onGoogle={handleGoogle}
              onApple={handleApple}
            />
          )}
          {mode === 'login' && (
            <LoginCard
              key="login"
              onSubmit={onLoginSuccess}
              onSwitchToSignup={() => setMode('signup')}
              onForgot={() => setMode('forgot')}
              onBack={() => setMode('welcome')}
              onGoogle={handleGoogle}
              onApple={handleApple}
            />
          )}
          {mode === 'forgot' && (
            <ForgotPasswordCard
              key="forgot"
              onBack={() => setMode('login')}
            />
          )}
          {mode === 'signup' && (
            <SignupCard
              key="signup"
              onSubmit={onSignupSuccess}
              onSwitchToLogin={() => setMode('login')}
              onBack={() => setMode('welcome')}
              onGoogle={handleGoogle}
              onApple={handleApple}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ----------------------------- WELCOME CARD ------------------------------- */

function WelcomeCard({ onSignup, onLogin, onGoogle, onApple }: { onSignup: () => void; onLogin: () => void; onGoogle: () => void; onApple: () => void }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto px-6 pb-10"
    >
      <div className="mb-8 max-w-[340px]">
        <h1 className="font-bold text-white text-[36px] leading-[1.05] tracking-[-0.025em]">
          Sua próxima<br />história de viagem.
        </h1>
        <p className="mt-3 text-[15px] text-white/75 leading-relaxed">
          Descubra roteiros prontos de criadores pelo mundo. Monte o seu e venda para quem ama viajar.
        </p>
      </div>

      <div className="bg-white rounded-[28px] p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]">
        <button
          onClick={onSignup}
          className="w-full h-14 rounded-2xl bg-[#9DCC36] text-[#0A0A0A] font-bold text-[15px] tracking-[-0.01em] hover:brightness-105 transition-all active:scale-[0.99] shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]"
        >
          Criar conta
        </button>
        <button
          onClick={onLogin}
          className="w-full h-14 mt-2.5 rounded-2xl bg-transparent border-[1.5px] border-[#1A1C40] text-[#1A1C40] font-bold text-[15px] tracking-[-0.01em] hover:bg-[#1A1C40]/5 transition-colors"
        >
          Já tenho conta
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#0A0A0A]/10" />
          <span className="text-[11px] font-medium text-[#0A0A0A]/45 uppercase tracking-[0.15em]">ou</span>
          <div className="flex-1 h-px bg-[#0A0A0A]/10" />
        </div>

        <GoogleButton onClick={onGoogle} />
        <AppleButton onClick={onApple} />
      </div>

      <p className="text-center text-[11px] text-white/55 mt-5 leading-relaxed">
        Ao continuar, você concorda com os{' '}
        <span className="text-white/90 font-semibold underline">Termos</span> e a{' '}
        <span className="text-white/90 font-semibold underline">Política de privacidade</span>.
      </p>
    </motion.div>
  );
}

/* ------------------------------ LOGIN CARD -------------------------------- */

function LoginCard({
  onSubmit,
  onSwitchToSignup,
  onForgot,
  onBack,
  onGoogle,
  onApple,
}: {
  onSubmit: () => void;
  onSwitchToSignup: () => void;
  onForgot: () => void;
  onBack: () => void;
  onGoogle: () => void;
  onApple: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length >= 6 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes('invalid')
          ? 'E-mail ou senha incorretos.'
          : `Erro ao entrar: ${error.message}`
      );
      return;
    }
    onSubmit();
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto bg-white rounded-t-[32px] px-6 pt-7 pb-10 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.4)]"
    >
      <div className="w-10 h-1 bg-[#0A0A0A]/15 rounded-full mx-auto mb-4" />
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/10 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <h2 className="font-bold text-[#0A0A0A] text-[26px] leading-[1.1] tracking-[-0.02em]">
        Bem-vindo de volta.
      </h2>
      <p className="mt-1.5 text-[14px] text-[#0A0A0A]/55">Entre para continuar planejando.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="E-mail" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="h-13 rounded-2xl bg-[#F4F5F7] border-0 px-4 text-[#0A0A0A] text-[15px] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-[#9DCC36] focus-visible:ring-offset-0"
            style={{ fontSize: '16px', height: '52px' }}
          />
        </Field>

        <Field label="Senha" htmlFor="login-password">
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="rounded-2xl bg-[#F4F5F7] border-0 px-4 pr-12 text-[#0A0A0A] text-[15px] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-[#9DCC36] focus-visible:ring-offset-0"
              style={{ fontSize: '16px', height: '52px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#0A0A0A]/55 hover:text-[#0A0A0A] hover:bg-[#0A0A0A]/5 transition-colors"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setRemember((v) => !v)}
            className="flex items-center gap-2 text-[13px] text-[#0A0A0A]/70 font-medium"
          >
            <span
              className={cn(
                'w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors',
                remember ? 'bg-[#9DCC36] border-[#9DCC36]' : 'bg-white border-[#0A0A0A]/20'
              )}
            >
              {remember && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            Lembrar de mim
          </button>
          <button type="button" onClick={onForgot} className="text-[13px] font-semibold text-[#0A0A0A] hover:underline">
            Esqueci a senha
          </button>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'w-full h-14 mt-2 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all active:scale-[0.99] flex items-center justify-center gap-2',
            canSubmit
              ? 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
              : 'bg-[#F4F5F7] text-[#0A0A0A]/35 cursor-not-allowed'
          )}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Entrar
        </button>
      </form>

      <Divider />
      <GoogleButton onClick={onGoogle} />
      <AppleButton onClick={onApple} />

      <p className="text-center text-[13px] text-[#0A0A0A]/65 mt-6">
        Novo por aqui?{' '}
        <button onClick={onSwitchToSignup} className="text-[#0A0A0A] font-bold hover:underline">
          Crie sua conta
        </button>
      </p>
    </motion.div>
  );
}

/* ------------------------------ SIGNUP CARD ------------------------------- */

function SignupCard({
  onSubmit,
  onSwitchToLogin,
  onBack,
  onGoogle,
  onApple,
}: {
  onSubmit: () => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
  onGoogle: () => void;
  onApple: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = password.length >= 6;
  const matches = password.length > 0 && password === confirm;
  const canSubmit = emailValid && passwordValid && matches && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getRedirectUrl() },
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already')) {
        toast.error('Este e-mail já está cadastrado. Tente entrar.');
      } else if (msg.includes('weak') || msg.includes('pwned') || msg.includes('compromised')) {
        toast.error('Essa senha não é segura. Escolha outra para continuar.');
      } else {
        toast.error(`Erro ao criar conta: ${error.message}`);
      }
      return;
    }
    // Se a confirmação de e-mail estiver habilitada, signUp retorna sem session.
    // Nesse caso não devemos avançar para o onboarding (que exige sessão).
    if (!data.session) {
      toast.success('Enviamos um e-mail de confirmação. Confirme para continuar.');
      return;
    }
    onSubmit();
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto bg-white rounded-t-[32px] px-6 pt-7 pb-10 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.4)] max-h-[88vh] overflow-y-auto"
    >
      <div className="w-10 h-1 bg-[#0A0A0A]/15 rounded-full mx-auto mb-4" />
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/10 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <h2 className="font-bold text-[#0A0A0A] text-[26px] leading-[1.1] tracking-[-0.02em]">
        Comece sua jornada.
      </h2>
      <p className="mt-1.5 text-[14px] text-[#0A0A0A]/55">Crie uma conta em segundos.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="E-mail" htmlFor="signup-email">
          <Input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="rounded-2xl bg-[#F4F5F7] border-0 px-4 text-[#0A0A0A] text-[15px] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-[#9DCC36] focus-visible:ring-offset-0"
            style={{ fontSize: '16px', height: '52px' }}
          />
        </Field>

        <Field label="Senha" htmlFor="signup-password">
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              className="rounded-2xl bg-[#F4F5F7] border-0 px-4 pr-12 text-[#0A0A0A] text-[15px] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-[#9DCC36] focus-visible:ring-offset-0"
              style={{ fontSize: '16px', height: '52px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#0A0A0A]/55 hover:text-[#0A0A0A] hover:bg-[#0A0A0A]/5 transition-colors"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <Field label="Confirmar senha" htmlFor="signup-confirm">
          <Input
            id="signup-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            className={cn(
              'rounded-2xl bg-[#F4F5F7] border-0 px-4 text-[#0A0A0A] text-[15px] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-offset-0',
              confirm.length > 0 && !matches
                ? 'focus-visible:ring-destructive ring-1 ring-destructive/40'
                : 'focus-visible:ring-[#9DCC36]'
            )}
            style={{ fontSize: '16px', height: '52px' }}
          />
          {confirm.length > 0 && !matches && (
            <p className="mt-1.5 text-[12px] text-destructive font-medium">As senhas não coincidem.</p>
          )}
        </Field>

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'w-full h-14 mt-2 rounded-2xl font-bold text-[15px] tracking-[-0.01em] transition-all active:scale-[0.99] flex items-center justify-center gap-2',
            canSubmit
              ? 'bg-[#9DCC36] text-[#0A0A0A] hover:brightness-105 shadow-[0_8px_22px_-8px_rgba(157,204,54,0.5)]'
              : 'bg-[#F4F5F7] text-[#0A0A0A]/35 cursor-not-allowed'
          )}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Criar conta
        </button>
      </form>

      <Divider />
      <GoogleButton onClick={onGoogle} />
      <AppleButton onClick={onApple} />

      <p className="text-center text-[13px] text-[#0A0A0A]/65 mt-6">
        Já tem uma conta?{' '}
        <button onClick={onSwitchToLogin} className="text-[#0A0A0A] font-bold hover:underline">
          Entrar
        </button>
      </p>
    </motion.div>
  );
}

/* --------------------------- FORGOT PASSWORD CARD ------------------------- */

function ForgotPasswordCard({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const canSubmit = emailValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('reset-password'),
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate') || msg.includes('limit') || msg.includes('too many')) {
        toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        return;
      }
      // For other errors, still show the generic success message to avoid leaking
      // whether an account exists. Log for debugging.
      console.error('[ForgotPassword] reset error:', error);
    }
    setSent(true);
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto bg-white rounded-t-[32px] px-6 pt-7 pb-10 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.4)]"
    >
      <div className="w-10 h-1 bg-[#0A0A0A]/15 rounded-full mx-auto mb-4" />
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#0A0A0A]/70 hover:bg-[#0A0A0A]/10 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {sent ? (
        <div className="pb-2">
          <h2 className="font-bold text-[#0A0A0A] text-[24px] leading-[1.1] tracking-[-0.02em]">
            Verifique seu e-mail
          </h2>
          <p className="mt-3 text-[14px] text-[#0A0A0A]/65 leading-relaxed">
            Se existir uma conta vinculada a <span className="font-semibold text-[#0A0A0A]">{email}</span>, enviaremos um link para redefinição da sua senha. O link é válido por 1 hora.
          </p>
          <p className="mt-3 text-[13px] text-[#0A0A0A]/55 leading-relaxed">
            Não recebeu? Verifique a caixa de spam ou tente novamente em alguns minutos.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-full mt-6 rounded-2xl bg-[#9DCC36] text-[#0A0A0A] font-bold text-[15px] active:scale-[0.99] transition-all"
            style={{ height: 56 }}
          >
            Voltar para o login
          </button>
        </div>
      ) : (
        <>
          <h2 className="font-bold text-[#0A0A0A] text-[26px] leading-[1.1] tracking-[-0.02em]">
            Esqueceu sua senha?
          </h2>
          <p className="mt-1.5 text-[14px] text-[#0A0A0A]/55">
            Informe seu e-mail e enviaremos um link para você criar uma nova senha.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="E-mail" htmlFor="forgot-email">
              <Input
                id="forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="rounded-2xl bg-[#F4F5F7] border-0 px-4 text-[#0A0A0A] text-[15px] font-medium placeholder:text-[#0A0A0A]/35 focus-visible:ring-2 focus-visible:ring-[#9DCC36] focus-visible:ring-offset-0"
                style={{ fontSize: '16px', height: '52px' }}
              />
              {email.length > 0 && !emailValid && (
                <p className="mt-1.5 text-[12px] text-destructive font-medium">Informe um e-mail válido.</p>
              )}
            </Field>

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
              Enviar link de recuperação
            </button>
          </form>

          <p className="text-center text-[13px] text-[#0A0A0A]/65 mt-6">
            Lembrou da senha?{' '}
            <button onClick={onBack} className="text-[#0A0A0A] font-bold hover:underline">
              Voltar para o login
            </button>
          </p>
        </>
      )}
    </motion.div>
  );
}

/* --------------------------------- HELPERS -------------------------------- */


function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12.5px] font-semibold text-[#0A0A0A] tracking-[-0.01em]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-[#0A0A0A]/10" />
      <span className="text-[11px] font-medium text-[#0A0A0A]/45 uppercase tracking-[0.15em]">ou</span>
      <div className="flex-1 h-px bg-[#0A0A0A]/10" />
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-12 rounded-2xl border border-[#0A0A0A]/12 bg-white flex items-center justify-center gap-2.5 text-[#0A0A0A] text-[14px] font-semibold hover:bg-[#0A0A0A]/[0.03] transition-colors active:scale-[0.99]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
      </svg>
      Continuar com Google
    </button>
  );
}

function AppleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-12 mt-2.5 rounded-2xl bg-[#000000] flex items-center justify-center gap-2.5 text-white text-[14px] font-semibold hover:bg-[#1a1a1a] transition-colors active:scale-[0.99]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M12.35 3.32c.04-.47-.35-.88-.82-.93-.48-.05-.9.29-.99.75-.04.48.34.9.81.95.48.05.91-.3 1-.77zm-.44 1.58c-.67-.08-1.24.3-1.57.3-.33 0-.82-.29-1.38-.28-.71.01-1.37.41-1.73 1.04-.74 1.28-.19 3.18.53 4.22.35.51.77 1.09 1.32 1.07.52-.02.73-.34 1.37-.34.63 0 .82.34 1.37.33.57-.02.93-.52 1.28-1.03.4-.59.57-1.16.58-1.19-.01-.01-1.11-.43-1.12-1.71-.01-1.07.86-1.58.9-1.61-.49-.72-1.25-.8-1.51-.83-.02 0-.04 0-.04 0z" fill="white"/>
      </svg>
      Continuar com Apple
    </button>
  );
}