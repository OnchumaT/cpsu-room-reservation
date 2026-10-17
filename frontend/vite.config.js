import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  plugins: [react()],
  server: {
    host: true
  },
  // `npm run preview:sim` — a production build served for the temporary
  // deploy simulation (see README "จำลอง deploy"): /api is forwarded to the
  // simulation API on :4100, and the Cloudflare quick-tunnel host is allowed in.
  preview: {
    port: 4173,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://127.0.0.1:4100', xfwd: true },
    },
  },
  build: {
    outDir: 'dist'
  }
});

