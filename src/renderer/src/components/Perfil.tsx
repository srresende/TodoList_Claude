import { useState, type FormEvent, type ReactElement } from 'react'
import { useLoja } from '../store'
import { LogoOriginal } from './icones'
import { ModalBox } from './Modais'

/** Formulário de nome e e-mail do usuário (edição Local, D11). Nome obrigatório; e-mail opcional. */
function FormUsuario({ textoBotao, aoSalvar }: { textoBotao: string; aoSalvar?: () => void }): ReactElement {
  const { estado, cmd } = useLoja()
  const u = estado?.usuario
  const [enviando, setEnviando] = useState(false)
  const enviar = async (ev: FormEvent<HTMLFormElement>): Promise<void> => {
    ev.preventDefault()
    const f = new FormData(ev.currentTarget)
    setEnviando(true)
    const ok = await cmd({ tipo: 'salvarUsuario', nome: String(f.get('nome')), email: String(f.get('email')) })
    setEnviando(false)
    if (ok) aoSalvar?.()
  }
  return (
    <form className="flex flex-col gap-3 text-left" onSubmit={(ev) => void enviar(ev)}>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold">Nome</span>
        <input className="campo" name="nome" defaultValue={u?.nome ?? ''} maxLength={80} required autoComplete="name" data-autofoco autoFocus />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold">
          E-mail <span className="font-normal text-suave">(opcional)</span>
        </span>
        <input className="campo" name="email" type="email" defaultValue={u?.email ?? ''} maxLength={254} autoComplete="email" />
      </label>
      <button className="btn btn-primario justify-center py-2" type="submit" disabled={enviando}>
        {textoBotao}
      </button>
    </form>
  )
}

/** Primeiro acesso na edição Local: identifica o usuário antes do primeiro paper. */
export function PrimeiroAcesso(): ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6">
      <div className="w-[min(400px,100%)] rounded-xl bg-white px-7 pt-7 pb-6 text-center shadow-[0_10px_30px_rgba(0,0,0,.08)]">
        <LogoOriginal altura={38} />
        <h1 className="mt-3 mb-0.5 text-[22px] font-bold">TodoList_C Local</h1>
        <p className="mt-0 mb-5 text-suave">Para começar, informe seus dados.</p>
        <FormUsuario textoBotao="Começar" />
        <p className="mt-4 mb-0 rounded-md bg-[#f4f6f7] px-2.5 py-2 text-xs text-suave">
          Esta versão funciona só neste computador, sem internet: não tem login e não sincroniza com a nuvem. Seus dados
          ficam guardados neste PC.
        </p>
      </div>
    </div>
  )
}

export function ModalPerfil(): ReactElement {
  const { set } = useLoja()
  const fechar = (): void => set({ modal: null })
  return (
    <ModalBox titulo="Meus dados" largura="estreita" aoFechar={fechar}>
      <FormUsuario textoBotao="Salvar" aoSalvar={fechar} />
    </ModalBox>
  )
}
