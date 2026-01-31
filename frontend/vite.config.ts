import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/1/',
  plugins: [
    tailwindcss(),
    solid(),
  ],
  build: {
    outDir: 'dist/1', // Build into subdirectory to support /1/ path
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('solid-js')) return 'vendor-solid';
            if (id.includes('lucide')) return 'vendor-icons';
            if (id.includes('pglite')) return 'vendor-db';
            return 'vendor';
          }
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
