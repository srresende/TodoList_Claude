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

// Edição (PRD D11): `--mode edicao-local` gera a versão só local; qualquer outro modo gera a versão com nuvem.
export default defineConfig(({ mode }) => {
  const define = { __EDICAO__: JSON.stringify(mode === 'edicao-local' ? 'local' : 'nuvem') }
  return {
    main: { resolve: { alias }, define },
    preload: { resolve: { alias }, define },
    renderer: {
      resolve: { alias: { ...alias, '@renderer': resolve(__dirname, 'src/renderer/src') } },
      define,
      plugins: [react(), tailwindcss()]
    }
  }
})
