import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'
import { ativ, filhos, idsHoje, linhasPaper, podeRecuar, secoesAtivas, visiveis, type Linha } from '@domain/consultas'
import { diaSemana, fmt } from '@domain/datas'
import type { Secao } from '@domain/tipos'
import { useLoja } from '../store'
import { vizinhas } from '../tela'
import { Icone, LogoBranco, corTexto } from './icones'

const trunc = (s: string, n = 40): string => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** Paper de um dia: hoje é editável; dias anteriores e o paper "de ontem" na virada do dia são somente leitura. */
export function PaperView({ data, roDia }: { data: string; roDia: boolean }): ReactElement {
  const { estado, set } = useLoja()
  const e = estado!
  const ro = roDia || data !== e.hoje
  const { anterior, proxima } = vizinhas(e, data)
  const ver = (d?: string): void => {
    if (d) set({ dataVista: d === e.hoje ? null : d, editando: null })
  }

  return (
    <main className="px-4 pt-5 pb-24">
      {roDia && (
        <Aviso texto={<>O dia mudou: hoje é <b>{diaSemana(e.hoje)}, {fmt(e.hoje)}</b>. Abaixo está o paper de {fmt(data)}, somente para leitura.</>}>
          <button type="button" className="btn btn-primario" onClick={() => set({ avisoNovoDia: false, dataVista: null })}>
            Criar paper do dia
          </button>
        </Aviso>
      )}
      {!roDia && ro && (
        <Aviso texto={<>Você está vendo o paper de <b>{diaSemana(data)}, {fmt(data)}</b>, somente para leitura.</>}>
          <button type="button" className="btn btn-primario" onClick={() => set({ dataVista: null })}>
            Voltar para hoje
          </button>
        </Aviso>
      )}
      <div className="mx-auto max-w-[860px] rounded-[3px] bg-white px-[26px] pt-[22px] pb-[30px] text-[15px] shadow-[0_1px_3px_rgba(0,0,0,.08),0_10px_28px_rgba(0,0,0,.06)]">
        <div className="faixa-data nav">
          <NavBtn data={anterior} rotulo="Anterior" seta="«" atalho="Alt+←" ver={ver} />
          <span>
            {fmt(data)}
            <small>{diaSemana(data)}</small>
            {ro && <span className="tag-somente-leitura">somente leitura</span>}
          </span>
          <NavBtn data={proxima} rotulo="Próximo" seta="»" atalho="Alt+→" ver={ver} />
        </div>
        {secoesAtivas(e).map((s) => (
          <SecaoView key={s.id} secao={s} data={data} ro={ro} />
        ))}
        <div className="mt-[22px] flex justify-center">
          <LogoBranco altura={30} />
        </div>
      </div>
    </main>
  )
}

function Aviso({ texto, children }: { texto: ReactElement; children: ReactElement }): ReactElement {
  return (
    <div className="mx-auto mb-3.5 flex max-w-[860px] flex-wrap items-center justify-between gap-2.5 rounded-lg border border-[#f0d58a] bg-[#fff7e0] px-3.5 py-2.5">
      <span>{texto}</span>
      {children}
    </div>
  )
}

function NavBtn(p: { data?: string; rotulo: string; seta: string; atalho: string; ver: (d?: string) => void }): ReactElement {
  return (
    <button
      type="button"
      className="nav-btn"
      data-nav={p.rotulo}
      disabled={!p.data}
      aria-label={`Paper ${p.rotulo.toLowerCase()}`}
      title={p.data ? `${p.rotulo}: ${diaSemana(p.data)}, ${fmt(p.data)} (${p.atalho})` : `Nenhum paper ${p.rotulo === 'Anterior' ? 'anterior' : 'posterior'}`}
      onClick={() => p.ver(p.data)}
    >
      {p.seta}
    </button>
  )
}

function SecaoView({ secao, data, ro }: { secao: Secao; data: string; ro: boolean }): ReactElement {
  const { estado } = useLoja()
  const e = estado!
  const topo = linhasPaper(e, data, secao.id, null)
  return (
    <section className="caixa-secao">
      <div className="cabecalho-secao" style={{ background: secao.cor, color: corTexto(secao.cor) }}>
        {secao.nome}
      </div>
      <div className="px-2 pt-1.5 pb-3">
        {topo.length === 0 && <div className="py-1 pl-[27px] text-[13px] text-[#9aa1a7] italic">Nenhuma atividade.</div>}
        {topo.map((l) => (
          <div key={l.id}>
            <LinhaView linha={l} nivel={1} ro={ro} />
            {linhasPaper(e, data, secao.id, l.id).map((c) => (
              <LinhaView key={c.id} linha={c} nivel={2} ro={ro} />
            ))}
          </div>
        ))}
        {!ro && <NovaLinha secao={secao} />}
      </div>
    </section>
  )
}

