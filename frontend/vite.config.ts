import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  base: '/1/',
  plugins: [solid()],
  build: {
    outDir: 'dist/1', // Build into subdirectory to support /1/ path
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
