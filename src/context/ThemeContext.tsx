import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemePreference = 'device' | 'light' | 'dark';
export type Theme = ThemePreference;

interface ThemeContextType {
  themePreference: ThemePreference;
  theme: ThemePreference;
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY = 'app_theme_preference';

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(pref: ThemePreference): boolean {
  if (pref === 'device') return getSystemPrefersDark();
  return pref === 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    return stored === 'light' || stored === 'dark' || stored === 'device' ? stored : 'device';
  });
  const [isDark, setIsDark] = useState<boolean>(() => resolveIsDark(themePreference));

  const applyClass = useCallback((dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark);
    // Keep the browser UI (status bar / address bar) color in sync too
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#07090E' : '#FFFFFF');
    setIsDark(dark);
  }, []);

  useEffect(() => {
    applyClass(resolveIsDark(themePreference));
    if (themePreference !== 'device') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => applyClass(e.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [themePreference, applyClass]);

  const setThemePreference = (pref: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, pref);
    setThemePreferenceState(pref);
  };

  const toggleTheme = () => {
    setThemePreference(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{
      themePreference,
      theme: themePreference,
      isDark,
      setThemePreference,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
