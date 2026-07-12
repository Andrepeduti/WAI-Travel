import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingFlow } from '@/components/auth/OnboardingFlow';
import { OnboardingLoading } from '@/components/auth/OnboardingLoading';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingData {
  name: string;
  username: string;
  city: string;
  birthdate: string;
  interests: string[];
  goals: string[];
}

function slugifyUsername(name: string): string {
  if (!name) return '';
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return base ? `${base}` : '';
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { session, loading: authLoading, refreshOnboardingStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingData, setPendingData] = useState<OnboardingData | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [resumeStep, setResumeStep] = useState<number>(0);

  // Must be authenticated to be here. We allow re-entering /onboarding even
  // if it was already completed (useful for previewing / testing the flow).
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      navigate('/login', { replace: true });
    }
  }, [session, authLoading, navigate]);


  const handleComplete = (data: OnboardingData) => {
    setPendingData(data);
    setUsernameError(null);
    setIsLoading(true);
  };

  const handleLoadingComplete = async () => {
    if (!session || !pendingData) {
      navigate('/', { replace: true });
      return;
    }

    // Use user-chosen username; fall back to a derived/random one if missing
    const baseUsername = slugifyUsername(pendingData.name);
    const username =
      pendingData.username?.trim().toLowerCase() ||
      (baseUsername
        ? `${baseUsername}${Math.floor(Math.random() * 9000 + 1000)}`
        : `user${Math.floor(Math.random() * 90000 + 10000)}`);

    const { error } = await supabase
      .from('profiles')
      .update({
        name: pendingData.name,
        location: pendingData.city,
        birthdate: pendingData.birthdate,
        interests: pendingData.interests,
        goals: pendingData.goals,
        username,
        onboarding_completed: true,
      })
      .eq('user_id', session.user.id);

    if (error) {
      console.error('[Onboarding] update error:', error);
      const isUsernameTaken =
        (error as { code?: string }).code === '23505' ||
        /profiles_username_key/i.test(error.message || '');
      if (isUsernameTaken) {
        setUsernameError(`O @${username} já está em uso. Escolha outro.`);
        setResumeStep(6);
        setIsLoading(false);
        toast.error('Este @ já está em uso. Escolha outro.');
        return;
      }
      toast.error('Não foi possível salvar seu perfil. Tente novamente.');
      setIsLoading(false);
      return;
    }
    // Atualiza o status no contexto para que o guard global não rebata o usuário.
    await refreshOnboardingStatus();
    // Retoma deep link salvo antes do signup (ex.: roteiro compartilhado).
    let target = '/';
    try {
      const saved = localStorage.getItem('post-onboarding-redirect');
      if (saved && saved.startsWith('/') && !saved.startsWith('//')) {
        target = saved;
        localStorage.removeItem('post-onboarding-redirect');
      }
    } catch {}
    navigate(target, { replace: true });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-background flex justify-center text-4xl">
      <div className="w-full w-full h-[100dvh] relative">
        {isLoading ? (
          <OnboardingLoading onComplete={handleLoadingComplete} />
        ) : (
          <OnboardingFlow
            onComplete={handleComplete}
            initialStep={resumeStep}
            initialData={pendingData ?? undefined}
            usernameError={usernameError}
          />
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
