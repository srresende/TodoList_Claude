import { defineConfig } from '@playwright/test'

// Testes de ponta a ponta no app Electron já compilado (rode `npm run build` antes).
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  use: { trace: 'retain-on-failure' }
})
