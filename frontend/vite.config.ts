import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'Music Demo Manager', short_name: 'Music Demos', description: 'Organize and play music demos',
      start_url: '/', scope: '/', display: 'standalone',
      background_color: '#101827', theme_color: '#101827',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    },
    workbox: {
      navigateFallback: '/index.html',
      runtimeCaching: [{
        urlPattern: ({url}) => url.pathname === '/api/songs',
        handler: 'NetworkFirst', options: {cacheName:'songs-data', networkTimeoutSeconds:3, expiration:{maxEntries:3,maxAgeSeconds:86400}}
      }]
    }
  })],
  server: { proxy: { '/api': 'http://localhost:8000' } }
})
