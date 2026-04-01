import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/PerlerBeads-web/' : '/',
  plugins: [react()],
  server: {
    port: 3000
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  }
}))
