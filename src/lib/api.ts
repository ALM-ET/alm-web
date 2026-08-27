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
  const parts = host.split('.');

  // `aysha.app.example.com` or `aysha.localhost` — anything with a subdomain
  // that is not one of the platform's own hosts.
  if (parts.length < 2) return undefined;

  const [candidate] = parts;
  if (!candidate || ['www', 'app', 'api', 'console', 'admin'].includes(candidate)) {
    return undefined;
  }

  return /^[a-z0-9-]{2,63}$/.test(candidate) ? candidate : undefined;
}

/**
 * One client for the whole app. The access token lives only in this instance's
 * memory — never in localStorage — so an injected script cannot read a
 * credential. Session continuity comes from the httpOnly refresh cookie.
 */
export const api = new AlmClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  ...(tenantFromHost() ? { tenant: tenantFromHost()! } : {}),
  onAuthFailure: () => {
    // Full reload rather than a router navigation: it guarantees every cached
    // query, context and in-flight request for the old identity is discarded.
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  },
});
