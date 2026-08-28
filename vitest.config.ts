import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Separate from `vite.config.ts` so the dev server's proxy and build options
 * stay out of the test run.
 *
 * `jsdom` because a handful of components carry real behaviour — the password
 * toggle's focus handling, for one — that a pure function test cannot reach and
 * that is tedious and slow to check by clicking.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
