import { datasNavegaveis, paperDe, paperHoje, ultimoPaperAntes } from '@domain/consultas'
import type { Estado } from '@domain/tipos'
import { EDICAO_LOCAL } from '@shared/edicao'

export type Rota = 'carregando' | 'perfil' | 'assistente' | 'paper' | 'paperDiaAnterior'

/** Qual tela mostrar: edição Local sem usuário → primeiro acesso; sem paper hoje → assistente (RF-10); se o dia virou com o app aberto → paper anterior com aviso (RF-15). */
export function rota(e: Estado | null, avisoNovoDia: boolean): Rota {
  if (!e) return 'carregando'
  if (EDICAO_LOCAL && !e.usuario) return 'perfil' // edição Local: nome e e-mail no primeiro acesso
  if (paperHoje(e)) return 'paper'
  if (avisoNovoDia && ultimoPaperAntes(e, e.hoje)) return 'paperDiaAnterior'
  return 'assistente'
}

/** Data do paper aberto na tela (RF-16); é também a que o botão Imprimir imprime. */
export function dataDaTela(e: Estado, dataVista: string | null, r: Rota): string {
  const base = r === 'paperDiaAnterior' ? ultimoPaperAntes(e, e.hoje)!.data : e.hoje
  return dataVista && dataVista !== base && dataVista <= e.hoje && paperDe(e, dataVista) ? dataVista : base
}

export function vizinhas(e: Estado, data: string): { anterior?: string; proxima?: string } {
  const datas = datasNavegaveis(e)
  return { anterior: datas.filter((d) => d < data).pop(), proxima: datas.find((d) => d > data) }
}
