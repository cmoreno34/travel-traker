import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configurado para cmoreno34
export default defineConfig({
  plugins: [react()],
  base: '/travel-tracker/',
  server: {
    port: 5173
  }
})
