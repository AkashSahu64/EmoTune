import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../../../services/api';

export default function useMessages(chatId, activeIntent = 'all') {
  const queryClient = useQueryClient();
  const key = ['messages', chatId, activeIntent];
  const messagesQuery = useQuery({
    queryKey: key,
    enabled: Boolean(chatId),
    queryFn: async ({ signal }) => {
      const { data } = await messageService.get(chatId, {
        intent: activeIntent !== 'all' ? activeIntent : undefined,
      }, { signal });
      return data.messages || [];
    },
  });

  const setMessages = useCallback((updater) => {
    queryClient.setQueryData(key, (previous = []) => (
      typeof updater === 'function' ? updater(previous) : updater
    ));
  }, [key, queryClient]);

  const fetchMessages = useCallback(() => messagesQuery.refetch(), [messagesQuery.refetch]);

  return {
    messages: messagesQuery.data || [],
    setMessages,
    // Background refetches must not replace an already usable chat with a
    // loading skeleton. Only the first load is blocking for this view.
    loadingMessages: messagesQuery.isLoading,
    fetchMessages,
  };
}
