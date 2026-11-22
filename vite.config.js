import { defineConfig } from 'vite'

// base './' para que funcione en cualquier carpeta o subruta (Netlify, wely.cl/travel, etc.)
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  build: { target: 'es2022', outDir: 'dist' },
})
