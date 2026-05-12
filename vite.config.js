import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/dev-eval-calculator/' : '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});
