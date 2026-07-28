import { defineConfig } from 'vite';

// Relative base so the built bundle can be dropped on any host or opened
// from a subdirectory without rewriting asset URLs.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
