import { useEffect, type ReactElement } from 'react'
import { useLoja } from './store'
import { dataDaTela, rota } from './tela'
import { Assistente } from './components/Assistente'
import { Dialogos } from './components/Dialogos'
import { ModalImpressao } from './components/Impressao'
import { ModalAtalhos, ModalFora, ModalPlanejadas, ModalSecoes, ModalSobre } from './components/Modais'
import { PaperView } from './components/PaperView'
import { ModalPerfil, PrimeiroAcesso } from './components/Perfil'
import { Toasts } from './components/Toasts'
import { Topo } from './components/Topo'

export function App(): ReactElement {
  const { estado, avisoNovoDia, dataVista, modal, dialogo, carregar, verificarDia, set } = useLoja()
  const r = rota(estado, avisoNovoDia)
  const data = estado && r !== 'assistente' && r !== 'carregando' ? dataDaTela(estado, dataVista, r) : null

  useEffect(() => {
    void carregar()
    // RF-15: o dia pode virar com o app aberto
    const t = setInterval(() => void verificarDia(), 30_000)
    return () => clearInterval(t)
  }, [carregar, verificarDia])

  // Atalhos globais (RNF-06)
  useEffect(() => {
    const teclas = (ev: KeyboardEvent): void => {
      const alvo = ev.target as HTMLElement
      const digitando = /INPUT|TEXTAREA|SELECT/.test(alvo.tagName)
      const livre = !modal && !dialogo && r !== 'assistente' && r !== 'perfil'
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'p' && livre && data) {
        ev.preventDefault()
        set({ modal: 'imprimir' })
      } else if (ev.altKey && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && !digitando && livre) {
        ev.preventDefault()
        document.querySelector<HTMLButtonElement>(`[data-nav="${ev.key === 'ArrowLeft' ? 'Anterior' : 'Próximo'}"]`)?.click()
      } else if (!digitando && livre && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        if (ev.key === 'n' || ev.key === 'N') {
          const campo = document.querySelector<HTMLInputElement>('[data-nova]')
          if (campo) {
            ev.preventDefault()
            campo.focus()
          }
        } else if (ev.key === '?') set({ modal: 'atalhos' })
      }
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  }, [modal, dialogo, r, data, set])

  if (r === 'carregando') return <div className="p-10 text-center text-suave">Abrindo…</div>
  if (r === 'perfil')
    return (
      <>
        <PrimeiroAcesso />
        <Toasts />
      </>
    )

  return (
    <>
      <Topo acoes={r === 'paper'} />
      {r === 'assistente' ? <Assistente key={estado!.hoje} /> : <PaperView data={data!} roDia={r === 'paperDiaAnterior'} />}
      {modal === 'planejadas' && <ModalPlanejadas />}
      {modal === 'fora' && <ModalFora />}
      {modal === 'secoes' && <ModalSecoes />}
      {modal === 'sobre' && <ModalSobre />}
      {modal === 'atalhos' && <ModalAtalhos />}
      {modal === 'perfil' && <ModalPerfil />}
      {modal === 'imprimir' && data && <ModalImpressao data={data} />}
      <Dialogos />
      <Toasts />
    </>
  )
}
