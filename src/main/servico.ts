// Mantém o Estado em memória (os dados de um usuário são pequenos), aplica comandos do domínio
// e grava as diferenças no SQLite. Sem dependência de Electron, para poder ser testado com Vitest.
import { randomUUID } from 'node:crypto'
import { executar, retratoDeHoje, secoesPadrao, type Comando } from '@domain/comandos'
import { ErroDominio, type Ctx, type Estado } from '@domain/tipos'
import type { Resposta } from '@shared/api'
import { Repositorio, type Banco, type OpcoesRepositorio } from './db/repositorio'

export class Servico {
  private estadoAtual: Estado
  private readonly repo: Repositorio
  private readonly ctx: Ctx

  constructor(
    db: Banco,
    private readonly hoje: () => string,
    opcoes: { ctx?: Ctx } & Partial<OpcoesRepositorio> = {}
  ) {
    const { ctx, registrarSincronizacao = true } = opcoes
    this.repo = new Repositorio(db, { registrarSincronizacao })
    this.ctx = ctx ?? { agora: () => new Date().toISOString(), uid: () => randomUUID() }
    this.estadoAtual = this.repo.carregar(this.hoje())
    if (!this.estadoAtual.secoes.length) {
      // RF-40: primeiro uso
      const antes = structuredClone(this.estadoAtual)
      this.estadoAtual.secoes.push(...secoesPadrao(this.ctx))
      this.repo.salvarDiferencas(antes, this.estadoAtual, this.ctx.agora())
    }
  }

  /** Estado atual, com a data de hoje recalculada (RN-02: o dia vira à meia-noite local). */
  estado(): Estado {
    this.estadoAtual.hoje = this.hoje()
    return this.estadoAtual
  }

  executar(comando: Comando): Resposta {
    const estado = this.estado()
    const antes = structuredClone(estado)
    try {
      const mensagem = executar(estado, this.ctx, comando) ?? undefined
      retratoDeHoje(estado)
      this.repo.salvarDiferencas(antes, estado, this.ctx.agora())
      return { ok: true, estado, mensagem }
    } catch (erro) {
      this.estadoAtual = antes // nada é aplicado pela metade
      if (erro instanceof ErroDominio) return { ok: false, estado: antes, erro: erro.message }
      console.error('Falha ao executar comando', comando, erro)
      return { ok: false, estado: antes, erro: 'Não foi possível salvar a alteração. Tente novamente.' }
    }
  }

  pendentesSincronizacao(): number {
    return this.repo.pendentesSincronizacao()
  }
}
