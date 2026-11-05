// Todas as alterações de dados passam por executar(). Cada comando altera o Estado em memória;
// o processo principal compara o antes/depois, grava as diferenças no SQLite e na fila de sincronização.
import { criarPaper, item, novaAtividade, proximaOrdem, type NovaNoAssistente } from './assistente'
import {
  COR_SECAO_PADRAO,
  ativOuErro,
  filhos,
  idsHoje,
  paperDe,
  paperHoje,
  paperHojeOuErro,
  pendentesNaSecao,
  podeRecuar,
  porOrdem,
  secaoOuErro,
  secoesAtivas,
  visiveis
} from './consultas'
import { ErroDominio, type Atividade, type Ctx, type Estado, type Secao, type Status } from './tipos'

export type Comando =
  | { tipo: 'criarAtividade'; secaoId: string; parentId: string | null; texto: string }
  | { tipo: 'concluir'; id: string }
  | { tipo: 'excluir'; id: string }
  | { tipo: 'restaurarStatus'; itens: { id: string; status: Status }[] }
  | { tipo: 'editarTexto'; id: string; texto: string }
  | { tipo: 'recuar'; id: string }
  | { tipo: 'desrecuar'; id: string }
  | { tipo: 'mover'; id: string; direcao: -1 | 1 }
  | { tipo: 'moverSecao'; id: string; secaoId: string }
  | { tipo: 'planejar'; id: string; data: string }
  | { tipo: 'novaPlanejada'; secaoId: string; texto: string; data: string }
  | { tipo: 'alterarDataPlanejada'; id: string; data: string }
  | { tipo: 'trazerParaHoje'; id: string }
  | { tipo: 'concluirFora'; id: string }
  | { tipo: 'criarSecao'; nome: string }
  | { tipo: 'renomearSecao'; id: string; nome: string }
  | { tipo: 'corSecao'; id: string; cor: string }
  | { tipo: 'moverSecaoOrdem'; id: string; direcao: -1 | 1 }
  | { tipo: 'arquivarSecao'; id: string; destinoId: string | null }
  | { tipo: 'restaurarSecao'; id: string }
  | { tipo: 'criarPaper'; marcados: string[]; excluidos: string[]; novos: NovaNoAssistente[] }
  | { tipo: 'marcarImpresso'; data: string }

/** Mensagem curta para o usuário (toast), quando o comando tem algo a dizer. */
export type Retorno = string | void

export function executar(e: Estado, ctx: Ctx, c: Comando): Retorno {
  const r = aplicar(e, ctx, c)
  retratoDeHoje(e)
  return r
}

// Retrato do dia (PaperItem): só o paper de HOJE acompanha as atividades; os anteriores ficam congelados.
export function retratoDeHoje(e: Estado): void {
  const p = paperHoje(e)
  if (!p) return
  p.itens = p.itens.flatMap((i) => {
    const a = e.atividades.find((x) => x.id === i.atividadeId)
    if (!a) return []
    return [{ ...i, secaoId: a.secaoId, parentId: a.parentId, texto: a.texto, status: a.status, ordem: a.ordem }]
  })
}

