import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Static build used by GitHub Pages, where the repo is published straight from
 * the branch. The entry keeps a stable filename so the fallback loader in
 * index.html can find it without reading a manifest.
 *
 *   npm run build:pages
 */
const base = process.env.VITE_BASE_PATH || '/PASHco/'

export default defineConfig({
  base,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_STATIC_HOST': JSON.stringify('true'),
  },
  build: {
    outDir: 'site',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
