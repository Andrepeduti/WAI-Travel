import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FollowListScreen } from '@/components/screens/FollowListScreen';
import { BackButton } from '@/components/ui/BackButton';
import { getProfileByUsername, getProfileByUserId } from '@/lib/profilesApi';
import { useAuth } from '@/contexts/AuthContext';

interface FollowListPageProps {
  initialTab: 'followers' | 'following';
}

const FollowListPage = ({ initialTab }: FollowListPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const params = useParams<{ username?: string }>();
  const passed = (location.state as { friend?: { userId?: string; username?: string; name?: string; followers?: string | number; following?: number } } | null)?.friend;

  const formatLabel = (val: string) => {
    if (!val || val === 'Perfil' || val.includes(' ')) return val;
    return val.startsWith('@') ? val : `@${val}`;
  };

  const [resolved, setResolved] = useState<{ userId: string; label: string } | null>(() => {
    if (passed?.userId) {
      const label = passed.username ? formatLabel(passed.username) : (passed.name || 'Perfil');
      return { userId: passed.userId, label };
    }
    return null;
  });
  const [loading, setLoading] = useState(!resolved);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Caso "meu próprio perfil" via rota /me/...
      if (!params.username && user?.id) {
        const p = await getProfileByUserId(user.id);
        if (cancelled) return;
        if (p) setResolved({ userId: p.userId!, label: p.username });
        else setNotFound(true);
        setLoading(false);
        return;
      }
      const handle = params.username?.replace(/^@/, '');
      if (!handle) { setNotFound(true); setLoading(false); return; }
      const p = await getProfileByUsername(handle);
      if (cancelled) return;
      if (p?.userId) setResolved({ userId: p.userId, label: p.username });
      else if (!resolved) setNotFound(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username, user?.id]);

  if (loading && !resolved) {
    return (
      <div className="min-h-screen bg-background w-full">
        <div className="w-full bg-background min-h-screen flex flex-col" style={{ minHeight: '100dvh' }}>
          <div className="sticky z-20 bg-background border-b border-border px-4 flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
            <BackButton onClick={() => navigate(-1)} />
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate" style={{ fontSize: 15, fontWeight: 700 }}></p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !resolved) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="w-full bg-background min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="text-base font-semibold text-foreground">Perfil não encontrado</span>
          <button onClick={() => navigate('/home')} className="mt-2 text-sm font-medium text-primary">Voltar para o início</button>
        </div>
      </div>
    );
  }

  return (
    <FollowListScreen
      profileUserId={resolved.userId}
      profileLabel={resolved.label}
      initialTab={initialTab}
      initialFollowersCount={passed?.followers}
      initialFollowingCount={passed?.following}
      onBack={() => navigate(-1)}
    />
  );
};

export default FollowListPage;
