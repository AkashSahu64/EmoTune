import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

/**
 * Owns the chat-list lifecycle for the dashboard. The hook intentionally
 * exposes setChats/updateChat during the migration so existing socket and
 * modal flows can keep their current behavior while the page is decomposed.
 */
export default function useChats() {
  const queryClient = useQueryClient();
  const chatsQuery = useQuery({
    queryKey: ['chats'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get('/chats', { signal });
      return data.chats || [];
    },
  });

  const fetchChats = useCallback(() => chatsQuery.refetch(), [chatsQuery.refetch]);

  const updateChat = useCallback((chatId, updater) => {
    queryClient.setQueryData(['chats'], (previous = []) => previous.map((chat) => (
      chat._id === chatId
        ? (typeof updater === 'function' ? updater(chat) : { ...chat, ...updater })
        : chat
    )));
  }, [queryClient]);

  const upsertChat = useCallback((chat) => {
    if (!chat?._id) return;
    queryClient.setQueryData(['chats'], (previous = []) => {
      const existing = previous.find((item) => item._id === chat._id);
      if (!existing) return [chat, ...previous];
      return [
        { ...existing, ...chat },
        ...previous.filter((item) => item._id !== chat._id),
      ];
    });
  }, [queryClient]);

  const applyMessageEvent = useCallback((message, currentUserId) => {
    const chatId = message?.chat?._id || message?.chat;
    if (!chatId) return;
    queryClient.setQueryData(['chats'], (previous = []) => {
      const current = previous.find((chat) => chat._id === chatId);
      if (!current) return previous;
      const senderId = message.sender?._id || message.sender;
      const isOwn = String(senderId) === String(currentUserId);
      const updated = {
        ...current,
        lastMessage: {
          content: message.content || '',
          sender: message.sender,
          type: message.type || 'text',
          createdAt: message.createdAt || new Date().toISOString(),
        },
        updatedAt: message.createdAt || new Date().toISOString(),
        unreadCount: isOwn ? (current.unreadCount || 0) : (current.unreadCount || 0) + 1,
      };
      return [updated, ...previous.filter((chat) => chat._id !== chatId)];
    });
  }, [queryClient]);

  const setChats = useCallback((value) => {
    queryClient.setQueryData(['chats'], value);
  }, [queryClient]);

  return {
    chats: chatsQuery.data || [],
    setChats,
    loadingChats: chatsQuery.isLoading,
    fetchChats,
    updateChat,
    upsertChat,
    applyMessageEvent,
  };
}
