import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { linhasPaper, secoesAtivas } from '@domain/consultas'
import { fmt } from '@domain/datas'
import type { Estado } from '@domain/tipos'
import { useLoja } from '../store'
import { Icone, LogoBranco, corTexto } from './icones'
import { ModalBox } from './Modais'

const MM = 96 / 25.4
const AREA_UTIL = 277 * MM // A4 (297 mm) menos as margens de 10 mm
const FONTE_MAX = 12
const FONTE_MIN = 9 // RF-54: mínimo legível

/** Folha A4 do paper (RF-51 a RF-53, RF-56). */
export function Folha({ e, data, fonte, concluidos }: { e: Estado; data: string; fonte: number; concluidos: boolean }): ReactElement {
  const mostrar = (status: string): boolean => concluidos || status !== 'concluida'
  return (
    <div className="folha" style={{ fontSize: `${fonte}pt` }}>
      <div className="faixa-data">{fmt(data)}</div>
      {secoesAtivas(e).map((s) => (
        <div key={s.id} className="caixa-secao">
          <div className="cabecalho-secao" style={{ background: s.cor, color: corTexto(s.cor) }}>
            {s.nome}
          </div>
          <ul>
            {linhasPaper(e, data, s.id, null)
              .filter((l) => mostrar(l.status))
              .map((l) => (
                <Itens key={l.id} e={e} data={data} secaoId={s.id} linha={l} mostrar={mostrar} />
              ))}
          </ul>
          <div className="anotacoes" />
        </div>
      ))}
      <div className="rodape">
        <LogoBranco altura="8mm" />
      </div>
    </div>
  )
}

function Itens(p: {
  e: Estado
  data: string
  secaoId: string
  linha: { id: string; texto: string; status: string }
  mostrar: (s: string) => boolean
}): ReactElement {
  const li = (l: { id: string; texto: string; status: string }, n: 1 | 2): ReactElement => (
    <li key={l.id} className={`${n === 2 ? 'n2' : ''} ${l.status === 'concluida' ? 'feita' : ''}`}>
      <span className="m">{n === 1 ? '●' : '○'}</span>
      <span className="t">{l.texto}</span>
    </li>
  )
  return (
    <>
      {li(p.linha, 1)}
      {linhasPaper(p.e, p.data, p.secaoId, p.linha.id)
        .filter((c) => p.mostrar(c.status))
        .map((c) => li(c, 2))}
    </>
  )
}

// RF-50 / RF-54: pré-visualização com redução automática da fonte até caber em uma página.
export function ModalImpressao({ data }: { data: string }): ReactElement {
  const { estado, imprimirConcluidos, set, cmd } = useLoja()
  const e = estado!
  const palco = useRef<HTMLDivElement>(null)
  const pagina = useRef<HTMLDivElement>(null)
  const envoltorio = useRef<HTMLDivElement>(null)
  const [fonte, setFonte] = useState(FONTE_MAX)
  const [info, setInfo] = useState('')

  useLayoutEffect(() => {
    const ajustar = (): void => {
      const a4 = pagina.current
      const folha = a4?.querySelector<HTMLElement>('.folha')
      if (!a4 || !folha || !palco.current || !envoltorio.current) return
      let fs = FONTE_MAX
      for (; fs >= FONTE_MIN; fs -= 0.5) {
        folha.style.fontSize = `${fs}pt`
        if (folha.scrollHeight <= AREA_UTIL) break
      }
      const cabe = fs >= FONTE_MIN
      if (!cabe) {
        fs = FONTE_MIN
        folha.style.fontSize = `${fs}pt`
      }
      setFonte(fs)
      setInfo(
        cabe
          ? `Fonte ${String(fs).replace('.', ',')} pt · cabe em 1 página`
          : `Fonte mínima (9 pt) · ~${Math.ceil(folha.scrollHeight / AREA_UTIL)} páginas, sem cortar seções`
      )
      const escala = Math.min(1, (palco.current.clientWidth - 24) / (210 * MM), Math.max(0.35, (window.innerHeight * 0.62) / a4.offsetHeight))
      a4.style.transform = `scale(${escala})`
      envoltorio.current.style.width = `${a4.offsetWidth * escala}px`
      envoltorio.current.style.height = `${a4.offsetHeight * escala}px`
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [e, data, imprimirConcluidos])

  const imprimir = (): void => {
    void cmd({ tipo: 'marcarImpresso', data })
    // O conteúdo de #print-root (abaixo) é o que sai no papel; o resto da tela é ocultado por @media print.
    requestAnimationFrame(() => window.print())
  }

  return (
    <ModalBox
      titulo="Pré-visualização de impressão (A4)"
      largura="larga"
      aoFechar={() => set({ modal: null })}
      rodape={
        <>
          <button type="button" className="btn" onClick={() => set({ modal: null })}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" onClick={imprimir} data-autofoco>
            <Icone nome="impressora" />
            Imprimir
          </button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="accent-acento"
            checked={imprimirConcluidos}
            onChange={(ev) => set({ imprimirConcluidos: ev.target.checked })}
          />
          Incluir concluídos (riscados)
        </label>
        <span className="text-suave">{info}</span>
      </div>
      <div ref={palco} className="flex justify-center overflow-hidden rounded-md bg-[#8d969d] p-3">
        <div ref={envoltorio} className="flex-none">
          <div ref={pagina} className="a4">
            <Folha e={e} data={data} fonte={fonte} concluidos={imprimirConcluidos} />
          </div>
        </div>
      </div>
      {createPortal(<Folha e={e} data={data} fonte={fonte} concluidos={imprimirConcluidos} />, document.getElementById('print-root')!)}
    </ModalBox>
  )
}
