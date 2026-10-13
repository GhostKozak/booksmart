/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function rssDevProxyPlugin() {
  return {
    name: 'rss-feed-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || (!req.url.startsWith('/api/feed-proxy') && !req.url.startsWith('/booksmart/api/feed-proxy'))) {
          return next();
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end();
          return;
        }

        try {
          const parsedUrl = new URL(req.url, 'http://localhost:5173');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing target URL' }));
            return;
          }

          const decodedUrl = decodeURIComponent(targetUrl);
          const response = await fetch(decodedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, text/html, */*',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });

          res.statusCode = response.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', response.headers.get('content-type') || 'text/xml; charset=utf-8');
          const body = await response.text();
          res.end(body);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
  },
  base: '/booksmart/',
  plugins: [
    react(),
    tailwindcss(),
    rssDevProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png', 'screenshots/*.png'],
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
        scope: '/booksmart/',
        start_url: '/booksmart/',
        categories: ['productivity', 'utilities', 'organization'],
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/maskable-icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshots/dark-mode.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'BookSmart Dark Mode'
          },
          {
            src: 'screenshots/white-mode.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'BookSmart Light Mode'
          },
          {
            src: 'screenshots/analytics-page.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Analytics & Dashboard'
          },
          {
            src: 'screenshots/grid-with-thumbnail-view.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Grid View with Thumbnails'
          },
          {
            src: 'screenshots/grid-with-thumbnail-preview-site.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Live Site Preview'
          },
          {
            src: 'screenshots/mobile.png',
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
        enabled: false
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
            if (id.includes('/dexie/')) return 'vendor-db';
            if (id.includes('/i18next/') || id.includes('/react-i18next/')) return 'vendor-i18n';
            if (id.includes('/recharts/')) return 'vendor-recharts';
            if (id.includes('/@dnd-kit/')) return 'vendor-dndkit';
            if (id.includes('/fuse.js/') || id.includes('/date-fns/') || id.includes('/lucide-react/') || id.includes('/react-virtuoso/')) {
              return 'vendor-utils';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
