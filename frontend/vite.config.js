import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = { target: 'http://localhost:8000', changeOrigin: true }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on the LAN too, so phones on the same Wi-Fi can open http://<laptop-ip>:5173/booth.
    // Every backend path goes through this proxy, so a phone never has to reach port 8000 itself.
    host: true,
    proxy: {
      '/api': backend,
      '/uploads': backend,
      '/showcase': backend,
    },
  },
})
