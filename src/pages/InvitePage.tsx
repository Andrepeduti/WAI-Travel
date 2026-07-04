import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { acceptInviteByToken } from '@/lib/itineraryMembersApi';
import { toast } from 'sonner';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session?.user?.id) {
      // Redireciona para login mantendo o token
      navigate(`/login?redirect=/convite/${token}`);
      return;
    }
    if (!token) return;
    setStatus('accepting');
    (async () => {
      try {
        const itineraryId = await acceptInviteByToken(token, session.user.id);
        toast.success('Convite aceito!');
        navigate(`/home`, { state: { openCollaboratorItineraryId: itineraryId } });
      } catch (e: any) {
        setError(e?.message || 'Erro ao aceitar convite');
        setStatus('error');
      }
    })();
  }, [token, session, loading, navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-background">
      <div className="text-center">
        {status !== 'error' ? (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-[#9DCC36] border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-[15px] font-medium text-foreground">Processando convite…</p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-medium text-foreground mb-2">Não foi possível aceitar</p>
            <p className="text-[13px] text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => navigate('/home')}
              className="h-10 px-5 rounded-full bg-[#9DCC36] text-[#1A1C40] text-[13px] font-semibold"
            >
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
