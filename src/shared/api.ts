// Contrato entre a interface (renderer) e o processo principal, exposto em window.api pelo preload.
import type { Comando } from '@domain/comandos'
import type { Estado } from '@domain/tipos'
import type { Edicao } from './edicao'

export interface Resposta {
  ok: boolean
  estado: Estado
  /** Mensagem curta para mostrar ao usuário em caso de sucesso. */
  mensagem?: string
  /** Motivo da recusa (regra de negócio) ou falha ao gravar. */
  erro?: string
}

export interface InfoApp {
  nome: string
  edicao: Edicao
  /** Pasta onde ficam os dados (útil para backup manual na edição Local). */
  pastaDados: string
  versao: string
  electron: string
  arquivoBanco: string
  pendentesSincronizacao: number
}

export interface Api {
  estado(): Promise<Estado>
  executar(comando: Comando): Promise<Resposta>
  info(): Promise<InfoApp>
}
