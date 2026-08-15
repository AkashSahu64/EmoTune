const rbacService = require('../rbac/rbacService');

const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const roles = req.user.roles || ['user'];
    const hasPermission = requiredPermissions.some(perm =>
      rbacService.hasPermission(roles, perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action',
        code: 'FORBIDDEN',
        requiredPermissions,
      });
    }

    next();
  };
};

const requireAllPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const roles = req.user.roles || ['user'];
    const hasAll = requiredPermissions.every(perm =>
      rbacService.hasPermission(roles, perm)
    );

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: 'You do not have all required permissions',
        code: 'FORBIDDEN',
        requiredPermissions,
      });
    }

    next();
  };
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: `Requires one of roles: ${roles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
      });
    }

    next();
  };
};

const requireRoleLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const roles = req.user.roles || ['user'];
    const userMaxLevel = Math.max(...roles.map(r => rbacService.getRoleLevel(r)));

    if (userMaxLevel < minLevel) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role level',
        code: 'INSUFFICIENT_ROLE_LEVEL',
        requiredLevel: minLevel,
        userLevel: userMaxLevel,
      });
    }

    next();
  };
};

module.exports = {
  requirePermission,
  requireAllPermissions,
  requireRole,
  requireRoleLevel,
};
