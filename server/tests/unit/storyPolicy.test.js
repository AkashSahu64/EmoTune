jest.mock('../../models/Chat', () => ({ findOne: jest.fn() }));
jest.mock('../../models/User', () => ({ find: jest.fn() }));

const Chat = require('../../models/Chat');
const User = require('../../models/User');
const { canViewStory } = require('../../policies/storyPolicy');

const query = (value) => ({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(value) });

describe('Story policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Chat.findOne.mockReturnValue(query({ _id: 'chat-1' }));
    User.find.mockReturnValue(query([
      { _id: 'u1', preferences: { privacy: { blockedUsers: [] } } },
      { _id: 'u2', preferences: { privacy: { blockedUsers: [] } } },
    ]));
  });

  it('allows the owner of an active Story', async () => {
    await expect(canViewStory('u1', { user: 'u1', expiresAt: new Date(Date.now() + 10000) })).resolves.toBe(true);
  });

  it('denies an excluded custom-audience user', async () => {
    await expect(canViewStory('u2', { user: 'u1', expiresAt: new Date(Date.now() + 10000), audience: { type: 'custom', allowedUsers: ['u2'], excludedUsers: ['u2'] } })).resolves.toBe(false);
  });

  it('denies an expired public Story', async () => {
    await expect(canViewStory('u2', { user: 'u1', expiresAt: new Date(Date.now() - 10000), audience: { type: 'public' } })).resolves.toBe(false);
  });

  it('denies a blocked user even for a public Story', async () => {
    User.find.mockReturnValue(query([
      { _id: 'u1', preferences: { privacy: { blockedUsers: ['u2'] } } },
      { _id: 'u2', preferences: { privacy: { blockedUsers: [] } } },
    ]));
    await expect(canViewStory('u2', { user: 'u1', expiresAt: new Date(Date.now() + 10000), audience: { type: 'public' } })).resolves.toBe(false);
  });
});
