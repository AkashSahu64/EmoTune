// Compatibility export. JWT creation and verification are centralized in the
// identity service.
const jwtService = require('../identity/services/jwtService');

module.exports = {
  verifyAccessToken: jwtService.verifyAccessToken.bind(jwtService),
  verifyRefreshToken: jwtService.verifyRefreshToken.bind(jwtService),
  generateTokenFamily: jwtService.generateTokenFamily.bind(jwtService),
  generateAccessToken: (userId, sessionId, options) => jwtService.generateAccessToken(userId, sessionId, options),
  generateRefreshToken: (userId, sessionId, family, version, options) => jwtService.generateRefreshToken(userId, sessionId, family, version, options),
};
