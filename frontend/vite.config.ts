import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'], // <--- Reads both VITE_ and REACT_APP_ prefixes from .env
  server: {
    port: 3000 // Default frontend port
  }
})