const sessionService = require('../services/sessionService');
const deviceService = require('../services/deviceService');
const loginHistoryService = require('../services/loginHistoryService');
const auditService = require('../services/auditService');
const User = require('../../models/User');
const IdentityError = require('../errors/IdentityError');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

const adminController = {
  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.role) filter.roles = req.query.role;
      if (req.query.search) {
        filter.$or = [
          { username: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ];
      }
      if (req.query.verified === 'true') filter.emailVerified = true;
      if (req.query.verified === 'false') filter.emailVerified = { $ne: true };
      if (req.query.deleted === 'true') filter.deletedAt = { $ne: null };
      if (req.query.deleted === 'false') filter.deletedAt = null;

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshToken -refreshTokens -encryptionKey')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserById(req, res, next) {
    try {
      const user = await User.findById(req.params.userId)
        .select('-password -refreshToken -refreshTokens -encryptionKey');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateUserRole(req, res, next) {
    try {
      const { roles } = req.body;

      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Roles must be a non-empty array',
          code: 'INVALID_ROLES',
        });
      }

      const validRoles = require('../rbac/roles').ROLES;
      const invalidRoles = roles.filter(r => !validRoles.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid roles: ${invalidRoles.join(', ')}`,
          code: 'INVALID_ROLES',
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.userId,
        { roles },
        { new: true }
      ).select('-password -refreshToken -refreshTokens -encryptionKey');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      await logEvent({
        action: AUDIT_ACTIONS.ROLE_UPDATE,
        userId: req.params.userId,
        actorId: req.user.id,
        metadata: { oldRoles: user.roles, newRoles: roles },
        severity: 'high',
      });

      res.json({
        success: true,
        message: 'User roles updated',
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

  async blockUser(req, res, next) {
    try {
      const { reason, duration } = req.body;

      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      if (user.roles.includes('admin') && !req.user.roles.includes('super_admin')) {
        return res.status(403).json({
          success: false,
          error: 'Cannot block admin users',
          code: 'CANNOT_BLOCK_ADMIN',
        });
      }

      user.status = 'blocked';
      user.blockedReason = reason || 'Violation of terms';
      if (duration) {
        user.blockedUntil = new Date(Date.now() + duration);
      }
      await user.save({ validateBeforeSave: false });

      await sessionService.terminateAllSessions(user._id, 'account_blocked');

      await logEvent({
        action: AUDIT_ACTIONS.USER_BLOCKED,
        userId: user._id,
        actorId: req.user.id,
        metadata: { reason, duration },
        severity: 'high',
      });

      res.json({
        success: true,
        message: 'User blocked successfully',
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

  async unblockUser(req, res, next) {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      user.status = user.status === 'blocked' ? 'offline' : user.status;
      user.blockedReason = undefined;
      user.blockedUntil = undefined;
      await user.save({ validateBeforeSave: false });

      await logEvent({
        action: AUDIT_ACTIONS.USER_UNBLOCKED,
        userId: user._id,
        actorId: req.user.id,
        metadata: {},
        severity: 'high',
      });

      res.json({
        success: true,
        message: 'User unblocked successfully',
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

  async terminateUserSessions(req, res, next) {
    try {
      const { userId } = req.params;
      await sessionService.terminateAllSessions(userId, 'admin_terminated');

      await logEvent({
        action: AUDIT_ACTIONS.SESSION_TERMINATED,
        userId,
        actorId: req.user.id,
        metadata: { reason: 'Admin terminated all sessions' },
        severity: 'medium',
      });

      res.json({
        success: true,
        message: 'All sessions terminated for user',
      });
    } catch (error) {
      next(error);
    }
  },

  async getAuditLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const filter = {};

      if (req.query.action) filter.action = req.query.action;
      if (req.query.userId) filter.userId = req.query.userId;
      if (req.query.severity) filter.severity = req.query.severity;
      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
      }

      const result = await auditService.getAuditLogs(filter, { page, limit });

      res.json({
        success: true,
        data: {
          logs: result.logs,
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

  async getLoginHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const userId = req.params.userId;

      const result = await loginHistoryService.getLoginHistory(userId, { page, limit });

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

  async getStats(req, res, next) {
    try {
      const [
        totalUsers,
        activeUsers,
        blockedUsers,
        todaySignups,
        totalSessions,
        totalLoginAttempts,
      ] = await Promise.all([
        User.countDocuments({ deletedAt: null }),
        User.countDocuments({ status: 'online', deletedAt: null }),
        User.countDocuments({ status: 'blocked' }),
        User.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          deletedAt: null,
        }),
        require('../models/Session').countDocuments({
          isActive: true,
          expiresAt: { $gt: new Date() },
        }),
        require('../models/LoginHistory').countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          blockedUsers,
          todaySignups,
          totalSessions,
          totalLoginAttempts24h: totalLoginAttempts,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteUser(req, res, next) {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      if (user.roles.includes('superadmin')) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete superadmin',
          code: 'CANNOT_DELETE_SUPERADMIN',
        });
      }

      user.deletedAt = new Date();
      user.status = 'deleted';
      user.email = `deleted_${user._id}@emotune.app`;
      user.username = `deleted_${user._id}`;
      await user.save({ validateBeforeSave: false });

      await sessionService.terminateAllSessions(user._id, 'admin_deletion');

      await logEvent({
        action: AUDIT_ACTIONS.ACCOUNT_DELETED,
        userId: user._id,
        actorId: req.user.id,
        severity: 'high',
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
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

  async restoreUser(req, res, next) {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      user.deletedAt = undefined;
      user.status = 'offline';
      await user.save({ validateBeforeSave: false });

      await logEvent({
        action: AUDIT_ACTIONS.ACCOUNT_RESTORED,
        userId: user._id,
        actorId: req.user.id,
        severity: 'high',
      });

      res.json({
        success: true,
        message: 'User restored successfully',
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

module.exports = adminController;
