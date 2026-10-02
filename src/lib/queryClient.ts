import { QueryClient } from '@tanstack/react-query';

/**
 * Instância única do React Query. Fica fora do App para que módulos não-React
 * (ex.: atualizações otimistas de roteiros) possam ler/escrever no mesmo cache.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
