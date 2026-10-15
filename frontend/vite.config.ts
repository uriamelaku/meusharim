import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Embedded in the bundle at build time. Without them the app throws on load and shows
// a blank page, so a production build must fail instead of shipping that.
const REQUIRED_BUILD_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = REQUIRED_BUILD_ENV.filter((name) => !env[name]?.trim())
    if (missing.length) {
      throw new Error(`Missing build environment variables: ${missing.join(', ')}`)
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
      host: true,
      // Docker on Windows/macOS does not forward file-change events into the container.
      watch: { usePolling: process.env.WATCH_POLLING === 'true' },
      proxy: {
        '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8000',
      },
    },
  }
})
