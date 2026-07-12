import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthFlow } from '@/components/auth/AuthFlow';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Detecta se a URL atual contém um retorno de OAuth (Google, etc.) vindo do
 * Supabase Auth. Aceita os formatos comuns:
 * - hash com `access_token` + `refresh_token` (implicit / token response)
 * - query/hash com `code` (PKCE / authorization code)
 */
function readOAuthReturn(): {
  type: 'tokens';
  access_token: string;
  refresh_token: string;
} | { type: 'code'; code: string } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);

  const access = hashParams.get('access_token') || queryParams.get('access_token');
  const refresh = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  if (access && refresh) {
    return { type: 'tokens', access_token: access, refresh_token: refresh };
  }

  const code = queryParams.get('code') || hashParams.get('code');
  // Ignora `code` quando `redirect` for um path interno do app (não é OAuth).
  if (code && !queryParams.get('redirect')) {
    return { type: 'code', code };
  }
  return null;
}

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, onboardingCompleted } = useAuth();
  const [processingOAuth, setProcessingOAuth] = useState<boolean>(() => readOAuthReturn() !== null);

  // Lê `?redirect=` para retomar deep links (ex.: /r/:datasetId compartilhado).
  // Apenas paths internos são aceitos para evitar open-redirect.
  const redirectPath = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('redirect');
    if (!raw) return null;
    if (!raw.startsWith('/') || raw.startsWith('//')) return null;
    return raw;
  }, [location.search]);

  // 1. Consome retorno do OAuth (tokens ou code) e estabelece a sessão no Supabase.
  // Necessário porque o fluxo OAuth faz um redirect top-level
  // e não há outro lugar do app que processe os tokens do callback.
  useEffect(() => {
    const ret = readOAuthReturn();
    if (!ret) return;
    let cancelled = false;
    (async () => {
      try {
        if (ret.type === 'tokens') {
          await supabase.auth.setSession({
            access_token: ret.access_token,
            refresh_token: ret.refresh_token,
          });
        } else if (ret.type === 'code') {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        }
      } catch (e) {
        console.error('[Auth] failed to consume OAuth return:', e);
      } finally {
        // Limpa a URL para não vazar tokens / code no histórico.
        try {
          const cleanUrl = window.location.pathname + (location.search.includes('redirect=')
            ? `?redirect=${encodeURIComponent(new URLSearchParams(location.search).get('redirect') || '')}`
            : '');
          window.history.replaceState(null, '', cleanUrl);
        } catch {}
        if (!cancelled) setProcessingOAuth(false);
      }
    })();
    return () => { cancelled = true; };
  }, [location.search]);

  // If already signed in, decide where to send them based on the profile state
  // loaded by AuthContext. This avoids sending Google logins to onboarding
  // before the existing profile has been restored.
  useEffect(() => {
    if (loading || processingOAuth || !session || onboardingCompleted === null) return;
    if (onboardingCompleted) {
      navigate(redirectPath ?? '/home', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [session, loading, processingOAuth, onboardingCompleted, navigate, redirectPath]);

  const handleLoginSuccess = () => {
    navigate(redirectPath ?? '/home', { replace: true });
  };

  const handleSignupSuccess = () => {
    // Após o onboarding, o usuário cai em /home. O redirect pós-onboarding
    // é tratado quando o redirect_path é colocado no localStorage.
    if (redirectPath) {
      try { localStorage.setItem('post-onboarding-redirect', redirectPath); } catch {}
    }
    navigate('/onboarding', { replace: true });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-premium-navy flex justify-center">
      <div className="w-full w-full h-[100dvh] relative">
        {processingOAuth || (!!session && onboardingCompleted === null) ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white/80" />
          </div>
        ) : (
          <AuthFlow onLoginSuccess={handleLoginSuccess} onSignupSuccess={handleSignupSuccess} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;
