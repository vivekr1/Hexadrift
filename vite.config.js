import { defineConfig } from 'vite';

export default defineConfig({
  // public/ is copied to dist/ root by default — audio at public/assets/sfx/...
  // resolves to /assets/sfx/... at runtime, matching audio.js fetch paths.
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});