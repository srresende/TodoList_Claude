// Entidades do PRD §3.1. Datas de calendário em 'AAAA-MM-DD'; instantes em ISO 8601.

export type Status = 'pendente' | 'concluida' | 'excluida'

export interface Secao {
  id: string
  nome: string
  cor: string
  ordem: number
  arquivada: boolean
  updatedAt: string
  deletedAt: string | null
}

export interface Atividade {
  id: string
  secaoId: string
  parentId: string | null
  texto: string
  ordem: number
  status: Status
  /** Data planejada (RF-26). Mantida como registro depois que a atividade entra no paper. */
  dataPlanejada: string | null
  /** Aguardando a data planejada chegar para entrar num paper. */
  planejadaPendente: boolean
  /** Desmarcada no assistente: fica na lista "Fora do paper" (RF-12a, RN-09). */
  foraDoPaper: boolean
  /** Concluída por propagação do pai (RN-07); desfazer o pai reabre só estas. */
  porPai: boolean
  criadaEm: string
  concluidaEm: string | null
  updatedAt: string
  deletedAt: string | null
}

/** Retrato da atividade naquele dia (texto_no_dia / status_no_dia). Só o paper de hoje é atualizado. */
export interface PaperItem {
  id: string
  atividadeId: string
  secaoId: string
  parentId: string | null
  texto: string
  status: Status
  ordem: number
  /** Chegou ao paper por estar planejada para a data (RF-13). */
  planejado: boolean
}

export interface Paper {
  id: string
  data: string
  criadoEm: string
  impressoEm: string | null
  updatedAt: string
  itens: PaperItem[]
}

/** Usuário do PC. Na edição Local é informado pela própria pessoa (nome e e-mail), sem autenticação. */
export interface Usuario {
  id: string
  nome: string
  email: string | null
  provedor: 'local' | 'google' | 'email'
  criadoEm: string
  updatedAt: string
}

export interface Estado {
  /** Data local do computador (RN-02). */
  hoje: string
  usuario: Usuario | null
  secoes: Secao[]
  atividades: Atividade[]
  papers: Paper[]
}

/** Relógio e gerador de IDs injetáveis, para testes determinísticos. */
export interface Ctx {
  agora(): string
  uid(): string
}

export class ErroDominio extends Error {}
