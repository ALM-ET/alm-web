import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { BrandingTokens } from '@alm/sdk';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  /** Applies tenant branding tokens over the CSS custom properties. */
  applyBranding: (branding: BrandingTokens) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'alm-theme';

/** `primaryForeground` -> `--primary-foreground` */
function toCssVar(token: string): string {
  return `--${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });

  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const applyBranding = useCallback((branding: BrandingTokens) => {
    const root = document.documentElement;
    for (const [token, value] of Object.entries(branding.colors)) {
      root.style.setProperty(toCssVar(token), value);
    }
    root.style.setProperty('--radius', branding.radius);
    root.style.setProperty('--font-heading', `'${branding.fontHeading}', ui-sans-serif, system-ui, sans-serif`);
    root.style.setProperty('--font-body', `'${branding.fontBody}', ui-sans-serif, system-ui, sans-serif`);
    document.title = branding.appName;
  }, []);

  const value = useMemo(
    () => ({ mode, isDark, setMode, toggle: () => setMode(isDark ? 'light' : 'dark'), applyBranding }),
    [mode, isDark, setMode, applyBranding],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
