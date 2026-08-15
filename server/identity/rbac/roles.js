const ROLES = {
  OWNER: 'owner',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  BUSINESS: 'business',
  PREMIUM: 'premium',
  VERIFIED: 'verified',
  USER: 'user',
  BOT: 'bot',
  GUEST: 'guest',
};

const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 1000,
  [ROLES.SUPER_ADMIN]: 900,
  [ROLES.ADMIN]: 800,
  [ROLES.MODERATOR]: 600,
  [ROLES.BUSINESS]: 500,
  [ROLES.PREMIUM]: 400,
  [ROLES.VERIFIED]: 300,
  [ROLES.USER]: 200,
  [ROLES.BOT]: 150,
  [ROLES.GUEST]: 100,
};

const ROLE_DEFAULTS = {
  [ROLES.OWNER]: {
    displayName: 'Owner',
    color: '#FF0000',
    priority: 1,
  },
  [ROLES.SUPER_ADMIN]: {
    displayName: 'Super Admin',
    color: '#DC2626',
    priority: 2,
  },
  [ROLES.ADMIN]: {
    displayName: 'Admin',
    color: '#EA580C',
    priority: 3,
  },
  [ROLES.MODERATOR]: {
    displayName: 'Moderator',
    color: '#CA8A04',
    priority: 4,
  },
  [ROLES.BUSINESS]: {
    displayName: 'Business',
    color: '#2563EB',
    priority: 5,
  },
  [ROLES.PREMIUM]: {
    displayName: 'Premium',
    color: '#7C3AED',
    priority: 6,
  },
  [ROLES.VERIFIED]: {
    displayName: 'Verified',
    color: '#059669',
    priority: 7,
  },
  [ROLES.USER]: {
    displayName: 'User',
    color: '#64748B',
    priority: 8,
  },
  [ROLES.BOT]: {
    displayName: 'Bot',
    color: '#0891B2',
    priority: 9,
  },
  [ROLES.GUEST]: {
    displayName: 'Guest',
    color: '#78716C',
    priority: 10,
  },
};

module.exports = { ROLES, ROLE_HIERARCHY, ROLE_DEFAULTS };
