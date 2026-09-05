import { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { clearAccessToken } from '../services/accessToken';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  const updateOnlineUsers = useCallback((userId, status) => {
    setOnlineUsers((prev) => {
      const next = new Set(prev);
      if (status) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers(new Set());
      return;
    }

    if (socketRef.current?.connected) return;

    const fingerprint = localStorage.getItem('emotune_device_fingerprint') || '';

    const newSocket = io('/', {
      auth: {
        token,
        deviceFingerprint: fingerprint,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', (error) => {
      const message = String(error?.message || '').toLowerCase();
      console.error('Socket error:', error.message);
      // An expired/revoked token cannot succeed through reconnect attempts.
      // Stop the retry storm and let the API auth lifecycle restore or redirect.
      if (message.includes('invalid token') || message.includes('authentication required') || message.includes('session')) {
        newSocket.io.opts.reconnection = false;
        newSocket.disconnect();
        clearAccessToken();
      }
    });

    newSocket.on('onlineUsers:list', ({ onlineUserIds }) => {
      setOnlineUsers(new Set(onlineUserIds));
    });

    newSocket.on('user:online', ({ userId }) => {
      updateOnlineUsers(userId, true);
    });

    newSocket.on('user:offline', ({ userId }) => {
      updateOnlineUsers(userId, false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, updateOnlineUsers]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}