function LinhaView({ linha, nivel, ro }: { linha: Linha; nivel: 1 | 2; ro: boolean }): ReactElement {
  const { estado, editando, focar, cmd, set, toast } = useLoja()
  const e = estado!
  const ref = useRef<HTMLDivElement>(null)
  const feita = linha.status === 'concluida'
  const emEdicao = editando === linha.id
  const multiplasSecoes = secoesAtivas(e).length > 1

  useEffect(() => {
    if (focar === linha.id && ref.current) {
      ref.current.focus()
      set({ focar: null })
    }
  }, [focar, linha.id, set])

  const concluir = (): void => {
    set({ focar: linha.id })
    void cmd({ tipo: 'concluir', id: linha.id })
  }
  const excluir = async (): Promise<void> => {
    const a = ativ(e, linha.id)!
    const grupo = [a, ...filhos(e, a.id)]
    const antes = grupo.map((x) => ({ id: x.id, status: x.status }))
    if (await cmd({ tipo: 'excluir', id: a.id }))
      toast(`“${trunc(a.texto)}” excluída${grupo.length > 1 ? ` com ${grupo.length - 1} sub-item(ns)` : ''}`, () => {
        void cmd({ tipo: 'restaurarStatus', itens: antes })
      })
  }
  const mover = (direcao: -1 | 1): void => {
    set({ focar: linha.id })
    void cmd({ tipo: 'mover', id: linha.id, direcao })
  }
  const recuar = (): void => {
    set({ focar: linha.id })
    void cmd({ tipo: 'recuar', id: linha.id })
  }
  const desrecuar = (): void => {
    set({ focar: linha.id })
    void cmd({ tipo: 'desrecuar', id: linha.id })
  }

  const teclas = (ev: KeyboardEvent<HTMLDivElement>): void => {
    if (ro || ev.target !== ref.current) return
    const k = ev.key
    if (k === ' ') {
      ev.preventDefault()
      concluir()
    } else if (k === 'F2' || k === 'Enter') {
      ev.preventDefault()
      set({ editando: linha.id })
    } else if (k === 'Delete') {
      ev.preventDefault()
      void excluir()
    } else if (ev.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) {
      ev.preventDefault()
      mover(k === 'ArrowUp' ? -1 : 1)
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      ev.preventDefault()
      const todas = [...document.querySelectorAll<HTMLElement>('[data-linha]')]
      todas[todas.indexOf(ref.current!) + (k === 'ArrowUp' ? -1 : 1)]?.focus()
    } else if (k === 'Tab' && !ev.shiftKey && podeRecuar(e, linha.id)) {
      ev.preventDefault()
      recuar()
    } else if (k === 'Tab' && ev.shiftKey && nivel === 2) {
      ev.preventDefault()
      desrecuar()
    }
  }

  return (
    <div
      ref={ref}
      className={`linha ${nivel === 2 ? 'n2' : ''} ${feita ? 'feita' : ''}`}
      tabIndex={ro ? undefined : 0}
      data-linha={ro ? undefined : linha.id}
      onKeyDown={teclas}
    >
      {!ro && (
        <input
          type="checkbox"
          className="h-4 w-4 flex-none accent-acento"
          checked={feita}
          onChange={concluir}
          title="Concluir (Espaço)"
          tabIndex={-1}
        />
      )}
      <span className="marcador">{nivel === 1 ? '●' : '○'}</span>
      {emEdicao ? (
        <EdicaoTexto id={linha.id} texto={linha.texto} nivel={nivel} />
      ) : (
        <span className="texto" onDoubleClick={() => !ro && set({ editando: linha.id })}>
          <span className="texto-principal">{linha.texto}</span>
          {linha.planejado && <span className="etiqueta-plan ml-1.5">planejado para hoje</span>}
        </span>
      )}
      {!ro && !emEdicao && (
        <span className="acoes">
          <button type="button" className="icone-btn" title="Editar texto (F2)" onClick={() => set({ editando: linha.id })}>
            <Icone nome="editar" />
          </button>
          {nivel === 1 && (
            <button
              type="button"
              className="icone-btn"
              title="Adicionar sub-item"
              onClick={() => {
                const a = ativ(e, linha.id)!
                set({ modoSubitem: { ...useLoja.getState().modoSubitem, [a.secaoId]: a.id } })
                document.querySelector<HTMLInputElement>(`[data-nova="${a.secaoId}"]`)?.focus()
              }}
            >
              <Icone nome="sub" />
            </button>
          )}
          <button type="button" className="icone-btn" title="Planejar para outra data" onClick={() => set({ dialogo: { tipo: 'planejar', id: linha.id } })}>
            <Icone nome="calendario" />
          </button>
          <button type="button" className="icone-btn" title="Subir (Alt+↑)" onClick={() => mover(-1)}>
            <Icone nome="subir" />
          </button>
          <button type="button" className="icone-btn" title="Descer (Alt+↓)" onClick={() => mover(1)}>
            <Icone nome="descer" />
          </button>
          {multiplasSecoes && (
            <button type="button" className="icone-btn" title="Mover para outra seção" onClick={() => set({ dialogo: { tipo: 'mover', id: linha.id } })}>
              <Icone nome="mover" />
            </button>
          )}
          <button type="button" className="icone-btn hover:text-[#b3261e]" title="Excluir (Del)" onClick={() => void excluir()}>
            <Icone nome="lixeira" />
          </button>
        </span>
      )}
    </div>
  )
}

