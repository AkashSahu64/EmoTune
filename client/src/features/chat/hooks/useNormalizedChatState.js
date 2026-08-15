import { useMemo } from 'react';

/** Provides stable entity indexes over the query-backed chat state. The
 * canonical data remains in TanStack Query; these maps are derived indexes,
 * so there is no second mutable source of truth to drift out of sync. */
export default function useNormalizedChatState({ chats = [], messages = [], typingUsers = {}, presence = new Map(), activeChatId = null }) {
  return useMemo(() => ({
    chatsById: Object.fromEntries(chats.filter((chat) => chat?._id).map((chat) => [chat._id, chat])),
    chatIds: chats.map((chat) => chat._id).filter(Boolean),
    messagesById: Object.fromEntries(messages.filter((message) => message?._id).map((message) => [message._id, message])),
    messageIds: messages.map((message) => message._id).filter(Boolean),
    unreadByChat: Object.fromEntries(chats.map((chat) => [chat._id, chat.unreadCount || 0])),
    typingByChat: activeChatId ? { [activeChatId]: typingUsers } : {},
    presenceByUser: presence,
    activeChatId,
  }), [chats, messages, typingUsers, presence, activeChatId]);
}
