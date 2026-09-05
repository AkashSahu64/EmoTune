import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { restoreSession } from '../services/api';
import { getAccessToken, setAccessToken, clearAccessToken } from '../services/accessToken';
import { queryClient } from '../services/queryClient';

export const AuthContext = createContext(null);

const USER_SNAPSHOT_KEY = 'emotune_user_snapshot';

function clearBookmarkCache() {
  queryClient.removeQueries({ queryKey: ['bookmarks'] });
}

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
      const nextUser = data.data?.profile || data.user;
      const previousUser = readUserSnapshot();
      if (previousUser?._id && nextUser?._id && String(previousUser._id) !== String(nextUser._id)) {
        clearBookmarkCache();
      }
      setUser(nextUser);
      setSession(data.data?.profile?.session || null);
    } catch (err) {
      clearBookmarkCache();
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

  const login = useCallback(async (credential, password) => {
    const payload = typeof credential === 'object'
      ? credential
      : { email: credential, password };

    const { data } = await api.post('/identity/auth/login', payload);
    clearBookmarkCache();
    if (data.data?.accessToken) {
      setToken(data.data.accessToken);
    }
    setUser(data.data.user);
    setSession(data.data.session);
    return data;
  }, [setToken]);

  const signup = useCallback(async (username, email, password, extraFields) => {
    const payload = typeof username === 'object'
      ? username
      : { username, email, password, ...extraFields };

    const { data } = await api.post('/identity/auth/signup', payload);
    clearBookmarkCache();
    if (data.data?.accessToken) {
      setToken(data.data.accessToken);
    }
    setUser(data.data.user);
    setSession(data.data.session);
    return data;
  }, [setToken]);

  const logout = useCallback(async () => {
    try {
      await api.post('/identity/auth/logout');
    } catch {
      // Ignore errors
    }
    clearAccessToken();
    clearBookmarkCache();
    writeUserSnapshot(null);
    setToken(null);
    setUser(null);
    setSession(null);
  }, [setToken]);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  const updatePreferences = useCallback((preferences) => {
    setUser((prev) => prev ? { ...prev, preferences } : prev);
  }, []);

  const updateSettings = useCallback((settings) => {
    setUser((prev) => prev ? { ...prev, settings } : prev);
  }, []);

  const value = useMemo(() => ({
    user, loading, token, session, login, signup, logout,
    updateUser, updatePreferences, updateSettings, fetchUser,
  }), [
    user, loading, token, session, login, signup, logout,
    updateUser, updatePreferences, updateSettings, fetchUser,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
