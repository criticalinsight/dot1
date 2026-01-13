import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  base: '/1/',
  plugins: [solid()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
