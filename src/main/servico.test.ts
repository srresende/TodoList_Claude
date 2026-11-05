import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { montarAssistente } from '@domain/assistente'
import { abrirBanco, Repositorio } from './db/repositorio'
import { Servico } from './servico'

const MIGRACOES = resolve(__dirname, '../../drizzle')
let fechar: (() => void) | undefined
afterEach(() => fechar?.())

function servico(hoje = '2026-11-04'): { s: Servico; repo: Repositorio; data: { hoje: string } } {
  const banco = abrirBanco(':memory:', MIGRACOES)
  fechar = banco.fechar
  const data = { hoje }
  return { s: new Servico(banco.db, () => data.hoje), repo: new Repositorio(banco.db), data }
}

describe('Servico + SQLite', () => {
  it('cria as seções padrão no primeiro uso e persiste o paper do dia', () => {
    const { s, repo } = servico()
    const [prof] = s.estado().secoes
    expect(s.estado().secoes.map((x) => x.nome)).toEqual(['Profissional', 'Pessoal'])
    expect(s.executar({ tipo: 'criarPaper', marcados: [], excluidos: [], novos: [] }).ok).toBe(true)
    s.executar({ tipo: 'criarAtividade', secaoId: prof.id, parentId: null, texto: 'Revisão SFDC' })

    const recarregado = repo.carregar('2026-11-04')
    expect(recarregado.papers).toHaveLength(1)
    expect(recarregado.papers[0].itens.map((i) => i.texto)).toEqual(['Revisão SFDC'])
    expect(recarregado.atividades[0]).toMatchObject({ texto: 'Revisão SFDC', status: 'pendente', foraDoPaper: false })
  })

  it('recusa comando inválido sem alterar nada e devolve a mensagem', () => {
    const { s, repo } = servico()
    const r = s.executar({ tipo: 'criarAtividade', secaoId: s.estado().secoes[0].id, parentId: null, texto: 'x' })
    expect(r).toMatchObject({ ok: false, erro: 'Crie o paper do dia primeiro.' })
    expect(repo.carregar('2026-11-04').atividades).toHaveLength(0)
  })

  it('grava na fila de sincronização só os campos alterados', () => {
    const { s, repo } = servico()
    s.executar({ tipo: 'criarPaper', marcados: [], excluidos: [], novos: [] })
    s.executar({ tipo: 'criarAtividade', secaoId: s.estado().secoes[0].id, parentId: null, texto: 'IBMR' })
    const antes = repo.pendentesSincronizacao()
    s.executar({ tipo: 'editarTexto', id: s.estado().atividades[0].id, texto: 'IBMR (ligar)' })
    // 1 atividade + 1 item do paper de hoje (retrato do dia)
    expect(repo.pendentesSincronizacao() - antes).toBe(2)
  })

  it('no dia seguinte, a importação lê o último paper gravado no banco', () => {
    const { s, data } = servico()
    s.executar({ tipo: 'criarPaper', marcados: [], excluidos: [], novos: [] })
    s.executar({ tipo: 'criarAtividade', secaoId: s.estado().secoes[0].id, parentId: null, texto: 'Pendente' })
    data.hoje = '2026-11-07'
    const as = montarAssistente(s.estado())
    expect(as.ultimo).toBe('2026-11-04')
    expect(as.pend).toHaveLength(1)
  })
})
