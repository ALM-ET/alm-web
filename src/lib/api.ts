import { AlmClient } from '@alm/sdk';

/**
 * Which agency this browser tab belongs to, taken from the hostname.
 *
 * The API cannot work this out for itself once it is served from its own
 * domain: a request arriving at `api.example.com` carries no trace of the
 * `aysha.app.example.com` page that made it. So the app states it, and the API
 * still checks that the session's own tenant matches before trusting it.
 */
function tenantFromHost(): string | undefined {
  const host = window.location.hostname;

  // Never treat local or vercel preview/production domains as tenant subdomains
  if (host === 'localhost' || host.endsWith('.vercel.app')) {
    return undefined;
  }

  const parts = host.split('.');

  // Needs at least 3 parts for a tenant subdomain (e.g. tenant.domain.com)
  if (parts.length < 3) return undefined;

  const [candidate] = parts;
  const reserved = [
    'www',
    'app',
    'api',
    'console',
    'admin',
    'alm',
    'alm-frontend',
    'frontend',
    'staging',
    'dev',
  ];

  if (!candidate || reserved.includes(candidate.toLowerCase())) {
    return undefined;
  }

  return /^[a-z0-9-]{2,63}$/.test(candidate) ? candidate : undefined;
}

const RECENT_KEY = 'alm_recent_tenants';

/**
 * Returns a list of recently used agency tenant slugs on this browser.
 */
export function getRecentTenants(): string[] {
  if (typeof window === 'undefined') return ['demo'];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return ['demo'];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(
        (item): item is string => typeof item === 'string' && /^[a-z0-9-]{2,63}$/.test(item),
      );
      if (!filtered.includes('demo')) filtered.unshift('demo');
      return Array.from(new Set(filtered));
    }
  } catch {
    // Ignore storage parse errors
  }
  return ['demo'];
}

/**
 * Adds an agency tenant slug to the list of recent tenants.
 */
export function addRecentTenant(slug: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,63}$/.test(cleaned)) return;
  const list = getRecentTenants().filter((item) => item !== cleaned);
  list.unshift(cleaned);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Resolves the active agency workspace slug.
 *
 * Checks in order:
 * 1. URL search parameter (?tenant=demo or ?agency=demo)
 * 2. localStorage ('alm_tenant') to persist across page reloads
 * 3. Environment variable (VITE_DEFAULT_TENANT)
 * 4. Hostname subdomain (e.g. demo.app.iotechet.com)
 * 5. Default fallback to 'demo' for Vercel / single-origin deployments
 */
export function getTenant(): string | undefined {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('tenant') || params.get('agency');
    if (fromQuery) {
      if (fromQuery === 'none' || fromQuery === 'platform' || fromQuery === 'control') {
        localStorage.removeItem('alm_tenant');
        return undefined;
      }
      if (/^[a-z0-9-]{2,63}$/.test(fromQuery)) {
        localStorage.setItem('alm_tenant', fromQuery);
        addRecentTenant(fromQuery);
        return fromQuery;
      }
    }

    const stored = localStorage.getItem('alm_tenant');
    if (stored && /^[a-z0-9-]{2,63}$/.test(stored)) {
      addRecentTenant(stored);
      return stored;
    }
  }

  if (import.meta.env.VITE_DEFAULT_TENANT) {
    return import.meta.env.VITE_DEFAULT_TENANT;
  }

  const fromHost = tenantFromHost();
  if (fromHost) return fromHost;

  return 'demo';
}

/**
 * Checks if the current or given agency workspace is the Demo sandbox environment.
 */
export function isDemoTenant(slug?: string): boolean {
  const current = slug ?? getTenant();
  return !current || current.toLowerCase() === 'demo';
}

/**
 * Sets the active agency tenant slug and optionally reloads the application.
 */
export function setTenant(slug: string, reload = true): void {
  if (typeof window === 'undefined') return;
  const cleaned = slug.trim().toLowerCase();
  if (cleaned === 'none' || cleaned === 'platform' || cleaned === 'control') {
    localStorage.removeItem('alm_tenant');
  } else if (/^[a-z0-9-]{2,63}$/.test(cleaned)) {
    localStorage.setItem('alm_tenant', cleaned);
    addRecentTenant(cleaned);
  }
  if (reload) {
    const url = new URL(window.location.href);
    url.searchParams.set('agency', cleaned);
    url.searchParams.delete('tenant');
    window.location.assign(url.toString());
  }
}

/**
 * Clears the active agency tenant and reloads back to the default workspace.
 */
export function clearTenant(reload = true): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('alm_tenant');
  if (reload) {
    const url = new URL(window.location.href);
    url.searchParams.delete('agency');
    url.searchParams.delete('tenant');
    window.location.assign(url.toString());
  }
}

/**
 * One client for the whole app. The access token lives only in this instance's
 * memory — never in localStorage — so an injected script cannot read a
 * credential. Session continuity comes from the httpOnly refresh cookie.
 */
/**
 * In development, route through window.location.origin so requests to /api are
 * handled by Vite's proxy to the target backend (preserving httpOnly cookies and
 * avoiding CORS restrictions). In production or when forced, use VITE_API_URL
 * (defaulting to https://alm-api.iotechet.com).
 */
const rawBaseUrl =
  import.meta.env.DEV && !import.meta.env.VITE_FORCE_DIRECT_API
    ? (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:5173')
    : (import.meta.env.VITE_API_URL || 'https://alm-api.iotechet.com');

export const api = new AlmClient({
  // Trim trailing slash to avoid double slashes in API route concatenation
  baseUrl: rawBaseUrl.replace(/\/+$/, ''),
  ...(getTenant() ? { tenant: getTenant()! } : {}),
  onAuthFailure: () => {
    // Full reload rather than a router navigation: it guarantees every cached
    // query, context and in-flight request for the old identity is discarded.
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login?next=' + encodeURIComponent(window.location.pathname));
    }
  },
});
