import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiMusic, FiBookOpen, FiSmile, FiVideo, FiSend, FiTrash2, FiGrid, FiList, FiStar, FiClock } from 'react-icons/fi';
import { bookmarkService } from '../../services/api';
import { toast } from 'sonner';
import { PanelHeader, Panel, ScrollArea, EmptyState, Skeleton, Chip, SearchInput, IconButton, GlassCard } from '../ui';
import VirtualizedList from '../ui/VirtualizedList';

const categories = [
  { id: 'all', label: 'All', icon: null }, { id: 'favorites', label: 'Favorites', icon: FiStar },
  { id: 'recent', label: 'Recent', icon: FiClock }, { id: 'ai', label: 'AI', icon: null },
  { id: 'shayari', label: 'Shayari', icon: FiBookOpen }, { id: 'song', label: 'Songs', icon: FiMusic },
  { id: 'emoji', label: 'Emojis', icon: FiSmile }, { id: 'video', label: 'Videos', icon: FiVideo },
];

const filterParams = (filterType, search) => ({
  ...(filterType === 'favorites' ? { favorite: 'true' } : {}),
  ...(filterType === 'recent' ? { sort: 'recent' } : {}),
  ...(filterType === 'ai' ? { source: 'ai' } : {}),
  ...(filterType !== 'all' && !['favorites', 'recent', 'ai'].includes(filterType) ? { type: filterType } : {}),
  ...(search ? { search } : {}),
});

const updateInfinitePages = (data, key, updater) => data?.pages ? {
  ...data,
  pages: data.pages.map((page) => ({ ...page, bookmarks: updater(page.bookmarks || [], key[2]) })),
} : data;

