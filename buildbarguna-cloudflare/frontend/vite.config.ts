import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isApp = process.env.BUILD_TARGET === 'app'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    // 'dist-app' for Capacitor Android/iOS, 'dist' for Cloudflare deployment
    outDir: isApp ? 'dist-app' : 'dist',
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
