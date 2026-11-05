import { useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { candidatos, marcarNoAssistente, montarAssistente, type NovaNoAssistente } from '@domain/assistente'
import { ativ, porOrdem, secoesAtivas } from '@domain/consultas'
import { diaSemana, difDias, fmt, fmtCurto } from '@domain/datas'
import type { Atividade } from '@domain/tipos'
import { useLoja } from '../store'
import { Icone, corTexto } from './icones'

// RF-10 a RF-14: revisa o que entra no paper de hoje; o que for desmarcado vai para "Fora do paper".
export function Assistente(): ReactElement {
  const { estado, cmd, toast } = useLoja()
  const e = estado!
  const as = useMemo(() => montarAssistente(e), [e])
  const [marcados, setMarcados] = useState(() => new Set([...as.pend, ...as.plan]))
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set())
  const [novos, setNovos] = useState<(NovaNoAssistente & { id: number })[]>([])
  const [enviando, setEnviando] = useState(false)

  const cand = candidatos(as, excluidos)
  const noPaper = cand.filter((id) => marcados.has(id)).length + novos.length
  const fora = cand.filter((id) => !marcados.has(id)).length

  const marcar = (id: string, on: boolean): void => setMarcados(marcarNoAssistente(e, as, excluidos, marcados, id, on))
  const excluir = (id: string): void => {
    const grupo = [id, ...e.atividades.filter((a) => a.parentId === id).map((a) => a.id)]
    setExcluidos((x) => new Set([...x, ...grupo]))
    toast(`“${ativ(e, id)!.texto}” será excluída`, () =>
      setExcluidos((x) => new Set([...x].filter((y) => !grupo.includes(y))))
    )
  }
  const criar = async (): Promise<void> => {
    setEnviando(true)
    await cmd({
      tipo: 'criarPaper',
      marcados: [...marcados].filter((id) => !excluidos.has(id)),
      excluidos: [...excluidos],
      novos: novos.map(({ secaoId, texto }) => ({ secaoId, texto }))
    })
    setEnviando(false)
  }

  const linha = (a: Atividade, origem: 'pend' | 'plan', prefixoPai: string | null, nivel2: boolean): ReactElement => {
    const on = marcados.has(a.id)
    const atrasada = origem === 'plan' && a.dataPlanejada && a.dataPlanejada < e.hoje
    return (
      <div key={a.id} className={`flex min-h-[29px] items-center gap-1.5 rounded px-1 hover:bg-destaque ${nivel2 ? 'pl-[30px]' : ''}`}>
        <label className="flex flex-1 cursor-pointer items-center gap-1.5">
          <input type="checkbox" className="h-4 w-4 accent-acento" checked={on} onChange={(ev) => marcar(a.id, ev.target.checked)} />
          <span className="w-3 text-center text-[11px]">{nivel2 || prefixoPai ? '○' : '●'}</span>
          <span className={on ? '' : 'text-[#9aa1a7]'}>
            {prefixoPai && <span className="text-suave">{prefixoPai} › </span>}
            {a.texto}
          </span>
          {atrasada && <span className="etiqueta-atraso">planejada p/ {fmtCurto(a.dataPlanejada!)}</span>}
          {!on && <span className="text-[11.5px] text-suave">→ fora do paper</span>}
        </label>
        <button type="button" className="icone-btn hover:text-[#b3261e]" title="Excluir" onClick={() => excluir(a.id)}>
          <Icone nome="lixeira" />
        </button>
      </div>
    )
  }

  const lista = (ids: string[], origem: 'pend' | 'plan'): ReactElement => {
    const set = new Set(ids.filter((id) => !excluidos.has(id)))
    if (!set.size) return <p className="my-1 text-[#9aa1a7] italic">Nenhum item.</p>
    return (
      <>
        {secoesAtivas(e).map((s) => {
          const daSecao = [...set].map((id) => ativ(e, id)!).filter((a) => a.secaoId === s.id)
          if (!daSecao.length) return null
          const topo = daSecao.filter((a) => !a.parentId || !set.has(a.parentId)).sort(porOrdem)
          return (
            <div key={s.id} className="mb-2.5">
              <SecaoTag nome={s.nome} cor={s.cor} />
              {topo.map((a) => (
                <div key={a.id}>
                  {linha(a, origem, a.parentId ? (ativ(e, a.parentId)?.texto ?? null) : null, false)}
                  {daSecao
                    .filter((c) => c.parentId === a.id)
                    .sort(porOrdem)
                    .map((c) => linha(c, origem, null, true))}
                </div>
              ))}
            </div>
          )
        })}
      </>
    )
  }

  const dias = as.ultimo ? difDias(as.ultimo, e.hoje) : 0
  return (
    <div className="px-4 pt-5 pb-24">
      <div className="mx-auto max-w-[860px] overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,.08)]">
        <div className="faixa-data">
          Criar paper do dia{' '}
          <small>
            {diaSemana(e.hoje)}, {fmt(e.hoje)}
          </small>
        </div>
        <div className="px-[22px] pt-4 pb-2">
          <p className="mt-0 mb-4 text-suave">
            Os itens vêm exatamente como estavam. Desmarque o que não entra hoje: o item continua pendente na lista{' '}
            <b>Fora do paper</b> e não volta sozinho nos próximos dias.
          </p>
          <Bloco titulo={as.ultimo ? `Pendentes de ${fmt(as.ultimo)}` : 'Pendentes do último paper'}>
            {!as.ultimo && <span className="text-suave">Ainda não existe nenhum paper: este será o primeiro.</span>}
            {dias > 1 && <span className="text-suave">Último paper criado há {dias} dias; os dias sem paper são ignorados.</span>}
            {lista(as.pend, 'pend')}
          </Bloco>
          <Bloco titulo="Planejadas para hoje">{lista(as.plan, 'plan')}</Bloco>
          <Bloco titulo="Novas atividades">
            {secoesAtivas(e).map((s) => (
              <div key={s.id} className="mb-2.5">
                <SecaoTag nome={s.nome} cor={s.cor} />
                {novos
                  .filter((n) => n.secaoId === s.id)
                  .map((n) => (
                    <div key={n.id} className="flex min-h-[29px] items-center gap-1.5 px-1">
                      <span className="w-3 text-center text-[11px]">●</span>
                      <span className="flex-1">{n.texto}</span>
                      <span className="etiqueta-plan">nova</span>
                      <button type="button" className="icone-btn" title="Remover" onClick={() => setNovos((x) => x.filter((y) => y.id !== n.id))}>
                        <Icone nome="fechar" />
                      </button>
                    </div>
                  ))}
                <input
                  className="campo mt-1"
                  placeholder={`Nova atividade em “${s.nome}” (Enter para incluir)`}
                  onKeyDown={(ev) => {
                    const v = ev.currentTarget.value.trim()
                    if (ev.key !== 'Enter' || !v) return
                    ev.preventDefault()
                    setNovos((x) => [...x, { id: Date.now() + Math.random(), secaoId: s.id, texto: v }])
                    ev.currentTarget.value = ''
                  }}
                />
              </div>
            ))}
          </Bloco>
        </div>
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2.5 border-t border-linha bg-[#fafbfb] px-[22px] py-3">
          <span>
            <b>{noPaper}</b> no paper de hoje · <b>{fora}</b> ficarão fora do paper
            {excluidos.size > 0 && ` · ${excluidos.size} excluída(s)`}
          </span>
          <button type="button" className="btn btn-primario" disabled={enviando} onClick={() => void criar()}>
            <Icone nome="ok" />
            Criar paper
          </button>
        </div>
      </div>
    </div>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }): ReactElement {
  return (
    <section className="mb-[18px]">
      <h3 className="mt-0 mb-2 border-b border-linha pb-1.5 text-[14.5px] font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

export function SecaoTag({ nome, cor }: { nome: string; cor: string }): ReactElement {
  return (
    <span
      className="mb-1 inline-block border-2 border-black px-2 py-px text-[12.5px] font-bold whitespace-nowrap"
      style={{ background: cor, color: corTexto(cor) }}
    >
      {nome}
    </span>
  )
}
