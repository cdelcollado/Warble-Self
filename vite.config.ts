import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/repeater': {
        target: 'https://www.repeaterbook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/repeater/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'chirp/next-20231215 Python 3.10.12 linux');
          });
        }
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1500, // Relaxem l'avís per llibreries grans DataGrid
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          aggrid: ['ag-grid-react', 'ag-grid-community']
        }
      }
    }
  }
})
