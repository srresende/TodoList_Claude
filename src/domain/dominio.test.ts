import { beforeEach, describe, expect, it } from 'vitest'
import { criarPaper, marcarNoAssistente, montarAssistente } from './assistente'
import { executar, secoesPadrao } from './comandos'
import { datasNavegaveis, foraDoPaper, linhasPaper, paperDe, paperHoje, visiveis } from './consultas'
import { ErroDominio, type Atividade, type Ctx, type Estado } from './tipos'

let n = 0
const ctx: Ctx = { agora: () => '2026-11-04T12:00:00.000Z', uid: () => `id-${++n}` }

/** Paper de 03/11/2026 do Exemplo 1 (concluídos = os que sumiram no Exemplo 2) + planejadas. */
function exemplo(): Estado {
  const [dxc, pes] = secoesPadrao(ctx)
  dxc.nome = 'Atividades DXC'
  pes.nome = 'Atividades Pessoais'
  const e: Estado = { hoje: '2026-11-03', usuario: null, secoes: [dxc, pes], atividades: [], papers: [] }
  const nova = (sec: string, texto: string, o: { pai?: Atividade; concluida?: boolean; data?: string } = {}): Atividade => {
    const a: Atividade = {
      id: ctx.uid(),
      secaoId: sec,
      parentId: o.pai?.id ?? null,
      texto,
      ordem: e.atividades.length + 1,
      status: o.concluida ? 'concluida' : 'pendente',
      dataPlanejada: o.data ?? null,
      planejadaPendente: !!o.data,
      foraDoPaper: false,
      porPai: false,
      criadaEm: ctx.agora(),
      concluidaEm: o.concluida ? ctx.agora() : null,
      updatedAt: ctx.agora(),
      deletedAt: null
    }
    e.atividades.push(a)
    return a
  }
  const noPaper: Atividade[] = []
  const p = (...args: Parameters<typeof nova>): Atividade => {
    const a = nova(...args)
    noPaper.push(a)
    return a
  }
  p(dxc.id, 'Thadeu.viagem bh')
  p(dxc.id, 'Ibm.oportunidades')
  p(dxc.id, 'Zouain.opx network', { concluida: true })
  const ag = p(dxc.id, 'Agenda')
  for (const nome of ['Amanda', 'Fabricio', 'Leo']) p(dxc.id, nome, { pai: ag })
  p(pes.id, 'Habilitacao detran')
  p(pes.id, 'IBMR')
  p(pes.id, 'Pagamento Light', { concluida: true })
  e.papers.push({
    id: ctx.uid(),
    data: '2026-11-03',
    criadoEm: ctx.agora(),
    impressoEm: null,
    updatedAt: ctx.agora(),
    itens: noPaper.map((a) => ({
      id: ctx.uid(),
      atividadeId: a.id,
      secaoId: a.secaoId,
      parentId: a.parentId,
      texto: a.texto,
      status: a.status,
      ordem: a.ordem,
      planejado: false
    }))
  })
  nova(dxc.id, 'Revisão SFDC', { data: '2026-11-04' })
  nova(pes.id, 'Revisar fatura do cartão', { data: '2026-11-06' })
  e.hoje = '2026-11-04'
  return e
}

const porTexto = (e: Estado, t: string): Atividade => e.atividades.find((a) => a.texto === t)!
const textos = (e: Estado, ids: string[]): string[] => ids.map((id) => e.atividades.find((a) => a.id === id)!.texto)
/** Cria o paper de hoje aceitando tudo, exceto os textos indicados. */
function criarHoje(e: Estado, desmarcar: string[] = []): void {
  const as = montarAssistente(e)
  const marcados = [...as.pend, ...as.plan].filter((id) => !desmarcar.includes(textos(e, [id])[0]))
  executar(e, ctx, { tipo: 'criarPaper', marcados, excluidos: [], novos: [] })
}

