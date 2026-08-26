import { AlmClient } from '@alm/sdk';

/**
 * One client for the whole app. The access token lives only in this instance's
 * memory — never in localStorage — so an injected script cannot read a
 * credential. Session continuity comes from the httpOnly refresh cookie.
 */
export const api = new AlmClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  onAuthFailure: () => {
    // Full reload rather than a router navigation: it guarantees every cached
    // query, context and in-flight request for the old identity is discarded.
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  },
});
