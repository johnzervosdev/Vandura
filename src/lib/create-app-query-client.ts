import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { emitGlobalToast } from '@/lib/global-toast-dispatcher';

type QueryMeta = { suppressGlobalError?: boolean };
type MutationMeta = { suppressGlobalToast?: boolean };

export function createAppQueryClient() {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      const meta = query.meta as QueryMeta | undefined;
      if (meta?.suppressGlobalError) return;
      emitGlobalToast(getApiErrorMessage(error));
    },
  });

  const mutationCache = new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const meta = mutation.meta as MutationMeta | undefined;
      if (meta?.suppressGlobalToast) return;
      emitGlobalToast(getApiErrorMessage(error));
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        retry: 1,
      },
    },
  });
}
