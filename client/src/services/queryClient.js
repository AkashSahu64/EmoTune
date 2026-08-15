import { QueryClient } from '@tanstack/react-query';

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

const STORAGE_KEY = 'emotune-query-cache-v1';
const PERSISTED_PREFIXES = new Set(['chats', 'messages', 'bookmarks', 'stories']);
const isBrowser = typeof window !== 'undefined';

function shouldPersist(query) {
  return query.state.status === 'success' && PERSISTED_PREFIXES.has(String(query.queryKey?.[0]));
}

if (isBrowser) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    saved.forEach(({ queryKey, data, dataUpdatedAt }) => {
      if (Array.isArray(queryKey)) queryClient.setQueryData(queryKey, data, { updatedAt: dataUpdatedAt || Date.now() });
    });
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  let persistTimer;
  const persist = () => {
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      try {
        const entries = queryClient.getQueryCache().getAll().filter(shouldPersist).map((query) => ({
          queryKey: query.queryKey,
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
        }));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch { /* Cache persistence is best effort. */ }
    }, 150);
  };
  queryClient.getQueryCache().subscribe(persist);

  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('emotune-query-sync') : null;
  let applyingRemote = false;
  channel?.addEventListener('message', (event) => {
    const { type, queryKey, data } = event.data || {};
    if (type !== 'query-update' || !Array.isArray(queryKey)) return;
    applyingRemote = true;
    queryClient.setQueryData(queryKey, data);
    applyingRemote = false;
  });
  const originalSetQueryData = queryClient.setQueryData.bind(queryClient);
  queryClient.setQueryData = (...args) => {
    const result = originalSetQueryData(...args);
    if (!applyingRemote && channel && Array.isArray(args[0]) && PERSISTED_PREFIXES.has(String(args[0][0]))) {
      channel.postMessage({ type: 'query-update', queryKey: args[0], data: result });
    }
    return result;
  };
  window.addEventListener('online', () => queryClient.invalidateQueries());
}
