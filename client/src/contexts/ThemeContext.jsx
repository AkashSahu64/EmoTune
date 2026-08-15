import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { emotionThemeMap, legacyThemeAliases, themes, themeStorageKeys } from '../theme/tokens';

export const ThemeContext = createContext(null);

function readInitialTheme() {
  const stored = localStorage.getItem(themeStorageKeys.preference);
  return legacyThemeAliases[stored] || stored || 'system';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);
  const [systemMode, setSystemMode] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [emotionThemeEnabled, setEmotionThemeEnabled] = useState(() => localStorage.getItem(themeStorageKeys.emotionEnabled) !== 'false');

  const resolvedTheme = useMemo(() => theme === 'system' ? (systemMode === 'dark' ? 'glass-black' : 'glass-white') : theme, [theme, systemMode]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const update = (event) => setSystemMode(event.matches ? 'dark' : 'light');
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const definition = themes.find((item) => item.id === resolvedTheme);
    const mode = definition?.mode || systemMode;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = mode;
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.setItem(themeStorageKeys.preference, theme);
    requestAnimationFrame(() => {
      const background = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim().split(/\s+/).join(', ');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta && background) meta.setAttribute('content', `rgb(${background})`);
    });
  }, [theme, resolvedTheme, systemMode]);

  const setTheme = useCallback((newTheme) => {
    const normalized = legacyThemeAliases[newTheme] || newTheme;
    if (themes.some((item) => item.id === normalized)) setThemeState(normalized);
  }, []);

  const applyEmotionTheme = useCallback((emoji) => {
    if (!emotionThemeEnabled) return;
    const mappedTheme = emotionThemeMap[emoji];
    if (mappedTheme) setThemeState(mappedTheme);
  }, [emotionThemeEnabled]);

  const toggleEmotionTheme = useCallback(() => {
    setEmotionThemeEnabled((previous) => {
      const next = !previous;
      localStorage.setItem(themeStorageKeys.emotionEnabled, next.toString());
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme,
      resolvedTheme,
      setTheme,
      themes,
      emotionThemeEnabled,
      toggleEmotionTheme,
      applyEmotionTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
