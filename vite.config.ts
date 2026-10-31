import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'https://alm-api.iotechet.com';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // Wildcard host so tenant subdomains (aysha.localhost) resolve in dev.
      host: true,
      /**
       * Proxy the API through this origin in development.
       *
       * `localhost` is on the public suffix list, so `demo.localhost` and
       * `localhost` count as different *sites*: the session cookie is SameSite
       * Strict and a browser will not send it across that boundary, which logged
       * every tenant subdomain out on reload. In production the app and the API
       * sit under one registrable domain and are same-site already; proxying here
       * makes development match that rather than papering over it by weakening
       * the cookie.
       */
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: { sourcemap: true },
  };
});
