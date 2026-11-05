import { useEffect, useRef, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { ativ, filhos, foraDoPaper, paperHoje, planejadas, secao, secoesArquivadas, secoesAtivas } from '@domain/consultas'
import { addDias, capitalizar, diaSemana, difDias, fmt } from '@domain/datas'
import type { Atividade } from '@domain/tipos'
import { EDICAO_LOCAL, NOME_APP } from '@shared/edicao'
import { useLoja } from '../store'
import { SecaoTag } from './Assistente'
import { Icone, LogoOriginal } from './icones'

export function ModalBox(p: {
  titulo: string
  children: ReactNode
  rodape?: ReactNode
  largura?: 'normal' | 'larga' | 'estreita'
  aoFechar: () => void
  camada?: 'modal' | 'dialogo'
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Foco inicial dentro da janela (o elemento com data-autofoco, ou a própria janela)
    const alvo = ref.current?.querySelector<HTMLElement>('[data-autofoco]') ?? ref.current
    alvo?.focus()
  }, [])
  const largura = { normal: 'w-[min(640px,100%)]', larga: 'w-[min(1000px,100%)]', estreita: 'w-[min(420px,100%)]' }[
    p.largura ?? 'normal'
  ]
  return (
    <div
      className={`fixed inset-0 flex items-start justify-center overflow-auto px-4 pt-[6vh] pb-4 ${p.camada === 'dialogo' ? 'z-[60] bg-[rgba(20,25,30,.3)]' : 'z-50 bg-[rgba(20,25,30,.45)]'}`}
      onMouseDown={(ev) => ev.target === ev.currentTarget && p.aoFechar()}
      onKeyDown={(ev) => {
        if (ev.key === 'Escape') {
          ev.stopPropagation()
          p.aoFechar()
        }
      }}
    >
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={p.titulo} className={`${largura} rounded-[10px] bg-white shadow-[0_20px_50px_rgba(0,0,0,.25)] outline-none`}>
        <div className="flex items-center justify-between gap-2.5 border-b border-linha px-[18px] py-[13px]">
          <h2 className="m-0 text-base font-semibold">{p.titulo}</h2>
          <button type="button" className="icone-btn" title="Fechar (Esc)" onClick={p.aoFechar}>
            <Icone nome="fechar" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto px-[18px] py-3.5">{p.children}</div>
        {p.rodape && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-linha px-[18px] py-3">{p.rodape}</div>}
      </div>
    </div>
  )
}

const Vazio = ({ texto }: { texto: string }): ReactElement => <p className="my-1 text-[#9aa1a7] italic">{texto}</p>
const fechar = (): void => useLoja.getState().set({ modal: null })

function TextoComPai({ a }: { a: Atividade }): ReactElement {
  const { estado } = useLoja()
  const pai = a.parentId ? ativ(estado!, a.parentId) : undefined
  return (
    <span className="min-w-[160px] flex-1">
      {pai && <span className="text-suave">{pai.texto} › </span>}
      {a.texto}
    </span>
  )
}

function Tag({ a }: { a: Atividade }): ReactElement {
  const s = secao(useLoja.getState().estado!, a.secaoId)
  return s ? <SecaoTag nome={s.nome} cor={s.cor} /> : <span />
}

// RF-27
export function ModalPlanejadas(): ReactElement {
  const { estado, cmd } = useLoja()
  const e = estado!
  const amanha = addDias(e.hoje, 1)
  const lista = planejadas(e)
  const temPaper = !!paperHoje(e)
  const nova = async (ev: FormEvent<HTMLFormElement>): Promise<void> => {
    ev.preventDefault()
    const f = new FormData(ev.currentTarget)
    const form = ev.currentTarget
    const ok = await cmd({
      tipo: 'novaPlanejada',
      texto: String(f.get('texto')),
      secaoId: String(f.get('secao')),
      data: String(f.get('data'))
    })
    if (ok) {
      form.reset()
      useLoja.getState().toast(`Planejada para ${fmt(String(f.get('data')))}`)
    }
  }
  return (
    <ModalBox titulo="Atividades planejadas" aoFechar={fechar}>
      <form className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#f5f7f8] p-2.5" onSubmit={(ev) => void nova(ev)}>
        <input className="campo w-auto min-w-[140px] flex-1 py-1.5" name="texto" placeholder="Nova atividade planejada" required data-autofoco />
        <select className="campo w-auto py-1.5" name="secao">
          {secoesAtivas(e).map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <input className="campo w-auto py-1.5" type="date" name="data" min={amanha} defaultValue={amanha} required />
        <button className="btn btn-primario" type="submit">
          Planejar
        </button>
      </form>
      {lista.length === 0 && <Vazio texto="Nenhuma atividade planejada." />}
      {lista.map((a, i) => {
        const cabecalho = i === 0 || lista[i - 1].dataPlanejada !== a.dataPlanejada
        const d = difDias(e.hoje, a.dataPlanejada!)
        const nFilhos = filhos(e, a.id).filter((c) => c.status === 'pendente').length
        return (
          <div key={a.id}>
            {cabecalho && (
              <div className="mt-3.5 mb-0.5 font-semibold text-[#38414a]">
                {capitalizar(diaSemana(a.dataPlanejada!))}, {fmt(a.dataPlanejada!)}{' '}
                <span className="font-normal text-suave">
                  · {d <= 0 ? 'aguardando o paper do dia' : d === 1 ? 'amanhã' : `em ${d} dias`}
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#eef0f2] py-1.5">
              <Tag a={a} />
              <TextoComPai a={a} />
              {nFilhos > 0 && <span className="text-suave">(+{nFilhos} sub-itens)</span>}
              <input
                type="date"
                className="campo w-auto px-2 py-1"
                defaultValue={a.dataPlanejada!}
                min={amanha}
                onChange={(ev) => {
                  if (ev.target.value) void cmd({ tipo: 'alterarDataPlanejada', id: a.id, data: ev.target.value })
                }}
              />
              <button type="button" className="btn btn-sm" disabled={!temPaper} onClick={() => void cmd({ tipo: 'trazerParaHoje', id: a.id })}>
                Trazer para hoje
              </button>
              <BotaoExcluir a={a} />
            </div>
          </div>
        )
      })}
      {!temPaper && lista.length > 0 && (
        <p className="mt-3 text-[12.5px] text-suave">Crie o paper de hoje para poder trazer itens para ele.</p>
      )}
    </ModalBox>
  )
}

function BotaoExcluir({ a }: { a: Atividade }): ReactElement {
  const { cmd, toast, estado } = useLoja()
  return (
    <button
      type="button"
      className="icone-btn hover:text-[#b3261e]"
      title="Excluir"
      onClick={async () => {
        const grupo = [a, ...filhos(estado!, a.id)]
        const antes = grupo.map((x) => ({ id: x.id, status: x.status }))
        if (await cmd({ tipo: 'excluir', id: a.id }))
          toast(`“${a.texto}” excluída`, () => void cmd({ tipo: 'restaurarStatus', itens: antes }))
      }}
    >
      <Icone nome="lixeira" />
    </button>
  )
}

// RF-12a
export function ModalFora(): ReactElement {
  const { estado, cmd, set } = useLoja()
  const e = estado!
  const lista = foraDoPaper(e)
  const temPaper = !!paperHoje(e)
  return (
    <ModalBox titulo="Fora do paper" aoFechar={fechar}>
      <p className="mt-0 text-suave">
        Itens pendentes que você deixou de fora ao criar um paper. Eles não voltam sozinhos: traga-os de volta quando
        quiser.
      </p>
      {lista.length === 0 && <Vazio texto="Nenhum item fora do paper." />}
      {lista.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-2 border-b border-[#eef0f2] py-1.5">
          <Tag a={a} />
          <TextoComPai a={a} />
          <button type="button" className="btn btn-sm" disabled={!temPaper} onClick={() => void cmd({ tipo: 'trazerParaHoje', id: a.id })}>
            Trazer para o paper
          </button>
          <button type="button" className="btn btn-sm" onClick={() => set({ dialogo: { tipo: 'planejar', id: a.id } })}>
            Planejar
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void cmd({ tipo: 'concluirFora', id: a.id })}>
            Concluir
          </button>
          <BotaoExcluir a={a} />
        </div>
      ))}
    </ModalBox>
  )
}

// RF-41 / RF-42
export function ModalSecoes(): ReactElement {
  const { estado, cmd, set } = useLoja()
  const e = estado!
  const ativas = secoesAtivas(e)
  const arquivadas = secoesArquivadas(e)
  const nova = async (ev: FormEvent<HTMLFormElement>): Promise<void> => {
    ev.preventDefault()
    const form = ev.currentTarget
    if (await cmd({ tipo: 'criarSecao', nome: String(new FormData(form).get('nome')) })) form.reset()
  }
  return (
    <ModalBox titulo="Seções" aoFechar={fechar}>
      <form className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#f5f7f8] p-2.5" onSubmit={(ev) => void nova(ev)}>
        <input className="campo w-auto min-w-[140px] flex-1 py-1.5" name="nome" placeholder="Nome da nova seção" required data-autofoco />
        <button className="btn btn-primario" type="submit">
          Criar seção
        </button>
      </form>
      {ativas.map((s, i) => (
        <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-[#eef0f2] py-1.5">
          <input
            type="color"
            className="h-[30px] w-[34px] rounded border border-linha bg-white p-0"
            defaultValue={s.cor.toLowerCase()}
            title="Cor do cabeçalho"
            onChange={(ev) => void cmd({ tipo: 'corSecao', id: s.id, cor: ev.target.value })}
          />
          <input
            className="campo min-w-[160px] flex-1 py-1"
            defaultValue={s.nome}
            onBlur={(ev) => {
              const v = ev.target.value.trim()
              if (v && v !== s.nome) void cmd({ tipo: 'renomearSecao', id: s.id, nome: v })
              else ev.target.value = s.nome
            }}
            onKeyDown={(ev) => ev.key === 'Enter' && ev.currentTarget.blur()}
          />
          <button type="button" className="icone-btn" title="Subir" disabled={i === 0} onClick={() => void cmd({ tipo: 'moverSecaoOrdem', id: s.id, direcao: -1 })}>
            <Icone nome="subir" />
          </button>
          <button
            type="button"
            className="icone-btn"
            title="Descer"
            disabled={i === ativas.length - 1}
            onClick={() => void cmd({ tipo: 'moverSecaoOrdem', id: s.id, direcao: 1 })}
          >
            <Icone nome="descer" />
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={ativas.length < 2}
            title={ativas.length < 2 ? 'Precisa existir ao menos uma seção' : undefined}
            onClick={() => {
              const pend = e.atividades.some((a) => a.secaoId === s.id && a.status === 'pendente')
              if (pend) set({ dialogo: { tipo: 'arquivar', id: s.id } })
              else void cmd({ tipo: 'arquivarSecao', id: s.id, destinoId: null })
            }}
          >
            Arquivar
          </button>
        </div>
      ))}
      {arquivadas.length > 0 && (
        <>
          <div className="mt-4 mb-0.5 font-semibold text-[#38414a]">Arquivadas</div>
          {arquivadas.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border-b border-[#eef0f2] py-1.5">
              <span className="flex-1 text-suave">{s.nome}</span>
              <button type="button" className="btn btn-sm" onClick={() => void cmd({ tipo: 'restaurarSecao', id: s.id })}>
                Restaurar
              </button>
            </div>
          ))}
        </>
      )}
    </ModalBox>
  )
}

// RF-61
export function ModalSobre(): ReactElement {
  const { info, estado } = useLoja()
  const u = estado?.usuario
  return (
    <ModalBox titulo="Sobre" largura="estreita" aoFechar={fechar}>
      <div className="text-center">
        <LogoOriginal altura={54} />
        <h2 className="mt-2 mb-0 text-xl font-bold">{NOME_APP}</h2>
        <div className="text-suave">Lista diária de atividades pessoais e profissionais</div>
        <dl className="mx-auto mt-4 grid max-w-[380px] grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-left">
          <dt className="text-suave">Versão</dt>
          <dd className="m-0">{info?.versao ?? '—'}</dd>
          <dt className="text-suave">Plataforma</dt>
          <dd className="m-0">Electron {info?.electron ?? '—'}</dd>
          <dt className="text-suave">Desenvolvido por</dt>
          <dd className="m-0">saladaMista</dd>
          <dt className="text-suave">Site</dt>
          <dd className="m-0 text-suave">[a definir]</dd>
          <dt className="text-suave">Contato</dt>
          <dd className="m-0 text-suave">[a definir]</dd>
          {EDICAO_LOCAL ? (
            <>
              <dt className="text-suave">Edição</dt>
              <dd className="m-0">Local: offline, sem login e sem sincronização</dd>
              <dt className="text-suave">Usuário</dt>
              <dd className="m-0">
                {u?.nome ?? '—'}
                {u?.email && <span className="block text-suave">{u.email}</span>}
              </dd>
              <dt className="text-suave">Dados</dt>
              <dd className="m-0 text-[12px] break-all text-suave">{info?.pastaDados ?? '—'}</dd>
            </>
          ) : (
            <>
              <dt className="text-suave">Sincronização</dt>
              <dd className="m-0">
                Ainda não disponível · {info?.pendentesSincronizacao ?? 0} alteração(ões) guardadas neste PC
              </dd>
            </>
          )}
        </dl>
        <p className="mt-[18px] text-xs text-suave">© 2026 saladaMista. Todos os direitos reservados.</p>
      </div>
    </ModalBox>
  )
}

// RNF-06
export function ModalAtalhos(): ReactElement {
  const linhas: [string, string][] = [
    ['N', 'Ir para “Adicionar atividade” da primeira seção'],
    ['Enter', 'Salvar a atividade e começar a próxima'],
    ['Tab / Shift+Tab', 'Virar sub-item / voltar ao 1º nível'],
    ['↑ / ↓', 'Navegar entre as atividades'],
    ['Espaço', 'Concluir / desfazer a atividade selecionada'],
    ['F2 ou duplo clique', 'Editar o texto'],
    ['Del', 'Excluir (com desfazer)'],
    ['Alt+↑ / Alt+↓', 'Subir / descer a atividade'],
    ['Alt+← / Alt+→', 'Ver o paper anterior / seguinte'],
    ['Ctrl+P', 'Imprimir o paper que está na tela'],
    ['Esc', 'Cancelar edição / fechar janela']
  ]
  return (
    <ModalBox titulo="Atalhos de teclado" largura="estreita" aoFechar={fechar}>
      <table className="w-full border-collapse">
        <tbody>
          {linhas.map(([k, d]) => (
            <tr key={k}>
              <td className="border-b border-[#eef0f2] px-1 py-1.5 whitespace-nowrap">
                {k.split(' / ').map((x, i) => (
                  <span key={x}>
                    {i > 0 && ' / '}
                    <kbd className="rounded border border-b-2 border-[#c9cfd4] bg-[#fafafa] px-1.5 font-mono text-xs">{x}</kbd>
                  </span>
                ))}
              </td>
              <td className="border-b border-[#eef0f2] px-1 py-1.5">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModalBox>
  )
}
