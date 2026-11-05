import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

const alias = {
  '@domain': resolve(__dirname, 'src/domain'),
  '@shared': resolve(__dirname, 'src/shared')
}

export default defineConfig({
  main: {
    resolve: { alias }
  },
  preload: {
    resolve: { alias }
  },
  renderer: {
    resolve: { alias: { ...alias, '@renderer': resolve(__dirname, 'src/renderer/src') } },
    plugins: [react(), tailwindcss()]
  }
})
