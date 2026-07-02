import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Command Center — PEC Edition',
        short_name: 'CmdCenter',
        description: 'Placement & EE Semester Dashboard — Attendance, LeetCode, AI Mentor, Fitness & Diet',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Don't cache Firebase/API calls — let them be fresh
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Chunk split heavy libraries — rolldown (Vite 8) requires manualChunks as a function
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || (id.includes('react') && !id.includes('recharts'))) return 'react-vendor';
          if (id.includes('firebase'))              return 'firebase-vendor';
          if (id.includes('recharts'))              return 'charts-vendor';
          if (id.includes('@google/generative-ai')) return 'gemini-vendor';
          if (id.includes('lucide-react'))          return 'lucide-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