describe('assistente do paper do dia', () => {
  let e: Estado
  beforeEach(() => {
    e = exemplo()
  })

  it('importa os pendentes do último paper e as planejadas para hoje (RN-03), sem os concluídos (RN-04)', () => {
    const as = montarAssistente(e)
    expect(as.ultimo).toBe('2026-11-03')
    expect(textos(e, as.pend)).toEqual([
      'Thadeu.viagem bh',
      'Ibm.oportunidades',
      'Agenda',
      'Amanda',
      'Fabricio',
      'Leo',
      'Habilitacao detran',
      'IBMR'
    ])
    expect(textos(e, as.plan)).toEqual(['Revisão SFDC'])
  })

  it('item desmarcado vai para "Fora do paper" e não volta sozinho no dia seguinte (RN-09)', () => {
    criarHoje(e, ['IBMR'])
    expect(foraDoPaper(e).map((a) => a.texto)).toEqual(['IBMR'])
    expect(porTexto(e, 'IBMR').dataPlanejada).toBeNull()
    e.hoje = '2026-11-05'
    expect(textos(e, montarAssistente(e).pend)).not.toContain('IBMR')
  })

  it('desmarcar o pai desmarca os filhos; marcar um filho marca o pai', () => {
    const as = montarAssistente(e)
    const ag = porTexto(e, 'Agenda').id
    const leo = porTexto(e, 'Leo').id
    let m = new Set([...as.pend, ...as.plan])
    m = marcarNoAssistente(e, as, new Set(), m, ag, false)
    expect(m.has(leo)).toBe(false)
    m = marcarNoAssistente(e, as, new Set(), m, leo, true)
    expect(m.has(ag)).toBe(true)
  })

  it('não permite dois papers na mesma data (RN-01)', () => {
    criarHoje(e)
    expect(() => criarPaper(e, ctx, new Set(), new Set(), [])).toThrow(ErroDominio)
  })

  it('importa do último paper mesmo com dias sem paper, trazendo as planejadas do intervalo', () => {
    criarHoje(e)
    e.hoje = '2026-11-09'
    const as = montarAssistente(e)
    expect(as.ultimo).toBe('2026-11-04')
    expect(textos(e, as.plan)).toEqual(['Revisar fatura do cartão'])
  })

  it('primeiro uso: sem paper anterior e sem pendências', () => {
    const vazio: Estado = { hoje: '2026-11-04', usuario: null, secoes: secoesPadrao(ctx), atividades: [], papers: [] }
    expect(montarAssistente(vazio)).toEqual({ ultimo: null, pend: [], plan: [] })
    executar(vazio, ctx, {
      tipo: 'criarPaper',
      marcados: [],
      excluidos: [],
      novos: [{ secaoId: vazio.secoes[0].id, texto: 'Primeira' }]
    })
    expect(paperHoje(vazio)!.itens.map((i) => i.texto)).toEqual(['Primeira'])
  })
})

