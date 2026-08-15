const { ROLES, ROLE_HIERARCHY } = require('../../../identity/rbac/roles');
const { hasPermission, ROLE_PERMISSIONS, getHighestRole } = require('../../../identity/rbac/permissions');

describe('RBAC', () => {
  describe('Roles', () => {
    it('should define all named roles', () => {
      const roleValues = Object.values(ROLES);
      expect(roleValues).toContain('owner');
      expect(roleValues).toContain('super_admin');
      expect(roleValues).toContain('admin');
      expect(roleValues).toContain('user');
      expect(roleValues).toContain('guest');
    });

    it('should have correct role hierarchy', () => {
      expect(ROLE_HIERARCHY[ROLES.OWNER]).toBe(1000);
      expect(ROLE_HIERARCHY[ROLES.SUPER_ADMIN]).toBe(900);
      expect(ROLE_HIERARCHY[ROLES.ADMIN]).toBe(800);
      expect(ROLE_HIERARCHY[ROLES.USER]).toBe(200);
      expect(ROLE_HIERARCHY[ROLES.GUEST]).toBe(100);
    });
  });

  describe('hasPermission', () => {
    it('should allow owner for all permissions', () => {
      expect(hasPermission(ROLES.OWNER, 'user:read_own')).toBe(true);
      expect(hasPermission(ROLES.OWNER, 'admin:manage_users')).toBe(true);
    });

    it('should allow admin for admin-level permissions', () => {
      expect(hasPermission(ROLES.ADMIN, 'user:read_own')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'user:read_any')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'session:read_any')).toBe(true);
    });

    it('should allow user for basic user permissions', () => {
      expect(hasPermission(ROLES.USER, 'message:send')).toBe(true);
      expect(hasPermission(ROLES.USER, 'message:read_own')).toBe(true);
    });

    it('should deny user for admin permissions', () => {
      expect(hasPermission(ROLES.USER, 'user:delete_any')).toBe(false);
      expect(hasPermission(ROLES.USER, 'admin:manage_users')).toBe(false);
    });

    it('should deny guest for admin permissions', () => {
      expect(hasPermission(ROLES.GUEST, 'user:delete_any')).toBe(false);
      expect(hasPermission(ROLES.GUEST, 'admin:manage_users')).toBe(false);
    });
  });

  describe('getHighestRole', () => {
    it('should return the highest role from an array', () => {
      expect(getHighestRole(['user', 'admin'])).toBe(ROLES.ADMIN);
      expect(getHighestRole(['guest', 'user'])).toBe(ROLES.USER);
    });

    it('should default to user for empty array', () => {
      expect(getHighestRole([])).toBe(ROLES.USER);
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should have permissions defined for each role', () => {
      expect(Array.isArray(ROLE_PERMISSIONS[ROLES.USER])).toBe(true);
      expect(ROLE_PERMISSIONS[ROLES.USER].length).toBeGreaterThan(0);
    });
  });
});
