import { ErroDominio, type Atividade, type Estado, type Paper, type PaperItem, type Secao, type Status } from './tipos'

export const COR_SECAO_PADRAO = '#4AA05C' // verde da palavra "mista" no logo (RF-42)

export const porOrdem = (a: { ordem: number }, b: { ordem: number }): number => a.ordem - b.ordem

export const ativ = (e: Estado, id: string): Atividade | undefined => e.atividades.find((a) => a.id === id)

export function ativOuErro(e: Estado, id: string): Atividade {
  const a = ativ(e, id)
  if (!a) throw new ErroDominio('Atividade não encontrada.')
  return a
}

export const secao = (e: Estado, id: string): Secao | undefined => e.secoes.find((s) => s.id === id)

export function secaoOuErro(e: Estado, id: string): Secao {
  const s = secao(e, id)
  if (!s) throw new ErroDominio('Seção não encontrada.')
  return s
}

export const secoesAtivas = (e: Estado): Secao[] =>
  e.secoes.filter((s) => !s.arquivada && !s.deletedAt).sort(porOrdem)

export const secoesArquivadas = (e: Estado): Secao[] =>
  e.secoes.filter((s) => s.arquivada && !s.deletedAt).sort(porOrdem)

export const paperDe = (e: Estado, data: string): Paper | undefined => e.papers.find((p) => p.data === data)

export const paperHoje = (e: Estado): Paper | undefined => paperDe(e, e.hoje)

export function paperHojeOuErro(e: Estado): Paper {
  const p = paperHoje(e)
  if (!p) throw new ErroDominio('Crie o paper do dia primeiro.')
  return p
}

/** Último paper com data anterior a `data`, qualquer que seja o intervalo (RN-03: sem regra de dias úteis). */
export const ultimoPaperAntes = (e: Estado, data: string): Paper | null =>
  e.papers.filter((p) => p.data < data).sort((a, b) => (a.data < b.data ? 1 : -1))[0] ?? null

export const filhos = (e: Estado, id: string): Atividade[] =>
  e.atividades.filter((a) => a.parentId === id && a.status !== 'excluida')

export function idsHoje(e: Estado): Set<string> {
  const p = paperHoje(e)
  return new Set(p ? p.itens.map((i) => i.atividadeId) : [])
}

export const itemHoje = (e: Estado, id: string): PaperItem | undefined =>
  paperHoje(e)?.itens.find((i) => i.atividadeId === id)

/** Atividades no paper de hoje, de uma seção e de um nível (pai = null para o 1º nível). */
export function visiveis(e: Estado, secaoId: string, parentId: string | null): Atividade[] {
  const ids = idsHoje(e)
  return e.atividades
    .filter(
      (a) =>
        ids.has(a.id) && a.status !== 'excluida' && a.secaoId === secaoId && (a.parentId ?? null) === parentId
    )
    .sort(porOrdem)
}

export const foraDoPaper = (e: Estado): Atividade[] =>
  e.atividades.filter((a) => a.status === 'pendente' && a.foraDoPaper).sort(porOrdem)

export const planejadas = (e: Estado): Atividade[] =>
  e.atividades
    .filter((a) => a.status === 'pendente' && a.planejadaPendente)
    .sort((a, b) =>
      a.dataPlanejada === b.dataPlanejada ? a.ordem - b.ordem : (a.dataPlanejada ?? '') < (b.dataPlanejada ?? '') ? -1 : 1
    )

export interface Linha {
  id: string
  texto: string
  status: Status
  planejado: boolean
}

/** Linhas de um nível de uma seção num paper: hoje = atividades vivas; dias anteriores = retrato congelado. */
export function linhasPaper(e: Estado, data: string, secaoId: string, parentId: string | null): Linha[] {
  if (data === e.hoje) {
    return visiveis(e, secaoId, parentId).map((a) => ({
      id: a.id,
      texto: a.texto,
      status: a.status,
      planejado: !!itemHoje(e, a.id)?.planejado
    }))
  }
  const p = paperDe(e, data)
  if (!p) return []
  return p.itens
    .filter((i) => i.secaoId === secaoId && (i.parentId ?? null) === parentId && i.status !== 'excluida')
    .sort(porOrdem)
    .map((i) => ({ id: i.atividadeId, texto: i.texto, status: i.status, planejado: false }))
}

/** Datas com paper, até hoje (RF-16: a navegação pula os dias sem paper). */
export const datasNavegaveis = (e: Estado): string[] =>
  e.papers
    .map((p) => p.data)
    .filter((d) => d <= e.hoje)
    .sort()

/** Item pendente acima que pode virar pai, ou null se a atividade não pode virar sub-item. */
export function podeRecuar(e: Estado, id: string): Atividade | null {
  const a = ativ(e, id)
  if (!a || a.parentId || filhos(e, id).length) return null
  const irmaos = visiveis(e, a.secaoId, null)
  const i = irmaos.findIndex((x) => x.id === id)
  return i > 0 && irmaos[i - 1].status === 'pendente' ? irmaos[i - 1] : null
}

export const pendentesNaSecao = (e: Estado, secaoId: string): number =>
  e.atividades.filter((a) => a.secaoId === secaoId && a.status === 'pendente').length
