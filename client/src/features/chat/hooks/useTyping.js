import { useCallback, useState } from 'react';

export default function useTyping({ socket, chatId, currentUserId }) {
  const [typingUsers, setTypingUsers] = useState({});
  const handleTyping = useCallback((isTyping) => {
    if (chatId) socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { chatId });
  }, [chatId, socket]);
  const handleTypingStart = useCallback((userId, eventChatId) => {
    if (eventChatId === chatId && String(userId) !== String(currentUserId)) setTypingUsers((previous) => ({ ...previous, [userId]: true }));
  }, [chatId, currentUserId]);
  const handleTypingStop = useCallback((userId, eventChatId) => {
    if (eventChatId === chatId) setTypingUsers((previous) => ({ ...previous, [userId]: false }));
  }, [chatId]);
  return { typingUsers, handleTyping, handleTypingStart, handleTypingStop };
}
