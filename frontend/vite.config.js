import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Only public catalog GETs are cached at runtime.
// Everything else (auth, cart, orders, checkout, webhooks, any POST/PATCH/DELETE)
// never matches and always goes to the network.
const isCatalogRequest = ({ url, request }) =>
  request.method === 'GET' &&
  (url.pathname.startsWith('/api/v1/products') || url.pathname.startsWith('/api/v1/categories'));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'PC Parts Store',
        short_name: 'PC Parts',
        description: 'Shop CPUs, GPUs, RAM and more. A mobile-first PC parts store.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#070a14',
        background_color: '#070a14',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // app shell: precache the built JS, CSS, HTML and static assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // single-page app: unknown navigations get index.html, but never API paths
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: isCatalogRequest,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-catalog',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    allowedHosts: ['.app.github.dev'],
    // In development, /api calls are forwarded to your backend on port 4000.
    proxy: { '/api': 'http://localhost:4000' },
  },
  preview: {
    port: 4173,
    allowedHosts: ['.app.github.dev'],
    proxy: { '/api': 'http://localhost:4000' },
  },
});