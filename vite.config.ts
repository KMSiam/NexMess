import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        rollupFormat: 'iife',
      },
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'NexMess — Smart Mess Management',
        short_name: 'NexMess',
        description: 'Next-generation real-time mess management system for shared living.',
        theme_color: '#4A6D56',
        background_color: '#FAF5F0',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Framework core
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('scheduler')
            ) {
              return 'react-core'
            }
            // State + data
            if (id.includes('zustand') || id.includes('supabase')) {
              return 'state-data'
            }
            // UI + animations
            if (
              id.includes('framer-motion') ||
              id.includes('lucide-react') ||
              id.includes('react-hot-toast')
            ) {
              return 'ui-animations'
            }
            // PDF generation (heavy)
            if (id.includes('jspdf')) {
              return 'pdf'
            }
            return 'vendor'
          }
        },
        // Long-term caching
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name ?? ''
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(info)) return 'img/[name]-[hash][extname]'
          if (/\.css$/i.test(info)) return 'css/[name]-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    sourcemap: false,
    cssMinify: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
})
