// Shared Socket.IO bridge for services that do not receive the server
// instance through request context. It is initialized once during startup.
let io = null;

module.exports = {
  set(instance) {
    io = instance;
  },

  to(room) {
    return io?.to(room);
  },

  emit(...args) {
    return io?.emit(...args);
  },

  get instance() {
    return io;
  },
};
