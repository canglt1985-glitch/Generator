import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function photoApiDevPlugin() {
  return {
    name: 'photo-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/photo')) {
          try {
            const { default: handler } = await import('./api/photo.js');
            const url = new URL(req.url, 'http://localhost');
            const query = Object.fromEntries(url.searchParams.entries());
            req.query = query;
            return handler(req, res);
          } catch (err) {
            console.error('[photo-api-dev-error]', err);
            res.statusCode = 500;
            return res.end('Internal Server Error in Photo Proxy');
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), photoApiDevPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('exceljs')) {
              return 'vendor-exceljs';
            }
            if (id.includes('docxtemplater') || id.includes('pizzip') || id.includes('jszip')) {
              return 'vendor-docx';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react/')) {
              return 'vendor-react';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
