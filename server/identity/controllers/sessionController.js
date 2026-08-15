const { IDENTITY_CONFIG } = require('../config/identityConfig');
const sessionService = require('../services/sessionService');
const IdentityError = require('../errors/IdentityError');

const sessionController = {
  async getSessions(req, res, next) {
    try {
      const sessions = await sessionService.getActiveSessions(req.user.id);
      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  },

  async getSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const session = await sessionService.getSessionById(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        });
      }

      if ((session.user || session.userId).toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async terminateSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const session = await sessionService.getSessionById(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        });
      }

      if ((session.user || session.userId).toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      await sessionService.terminateSession(sessionId, 'user_terminated');

      if (sessionId === req.user.sessionId) {
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: IDENTITY_CONFIG.security.secureCookies,
          sameSite: 'strict',
          path: '/api/identity/auth',
        });
      }

      res.json({
        success: true,
        message: 'Session terminated successfully',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async terminateAllSessions(req, res, next) {
    try {
      await sessionService.terminateAllSessions(req.user.id);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: IDENTITY_CONFIG.security.secureCookies,
        sameSite: 'strict',
        path: '/api/identity/auth',
      });

      res.json({
        success: true,
        message: 'All other sessions terminated. Please login again.',
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },

  async keepAlive(req, res, next) {
    try {
      const { sessionId } = req.body;
      await sessionService.updateActivity(sessionId || req.user.sessionId, req.ip);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof IdentityError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      next(error);
    }
  },
};

module.exports = sessionController;
