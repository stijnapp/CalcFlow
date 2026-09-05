import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        // `id` is what keeps an install pointed at this app across redeploys.
        id: '/',
        name: 'CalcFlow',
        short_name: 'CalcFlow',
        description: 'Unlimited practice for the RU Mathematics Practice Book.',
        theme_color: '#141210',
        background_color: '#141210',
        // No browser chrome and no system bars: the answer sheet already has to
        // dodge Android's gesture bar, and a URL bar on top of that is 60px of
        // a phone screen spent on an address he never types.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['education'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole shell is precached: a cold start on the train has to work.
        globPatterns: ['**/*.{js,css,html,woff2,ttf,svg,png}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
      // So the install prompt can be judged against `npm run dev` too, and not
      // only against a built bundle.
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Chrome only offers a real install over a secure origin, so the dev server
  // has to answer to the Tailscale name `tailscale serve` puts a certificate on.
  server: { host: true, allowedHosts: ['omarchy', 'prodesk', '.ts.net'] },
});
