import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // React 19 + ReactDOM alone is ~256 kB minified, pushing a single-chunk app
    // over Vite's 500 kB default. 1000 kB still catches genuinely runaway bundles.
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true, // fail fast if port is taken rather than silently picking another
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
