import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config optimizado para deployment
// - Code splitting por vendor para reducir bundle inicial
// - Hashing para cache busting
// - Three.js ELIMINADO — solo mapa 2D Leaflet
export default defineConfig({
  // Base path: vacio en Vercel/Netlify, "/sisar-demo-react/" en GitHub Pages
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core (~140KB)
          'react-vendor': ['react', 'react-dom'],
          // Leaflet 2D maps (~150KB)
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
          // Animaciones (~80KB)
          'motion-vendor': ['framer-motion'],
        },
      },
    },
  },
})
