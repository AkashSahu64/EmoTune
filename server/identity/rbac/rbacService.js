const User = require('../../models/User');
const { ROLES, ROLE_HIERARCHY } = require('./roles');
const { hasPermission, getHighestRole } = require('./permissions');
const { logEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

const RBACService = {
  async getUserRole(userId) {
    const user = await User.findById(userId).select('roles');
    if (!user) return ROLES.USER;
    return getHighestRole(user.roles || [ROLES.USER]);
  },

  async getUserPermissions(userId) {
    const role = await this.getUserRole(userId);
    const { ROLE_PERMISSIONS } = require('./permissions');
    return ROLE_PERMISSIONS[role] || [];
  },

  async hasPermissionByUserId(userId, permission) {
    const role = await this.getUserRole(userId);
    return hasPermission(role, permission);
  },

  async assignRole(userId, role, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.roles) user.roles = [];
    if (!user.roles.includes(role)) {
      user.roles.push(role);
    }
    user.roles.sort((a, b) => (ROLE_HIERARCHY[b] || 0) - (ROLE_HIERARCHY[a] || 0));
    await user.save();

    await logEvent({
      action: AUDIT_ACTIONS.RBAC_CHANGE,
      userId,
      metadata: { role, assignedBy: adminId },
      severity: 'warning',
    });

    return user.roles;
  },

  async removeRole(userId, role, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.roles = (user.roles || []).filter(r => r !== role);
    if (user.roles.length === 0) user.roles = [ROLES.USER];
    await user.save();

    await logEvent({
      action: AUDIT_ACTIONS.RBAC_CHANGE,
      userId,
      metadata: { roleRemoved: role, by: adminId },
      severity: 'warning',
    });

    return user.roles;
  },

  checkHierarchy(actorRole, targetRole) {
    const actorLevel = ROLE_HIERARCHY[actorRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    return actorLevel > targetLevel;
  },
};

module.exports = RBACService;
