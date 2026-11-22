import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this repo at /Hexadrift/, so prefix all asset paths.
  base: '/Hexadrift/',
  // public/ is copied to dist/ root by default — audio at public/assets/sfx/...
  // resolves to /assets/sfx/... at runtime, matching audio.js fetch paths.
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});