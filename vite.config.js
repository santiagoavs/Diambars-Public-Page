import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  base: './', // Use relative paths for production
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://expo2025-8bjn.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,
    chunkSizeWarningLimit: 1600,
  },
  define: {
    'process.env': process.env,
    // Add any other environment variables here
  }
}))