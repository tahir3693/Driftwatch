import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The new service worker takes over at once, so the app is controlled after the first load.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Driftwatch',
        short_name: 'Driftwatch',
        description: 'Catch the drift before it becomes a problem. Simulated data. Decision support only, not a medical device.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache every built file, including JSON (rules and scenario data) and the manifest.
        globPatterns: ['**/*.{js,css,html,json,svg,png,ico,webmanifest,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      // The service worker is only built and registered in production builds.
      devOptions: { enabled: false },
    }),
  ],
})
