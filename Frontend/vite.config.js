import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import config from './config.js'

const viteEnv = Object.fromEntries(
  Object.entries(config)
    .filter(([key]) => key.startsWith('VITE_'))
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
)

// export default defineConfig({
//   define: viteEnv,
//   plugins: [react()],
//   server: {
//     proxy: {
//       '/api': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//       },
//     },
//   },
// })

const isDocker = process.env.DOCKER === 'true'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: isDocker
          ? 'http://backend:5000'
          : 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

