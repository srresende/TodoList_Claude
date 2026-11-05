import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import type { Comando } from '@domain/comandos'
import { hojeLocal } from '@domain/datas'
import type { InfoApp } from '@shared/api'
import { abrirBanco } from './db/repositorio'
import { Servico } from './servico'

// Desenvolvimento/testes: TODOLIST_DADOS aponta uma pasta de dados isolada (não toca nos dados reais).
if (!app.isPackaged && process.env.TODOLIST_DADOS) app.setPath('userData', process.env.TODOLIST_DADOS)

// Uma instância só: duas janelas gravando a mesma base local causariam conflito.
if (!app.requestSingleInstanceLock()) app.quit()

/** RN-02: data local do computador. TODOLIST_HOJE=AAAA-MM-DD simula outra data (apenas em desenvolvimento). */
const hoje = (): string => (!app.isPackaged && process.env.TODOLIST_HOJE) || hojeLocal()

let janela: BrowserWindow | null = null

function criarJanela(): void {
  janela = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    title: 'TodoList_C',
    show: false,
    backgroundColor: '#eceff1',
    autoHideMenuBar: true,
    // No app empacotado o ícone vem do próprio .exe; em desenvolvimento, do arquivo.
    ...(app.isPackaged ? {} : { icon: join(app.getAppPath(), 'resources/icon.png') }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  janela.once('ready-to-show', () => janela?.show())
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  janela.webContents.on('will-navigate', (e) => e.preventDefault())
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) janela.loadURL(process.env.ELECTRON_RENDERER_URL)
  else janela.loadFile(join(__dirname, '../renderer/index.html'))
}

app.on('second-instance', () => {
  if (janela) {
    if (janela.isMinimized()) janela.restore()
    janela.focus()
  }
})

app.whenReady().then(() => {
  if (app.isPackaged) Menu.setApplicationMenu(null)

  // Base local na pasta de dados do usuário, protegida pelo perfil do sistema operacional (RNF-03, D10).
  const arquivoBanco = join(app.getPath('userData'), 'todolist_c.db')
  const migracoes = app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(app.getAppPath(), 'drizzle')
  const { db, fechar } = abrirBanco(arquivoBanco, migracoes)
  const servico = new Servico(db, hoje)
  app.on('will-quit', fechar)

  ipcMain.handle('estado', () => servico.estado())
  ipcMain.handle('executar', (_e, comando: Comando) => servico.executar(comando))
  ipcMain.handle(
    'info',
    (): InfoApp => ({
      nome: 'TodoList_C',
      versao: app.getVersion(),
      electron: process.versions.electron,
      arquivoBanco,
      pendentesSincronizacao: servico.pendentesSincronizacao()
    })
  )

  criarJanela()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
