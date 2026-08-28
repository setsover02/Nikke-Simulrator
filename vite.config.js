import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/blablalink': {
        target: 'https://api.blablalink.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blablalink/, ''),
        headers: {
          'Origin': 'https://www.blablalink.com',
          'Referer': 'https://www.blablalink.com/',
        },
      },
      '/cdn/blablalink': {
        target: 'https://sg-tools-cdn.blablalink.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cdn\/blablalink/, ''),
      },
    },
  },
})
