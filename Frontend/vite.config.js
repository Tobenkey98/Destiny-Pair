import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('@radix-ui') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('cmdk') || id.includes('tailwind-merge')) {
              return 'vendor-ui';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('date-fns') || id.includes('sonner') || id.includes('react-loading-indicators') || id.includes('tw-animate-css')) {
              return 'vendor-utils';
            }
            if (id.includes('react')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
    cssCodeSplit: true,
    target: 'es2020',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8002',
        ws: true,
      },
    },
  },
})
