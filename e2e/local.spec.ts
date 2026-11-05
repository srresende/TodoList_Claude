import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

// Edição Local (D11). Rode com `npm run test:e2e:local` (o build precisa ser feito com --mode edicao-local).
const capturas = process.env.TODOLIST_CAPTURAS

async function abrir(dados: string): Promise<{ app: ElectronApplication; janela: Page }> {
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, TODOLIST_DADOS: dados, TODOLIST_HOJE: '2026-11-05', ELECTRON_RENDERER_URL: '' }
  })
  const janela = await app.firstWindow()
  await janela.setViewportSize({ width: 1200, height: 900 })
  return { app, janela }
}

async function foto(janela: Page, nome: string): Promise<void> {
  if (capturas) await janela.screenshot({ path: join(capturas, `${nome}.png`) })
}

test('edição Local: pede nome e e-mail no primeiro acesso e permite alterar depois', async () => {
  const dados = mkdtempSync(join(tmpdir(), 'todolist-c-local-'))
  try {
    let { app, janela } = await abrir(dados)
    await expect(janela).toHaveTitle('TodoList_C Local')
    await expect(janela.getByRole('heading', { name: 'TodoList_C Local' })).toBeVisible()

    // Validações: nome obrigatório (HTML) e e-mail inválido (regra do domínio)
    await janela.getByLabel('Nome').fill('Sergio Resende')
    await janela.getByLabel(/E-mail/).fill('sergio@')
    await janela.getByLabel(/E-mail/).evaluate((el: HTMLInputElement) => (el.type = 'text')) // ignora a validação do navegador
    await janela.getByRole('button', { name: 'Começar' }).click()
    await expect(janela.getByText('E-mail inválido.')).toBeVisible()
    await janela.getByLabel(/E-mail/).fill('sergio@exemplo.com')
    await foto(janela, 'local-1-primeiro-acesso')
    await janela.getByRole('button', { name: 'Começar' }).click()

    // Depois dos dados, segue o fluxo normal: assistente do paper do dia
    await expect(janela.getByText('Criar paper do dia')).toBeVisible()
    await janela.getByRole('button', { name: 'Criar paper' }).click()
    await expect(janela.getByText('Versão local')).toBeVisible()
    await expect(janela.getByRole('button', { name: 'Sergio Resende' })).toBeVisible()
    await foto(janela, 'local-2-paper')

    // Alterar os dados pelo nome no topo
    await janela.getByRole('button', { name: 'Sergio Resende' }).click()
    await expect(janela.getByRole('dialog', { name: 'Meus dados' })).toBeVisible()
    await janela.getByLabel('Nome').fill('Sergio R.')
    await janela.getByRole('button', { name: 'Salvar' }).click()
    await expect(janela.getByRole('button', { name: 'Sergio R.' })).toBeVisible()

    // "Sobre" mostra a edição e o usuário
    await janela.getByTitle('Sobre o TodoList_C Local').click()
    await expect(janela.getByText('Local: offline, sem login e sem sincronização')).toBeVisible()
    await expect(janela.getByText('sergio@exemplo.com')).toBeVisible()
    await foto(janela, 'local-3-sobre')
    await app.close()

    // Ao reabrir, não pede os dados de novo
    ;({ app, janela } = await abrir(dados))
    await expect(janela.getByRole('button', { name: 'Sergio R.' })).toBeVisible()
    await app.close()
  } finally {
    // Melhor esforço: no Windows, antivírus/indexador podem segurar a pasta temporária por alguns instantes.
    try {
      rmSync(dados, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {
      /* fica no %TEMP%; não afeta o resultado do teste */
    }
  }
})
