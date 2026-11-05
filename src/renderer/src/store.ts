import { create } from 'zustand'
import type { Comando } from '@domain/comandos'
import type { Estado } from '@domain/tipos'
import type { InfoApp } from '@shared/api'

export type Modal = 'planejadas' | 'fora' | 'secoes' | 'imprimir' | 'sobre' | 'atalhos' | 'perfil'

export type Dialogo =
  | { tipo: 'planejar'; id: string }
  | { tipo: 'mover'; id: string }
  | { tipo: 'arquivar'; id: string }

export interface Toast {
  id: number
  msg: string
  desfazer?: () => void
}

interface Loja {
  estado: Estado | null
  info: InfoApp | null
  /** Data do paper aberto na tela; null = hoje (RF-16). */
  dataVista: string | null
  /** O dia virou com o app aberto (RF-15). */
  avisoNovoDia: boolean
  modal: Modal | null
  dialogo: Dialogo | null
  editando: string | null
  /** Por seção: id do item pai quando o campo "Adicionar" está criando sub-itens. */
  modoSubitem: Record<string, string>
  /** Atividade que deve receber o foco depois da próxima renderização. */
  focar: string | null
  imprimirConcluidos: boolean
  toasts: Toast[]

  carregar(): Promise<void>
  verificarDia(): Promise<void>
  cmd(c: Comando): Promise<boolean>
  toast(msg: string, desfazer?: () => void): void
  fecharToast(id: number): void
  set(p: Partial<Loja>): void
}

let proximoToast = 1

export const useLoja = create<Loja>((set, get) => ({
  estado: null,
  info: null,
  dataVista: null,
  avisoNovoDia: false,
  modal: null,
  dialogo: null,
  editando: null,
  modoSubitem: {},
  focar: null,
  imprimirConcluidos: false,
  toasts: [],

  async carregar() {
    const [estado, info] = await Promise.all([window.api.estado(), window.api.info()])
    set({ estado, info })
  },

  async verificarDia() {
    const atual = get().estado
    const novo = await window.api.estado()
    if (atual && novo.hoje !== atual.hoje) {
      set({ estado: novo, avisoNovoDia: true, dataVista: null, editando: null, modal: null, dialogo: null })
      get().toast(`O dia mudou: hoje é ${novo.hoje.split('-').reverse().join('/')}`)
    }
  },

  async cmd(c) {
    const r = await window.api.executar(c)
    set({ estado: r.estado })
    if (!r.ok) get().toast(r.erro ?? 'Não foi possível concluir a ação.')
    else if (r.mensagem) get().toast(r.mensagem)
    window.api.info().then((info) => set({ info }))
    return r.ok
  },

  toast(msg, desfazer) {
    const id = proximoToast++
    set((s) => ({ toasts: [...s.toasts, { id, msg, desfazer }] }))
    setTimeout(() => get().fecharToast(id), desfazer ? 6000 : 3200)
  },

  fecharToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  set(p) {
    set(p)
  }
}))
