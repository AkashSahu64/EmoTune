const { encodeState, verifyState } = require('../../../identity/oauth/oauthState');

describe('OAuth state', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-oauth-state-secret';
  });

  it('creates a provider-bound state that verifies', () => {
    const state = encodeState('google');
    expect(verifyState(state, 'google')).toBe(true);
    expect(verifyState(state, 'microsoft')).toBe(false);
  });

  it('rejects malformed and tampered state', () => {
    expect(verifyState('not-a-state', 'google')).toBe(false);
    const state = encodeState('google');
    const [payload, signature] = state.split('.');
    const tampered = `${payload}.${signature.slice(0, -1)}x`;
    expect(verifyState(tampered, 'google')).toBe(false);
  });
});
