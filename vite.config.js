import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { nvidiaAiPlugin } from './server/nvidiaAiPlugin.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), nvidiaAiPlugin(env)],
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
  }
})
