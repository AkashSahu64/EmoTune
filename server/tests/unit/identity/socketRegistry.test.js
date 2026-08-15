const registry = require('../../../socketRegistry');

describe('socket registry', () => {
  it('disconnects sockets by session and user', () => {
    const disconnect = jest.fn();
    const socket = { sessionId: 'session-1', userId: 'user-1', disconnect };
    registry.register(socket);
    registry.disconnectSession('session-1', 'revoked');
    expect(disconnect).toHaveBeenCalled();
    registry.unregister(socket);
  });
});
