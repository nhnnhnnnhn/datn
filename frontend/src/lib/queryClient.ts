import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { logFailure } from '@/lib/logFailure'

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { tag: string }
    mutationMeta: { tag: string }
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) =>
      logFailure(createLogger(query.meta?.tag ?? 'HTTP'), `load failed ${JSON.stringify(query.queryKey)}`, err),
  }),
  mutationCache: new MutationCache({
    onError: (err, _variables, _result, mutation) =>
      logFailure(createLogger(mutation.meta?.tag ?? 'HTTP'), 'action failed', err),
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})
