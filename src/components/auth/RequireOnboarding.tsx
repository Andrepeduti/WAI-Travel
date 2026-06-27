import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RequireOnboardingProps {
  children: ReactNode;
}

/**
 * Garante que qualquer sessão autenticada com onboarding incompleto
 * (perfil sem `onboarding_completed`, `username` ou `name`) seja
 * redirecionada para `/onboarding`. Não força login — apenas faz o gate
 * de onboarding para usuários já autenticados.
 */
export function RequireOnboarding({ children }: RequireOnboardingProps) {
  const { session, loading, onboardingCompleted } = useAuth();
  const location = useLocation();

  // Sem sessão: deixa a rota seguir (telas decidem se exigem login).
  if (!session) return <>{children}</>;

  // Ainda carregando sessão ou status do perfil.
  if (loading || onboardingCompleted === null) {
    return (
      <div className="w-full min-h-[100dvh] bg-premium-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/80" />
      </div>
    );
  }

  // Onboarding pendente: força a tela de onboarding.
  if (onboardingCompleted === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
