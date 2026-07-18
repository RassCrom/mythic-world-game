import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev the Worker runs on :8787 (wrangler dev); /api is proxied there,
// including WebSocket upgrades. In production set VITE_API_BASE to the
// deployed Worker URL (see README).
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    fs: { allow: ['..'] }, // allow importing ../shared/cards.js
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
