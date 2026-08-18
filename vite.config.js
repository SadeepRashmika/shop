import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('xlsx') || id.includes('jspdf') || id.includes('jsbarcode') || id.includes('qrcode')) {
              return 'vendor-utils';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            return 'vendor-libs';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
