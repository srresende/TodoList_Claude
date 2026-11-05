// Esquema SQLite local (PRD §3.1). Serve também de referência para as tabelas do Supabase.
// Toda tabela sincronizável tem id UUID gerado no cliente e updated_at; exclusão lógica via deleted_at.
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/** Usuário do PC (uma linha). Na edição Local, nome e e-mail informados pela pessoa. */
export const usuario = sqliteTable('usuario', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email'),
  provedor: text('provedor', { enum: ['local', 'google', 'email'] }).notNull(),
  criadoEm: text('criado_em').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const secoes = sqliteTable('secoes', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cor: text('cor').notNull(),
  ordem: real('ordem').notNull(),
  arquivada: integer('arquivada', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at')
})

export const atividades = sqliteTable('atividades', {
  id: text('id').primaryKey(),
  secaoId: text('secao_id').notNull(),
  parentId: text('parent_id'),
  texto: text('texto').notNull(),
  ordem: real('ordem').notNull(),
  status: text('status', { enum: ['pendente', 'concluida', 'excluida'] }).notNull(),
  dataPlanejada: text('data_planejada'),
  planejadaPendente: integer('planejada_pendente', { mode: 'boolean' }).notNull().default(false),
  foraDoPaper: integer('fora_do_paper', { mode: 'boolean' }).notNull().default(false),
  porPai: integer('por_pai', { mode: 'boolean' }).notNull().default(false),
  criadaEm: text('criada_em').notNull(),
  concluidaEm: text('concluida_em'),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at')
})

export const papers = sqliteTable('papers', {
  id: text('id').primaryKey(),
  data: text('data').notNull().unique(), // RN-01: um paper por data
  criadoEm: text('criado_em').notNull(),
  impressoEm: text('impresso_em'),
  updatedAt: text('updated_at').notNull()
})

export const paperItens = sqliteTable(
  'paper_itens',
  {
    id: text('id').primaryKey(),
    paperId: text('paper_id')
      .notNull()
      .references(() => papers.id),
    atividadeId: text('atividade_id').notNull(),
    secaoId: text('secao_id').notNull(),
    parentId: text('parent_id'),
    textoNoDia: text('texto_no_dia').notNull(),
    statusNoDia: text('status_no_dia', { enum: ['pendente', 'concluida', 'excluida'] }).notNull(),
    ordem: real('ordem').notNull(),
    planejado: integer('planejado', { mode: 'boolean' }).notNull().default(false)
  },
  (t) => [uniqueIndex('paper_itens_paper_atividade').on(t.paperId, t.atividadeId)]
)

/** Fila de alterações para a sincronização (D10): um registro por linha alterada, com os campos que mudaram. */
export const outbox = sqliteTable('outbox', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  tabela: text('tabela').notNull(),
  registroId: text('registro_id').notNull(),
  operacao: text('operacao', { enum: ['upsert', 'delete'] }).notNull(),
  campos: text('campos').notNull(), // JSON { campo: valor }
  criadoEm: text('criado_em').notNull()
})

export const meta = sqliteTable('meta', {
  chave: text('chave').primaryKey(),
  valor: text('valor').notNull()
})
