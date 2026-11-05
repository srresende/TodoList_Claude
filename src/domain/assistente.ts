// Assistente "Criar paper do dia" (RF-10 a RF-14, RN-03, RN-08, RN-09).
import { ativ, filhos, paperHoje, porOrdem, ultimoPaperAntes } from './consultas'
import { ErroDominio, type Atividade, type Ctx, type Estado, type Paper, type PaperItem } from './tipos'

export interface Assistente {
  /** Data do último paper cadastrado, ou null no primeiro uso. */
  ultimo: string | null
  /** Pendentes do último paper. */
  pend: string[]
  /** Planejadas com data ≤ hoje (e sub-itens/pais que vêm junto). */
  plan: string[]
}

export interface NovaNoAssistente {
  secaoId: string
  texto: string
}

export function montarAssistente(e: Estado): Assistente {
  const ult = ultimoPaperAntes(e, e.hoje)
  const pend: string[] = []
  if (ult) {
    for (const i of ult.itens) {
      const a = ativ(e, i.atividadeId)
      if (a && a.status === 'pendente' && !a.foraDoPaper && !a.planejadaPendente && !pend.includes(a.id))
        pend.push(a.id)
    }
  }
  const plan = e.atividades
    .filter((a) => a.status === 'pendente' && a.planejadaPendente && (a.dataPlanejada ?? '') <= e.hoje)
    .sort(porOrdem)
    .map((a) => a.id)
  // Sub-itens (sem data própria) de uma planejada vêm junto
  for (const id of [...plan]) {
    for (const c of filhos(e, id)) {
      if (c.status === 'pendente' && !c.planejadaPendente && !c.foraDoPaper && !pend.includes(c.id) && !plan.includes(c.id))
        plan.push(c.id)
    }
  }
  // RF-14 / RN-08: sub-item pendente arrasta o pai
  const todos = new Set([...pend, ...plan])
  for (const id of [...pend, ...plan]) {
    const a = ativ(e, id)!
    if (a.parentId && !todos.has(a.parentId)) {
      const pai = ativ(e, a.parentId)
      if (pai && pai.status !== 'excluida') {
        ;(pend.includes(id) ? pend : plan).push(pai.id)
        todos.add(pai.id)
      }
    }
  }
  return { ultimo: ult?.data ?? null, pend, plan }
}

export const candidatos = (a: Assistente, excluidos: ReadonlySet<string>): string[] =>
  [...a.pend, ...a.plan].filter((id) => !excluidos.has(id))

/** Marca/desmarca no assistente mantendo pai e filhos coerentes. Retorna um novo conjunto. */
export function marcarNoAssistente(
  e: Estado,
  a: Assistente,
  excluidos: ReadonlySet<string>,
  marcados: ReadonlySet<string>,
  id: string,
  on: boolean
): Set<string> {
  const m = new Set(marcados)
  const cand = new Set(candidatos(a, excluidos))
  const at = ativ(e, id)
  if (!at) return m
  if (on) m.add(id)
  else m.delete(id)
  if (on && at.parentId && cand.has(at.parentId)) m.add(at.parentId)
  if (!at.parentId)
    for (const c of filhos(e, id)) {
      if (!cand.has(c.id)) continue
      if (on) m.add(c.id)
      else m.delete(c.id)
    }
  return m
}

export function item(ctx: Ctx, a: Atividade, planejado: boolean): PaperItem {
  return {
    id: ctx.uid(),
    atividadeId: a.id,
    secaoId: a.secaoId,
    parentId: a.parentId,
    texto: a.texto,
    status: a.status,
    ordem: a.ordem,
    planejado
  }
}

export function proximaOrdem(e: Estado): number {
  return e.atividades.reduce((m, a) => Math.max(m, a.ordem), 0) + 1
}

export function novaAtividade(
  e: Estado,
  ctx: Ctx,
  secaoId: string,
  parentId: string | null,
  texto: string,
  data: string | null = null
): Atividade {
  const agora = ctx.agora()
  const a: Atividade = {
    id: ctx.uid(),
    secaoId,
    parentId,
    texto,
    ordem: proximaOrdem(e),
    status: 'pendente',
    dataPlanejada: data,
    planejadaPendente: !!data,
    foraDoPaper: false,
    porPai: false,
    criadaEm: agora,
    concluidaEm: null,
    updatedAt: agora,
    deletedAt: null
  }
  e.atividades.push(a)
  return a
}

/** Cria o paper de hoje a partir das escolhas feitas no assistente. Itens desmarcados vão para "Fora do paper". */
export function criarPaper(
  e: Estado,
  ctx: Ctx,
  marcados: ReadonlySet<string>,
  excluidos: ReadonlySet<string>,
  novos: NovaNoAssistente[]
): { paper: Paper; fora: number } {
  if (paperHoje(e)) throw new ErroDominio('O paper de hoje já existe.') // RN-01
  const as = montarAssistente(e)
  const agora = ctx.agora()
  const p: Paper = { id: ctx.uid(), data: e.hoje, criadoEm: agora, impressoEm: null, updatedAt: agora, itens: [] }
  e.papers.push(p)
  let fora = 0
  for (const id of [...as.pend, ...as.plan]) {
    const a = ativ(e, id)!
    if (excluidos.has(id)) {
      a.status = 'excluida'
      a.deletedAt = agora
    } else if (marcados.has(id)) {
      p.itens.push(item(ctx, a, as.plan.includes(id)))
      a.foraDoPaper = false
      a.planejadaPendente = false
    } else {
      a.foraDoPaper = true // D4 / RN-09: sem nova data e sem reimportação automática
      a.planejadaPendente = false
      a.dataPlanejada = null
      fora++
    }
    a.updatedAt = agora
  }
  for (const n of novos) {
    const texto = n.texto.trim()
    if (!texto) continue
    const a = novaAtividade(e, ctx, n.secaoId, null, texto)
    p.itens.push(item(ctx, a, false))
  }
  return { paper: p, fora }
}
