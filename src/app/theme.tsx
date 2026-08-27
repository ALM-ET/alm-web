import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenToCssVar, type BrandingTokens } from '@alm/sdk';

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

  /**
   * Hold the agency's palettes so the theme toggle can swap between them
   * without another round trip.
   */
  const [branding, setBranding] = useState<BrandingTokens | null>(null);

  const applyBranding = useCallback((next: BrandingTokens) => {
    setBranding(next);
  }, []);

  /**
   * Write the active palette onto the document.
   *
   * Re-runs when the theme flips, because light and dark are two separate
   * palettes rather than one inverted — an accent that reads on white usually
   * vanishes on near-black.
   */
  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;

    const palette = isDark ? branding.colorsDark : branding.colorsLight;
    for (const [token, value] of Object.entries(palette)) {
      root.style.setProperty(tokenToCssVar(token), value);
    }

    root.style.setProperty('--radius', branding.radius);
    root.style.setProperty(
      '--font-heading',
      `'${branding.fontHeading}', ui-sans-serif, system-ui, sans-serif`,
    );
    root.style.setProperty(
      '--font-body',
      `'${branding.fontBody}', ui-sans-serif, system-ui, sans-serif`,
    );

    document.title = branding.appName;

    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding, isDark]);

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
