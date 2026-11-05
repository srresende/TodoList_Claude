import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

const capturas = process.env.TODOLIST_CAPTURAS // pasta opcional para salvar capturas de tela

async function abrir(dados: string, hoje: string): Promise<{ app: ElectronApplication; janela: Page }> {
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, TODOLIST_DADOS: dados, TODOLIST_HOJE: hoje, ELECTRON_RENDERER_URL: '' }
  })
  const janela = await app.firstWindow()
  await janela.setViewportSize({ width: 1200, height: 900 })
  return { app, janela }
}

async function foto(janela: Page, nome: string): Promise<void> {
  if (capturas) await janela.screenshot({ path: join(capturas, `${nome}.png`) })
}

test('fluxo do paper: primeiro uso, criar atividades, virar o dia e navegar', async () => {
  const dados = mkdtempSync(join(tmpdir(), 'todolist-c-e2e-'))
  try {
    // Dia 1: primeiro uso → assistente com as seções padrão
    let { app, janela } = await abrir(dados, '2026-11-04')
    await expect(janela.getByText('Criar paper do dia')).toBeVisible()
    await expect(janela.getByText('Ainda não existe nenhum paper')).toBeVisible()
    await janela.getByPlaceholder('Nova atividade em “Profissional”').fill('Revisão SFDC')
    await janela.getByPlaceholder('Nova atividade em “Profissional”').press('Enter')
    await foto(janela, '1-assistente')
    await janela.getByRole('button', { name: 'Criar paper' }).click()

    // Paper do dia: criar item, sub-itens (Tab) e concluir
    const campo = janela.locator('[data-nova]').first()
    await campo.fill('Agenda')
    await campo.press('Enter')
    await campo.press('Tab')
    await expect(janela.getByText('Sub-item de “Agenda”')).toBeVisible()
    for (const nome of ['Amanda', 'Leo']) {
      await campo.fill(nome)
      await campo.press('Enter')
    }
    await campo.press('Shift+Tab')
    await campo.fill('Ibm oportunidades')
    await campo.press('Enter')
    await janela.locator('[data-nova]').nth(1).fill('IBMR')
    await janela.locator('[data-nova]').nth(1).press('Enter')
    await janela.locator('[data-linha]', { hasText: 'Revisão SFDC' }).getByRole('checkbox').check()
    await expect(janela.locator('.linha.feita', { hasText: 'Revisão SFDC' })).toBeVisible()
    await expect(janela.locator('.linha.n2')).toHaveCount(2)
    await foto(janela, '2-paper-hoje')

    await janela.keyboard.press('Control+P')
    await expect(janela.getByText('cabe em 1 página')).toBeVisible()
    await foto(janela, '3-impressao')
    await janela.keyboard.press('Escape')
    await app.close()

    // Dia 3 (pulando um dia sem paper): os pendentes voltam; o concluído não (RN-03, RN-04)
    ;({ app, janela } = await abrir(dados, '2026-11-06'))
    await expect(janela.getByText('Pendentes de 04/11/2026')).toBeVisible()
    await expect(janela.getByText('Último paper criado há 2 dias')).toBeVisible()
    await expect(janela.getByText('Revisão SFDC')).toHaveCount(0)
    await janela.locator('label', { hasText: 'IBMR' }).getByRole('checkbox').uncheck()
    await janela.getByRole('button', { name: 'Criar paper' }).click()
    await expect(janela.getByRole('button', { name: /Fora do paper/ })).toContainText('1')

    // Navegar para o paper anterior (RF-16): somente leitura, com o concluído riscado
    await janela.getByRole('button', { name: 'Paper anterior' }).click()
    await expect(janela.getByText('somente leitura').first()).toBeVisible()
    await expect(janela.locator('.linha.feita', { hasText: 'Revisão SFDC' })).toBeVisible()
    await foto(janela, '4-dia-anterior')
    await janela.getByRole('button', { name: 'Voltar para hoje' }).click()
    await expect(janela.locator('[data-linha]', { hasText: 'Agenda' })).toBeVisible()
    await app.close()
  } finally {
    rmSync(dados, { recursive: true, force: true })
  }
})
