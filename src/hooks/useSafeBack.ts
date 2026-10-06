import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * "Voltar" para páginas de rota: volta no histórico quando existe uma entrada
 * anterior do app; se a página foi aberta direto (deep link / primeira tela),
 * vai para `fallback` em vez de ficar preso ou sair do app.
 */
export function useSafeBack(fallback = '/home') {
  const navigate = useNavigate();
  return useCallback(() => {
    // React Router (BrowserRouter) guarda o índice da entrada em history.state.idx.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
