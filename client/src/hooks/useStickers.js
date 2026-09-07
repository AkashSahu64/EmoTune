import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import stickerService from '../services/stickerService';

// MongoDB is the source of truth for saved stickers; these hooks are only a
// cache over it. Every key is scoped by user id so a logout/login never shows
// the previous account's library from cache.
export const stickerListKey = (userId, params = {}) => ['stickers', userId, params];
export const stickerDetailKey = (userId, stickerId) => ['sticker', userId, stickerId];

const PAGE_SIZE = 24;

export const newClientMutationId = () => (
  globalThis.crypto?.randomUUID?.() || `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const listParams = ({ search = '', favorite = false, assetType = '', sort = 'recent', limit = PAGE_SIZE } = {}) => {
  const params = { sort, limit };
  if (search.trim()) params.search = search.trim();
  if (favorite) params.favorite = 'true';
  if (assetType) params.assetType = assetType;
  return params;
};

export function useCurrentUserId() {
  const { user } = useAuth();
  return user?._id ? String(user._id) : '';
}

/** Cursor-paginated "My Stickers" library for the signed-in user. */
export function useStickerLibrary(filters = {}, { enabled = true } = {}) {
  const userId = useCurrentUserId();
  const params = useMemo(() => listParams(filters), [filters.search, filters.favorite, filters.assetType, filters.sort, filters.limit]);

  const query = useInfiniteQuery({
    queryKey: stickerListKey(userId, params),
    enabled: Boolean(userId) && enabled,
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => stickerService.list(
      { ...params, ...(pageParam ? { cursor: pageParam } : {}) },
      { signal },
    ),
    getNextPageParam: (lastPage) => (lastPage?.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined),
    maxPages: 20,
  });

  const stickers = useMemo(
    () => query.data?.pages?.flatMap((page) => page.stickers || []) || [],
    [query.data],
  );

  return { ...query, params, stickers };
}

/** Full sticker including the editor project, for reopening it in the studio. */
export function useSticker(stickerId, { enabled = true } = {}) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: stickerDetailKey(userId, stickerId),
    enabled: Boolean(userId && stickerId) && enabled,
    queryFn: ({ signal }) => stickerService.get(stickerId, { signal }),
    staleTime: 60_000,
  });
}

// Mutations touch many cached list variants at once (search, favourites-only,
// sort orders), so they patch every matching entry rather than one key.
function useStickerCacheWriter() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  const patchLists = useCallback((updater) => {
    const snapshots = queryClient.getQueriesData({ queryKey: ['stickers', userId] });
    snapshots.forEach(([key, data]) => {
      if (!data?.pages) return;
      const params = key[2] || {};
      queryClient.setQueryData(key, {
        ...data,
        pages: data.pages.map((page) => ({ ...page, stickers: updater(page.stickers || [], params) })),
      });
    });
    return snapshots;
  }, [queryClient, userId]);

  const restore = useCallback((snapshots = []) => {
    snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
  }, [queryClient]);

  const invalidateLists = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['stickers', userId] }),
    [queryClient, userId],
  );

  return { queryClient, userId, patchLists, restore, invalidateLists };
}

/**
 * Saves a sticker to the library. `stickerId` present means "update the
 * project I reopened"; absent means "create a new one".
 *
 * The caller passes a stable clientMutationId, so a double-clicked or retried
 * save resolves to the sticker the first request created instead of a copy.
 */
export function useSaveSticker() {
  const { queryClient, userId, invalidateLists } = useStickerCacheWriter();

  return useMutation({
    mutationFn: ({ stickerId, payload, onProgress, signal }) => (stickerId
      ? stickerService.update(stickerId, payload, { onProgress, signal })
      : stickerService.create(payload, { onProgress, signal })),
    onSuccess: (data) => {
      if (data?.sticker?._id) {
        queryClient.setQueryData(stickerDetailKey(userId, String(data.sticker._id)), { sticker: data.sticker, canEdit: true });
      }
      return invalidateLists();
    },
  });
}

export function useDeleteSticker() {
  const { queryClient, userId, patchLists, restore, invalidateLists } = useStickerCacheWriter();

  return useMutation({
    mutationFn: (stickerId) => stickerService.remove(stickerId),
    onMutate: (stickerId) => ({ snapshots: patchLists((items) => items.filter((item) => item._id !== stickerId)) }),
    onError: (_error, _stickerId, context) => restore(context?.snapshots),
    onSuccess: (_data, stickerId) => {
      queryClient.removeQueries({ queryKey: stickerDetailKey(userId, stickerId) });
      return invalidateLists();
    },
  });
}

export function useToggleStickerFavorite() {
  const { patchLists, restore, invalidateLists } = useStickerCacheWriter();

  return useMutation({
    mutationFn: ({ stickerId, isFavorite }) => stickerService.setFavorite(stickerId, isFavorite),
    onMutate: ({ stickerId, isFavorite }) => ({
      // A favourites-only list must drop an unfavourited sticker immediately,
      // otherwise the optimistic row contradicts its own filter.
      snapshots: patchLists((items, params) => items
        .map((item) => (item._id === stickerId ? { ...item, isFavorite } : item))
        .filter((item) => (params.favorite === 'true' ? item.isFavorite : true))),
    }),
    onError: (_error, _variables, context) => restore(context?.snapshots),
    onSuccess: (data, { stickerId }) => {
      if (data?.sticker) patchLists((items) => items.map((item) => (item._id === stickerId ? { ...item, ...data.sticker } : item)));
      return invalidateLists();
    },
  });
}

/** Counts a use, which also drives the "recently used" sort. */
export function useMarkStickerUsed() {
  const { patchLists } = useStickerCacheWriter();

  return useMutation({
    mutationFn: (stickerId) => stickerService.markUsed(stickerId),
    onSuccess: (data, stickerId) => {
      if (!data?.sticker) return;
      patchLists((items) => items.map((item) => (item._id === stickerId ? { ...item, ...data.sticker } : item)));
    },
  });
}
