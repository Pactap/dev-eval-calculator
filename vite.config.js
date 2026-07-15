import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base on build so the app works from a GitHub Pages project subpath
// (https://<user>.github.io/<repo>/); root base in dev to keep HMR simple.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
}));
