import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://corsproxy.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://corsproxy.io; frame-ancestors 'none'; base-uri 'self';",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()'
      }
    },
    plugins: [react()],
    // Variables de entorno para el frontend (sin API keys)
    define: {
      // Solo exponer variables seguras necesarias para el frontend
      'import.meta.env.VITE_APP_NAME': JSON.stringify('Scrapii'),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.0')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      // Configuraciones de seguridad para producción
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.warn']
        }
      },
      rollupOptions: {
        output: {
          // Configurar headers de seguridad
          assetFileNames: '[name].[hash][extname]',
          chunkFileNames: '[name].[hash].js',
          entryFileNames: '[name].[hash].js'
        }
      }
    }
  };
});
