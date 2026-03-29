import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sdk: './sdk-entry.js',
      },
      output: {
        entryFileNames: 'sdk-bundle.js',
        format: 'iife',
        name: 'AitSdk',
      }
    },
    emptyOutDir: false,
  }
});
