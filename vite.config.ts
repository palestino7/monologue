import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo-mark.svg', 'logo-wordmark.svg', 'icon-pwa-192.svg', 'icon-pwa-512.svg', 'icon-maskable.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
      },
      manifest: {
        name: 'Monologue - Chat com Você Mesmo',
        short_name: 'Monologue',
        description: 'Um espaço privado e local para organizar pensamentos como uma conversa.',
        lang: 'pt-BR',
        theme_color: '#0B0C0E',
        background_color: '#0B0C0E',
        display: 'standalone',
        icons: [
          {
            src: 'icon-pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
