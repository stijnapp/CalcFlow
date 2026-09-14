import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    environment: 'node',
  },
  // The web app's own `@/` alias, repeated here because the root runner does not
  // read `apps/web/vite.config.ts` — without it a test can only reach the parts
  // of the app that happen to import by relative path.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) },
  },
});