export default function BookmarksPanel({ userId, onSendBookmark, onClose }) {
  const [filterType, setFilterType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [pendingAction, setPendingAction] = useState(null);
  const [openBookmarkId, setOpenBookmarkId] = useState(null);
  const queryClient = useQueryClient();
  const loadMoreRef = useRef(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const params = useMemo(() => filterParams(filterType, search), [filterType, search]);
  const bookmarksQuery = useInfiniteQuery({
    queryKey: ['bookmarks', userId, params], enabled: Boolean(userId), initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const { data } = await bookmarkService.getAll({ ...params, ...(pageParam ? { cursor: pageParam } : {}) });
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
    maxPages: 10,
  });
  const detailQuery = useQuery({
    queryKey: ['bookmark', userId, openBookmarkId],
    enabled: Boolean(userId && openBookmarkId),
    queryFn: async () => (await bookmarkService.getOne(openBookmarkId)).data.bookmark,
    staleTime: 60_000,
  });

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !bookmarksQuery.hasNextPage) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !bookmarksQuery.isFetchingNextPage) bookmarksQuery.fetchNextPage();
    }, { rootMargin: '240px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [bookmarksQuery.hasNextPage, bookmarksQuery.isFetchingNextPage, bookmarksQuery.fetchNextPage]);

  const bookmarks = useMemo(() => bookmarksQuery.data?.pages?.flatMap((page) => page.bookmarks || []) || [], [bookmarksQuery.data]);

  const updateCachedBookmarks = (bookmarkId, updater) => {
    queryClient.getQueriesData({ queryKey: ['bookmarks', userId] }).forEach(([key, data]) => {
      queryClient.setQueryData(key, updateInfinitePages(data, key, (items, queryParams) => updater(items, queryParams, bookmarkId)));
    });
  };

  const handleDelete = async (id) => {
    if (pendingAction) return;
    setPendingAction(`delete:${id}`);
    const snapshots = queryClient.getQueriesData({ queryKey: ['bookmarks', userId] });
    updateCachedBookmarks(id, (items, _queryParams, bookmarkId) => items.filter((b) => b._id !== bookmarkId));
    try { await bookmarkService.delete(id); toast.success('Bookmark removed'); }
    catch (error) { snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data)); toast.error(error.response?.data?.error || 'Failed to delete bookmark'); }
    finally { setPendingAction(null); }
  };

  const handleFavorite = async (bookmark) => {
    if (pendingAction) return;
    const nextValue = !bookmark.isFavorite;
    setPendingAction(`favorite:${bookmark._id}`);
    const snapshots = queryClient.getQueriesData({ queryKey: ['bookmarks', userId] });
    updateCachedBookmarks(bookmark._id, (items, queryParams, bookmarkId) => items.map((item) => item._id === bookmarkId ? { ...item, isFavorite: nextValue } : item).filter((item) => queryParams?.favorite === 'true' ? item.isFavorite : true));
    try {
      const { data } = await bookmarkService.setFavorite(bookmark._id, nextValue);
      updateCachedBookmarks(bookmark._id, (items, queryParams, bookmarkId) => items.map((item) => item._id === bookmarkId ? data.bookmark : item).filter((item) => queryParams?.favorite === 'true' ? item.isFavorite : true));
    } catch (error) { snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data)); toast.error(error.response?.data?.error || 'Failed to update favorite'); }
    finally { setPendingAction(null); }
  };

  const handleSend = async (bookmark) => {
    if (pendingAction || !onSendBookmark || !bookmark) return false;
    setPendingAction(`send:${bookmark._id}`);
    try {
      return await onSendBookmark(bookmark);
    } finally {
      setPendingAction(null);
    }
  };
  const getIcon = (type) => ({ shayari: '💫', song: '🎵', emoji: '😊', video: '📹' }[type] || '🔖');
  const getPreview = (bookmark) => {
    if (bookmark.contentPreview) return bookmark.contentPreview;
    if (bookmark.metadata?.emoji) return bookmark.metadata.emoji;
    if (bookmark.metadata?.shayari) return bookmark.metadata.shayari;
    if (bookmark.metadata?.songTitle) return [bookmark.metadata.songTitle, bookmark.metadata.songArtist].filter(Boolean).join(' · ');
    return bookmark.metadata?.videoQuery || bookmark.content || 'Saved item';
  };
  const getSourceLabel = (bookmark) => `${bookmark.source || 'other'} · ${bookmark.type || 'saved'}`;
  const gridRows = useMemo(() => { const rows = []; for (let i = 0; i < bookmarks.length; i += 2) rows.push(bookmarks.slice(i, i + 2)); return rows; }, [bookmarks]);
  const renderActions = (bookmark) => <div className="flex items-center gap-1 flex-shrink-0"><IconButton icon={FiStar} size="xs" onClick={() => handleFavorite(bookmark)} active={bookmark.isFavorite} disabled={Boolean(pendingAction)} label={bookmark.isFavorite ? 'Remove favorite' : 'Add favorite'} /><IconButton icon={FiSend} size="xs" onClick={() => handleSend(bookmark)} disabled={Boolean(pendingAction)} label="Send" /><IconButton icon={FiTrash2} size="xs" onClick={() => handleDelete(bookmark._id)} disabled={Boolean(pendingAction)} label="Delete" /></div>;
  const noResultsTitle = search ? `No bookmarks found for “${search}”` : filterType === 'favorites' ? 'No favorite bookmarks' : filterType === 'recent' ? 'No recent bookmarks' : 'No bookmarks yet';
  const noResultsDescription = search ? 'Try a different search term.' : 'Save AI suggestions for later';

  return <Panel>
    <PanelHeader title="Knowledge Library" subtitle="Your saved content" onClose={onClose} actions={<div className="flex gap-1"><IconButton icon={FiGrid} size="xs" onClick={() => setViewMode('grid')} active={viewMode === 'grid'} label="Grid view" /><IconButton icon={FiList} size="xs" onClick={() => setViewMode('list')} active={viewMode === 'list'} label="List view" /></div>} />
    <div className="px-4 py-2"><SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search bookmarks..." /></div>
    <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-border dark:border-border-dark">{categories.map((cat) => { const Icon = cat.icon; return <Chip key={cat.id} icon={Icon} active={filterType === cat.id} onClick={() => setFilterType(cat.id)} size="xs" variant="ghost">{cat.label}</Chip>; })}</div>
    {openBookmarkId && <div className="mx-3 mt-3 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-3"><div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">Bookmark details</p><button type="button" onClick={() => setOpenBookmarkId(null)} className="text-xs text-text-secondary">Close</button></div>{detailQuery.isLoading ? <Skeleton height={60} /> : detailQuery.isError ? <p className="text-xs text-danger">Unable to load bookmark.</p> : <><p className="text-sm whitespace-pre-wrap break-words text-text-primary dark:text-text-primary-dark">{detailQuery.data?.content || detailQuery.data?.metadata?.shayari || detailQuery.data?.metadata?.songTitle || detailQuery.data?.metadata?.emoji || 'Saved item'}</p><button type="button" onClick={() => handleSend(detailQuery.data)} className="mt-3 text-xs text-primary dark:text-primary-dark font-medium">Send to chat</button></>}</div>}
    <ScrollArea className="flex-1 p-3 space-y-2">
      {bookmarksQuery.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={60} />)
        : bookmarksQuery.isError ? <EmptyState icon="bookmark" title={isOnline ? 'Unable to load bookmarks' : 'You’re offline'} description={isOnline ? (bookmarksQuery.error?.response?.data?.error || 'Please try again.') : 'Reconnect to load your Knowledge Library.'} action={<button type="button" onClick={() => bookmarksQuery.refetch()} className="text-xs text-primary dark:text-primary-dark font-medium">Retry</button>} />
          : bookmarks.length === 0 ? <EmptyState icon="bookmark" title={noResultsTitle} description={noResultsDescription} />
            : viewMode === 'grid' ? <VirtualizedList items={gridRows} itemHeight={154} className="h-full" renderItem={(row) => <div className="grid grid-cols-2 gap-2 px-0.5">{row.map((bookmark) => <GlassCard key={bookmark._id} className="p-3 relative" hover><button type="button" className="w-full text-left" onClick={() => setOpenBookmarkId(bookmark._id)} title="Open bookmark"><div className="text-2xl mb-2">{getIcon(bookmark.type)}</div><p className="text-[9px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">{getSourceLabel(bookmark)}</p><p className="text-xs text-text-primary dark:text-text-primary-dark line-clamp-2">{getPreview(bookmark)}</p><p className="text-[9px] text-text-secondary dark:text-text-secondary-dark mt-1">Used {bookmark.usageCount || 0} times</p></button><div className="flex justify-end mt-2">{renderActions(bookmark)}</div></GlassCard>)}</div>} />
              : <VirtualizedList items={bookmarks} itemHeight={78} className="h-full" renderItem={(bookmark) => <GlassCard key={bookmark._id} className="p-3 flex items-center gap-3" hover><button type="button" className="w-10 h-10 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center text-lg flex-shrink-0" onClick={() => setOpenBookmarkId(bookmark._id)} title="Open bookmark">{getIcon(bookmark.type)}</button><button type="button" className="flex-1 min-w-0 text-left" onClick={() => setOpenBookmarkId(bookmark._id)}><p className="text-[9px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">{getSourceLabel(bookmark)}</p><p className="text-xs text-text-primary dark:text-text-primary-dark truncate">{getPreview(bookmark)}</p><p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-0.5">Used {bookmark.usageCount || 0} times</p></button>{renderActions(bookmark)}</GlassCard>} />}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">{bookmarksQuery.isFetchingNextPage && <span className="text-xs text-text-secondary">Loading more…</span>}{bookmarksQuery.hasNextPage && !bookmarksQuery.isFetchingNextPage && <button type="button" onClick={() => bookmarksQuery.fetchNextPage()} className="text-xs text-primary">Load more</button>}{!bookmarksQuery.hasNextPage && bookmarks.length > 0 && <span className="text-[10px] text-text-secondary">End of library</span>}{bookmarksQuery.isFetchNextPageError && <button type="button" onClick={() => bookmarksQuery.fetchNextPage()} className="text-xs text-primary">Retry</button>}</div>
    </ScrollArea>
  </Panel>;
}
