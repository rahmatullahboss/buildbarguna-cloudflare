import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const isApp = process.env.BUILD_TARGET === 'app'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*', '*.jpg', '*.jpeg', '*.png'],
      manifest: {
        name: 'বিল্ড বরগুনা',
        short_name: 'বিল্ড বরগুনা',
        description: 'বিল্ড বরগুনা গ্রুপ ইনভেস্টমেন্ট প্ল্যাটফর্ম',
        start_url: '/',
        display: 'standalone',
        background_color: '#15803d',
        theme_color: '#15803d',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/logo.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        categories: ['business', 'finance'],
        lang: 'bn',
        dir: 'ltr',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2}'],
        navigateFallbackDenylist: [/^\/api/, /\/api\//],
        runtimeCaching: [
          {
            // Cache-first strategy for static assets (app shell)
            urlPattern: /^https?:\/\/.*\.(js|css|png|jpg|jpeg|svg|woff|woff2|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'buildbarguna-static-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Network-first strategy for API requests
            urlPattern: /^https?:\/\/.*\/api\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'buildbarguna-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache-first for Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'buildbarguna-google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    // 'dist-app' for Capacitor Android/iOS, '../dist' for Cloudflare deployment
    outDir: isApp ? 'dist-app' : '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true
      }
    }
  }
})
