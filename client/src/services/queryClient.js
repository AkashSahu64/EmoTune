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
// Message pages can grow very large and are already fetched with a stable
// server-side pagination contract. Persist lightweight navigation/feed data,
// but keep message pages out of the synchronous localStorage snapshot.
const PERSISTED_PREFIXES = new Set(['chats', 'bookmarks', 'stories']);
const isBrowser = typeof window !== 'undefined';

const isSafePersistedKey = (queryKey) => {
  if (!Array.isArray(queryKey)) return false;
  // Bookmark entries created before Phase 1 were not user-scoped and must
  // never be restored or broadcast into an authenticated session.
  if (String(queryKey[0]) === 'bookmarks') return typeof queryKey[1] === 'string' && queryKey.length >= 3;
  return true;
};

function shouldPersist(query) {
  return query.state.status === 'success' && PERSISTED_PREFIXES.has(String(query.queryKey?.[0])) && isSafePersistedKey(query.queryKey);
}

if (isBrowser) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    saved.forEach(({ queryKey, data, dataUpdatedAt }) => {
      if (isSafePersistedKey(queryKey)) queryClient.setQueryData(queryKey, data, { updatedAt: dataUpdatedAt || Date.now() });
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
          data: String(query.queryKey?.[0]) === 'bookmarks' && query.state.data?.pages
            ? { ...query.state.data, pages: query.state.data.pages.slice(0, 2), pageParams: query.state.data.pageParams?.slice(0, 2) }
            : query.state.data,
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
    if (!Array.isArray(queryKey)) return;
    if (!isSafePersistedKey(queryKey)) return;
    if (type === 'query-invalidate') {
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
      return;
    }
    if (type !== 'query-update') return;
    applyingRemote = true;
    queryClient.setQueryData(queryKey, data);
    applyingRemote = false;
  });
  const originalSetQueryData = queryClient.setQueryData.bind(queryClient);
  queryClient.setQueryData = (...args) => {
    const result = originalSetQueryData(...args);
    if (!applyingRemote && channel && Array.isArray(args[0]) && PERSISTED_PREFIXES.has(String(args[0][0]))) {
      channel.postMessage({
        type: String(args[0][0]) === 'bookmarks' ? 'query-invalidate' : 'query-update',
        queryKey: args[0],
        ...(String(args[0][0]) === 'bookmarks' ? {} : { data: result }),
      });
    }
    return result;
  };
  window.addEventListener('online', () => {
    // Revalidate mounted queries after reconnect. Keeping inactive cache
    // entries untouched avoids a full-cache refetch storm.
    queryClient.invalidateQueries({
      refetchType: 'active',
    });
  });
}
