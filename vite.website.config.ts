import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve('website'),
  base: '/TabSpace/',
  publicDir: resolve('website/public'),
  build: {
    outDir: resolve('site-dist'),
    emptyOutDir: true,
  },
})
