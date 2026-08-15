const IdentityService = require('../services/identityService');
const loginHistoryService = require('../services/loginHistoryService');
const sessionService = require('../services/sessionService');
const deviceService = require('../services/deviceService');
const User = require('../../models/User');
const IdentityError = require('../errors/IdentityError');
const { IDENTITY_CONFIG } = require('../config/identityConfig');

const profileController = {
  async getProfile(req, res, next) {
    try {
      const profile = await IdentityService.getProfile(req.user.id);
      res.json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const allowedFields = ['displayName', 'bio', 'about', 'phone', 'countryCode', 'timezone', 'language', 'avatar', 'wallpaper'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update',
          code: 'NO_UPDATES',
        });
      }

      const user = await IdentityService.updateProfile(req.user.id, updates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
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

  async deleteAccount(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      user.deletedAt = new Date();
      user.status = 'deleted';
      user.email = `deleted_${user._id}@emotune.app`;
      user.username = `deleted_${user._id}`;
      await user.save({ validateBeforeSave: false });

      await sessionService.terminateAllSessions(req.user.id, 'account_deletion');

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: IDENTITY_CONFIG.security.secureCookies,
        sameSite: 'strict',
        path: '/api/identity/auth',
      });

      res.json({
        success: true,
        message: 'Account deleted successfully',
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

  async getLoginHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await loginHistoryService.getLoginHistory(req.user.id, { page, limit });

      res.json({
        success: true,
        data: {
          attempts: result.attempts,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: result.pages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getActiveSessions(req, res, next) {
    try {
      const sessions = await sessionService.getUserSessions(req.user.id);

      const currentSessionId = req.user.sessionId;
      const enriched = sessions.map(s => ({
        ...s.toObject(),
        isCurrent: s.sessionId === currentSessionId,
      }));

      res.json({
        success: true,
        data: { sessions: enriched },
      });
    } catch (error) {
      next(error);
    }
  },

  async getDevices(req, res, next) {
    try {
      const devices = await deviceService.getUserDevices(req.user.id);

      const currentDeviceFingerprint = req.headers['x-device-fingerprint'];
      const enriched = devices.map(d => ({
        ...(typeof d.toObject === 'function' ? d.toObject() : d),
        isCurrent: d.fingerprint === currentDeviceFingerprint,
      }));

      res.json({
        success: true,
        data: { devices: enriched },
      });
    } catch (error) {
      next(error);
    }
  },

  async getStatus(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('status lastActive');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: {
          status: user.status,
          lastActive: user.lastActive,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['online', 'offline', 'away', 'busy'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Status must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
        });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { status, lastActive: new Date() },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Status updated',
        data: { status: user.status, lastActive: user.lastActive },
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

module.exports = profileController;
