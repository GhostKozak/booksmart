import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/booksmart/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'screenshots/*.png'],
      manifest: {
        id: 'booksmart-app',
        name: 'BookSmart - Smart Bookmark Organizer and Manager',
        short_name: 'BookSmart',
        description: 'Organize your bookmarks smartly with AI, clean up dead links, and boost your productivity.',
        theme_color: '#0a0f1a',
        background_color: '#0a0f1a',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
        dir: 'ltr',
        lang: 'en-US',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'utilities', 'organization'],
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/maskable-icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/screenshots/dark-mode.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'BookSmart Dark Mode'
          },
          {
            src: '/screenshots/white-mode.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'BookSmart Light Mode'
          },
          {
            src: '/screenshots/analytics-page.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Analytics & Dashboard'
          },
          {
            src: '/screenshots/grid-with-thumbnail-view.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Grid View with Thumbnails'
          },
          {
            src: '/screenshots/grid-with-thumbnail-preview-site.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Live Site Preview'
          },
          {
            src: '/screenshots/mobile.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'BookSmart Mobile View'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons\?.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'favicon-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          dndkit: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          vendor: ['react', 'react-dom', 'dexie', 'dexie-react-hooks'],
        }
      }
    }
  }
})
