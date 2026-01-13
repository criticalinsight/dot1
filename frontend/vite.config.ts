import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'pglite': ['@electric-sql/pglite'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
