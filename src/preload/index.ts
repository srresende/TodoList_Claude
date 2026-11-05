// Ponte segura (contextIsolation + sandbox): a interface só enxerga estas três funções.
import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '@shared/api'

const api: Api = {
  estado: () => ipcRenderer.invoke('estado'),
  executar: (comando) => ipcRenderer.invoke('executar', comando),
  info: () => ipcRenderer.invoke('info')
}

contextBridge.exposeInMainWorld('api', api)
