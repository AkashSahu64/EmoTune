const axios = require('axios');

jest.mock('axios');
jest.mock('../../../identity/config/identityConfig', () => {
  const actual = jest.requireActual('../../../identity/config/identityConfig');
  return {
    IDENTITY_CONFIG: {
      ...actual.IDENTITY_CONFIG,
      oauth: {
        google: { enabled: true, clientId: 'test-client-id', clientSecret: 'test-secret' },
        apple: { enabled: false, clientId: '', clientSecret: '' },
        microsoft: { enabled: false, clientId: '', clientSecret: '' },
      },
    },
  };
});

const { getOAuthProvider, getEnabledOAuthProviders } = require('../../../identity/oauth/index');

describe('OAuth Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOAuthProvider', () => {
    it('should return a Google provider', () => {
      const provider = getOAuthProvider('google');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('google');
    });

    it('should return null for unknown provider', () => {
      const provider = getOAuthProvider('unknown');
      expect(provider).toBeNull();
    });

    it('should return null for removed provider (github)', () => {
      const provider = getOAuthProvider('github');
      expect(provider).toBeNull();
    });

    it('should generate a Google authorization URL when enabled', () => {
      const provider = getOAuthProvider('google');
      const url = provider.getAuthorizationUrl('test-state-123');
      expect(url).not.toBeNull();
      expect(url).toContain('accounts.google.com');
      expect(url).toContain('client_id=');
      expect(url).toContain('state=test-state-123');
    });
  });

  describe('Google OAuth', () => {
    it('should exchange code for tokens', async () => {
      const mockTokenData = { access_token: 'google_at_123', id_token: 'google_id_token' };
      axios.post.mockResolvedValue({ data: mockTokenData });

      const provider = getOAuthProvider('google');
      const result = await provider.exchangeCode('test-auth-code');

      expect(result).toEqual(mockTokenData);
      expect(axios.post).toHaveBeenCalled();
      const callArgs = axios.post.mock.calls[0];
      expect(callArgs[0]).toBe('https://oauth2.googleapis.com/token');
      expect(callArgs[1]).toMatchObject({ code: 'test-auth-code' });
    });

    it('should get user profile', async () => {
      const mockProfile = {
        id: 'google-123',
        email: 'user@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        verified_email: true,
      };
      axios.get.mockResolvedValue({ data: mockProfile });

      const provider = getOAuthProvider('google');
      const profile = await provider.getUserProfile('google_at_123');

      expect(profile.id).toBe('google-123');
      expect(profile.email).toBe('user@gmail.com');
      expect(profile.verified).toBe(true);
    });
  });

  describe('getEnabledOAuthProviders', () => {
    it('should return enabled providers', () => {
      const providers = getEnabledOAuthProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBe(1);
      expect(providers[0].provider).toBe('google');
    });
  });
});
