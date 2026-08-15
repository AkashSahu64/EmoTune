import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './accessToken';

let refreshPromise = null;
let restorePromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios.post('/api/identity/auth/refresh', {}, {
      withCredentials: true,
      timeout: 5000,
      headers: { 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') },
    })
      .then(({ data }) => {
        const token = data.data?.accessToken;
        if (!token) throw new Error('Refresh response did not contain an access token');
        setAccessToken(token);
        return token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Restore the in-memory access token after a full page reload. The refresh
// token remains exclusively in the HTTP-only cookie and is never read here.
export function restoreSession() {
  if (!restorePromise) {
    restorePromise = (async () => {
      if (getAccessToken()) {
        return api.get('/identity/auth/me');
      }

      // Try the refresh directly. The server sets the CSRF cookie on the
      // first response when it is missing. Retrying only that failed refresh
      // avoids the old three-request bootstrap sequence:
      // GET /me -> POST /refresh -> GET /me.
      try {
        await refreshAccessToken();
      } catch (error) {
        if (error.response?.status !== 403 || !getCookie('XSRF-TOKEN')) {
          throw error;
        }
        await refreshAccessToken();
      }
      return api.get('/identity/auth/me');
    })().finally(() => {
      restorePromise = null;
    });
  }

  return restorePromise;
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const fingerprint = localStorage.getItem('emotune_device_fingerprint');
    if (fingerprint) {
      config.headers['X-Device-Fingerprint'] = fingerprint;
    }

    const deviceName = localStorage.getItem('emotune_device_name');
    if (deviceName) {
      config.headers['X-Device-Name'] = deviceName;
    }

    config.headers['X-XSRF-TOKEN'] = getCookie('XSRF-TOKEN');

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isIdentityAuthRequest = String(originalRequest.url || '').includes('/identity/auth/');

    // Login/signup/refresh errors must be returned immediately. Retrying a
    // failed login with a refresh-token request made failures appear frozen.
    if (error.response?.status === 401 && !originalRequest._retry && !isIdentityAuthRequest) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        clearAccessToken();
        if (!originalRequest.url?.includes('/identity/auth/')) {
          window.location.href = '/login';
        }
      }
    }

    if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_MISMATCH' && !originalRequest._retry) {
      console.warn('CSRF token mismatch, retrying');
      const token = getCookie('XSRF-TOKEN');
      if (token) {
        originalRequest.headers['X-XSRF-TOKEN'] = token;
        originalRequest._retry = true;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : '';
}

function generateDeviceFingerprint() {
  let fp = localStorage.getItem('emotune_device_fingerprint');
  if (!fp) {
    const nav = window.navigator;
    const screen = window.screen;
    const components = [
      nav.userAgent,
      nav.language,
      nav.platform,
      screen.colorDepth,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ];
    fp = components.join('|||');
    let hash = 0;
    for (let i = 0; i < fp.length; i++) {
      const char = fp.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    fp = 'fp_' + Math.abs(hash).toString(36);
    localStorage.setItem('emotune_device_fingerprint', fp);
  }
  return fp;
}

function getOrCreateDeviceName() {
  let name = localStorage.getItem('emotune_device_name');
  if (!name) {
    name = `${window.navigator.platform || 'Device'} - ${new Date().toLocaleDateString()}`;
    localStorage.setItem('emotune_device_name', name);
  }
  return name;
}

generateDeviceFingerprint();

export default api;

export const deviceHeaders = () => ({
  'X-Device-Fingerprint': localStorage.getItem('emotune_device_fingerprint') || '',
  'X-Device-Name': getOrCreateDeviceName(),
});

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const config = {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  };
  if (onProgress) {
    config.onUploadProgress = (e) => onProgress(Math.round((e.loaded / e.total) * 100));
  }
  const { data } = await api.post('/upload', formData, config);
  return data;
};

export const aiService = {
  getSuggestions: (chatId) => api.get(`/ai/suggestions/${chatId}`),
  rewriteMessage: (data) => api.post('/ai/rewrite', data),
  getEmotionTheme: (chatId) => api.get(`/ai/emotion-theme/${chatId}`),
  getGifs: (chatId, params = {}, config = {}) => api.get(`/ai/gifs/${chatId}`, { ...config, params }),
  getShayari: (chatId) => api.get(`/ai/shayari/${chatId}`),
  getSummary: (chatId, config = {}) => api.get(`/ai/summary/${chatId}`, config),
};

export const messageService = {
  send: (data) => api.post('/messages', data),
  get: (chatId, params, config = {}) => api.get(`/messages/${chatId}`, { ...config, params }),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
  deleteEveryone: (messageId) => api.delete(`/messages/${messageId}/everyone`),
  edit: (messageId, content) => api.patch(`/messages/${messageId}/edit`, { content }),
  forward: (messageId, targetChatId) => api.post('/messages/forward', { messageId, targetChatId }),
  pin: (messageId) => api.post(`/messages/${messageId}/pin`),
  unpin: (messageId) => api.post(`/messages/${messageId}/unpin`),
  react: (messageId, emoji) => api.post(`/messages/${messageId}/react`, { emoji }),
  getIntentCounts: (chatId) => api.get(`/messages/${chatId}/counts`),
  markRead: (messageIds, chatId) => api.patch('/messages/read', { messageIds, chatId }),
  markAllRead: () => api.patch('/messages/read-all'),
  getSilent: () => api.get('/messages/silent'),
  acceptSilent: (messageId, chatId) => api.post('/messages/accept-silent', { messageId, chatId }),
};

export const groupService = {
  create: (data) => api.post('/groups', data),
  getAll: () => api.get('/groups'),
  addMember: (data) => api.post('/groups/add-member', data),
  removeMember: (data) => api.post('/groups/remove-member', data),
};

export const chatService = {
  search: (q, config = {}) => api.get('/chats/search', { ...config, params: { q } }),
  updatePreferences: (chatId, data) => api.patch(`/chats/${chatId}/preferences`, data),
};

export const groupIntelligenceService = {
  getSummary: (chatId, config = {}) => api.get(`/groups/${chatId}/summary`, config),
  getSharedMedia: (chatId, params, config = {}) => api.get(`/groups/${chatId}/media`, { ...config, params }),
  getOnlineMembers: (chatId, config = {}) => api.get(`/groups/${chatId}/online`, config),
  toggleMute: (chatId, data = {}, config = {}) => api.post(`/groups/${chatId}/mute`, data, config),
};

export const bookmarkService = {
  create: (data) => api.post('/bookmarks', data),
  getAll: (params) => api.get('/bookmarks', { params }),
  delete: (id) => api.delete(`/bookmarks/${id}`),
  increment: (id) => api.patch(`/bookmarks/${id}/use`),
};

export const memoryService = {
  search: (params) => api.get('/memory/search', { params }),
  getAll: (params) => api.get('/memory', { params }),
  requestVerification: (id) => api.post(`/memory/${id}/verify`),
  respondVerification: (id, data) => api.post(`/memory/${id}/respond`, data),
};

export const truthService = {
  getClaim: (id) => api.get(`/truth/${id}`),
  getChatClaims: (chatId) => api.get(`/truth/chat/${chatId}`),
  vote: (claimId, vote) => api.post(`/truth/${claimId}/vote`, { vote }),
  create: (data) => api.post('/truth', data),
};

export const personaService = {
  getAll: () => api.get('/personas'),
  create: (data) => api.post('/personas', data),
  update: (id, data) => api.patch(`/personas/${id}`, data),
  delete: (id) => api.delete(`/personas/${id}`),
  activate: (id) => api.post(`/personas/${id}/activate`),
};

export const decideService = {
  trigger: (chatId) => api.post(`/decide/${chatId}/trigger`),
  vote: (decisionId, optionIndex) => api.post(`/decide/${decisionId}/vote`, { optionIndex }),
  get: (decisionId) => api.get(`/decide/${decisionId}`),
  getChat: (chatId) => api.get(`/decide/chat/${chatId}`),
};

export const ghostService = {
  create: (data) => api.post('/ghost', data),
  getChatSessions: (chatId) => api.get(`/ghost/${chatId}`),
  destroy: (id) => api.delete(`/ghost/${id}`),
};

export const authService = {
  forgotPassword: (data) => api.post('/identity/auth/forgot-password', data),
  verifyResetCode: (data) => api.post('/identity/auth/verify-reset-code', data),
  resetPassword: (data) => api.post('/identity/auth/reset-password', data),
};

export const userService = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateStatus: (status) => api.patch('/identity/auth/me/status', { status }),
  updatePreferences: (data) => api.put('/users/preferences', data),
  changePassword: (data) => api.put('/users/password', data),
  deleteAccount: (password) => api.delete('/users/account', { data: { password } }),
  getSessions: () => api.get('/users/sessions'),
  logoutOtherSessions: () => api.post('/users/logout-other'),
};
