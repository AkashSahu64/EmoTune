const socketsBySession = new Map();
const socketsByUser = new Map();

function register(socket) {
  const sessionId = socket.sessionId;
  const userId = socket.userId;
  if (sessionId) {
    if (!socketsBySession.has(sessionId)) socketsBySession.set(sessionId, new Set());
    socketsBySession.get(sessionId).add(socket);
  }
  if (userId) {
    if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
    socketsByUser.get(userId).add(socket);
  }
}

function unregister(socket) {
  for (const [key, sockets] of socketsBySession) {
    sockets.delete(socket);
    if (sockets.size === 0) socketsBySession.delete(key);
  }
  for (const [key, sockets] of socketsByUser) {
    sockets.delete(socket);
    if (sockets.size === 0) socketsByUser.delete(key);
  }
}

function disconnectSession(sessionId, reason = 'session_revoked') {
  const sockets = socketsBySession.get(sessionId) || [];
  for (const socket of sockets) socket.disconnect(true, reason);
}

function disconnectUser(userId, excludeSessionId = null) {
  const sockets = socketsByUser.get(userId) || [];
  for (const socket of sockets) {
    if (!excludeSessionId || socket.sessionId !== excludeSessionId) {
      socket.disconnect(true, 'user_sessions_revoked');
    }
  }
}

module.exports = { register, unregister, disconnectSession, disconnectUser };
