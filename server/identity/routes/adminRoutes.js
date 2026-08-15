const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission, requireRole } = require('../middleware/rbacMiddleware');
const { PERMISSIONS } = require('../rbac/permissions');
const { sensitiveRateLimiter } = require('../middleware/rateLimiter');

router.get(
  '/users',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.READ_ANY),
  adminController.getUsers
);

router.get(
  '/users/stats',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.READ_ANY),
  adminController.getStats
);

router.get(
  '/users/:userId',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.READ_ANY),
  adminController.getUserById
);

router.patch(
  '/users/:userId/roles',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN.MANAGE_ROLES),
  sensitiveRateLimiter.middleware(),
  adminController.updateUserRole
);

router.post(
  '/users/:userId/block',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.BAN),
  sensitiveRateLimiter.middleware(),
  adminController.blockUser
);

router.post(
  '/users/:userId/unblock',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.BAN),
  adminController.unblockUser
);

router.post(
  '/users/:userId/terminate-sessions',
  authenticate,
  requirePermission(PERMISSIONS.SESSION.TERMINATE_ANY),
  adminController.terminateUserSessions
);

router.delete(
  '/users/:userId',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.DELETE_ANY),
  sensitiveRateLimiter.middleware(),
  adminController.deleteUser
);

router.post(
  '/users/:userId/restore',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.UPDATE_ANY),
  adminController.restoreUser
);

router.get(
  '/users/:userId/login-history',
  authenticate,
  requirePermission(PERMISSIONS.USER_ADMIN.READ_ANY),
  adminController.getLoginHistory
);

router.get(
  '/audit-logs',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN.VIEW_LOGS),
  adminController.getAuditLogs
);

module.exports = router;