function aplicar(e: Estado, ctx: Ctx, c: Comando): Retorno {
  const agora = ctx.agora()
  const toque = (x: { updatedAt: string }): void => {
    x.updatedAt = agora
  }
  const reabrir = (a: Atividade): void => {
    if (a.status === 'concluida') {
      a.status = 'pendente'
      a.concluidaEm = null
      a.porPai = false
      toque(a)
    }
  }
  const texto = (s: string): string => {
    const t = s.trim()
    if (!t) throw new ErroDominio('O texto não pode ficar vazio.')
    return t
  }
  const dataFutura = (d: string): string => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= e.hoje) throw new ErroDominio('A data precisa ser a partir de amanhã.')
    return d
  }

  switch (c.tipo) {
    // RF-20 / RF-21
    case 'criarAtividade': {
      const p = paperHojeOuErro(e)
      secaoOuErro(e, c.secaoId)
      if (c.parentId) {
        const pai = ativOuErro(e, c.parentId)
        if (pai.parentId) throw new ErroDominio('Limite de 2 níveis: item → sub-item.') // RN-06
        reabrir(pai)
      }
      const a = novaAtividade(e, ctx, c.secaoId, c.parentId, texto(c.texto))
      p.itens.push(item(ctx, a, false))
      return
    }

    // RF-22 / RF-23 / RN-07: concluir o pai conclui os filhos; o contrário não
    case 'concluir': {
      const a = ativOuErro(e, c.id)
      if (a.status === 'pendente') {
        a.status = 'concluida'
        a.concluidaEm = agora
        a.porPai = false
        for (const f of filhos(e, a.id).filter((f) => f.status === 'pendente')) {
          f.status = 'concluida'
          f.concluidaEm = agora
          f.porPai = true
          toque(f)
        }
      } else if (a.status === 'concluida') {
        a.status = 'pendente'
        a.concluidaEm = null
        a.porPai = false
        for (const f of filhos(e, a.id).filter((f) => f.porPai)) {
          f.status = 'pendente'
          f.concluidaEm = null
          f.porPai = false
          toque(f)
        }
        if (a.parentId) reabrir(ativOuErro(e, a.parentId))
      }
      toque(a)
      return
    }

    // RF-24: excluir o pai exclui os filhos (o "desfazer" usa restaurarStatus)
    case 'excluir': {
      const a = ativOuErro(e, c.id)
      for (const x of [a, ...filhos(e, a.id)]) {
        x.status = 'excluida'
        x.deletedAt = agora
        toque(x)
      }
      return
    }
    case 'restaurarStatus': {
      for (const { id, status } of c.itens) {
        const x = ativOuErro(e, id)
        x.status = status
        x.deletedAt = null
        toque(x)
      }
      return
    }

    // RF-25: vale daí em diante; papers anteriores mantêm o texto original
    case 'editarTexto': {
      const a = ativOuErro(e, c.id)
      const t = texto(c.texto)
      if (t !== a.texto) {
        a.texto = t
        toque(a)
      }
      return
    }

    case 'recuar': {
      const a = ativOuErro(e, c.id)
      if (a.parentId) throw new ErroDominio('Limite de 2 níveis: item → sub-item.')
      if (filhos(e, a.id).length)
        throw new ErroDominio('Este item já tem sub-itens e não pode virar sub-item (máx. 2 níveis).')
      const pai = podeRecuar(e, a.id)
      if (!pai) throw new ErroDominio('Não há item pendente acima para ser o item pai.')
      a.parentId = pai.id
      a.ordem = proximaOrdem(e)
      toque(a)
      return
    }
    case 'desrecuar': {
      const a = ativOuErro(e, c.id)
      if (!a.parentId) return
      const pai = ativOuErro(e, a.parentId)
      a.parentId = null
      a.ordem = pai.ordem + 0.5
      renumerar(e)
      toque(a)
      return
    }

    // RF-28
    case 'mover': {
      const a = ativOuErro(e, c.id)
      const irmaos = visiveis(e, a.secaoId, a.parentId)
      const b = irmaos[irmaos.findIndex((x) => x.id === a.id) + c.direcao]
      if (!b) return
      ;[a.ordem, b.ordem] = [b.ordem, a.ordem]
      toque(a)
      toque(b)
      return
    }

    // RF-29: um sub-item movido vira item de 1º nível
    case 'moverSecao': {
      const a = ativOuErro(e, c.id)
      const s = secaoOuErro(e, c.secaoId)
      for (const x of [a, ...filhos(e, a.id)]) {
        x.secaoId = s.id
        toque(x)
      }
      a.parentId = null
      a.ordem = proximaOrdem(e)
      return `Movida para “${s.nome}”`
    }

    // RF-26: com data futura, sai do paper de hoje e só volta no paper da data
    case 'planejar': {
      const a = ativOuErro(e, c.id)
      a.dataPlanejada = dataFutura(c.data)
      a.planejadaPendente = true
      const grupo = [a, ...filhos(e, a.id)]
      for (const x of grupo) {
        x.foraDoPaper = false
        toque(x)
      }
      const p = paperHoje(e)
      if (p) p.itens = p.itens.filter((i) => !grupo.some((x) => x.id === i.atividadeId))
      return
    }
    case 'novaPlanejada': {
      secaoOuErro(e, c.secaoId)
      novaAtividade(e, ctx, c.secaoId, null, texto(c.texto), dataFutura(c.data))
      return
    }
    case 'alterarDataPlanejada': {
      const a = ativOuErro(e, c.id)
      a.dataPlanejada = dataFutura(c.data)
      toque(a)
      return
    }

    // RF-12a / RF-27: traz de "Fora do paper" ou "Planejadas"; RF-14: o pai vem junto
    case 'trazerParaHoje': {
      const p = paperHojeOuErro(e)
      const a = ativOuErro(e, c.id)
      const ids = idsHoje(e)
      const add = (x: Atividade): void => {
        if (!ids.has(x.id)) {
          p.itens.push(item(ctx, x, false))
          ids.add(x.id)
        }
        x.foraDoPaper = false
        x.planejadaPendente = false
        toque(x)
      }
      if (a.parentId) {
        const pai = e.atividades.find((x) => x.id === a.parentId)
        if (pai && pai.status !== 'excluida') {
          reabrir(pai)
          add(pai)
        } else a.parentId = null
      }
      add(a)
      for (const f of filhos(e, a.id)) {
        if (f.status === 'pendente' && !(f.planejadaPendente && (f.dataPlanejada ?? '') > e.hoje)) add(f)
      }
      return `“${a.texto}” está no paper de hoje`
    }
    case 'concluirFora': {
      const a = ativOuErro(e, c.id)
      a.foraDoPaper = false
      aplicar(e, ctx, { tipo: 'concluir', id: a.id })
      return `“${a.texto}” concluída`
    }

    // RF-41 / RF-42
    case 'criarSecao': {
      const nome = texto(c.nome)
      const s: Secao = {
        id: ctx.uid(),
        nome,
        cor: COR_SECAO_PADRAO,
        ordem: e.secoes.reduce((m, x) => Math.max(m, x.ordem), 0) + 1,
        arquivada: false,
        updatedAt: agora,
        deletedAt: null
      }
      e.secoes.push(s)
      return
    }
    case 'renomearSecao': {
      const s = secaoOuErro(e, c.id)
      s.nome = texto(c.nome)
      toque(s)
      return
    }
    case 'corSecao': {
      const s = secaoOuErro(e, c.id)
      if (!/^#[0-9a-fA-F]{6}$/.test(c.cor)) throw new ErroDominio('Cor inválida.')
      s.cor = c.cor.toUpperCase()
      toque(s)
      return
    }
    case 'moverSecaoOrdem': {
      const ativas = secoesAtivas(e)
      const i = ativas.findIndex((s) => s.id === c.id)
      const j = i + c.direcao
      if (i < 0 || !ativas[j]) return
      ;[ativas[i].ordem, ativas[j].ordem] = [ativas[j].ordem, ativas[i].ordem]
      toque(ativas[i])
      toque(ativas[j])
      return
    }
    // RF-41: arquivar exige seção vazia ou mover os itens
    case 'arquivarSecao': {
      const s = secaoOuErro(e, c.id)
      if (secoesAtivas(e).length < 2) throw new ErroDominio('Precisa existir ao menos uma seção.')
      if (pendentesNaSecao(e, s.id)) {
        if (!c.destinoId || c.destinoId === s.id) throw new ErroDominio('Escolha a seção que vai receber as atividades.')
        const destino = secaoOuErro(e, c.destinoId)
        for (const a of e.atividades.filter((a) => a.secaoId === s.id && a.status !== 'excluida')) {
          a.secaoId = destino.id
          if (a.status === 'pendente') a.ordem = proximaOrdem(e)
          toque(a)
        }
      }
      s.arquivada = true
      toque(s)
      return `Seção “${s.nome}” arquivada`
    }
    case 'restaurarSecao': {
      const s = secaoOuErro(e, c.id)
      s.arquivada = false
      s.ordem = secoesAtivas(e).reduce((m, x) => Math.max(m, x.ordem), 0) + 1
      toque(s)
      return
    }

    case 'criarPaper': {
      const { fora } = criarPaper(e, ctx, new Set(c.marcados), new Set(c.excluidos), c.novos)
      return fora ? `Paper criado · ${fora} item(ns) em “Fora do paper”` : 'Paper do dia criado'
    }
    case 'marcarImpresso': {
      const p = paperDe(e, c.data)
      if (p) {
        p.impressoEm = agora
        toque(p)
      }
      return
    }
  }
}

function renumerar(e: Estado): void {
  e.atividades
    .slice()
    .sort(porOrdem)
    .forEach((a, i) => {
      a.ordem = i + 1
    })
}

/** RF-40: seções padrão do primeiro uso. */
export function secoesPadrao(ctx: Ctx): Secao[] {
  const agora = ctx.agora()
  return ['Profissional', 'Pessoal'].map((nome, i) => ({
    id: ctx.uid(),
    nome,
    cor: COR_SECAO_PADRAO,
    ordem: i + 1,
    arquivada: false,
    updatedAt: agora,
    deletedAt: null
  }))
}
