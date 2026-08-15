const { IDENTITY_CONFIG } = require('../config/identityConfig');
const { encodeState, getStatePayload } = require('./oauthState');

class BaseOAuthProvider {
  constructor(config) {
    this.config = config;
    this.name = 'base';
  }

  isEnabled() {
    return this.config.enabled && this.config.clientId;
  }

  getAuthorizationUrl(state) {
    throw new Error('Not implemented');
  }

  async exchangeCode(code) {
    throw new Error('Not implemented');
  }

  async getUserProfile(accessToken) {
    throw new Error('Not implemented');
  }

  getClientId() {
    return this.config.clientId;
  }
}

class GoogleOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super(IDENTITY_CONFIG.oauth.google);
    this.name = 'google';
    this.authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenEndpoint = 'https://oauth2.googleapis.com/token';
    this.userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
    this.scopes = ['openid', 'email', 'profile'];
  }

  getAuthorizationUrl(state) {
    if (!this.isEnabled()) return null;
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: `${process.env.CLIENT_URL}/auth/google/callback`,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
      nonce: getStatePayload(state)?.nonce || '',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCode(code) {
    const axios = require('axios');
    const { data } = await axios.post(this.tokenEndpoint, {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: `${process.env.CLIENT_URL}/auth/google/callback`,
      grant_type: 'authorization_code',
    });
    return data;
  }

  async getUserProfile(accessToken) {
    const axios = require('axios');
    const { data } = await axios.get(this.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture,
      verified: data.verified_email,
    };
  }

  async verifyIdToken(idToken, state) {
    const axios = require('axios');
    const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: idToken },
    });
    const expectedNonce = getStatePayload(state)?.nonce;
    if (!data.sub || data.aud !== this.config.clientId || data.nonce !== expectedNonce) {
      throw new Error('Google identity token validation failed');
    }
    return data;
  }
}

class AppleOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super(IDENTITY_CONFIG.oauth.apple);
    this.name = 'apple';
  }

  getAuthorizationUrl(state) {
    if (!this.isEnabled()) return null;
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: `${process.env.CLIENT_URL}/auth/apple/callback`,
      response_type: 'code id_token',
      scope: 'name email',
      state,
      response_mode: 'form_post',
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async exchangeCode(code) {
    const axios = require('axios');
    const { data } = await axios.post('https://appleid.apple.com/auth/token', {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: `${process.env.CLIENT_URL}/auth/apple/callback`,
      grant_type: 'authorization_code',
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  }

  async getUserProfile(accessToken) {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(accessToken);
    return {
      id: decoded.sub,
      email: decoded.email || '',
      name: '',
      avatar: '',
      verified: decoded.email_verified === 'true',
    };
  }
}

class MicrosoftOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super(IDENTITY_CONFIG.oauth.microsoft);
    this.name = 'microsoft';
  }

  getAuthorizationUrl(state) {
    if (!this.isEnabled()) return null;
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: `${process.env.CLIENT_URL}/auth/microsoft/callback`,
      response_type: 'code',
      scope: 'openid email profile User.Read',
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code) {
    const axios = require('axios');
    const { data } = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: `${process.env.CLIENT_URL}/auth/microsoft/callback`,
        grant_type: 'authorization_code',
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return data;
  }

  async getUserProfile(accessToken) {
    const axios = require('axios');
    const { data } = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      avatar: '',
      verified: true,
    };
  }
}

const getOAuthProvider = (provider) => {
  const providers = {
    google: GoogleOAuthProvider,
    apple: AppleOAuthProvider,
    microsoft: MicrosoftOAuthProvider,
  };

  const ProviderClass = providers[provider];
  if (!ProviderClass) return null;
  return new ProviderClass();
};

const getEnabledOAuthProviders = () => {
  const providers = ['google', 'apple', 'microsoft'];
  return providers
    .map(p => ({ provider: p, instance: getOAuthProvider(p) }))
    .filter(({ instance }) => instance && instance.isEnabled())
    .map(({ provider, instance }) => ({
      provider,
      clientId: instance.getClientId(),
      authorizationUrl: instance.getAuthorizationUrl(encodeState(provider)),
    }));
};

module.exports = {
  BaseOAuthProvider,
  GoogleOAuthProvider,
  AppleOAuthProvider,
  MicrosoftOAuthProvider,
  getOAuthProvider,
  getEnabledOAuthProviders,
};
