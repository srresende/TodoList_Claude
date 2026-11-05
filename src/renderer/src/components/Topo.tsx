import type { ReactElement } from 'react'
import { foraDoPaper, planejadas } from '@domain/consultas'
import { capitalizar, diaSemana, fmt } from '@domain/datas'
import { useLoja } from '../store'
import { Icone, LogoBranco } from './icones'

export function Topo({ acoes }: { acoes: boolean }): ReactElement {
  const { estado, info, set } = useLoja()
  const e = estado!
  const nFora = foraDoPaper(e).length
  const nPlan = planejadas(e).length
  const pendentes = info?.pendentesSincronizacao ?? 0
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 border-b border-linha bg-white px-4 py-2">
      <button
        type="button"
        className="-ml-1 rounded-md px-1 py-0.5 hover:bg-[#dfe4e7]"
        title="Sobre o TodoList_C"
        onClick={() => set({ modal: 'sobre' })}
      >
        <LogoBranco altura={26} />
      </button>
      <span className="border-l border-linha pl-2.5 text-[15px] font-bold">TodoList_C</span>
      <span className="mr-auto pl-1.5 text-suave">
        {capitalizar(diaSemana(e.hoje))}, {fmt(e.hoje)}
      </span>
      {acoes && (
        <>
          <button type="button" className="btn" title="Imprimir (Ctrl+P)" onClick={() => set({ modal: 'imprimir' })}>
            <Icone nome="impressora" />
            Imprimir
          </button>
          <button type="button" className="btn" onClick={() => set({ modal: 'planejadas' })}>
            <Icone nome="calendario" />
            Planejadas <span className="badge">{nPlan}</span>
          </button>
          <button type="button" className="btn" onClick={() => set({ modal: 'fora' })}>
            <Icone nome="caixa" />
            Fora do paper <span className={`badge ${nFora ? 'bg-aviso text-white' : ''}`}>{nFora}</span>
          </button>
          <button type="button" className="btn" onClick={() => set({ modal: 'secoes' })}>
            <Icone nome="grade" />
            Seções
          </button>
        </>
      )}
      {/* RF-72: a sincronização com a nuvem ainda não existe; por enquanto os dados ficam só neste PC. */}
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-linha px-2.5 py-1 text-[12.5px]"
        title={`${pendentes} alteração(ões) aguardando a sincronização com a nuvem`}
      >
        <span className="h-2 w-2 rounded-full bg-[#9aa1a7]" />
        Salvo neste PC
      </span>
      {acoes && (
        <button type="button" className="btn btn-sm" title="Atalhos de teclado" onClick={() => set({ modal: 'atalhos' })}>
          ?
        </button>
      )}
    </header>
  )
}
