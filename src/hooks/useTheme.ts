import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'monologue_theme';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): ThemeMode {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
    ? storedTheme
    : 'dark';
}

function applyTheme(theme: ThemeMode, systemPrefersDark: boolean): void {
  const resolvedTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolvedTheme;
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    const updateSystemTheme = () => applyTheme(themeMode, mediaQuery.matches);

    updateSystemTheme();
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);

    if (themeMode !== 'system') return;
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, [themeMode]);

  return { themeMode, setThemeMode };
}
