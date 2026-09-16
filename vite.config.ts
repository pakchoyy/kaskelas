import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(
      new Date().toISOString().replace(/[:.]/g, '-')
    ),
    __APP_SCOPE__: JSON.stringify(process.env.APP_SCOPE || ''),
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://kaskelas-two.vercel.app',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['guru-cibisd2.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'template-siswa.xlsx', 'template-keuangan.xlsx'],
      manifest: {
        name: process.env.APP_SCOPE === 'kwaru' ? 'Rekap Sodaqoh Kelompok Waru' : 'Bantu Guru Yuk - Kas Kelas',
        short_name: process.env.APP_SCOPE === 'kwaru' ? 'Sodaqoh Waru' : 'Kas Kelas',
        description: process.env.APP_SCOPE === 'kwaru' ? 'Rekap sodaqoh Kelompok Waru - Triwulan & Pisangisasi' : 'Aplikasi kas kelas untuk guru SD/SMP dengan sinkronisasi ke Google Spreadsheet.',
        theme_color: '#0ea5a0',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
