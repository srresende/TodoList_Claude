import Database from 'better-sqlite3'
import { count, eq } from 'drizzle-orm'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Atividade, Estado, Paper, Secao, Usuario } from '@domain/tipos'
import * as schema from './schema'

export type Banco = BetterSQLite3Database<typeof schema>

/** Abre (ou cria) a base local e aplica as migrações pendentes. Use ':memory:' nos testes. */
export function abrirBanco(arquivo: string, pastaMigracoes: string): { db: Banco; fechar: () => void } {
  const sqlite = new Database(arquivo)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: pastaMigracoes })
  return { db, fechar: () => sqlite.close() }
}

type Linha = Record<string, unknown> & { id: string }
type Tabela =
  | typeof schema.usuario
  | typeof schema.secoes
  | typeof schema.atividades
  | typeof schema.papers
  | typeof schema.paperItens

/** Linhas planas por tabela, no formato das colunas do esquema. */
function linhas(e: Estado): Record<'usuario' | 'secoes' | 'atividades' | 'papers' | 'paperItens', Map<string, Linha>> {
  const mapa = <T extends { id: string }>(xs: T[]): Map<string, Linha> =>
    new Map(xs.map((x) => [x.id, { ...x } as unknown as Linha]))
  return {
    usuario: mapa(e.usuario ? [e.usuario] : []),
    secoes: mapa(e.secoes),
    atividades: mapa(e.atividades),
    papers: mapa(e.papers.map(({ itens: _itens, ...p }) => p)),
    paperItens: mapa(
      e.papers.flatMap((p) =>
        p.itens.map(({ texto, status, ...i }) => ({ ...i, paperId: p.id, textoNoDia: texto, statusNoDia: status }))
      )
    )
  }
}

export interface OpcoesRepositorio {
  /** Grava a fila de sincronização (outbox). Desligado na edição Local, que nunca sincroniza. */
  registrarSincronizacao: boolean
}

export class Repositorio {
  constructor(
    private readonly db: Banco,
    private readonly opcoes: OpcoesRepositorio = { registrarSincronizacao: true }
  ) {}

  carregar(hoje: string): Estado {
    const itens = this.db.select().from(schema.paperItens).all()
    const papers: Paper[] = this.db
      .select()
      .from(schema.papers)
      .all()
      .map((p) => ({
        ...p,
        itens: itens
          .filter((i) => i.paperId === p.id)
          .map(({ paperId: _paperId, textoNoDia, statusNoDia, ...i }) => ({ ...i, texto: textoNoDia, status: statusNoDia }))
      }))
    return {
      hoje,
      usuario: (this.db.select().from(schema.usuario).get() as Usuario | undefined) ?? null,
      secoes: this.db.select().from(schema.secoes).all() as Secao[],
      atividades: this.db.select().from(schema.atividades).all() as Atividade[],
      papers
    }
  }

  /**
   * Grava só o que mudou entre `antes` e `depois`, numa transação, e registra cada mudança na fila de
   * sincronização com os campos alterados (base para o "último a alterar vence" por campo, RF-74).
   */
  salvarDiferencas(antes: Estado, depois: Estado, agora: string): number {
    const a = linhas(antes)
    const d = linhas(depois)
    const tabelas: [keyof typeof a, Tabela, string][] = [
      ['usuario', schema.usuario, 'usuario'],
      ['secoes', schema.secoes, 'secoes'],
      ['atividades', schema.atividades, 'atividades'],
      ['papers', schema.papers, 'papers'],
      ['paperItens', schema.paperItens, 'paper_itens']
    ]
    let alteracoes = 0
    const fila = this.opcoes.registrarSincronizacao
    this.db.transaction((tx) => {
      for (const [chave, tabela, nome] of tabelas) {
        for (const [id, nova] of d[chave]) {
          const velha = a[chave].get(id)
          const campos = Object.fromEntries(
            Object.entries(nova).filter(([k, v]) => !velha || JSON.stringify(velha[k]) !== JSON.stringify(v))
          )
          if (!Object.keys(campos).length) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tx.insert(tabela).values(nova as any).onConflictDoUpdate({ target: tabela.id, set: nova as any }).run()
          if (fila)
            tx.insert(schema.outbox)
              .values({ tabela: nome, registroId: id, operacao: 'upsert', campos: JSON.stringify(campos), criadoEm: agora })
              .run()
          alteracoes++
        }
        for (const id of a[chave].keys()) {
          if (d[chave].has(id)) continue
          tx.delete(tabela).where(eq(tabela.id, id)).run()
          if (fila)
            tx.insert(schema.outbox)
              .values({ tabela: nome, registroId: id, operacao: 'delete', campos: '{}', criadoEm: agora })
              .run()
          alteracoes++
        }
      }
    })
    return alteracoes
  }

  pendentesSincronizacao(): number {
    return this.db.select({ n: count() }).from(schema.outbox).get()?.n ?? 0
  }
}
