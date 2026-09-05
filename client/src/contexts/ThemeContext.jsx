import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { themes, themeStorageKeys } from '../theme/tokens';

export const ThemeContext = createContext(null);

const LEGACY_LIGHT = new Set(['glass-white', 'glass-sand']);
const LEGACY_DARK = new Set(['glass-black', 'glass-midnight', 'glass-ocean', 'glass-emerald', 'glass-lavender']);

function detectSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function normalizeTheme(value) {
  if (value === 'light' || value === 'dark') return value;
  if (LEGACY_LIGHT.has(value)) return 'light';
  if (LEGACY_DARK.has(value)) return 'dark';
  return detectSystemTheme();
}

function readInitialTheme() {
  let stored = null;
  try {
    stored = window.localStorage.getItem(themeStorageKeys.preference);
  } catch {
    stored = null;
  }

  const theme = normalizeTheme(stored);
  try {
    window.localStorage.setItem(themeStorageKeys.preference, theme);
  } catch {
    // Private browsing/storage-disabled environments still get a valid theme.
  }
  return theme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    try {
      window.localStorage.setItem(themeStorageKeys.preference, theme);
    } catch {
      // Keep the in-memory theme when storage is unavailable.
    }
  }, [theme]);

  const setTheme = useCallback((nextTheme) => {
    if (nextTheme === 'light' || nextTheme === 'dark') setThemeState(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme: theme, setTheme, themes }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
