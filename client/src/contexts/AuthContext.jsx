import { createContext, useState, useEffect, useCallback } from 'react';
import api, { restoreSession } from '../services/api';
import { getAccessToken, setAccessToken, clearAccessToken } from '../services/accessToken';

export const AuthContext = createContext(null);

const USER_SNAPSHOT_KEY = 'emotune_user_snapshot';

function readUserSnapshot() {
  try {
    const value = sessionStorage.getItem(USER_SNAPSHOT_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeUserSnapshot(user) {
  try {
    if (user) sessionStorage.setItem(USER_SNAPSHOT_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(USER_SNAPSHOT_KEY);
  } catch {
    // Authentication remains functional when storage is unavailable.
  }
}

export function AuthProvider({ children }) {
  // This is a non-sensitive UI snapshot only. Access and refresh tokens are
  // never stored here. It lets protected screens render while the HTTP-only
  // refresh cookie restores the real session in the background.
  const [user, setUser] = useState(readUserSnapshot);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(getAccessToken());
  const [session, setSession] = useState(null);

  const setToken = useCallback((value) => {
    setAccessToken(value);
    setTokenState(value || null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await restoreSession();
      const currentToken = getAccessToken();
      if (currentToken) setToken(currentToken);
      setUser(data.data?.profile || data.user);
      setSession(data.data?.profile?.session || null);
    } catch (err) {
      clearAccessToken();
      setToken(null);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    writeUserSnapshot(user);
  }, [user]);

  useEffect(() => {
    const onTokenChange = (event) => setTokenState(event.detail || null);
    window.addEventListener('emotune:token', onTokenChange);
    return () => window.removeEventListener('emotune:token', onTokenChange);
  }, []);

  const login = async (credential, password) => {
    const payload = typeof credential === 'object'
      ? credential
      : { email: credential, password };

    const { data } = await api.post('/identity/auth/login', payload);
    if (data.data?.accessToken) {
      setToken(data.data.accessToken);
    }
    setUser(data.data.user);
    setSession(data.data.session);
    return data;
  };

  const signup = async (username, email, password, extraFields) => {
    const payload = typeof username === 'object'
      ? username
      : { username, email, password, ...extraFields };

    const { data } = await api.post('/identity/auth/signup', payload);
    if (data.data?.accessToken) {
      setToken(data.data.accessToken);
    }
    setUser(data.data.user);
    setSession(data.data.session);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/identity/auth/logout');
    } catch {
      // Ignore errors
    }
    clearAccessToken();
    writeUserSnapshot(null);
    setToken(null);
    setUser(null);
    setSession(null);
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const updatePreferences = (preferences) => {
    setUser((prev) => prev ? { ...prev, preferences } : prev);
  };

  const updateSettings = (settings) => {
    setUser((prev) => prev ? { ...prev, settings } : prev);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, token, session, login, signup, logout,
      updateUser, updatePreferences, updateSettings, fetchUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
