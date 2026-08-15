import { useEffect, useRef } from 'react';

const EVENTS = [
  'message:delivered', 'message:read', 'message:receive', 'newChat',
  'typing:start', 'typing:stop', 'message:edited', 'message:deleted',
  'silent:accepted', 'message:pinned', 'message:reaction', 'user:profileUpdated',
];

/** Registers Dashboard chat events once per socket instance. Callback refs
 * keep the subscription stable while active-chat state changes. */
export default function useChatSocket({ socket, handlers }) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!socket) return undefined;

    const eventHandlers = {
      'message:delivered': (data) => handlersRef.current.onDelivered?.(data),
      'message:read': (data) => handlersRef.current.onRead?.(data),
      'message:receive': (data) => handlersRef.current.onMessage?.(data),
      newChat: (data) => handlersRef.current.onNewChat?.(data),
      'typing:start': (data) => handlersRef.current.onTypingStart?.(data),
      'typing:stop': (data) => handlersRef.current.onTypingStop?.(data),
      'message:edited': (data) => handlersRef.current.onEdited?.(data),
      'message:deleted': (data) => handlersRef.current.onDeleted?.(data),
      'silent:accepted': (data) => handlersRef.current.onSilentAccepted?.(data),
      'message:pinned': (data) => handlersRef.current.onPinned?.(data),
      'message:reaction': (data) => handlersRef.current.onReaction?.(data),
      'user:profileUpdated': (data) => handlersRef.current.onProfileUpdated?.(data),
    };

    EVENTS.forEach((event) => socket.on(event, eventHandlers[event]));
    return () => EVENTS.forEach((event) => socket.off(event, eventHandlers[event]));
  }, [socket]);
}
