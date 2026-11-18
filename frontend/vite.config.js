import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.app.github.dev'],
    // In development, /api calls are forwarded to your backend on port 4000.
    proxy: { '/api': 'http://localhost:4000' },
  },
});