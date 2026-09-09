import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The version shown on the settings screen. It is read off `package.json` so
 * that bumping the release is one edit rather than two, and so that what the
 * phone says can be trusted to mean "this is the build I just deployed".
 */
const { version } = createRequire(import.meta.url)('./package.json') as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The new worker waits until he says so. `autoUpdate` swapped the app out
      // from under him — mid-problem, with no way to tell that anything had
      // happened; the banner in `UpdateBanner` is the other half of this.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        // `id` is what keeps an install pointed at this app across redeploys.
        id: '/',
        name: 'CalcFlow',
        short_name: 'CalcFlow',
        description: 'Unlimited practice for the RU Mathematics Practice Book.',
        theme_color: '#141210',
        background_color: '#141210',
        // No browser chrome, but Android's own bars stay: the clock and the
        // battery are worth the strip they sit in, and a gesture bar drawn over
        // the app is a gesture bar he cannot see the edge of. `theme_color`
        // paints the status bar and `background_color` the navigation bar, so
        // both read as part of the page rather than as black bands around it.
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['education'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Square and full-bleed on purpose. Android crops a maskable icon to
          // whatever shape the launcher uses, so the rounded one would come back
          // with its corners bitten off; this one hands over the whole tile and
          // lets the launcher round it.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole shell is precached: a cold start on the train has to work.
        globPatterns: ['**/*.{js,css,html,woff2,ttf,svg,png}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        // Everything the app routes to is the same shell — except the API,
        // which the server answers and the worker must not stand in front of.
        navigateFallbackDenylist: [/^\/api\//],
        // An update replaces the shell rather than living beside it, and takes
        // over the open window instead of waiting for every tab to be closed.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      // No worker in dev. It bought an install prompt against `npm run dev` and
      // nothing else — the install could not work offline, because the only
      // thing there is to precache at that point is the dev `index.html`, and
      // that copy went on being served after the origin moved to a built app,
      // which is a white screen with no way out of itself. Offline is a
      // property of the built app: `npm run build && npm run preview`.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Chrome only offers a real install over a secure origin, so both servers
  // have to answer to the Tailscale name `tailscale serve` puts a certificate
  // on. The preview server is the one that is genuinely offline-capable.
  server: { host: true, allowedHosts: ['omarchy', 'prodesk', '.ts.net'] },
  preview: { host: true, allowedHosts: ['omarchy', 'prodesk', '.ts.net'] },
});