function EdicaoTexto({ id, texto, nivel }: { id: string; texto: string; nivel: 1 | 2 }): ReactElement {
  const { cmd, set } = useLoja()
  const [valor, setValor] = useState(texto)
  const salvo = useRef(false)

  const salvar = async (depois?: 'recuar' | 'desrecuar'): Promise<void> => {
    if (salvo.current) return
    salvo.current = true
    set({ editando: null, focar: id })
    const v = valor.trim()
    if (v && v !== texto) await cmd({ tipo: 'editarTexto', id, texto: v })
    if (depois === 'recuar') await cmd({ tipo: 'recuar', id })
    if (depois === 'desrecuar' && nivel === 2) await cmd({ tipo: 'desrecuar', id })
  }

  return (
    <input
      className="flex-1 rounded border border-acento px-1.5 py-0.5"
      value={valor}
      autoFocus
      onFocus={(ev) => ev.currentTarget.setSelectionRange(valor.length, valor.length)}
      onChange={(ev) => setValor(ev.target.value)}
      onBlur={() => void salvar()}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault()
          void salvar()
        } else if (ev.key === 'Escape') {
          ev.preventDefault()
          salvo.current = true
          set({ editando: null, focar: id })
        } else if (ev.key === 'Tab') {
          ev.preventDefault()
          void salvar(ev.shiftKey ? 'desrecuar' : 'recuar')
        }
      }}
    />
  )
}

// RF-20 / RF-21: Enter salva e já começa a próxima; Tab vira sub-item do último item; Shift+Tab volta.
function NovaLinha({ secao }: { secao: Secao }): ReactElement {
  const { estado, modoSubitem, cmd, set, toast } = useLoja()
  const e = estado!
  const [valor, setValor] = useState('')
  let pai = modoSubitem[secao.id] ? ativ(e, modoSubitem[secao.id]) : undefined
  if (pai && (pai.status === 'excluida' || !idsHoje(e).has(pai.id) || pai.secaoId !== secao.id)) pai = undefined

  const modo = (parentId?: string): void => {
    const m = { ...useLoja.getState().modoSubitem }
    if (parentId) m[secao.id] = parentId
    else delete m[secao.id]
    set({ modoSubitem: m })
  }

  const teclas = async (ev: KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (ev.key === 'Enter') {
      ev.preventDefault()
      const texto = valor.trim()
      if (!texto) return
      if (await cmd({ tipo: 'criarAtividade', secaoId: secao.id, parentId: pai?.id ?? null, texto })) setValor('')
    } else if (ev.key === 'Tab' && !ev.shiftKey && !pai) {
      const topo = visiveis(e, secao.id, null)
      const ultimo = topo[topo.length - 1]
      if (!ultimo) return
      ev.preventDefault()
      if (ultimo.status !== 'pendente') toast('O item acima está concluído; o sub-item vai reabri-lo.')
      modo(ultimo.id)
    } else if ((ev.key === 'Tab' && ev.shiftKey && pai) || (ev.key === 'Escape' && pai)) {
      ev.preventDefault()
      modo()
    }
  }

  return (
    <>
      {pai && (
        <div className="flex items-center gap-1.5 pt-0.5 pl-[55px] text-[11.5px] text-acento">
          <Icone nome="sub" />
          Sub-item de “{trunc(pai.texto, 50)}”
          <button type="button" className="link text-[11.5px]" onClick={() => modo()}>
            voltar ao 1º nível
          </button>
        </div>
      )}
      <div className={`nova-linha ${pai ? 'n2' : ''}`}>
        <span className="marcador text-[11px] text-[#b5bbc0]">{pai ? '○' : '●'}</span>
        <input
          data-nova={secao.id}
          value={valor}
          onChange={(ev) => setValor(ev.target.value)}
          onKeyDown={(ev) => void teclas(ev)}
          placeholder={
            pai
              ? 'Novo sub-item… (Enter salva · Shift+Tab volta ao 1º nível)'
              : 'Adicionar atividade… (Enter salva · Tab vira sub-item)'
          }
        />
      </div>
    </>
  )
}