describe('atividades no paper de hoje', () => {
  let e: Estado
  beforeEach(() => {
    e = exemplo()
    criarHoje(e)
  })

  it('editar o texto não altera o retrato dos papers anteriores (RF-25)', () => {
    const th = porTexto(e, 'Thadeu.viagem bh')
    executar(e, ctx, { tipo: 'editarTexto', id: th.id, texto: 'Assuntos Thadeu' })
    expect(paperHoje(e)!.itens.find((i) => i.atividadeId === th.id)!.texto).toBe('Assuntos Thadeu')
    expect(paperDe(e, '2026-11-03')!.itens.find((i) => i.atividadeId === th.id)!.texto).toBe('Thadeu.viagem bh')
    expect(linhasPaper(e, '2026-11-03', th.secaoId, null)[0].texto).toBe('Thadeu.viagem bh')
  })

  it('concluir o pai conclui os filhos e desfazer reabre só os que ele concluiu (RN-07)', () => {
    const ag = porTexto(e, 'Agenda')
    const amanda = porTexto(e, 'Amanda')
    executar(e, ctx, { tipo: 'concluir', id: amanda.id })
    executar(e, ctx, { tipo: 'concluir', id: ag.id })
    expect(e.atividades.filter((a) => a.parentId === ag.id).every((a) => a.status === 'concluida')).toBe(true)
    executar(e, ctx, { tipo: 'concluir', id: ag.id })
    expect(porTexto(e, 'Fabricio').status).toBe('pendente')
    expect(amanda.status).toBe('concluida') // concluída antes, por conta própria
  })

  it('reabrir um sub-item reabre o pai concluído', () => {
    const ag = porTexto(e, 'Agenda')
    executar(e, ctx, { tipo: 'concluir', id: ag.id })
    executar(e, ctx, { tipo: 'concluir', id: porTexto(e, 'Leo').id })
    expect(ag.status).toBe('pendente')
  })

  it('excluir o pai exclui os filhos, e restaurarStatus desfaz (RF-24)', () => {
    const ag = porTexto(e, 'Agenda')
    const antes = [ag, ...e.atividades.filter((a) => a.parentId === ag.id)].map((a) => ({ id: a.id, status: a.status }))
    executar(e, ctx, { tipo: 'excluir', id: ag.id })
    expect(visiveis(e, ag.secaoId, ag.id)).toHaveLength(0)
    executar(e, ctx, { tipo: 'restaurarStatus', itens: antes })
    expect(visiveis(e, ag.secaoId, ag.id)).toHaveLength(3)
  })

  it('limita a hierarquia a 2 níveis (RN-06)', () => {
    expect(() => executar(e, ctx, { tipo: 'recuar', id: porTexto(e, 'Amanda').id })).toThrow(ErroDominio)
    expect(() => executar(e, ctx, { tipo: 'recuar', id: porTexto(e, 'Agenda').id })).toThrow(/sub-itens/)
    const ibm = porTexto(e, 'Ibm.oportunidades')
    executar(e, ctx, { tipo: 'recuar', id: ibm.id })
    expect(ibm.parentId).toBe(porTexto(e, 'Thadeu.viagem bh').id)
    executar(e, ctx, { tipo: 'desrecuar', id: ibm.id })
    expect(ibm.parentId).toBeNull()
  })

  it('planejar tira do paper de hoje e o item volta só na data (RF-26)', () => {
    const hab = porTexto(e, 'Habilitacao detran')
    executar(e, ctx, { tipo: 'planejar', id: hab.id, data: '2026-11-06' })
    expect(visiveis(e, hab.secaoId, null).map((a) => a.texto)).not.toContain('Habilitacao detran')
    expect(() => executar(e, ctx, { tipo: 'planejar', id: hab.id, data: '2026-11-04' })).toThrow(ErroDominio)
    e.hoje = '2026-11-05'
    expect(textos(e, montarAssistente(e).plan)).not.toContain('Habilitacao detran')
    expect(textos(e, montarAssistente(e).pend)).not.toContain('Habilitacao detran')
    e.hoje = '2026-11-06'
    expect(textos(e, montarAssistente(e).plan)).toContain('Habilitacao detran')
  })

  it('sub-item planejado arrasta o pai para o paper da data (RF-14 / RN-08)', () => {
    const ag = porTexto(e, 'Agenda')
    const leo = porTexto(e, 'Leo')
    executar(e, ctx, { tipo: 'planejar', id: ag.id, data: '2026-11-10' })
    e.hoje = '2026-11-10'
    const as = montarAssistente(e)
    expect(textos(e, as.plan)).toEqual(expect.arrayContaining(['Agenda', 'Leo']))
    expect(leo.parentId).toBe(ag.id)
  })

  it('trazer de "Fora do paper" traz o pai junto', () => {
    e = exemplo()
    criarHoje(e, ['Agenda', 'Amanda', 'Fabricio', 'Leo'])
    const leo = porTexto(e, 'Leo')
    executar(e, ctx, { tipo: 'trazerParaHoje', id: leo.id })
    const ag = porTexto(e, 'Agenda')
    expect(visiveis(e, ag.secaoId, null).map((a) => a.texto)).toContain('Agenda')
    expect(visiveis(e, ag.secaoId, ag.id).map((a) => a.texto)).toEqual(['Leo'])
  })

  it('navegação entre papers lista só os dias com paper', () => {
    expect(datasNavegaveis(e)).toEqual(['2026-11-03', '2026-11-04'])
  })

  it('arquivar uma seção com pendências exige mover para outra (RF-41)', () => {
    const [dxc, pes] = e.secoes
    expect(() => executar(e, ctx, { tipo: 'arquivarSecao', id: pes.id, destinoId: null })).toThrow(ErroDominio)
    executar(e, ctx, { tipo: 'arquivarSecao', id: pes.id, destinoId: dxc.id })
    expect(pes.arquivada).toBe(true)
    expect(porTexto(e, 'IBMR').secaoId).toBe(dxc.id)
    expect(() => executar(e, ctx, { tipo: 'arquivarSecao', id: dxc.id, destinoId: null })).toThrow(/ao menos uma/)
  })
})

describe('usuário da edição Local (D11)', () => {
  it('salva nome e e-mail, normalizando espaços e caixa do e-mail', () => {
    const e = exemplo()
    executar(e, ctx, { tipo: 'salvarUsuario', nome: '  Sergio   Resende ', email: ' Sergio@Exemplo.COM ' })
    expect(e.usuario).toMatchObject({ nome: 'Sergio Resende', email: 'sergio@exemplo.com', provedor: 'local' })
    const id = e.usuario!.id
    executar(e, ctx, { tipo: 'salvarUsuario', nome: 'Sergio', email: '' })
    expect(e.usuario).toMatchObject({ id, nome: 'Sergio', email: null })
  })

  it('exige o nome e valida o e-mail quando informado', () => {
    const e = exemplo()
    expect(() => executar(e, ctx, { tipo: 'salvarUsuario', nome: '   ', email: '' })).toThrow('Informe o seu nome.')
    expect(() => executar(e, ctx, { tipo: 'salvarUsuario', nome: 'Ana', email: 'ana@' })).toThrow('E-mail inválido.')
    expect(() => executar(e, ctx, { tipo: 'salvarUsuario', nome: 'x'.repeat(81), email: '' })).toThrow(/80/)
    expect(e.usuario).toBeNull()
  })
})
