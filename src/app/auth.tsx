import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasPermission, type Bootstrap, type Permission } from '@alm/sdk';
import { api } from '@/lib/api';
import { useTheme } from './theme';

interface AuthContextValue {
  status: 'loading' | 'authenticated' | 'anonymous';
  bootstrap: Bootstrap | null;
  login: (email: string, password: string, totp?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: Permission) => boolean;
  isFlagEnabled: (flag: string) => boolean;
  hasModule: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const { applyBranding } = useTheme();

  const load = useCallback(async () => {
    try {
      const data = await api.bootstrap();
      setBootstrap(data);
      applyBranding(data.branding);
      document.documentElement.lang = data.locale;
      document.documentElement.dir =
        data.availableLocales.find((l) => l.code === data.locale)?.rtl ? 'rtl' : 'ltr';
      setStatus('authenticated');
    } catch {
      setBootstrap(null);
      setStatus('anonymous');
    }
  }, [applyBranding]);

  useEffect(() => {
    // On a cold load there is no access token in memory, so the first bootstrap
    // call 401s, the SDK silently refreshes from the cookie, and replays it.
    void load();
  }, [load]);

  const login = useCallback(
    async (email: string, password: string, totp?: string) => {
      const result = await api.auth.login(email, password, totp);
      api.setAccessToken(result.accessToken);
      await load();
    },
    [load],
  );

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => undefined);
    api.setAccessToken(null);
    setBootstrap(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = new Set<string>(bootstrap?.permissions ?? []);
    return {
      status,
      bootstrap,
      login,
      logout,
      refresh: load,
      can: (permission) => hasPermission(permissions, permission),
      // Flags resolve server-side (M4); an unknown flag is off, never on.
      isFlagEnabled: (flag) => bootstrap?.flags[flag] === true,
      hasModule: (module) => bootstrap?.modules.includes(module) ?? false,
    };
  }, [status, bootstrap, login, logout, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
