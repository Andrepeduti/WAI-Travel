import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Deep link `/r/:datasetId` para compartilhamento de roteiros do marketplace.
 *
 * - Usuário logado: redireciona para `/home` com `state.openMarketplaceItineraryId`,
 *   que `Index` consome para abrir a tela de marketplace do roteiro.
 * - Usuário não logado: redireciona para `/login?redirect=/r/:datasetId`,
 *   preservando o destino original para retomar o fluxo após autenticação.
 */
const SharedItineraryPage = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const id = Number(datasetId);
    if (!Number.isFinite(id) || id <= 0) {
      navigate('/home', { replace: true });
      return;
    }
    if (!session) {
      const target = `/r/${id}`;
      navigate(`/login?redirect=${encodeURIComponent(target)}`, { replace: true });
      return;
    }
    navigate('/home', { replace: true, state: { openMarketplaceItineraryId: id } });
  }, [datasetId, session, loading, navigate]);

  return (
    <div className="w-full min-h-[100dvh] bg-bg flex items-center justify-center">
      <div className="text-secondary/60 text-sm">Abrindo roteiro…</div>
    </div>
  );
};

export default SharedItineraryPage;
