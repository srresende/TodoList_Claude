import type { FormEvent, ReactElement } from 'react'
import { ativ, filhos, pendentesNaSecao, secao, secoesAtivas } from '@domain/consultas'
import { addDias } from '@domain/datas'
import { useLoja } from '../store'
import { ModalBox } from './Modais'

export function Dialogos(): ReactElement | null {
  const { estado, dialogo, cmd, set } = useLoja()
  if (!dialogo || !estado) return null
  const e = estado
  const fechar = (): void => set({ dialogo: null })
  const enviar =
    (fn: (f: FormData) => Promise<boolean>) =>
    async (ev: FormEvent<HTMLFormElement>): Promise<void> => {
      ev.preventDefault()
      if (await fn(new FormData(ev.currentTarget))) fechar()
    }
  const caixa = (titulo: string, corpo: ReactElement, ok: string, fn: (f: FormData) => Promise<boolean>): ReactElement => (
    <ModalBox titulo={titulo} largura="estreita" camada="dialogo" aoFechar={fechar}>
      <form onSubmit={(ev) => void enviar(fn)(ev)}>
        {corpo}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario">
            {ok}
          </button>
        </div>
      </form>
    </ModalBox>
  )

  if (dialogo.tipo === 'planejar') {
    const a = ativ(e, dialogo.id)
    if (!a) return null
    const amanha = addDias(e.hoje, 1)
    return caixa(
      'Planejar para outra data',
      <>
        <p className="mt-0">
          “{a.texto}”{filhos(e, a.id).length ? ' e seus sub-itens' : ''} sairão do paper de hoje e entrarão no paper da data
          escolhida.
        </p>
        <input
          className="campo"
          type="date"
          name="data"
          min={amanha}
          defaultValue={a.dataPlanejada && a.dataPlanejada > e.hoje ? a.dataPlanejada : amanha}
          required
          data-autofoco
        />
      </>,
      'Planejar',
      async (f) => cmd({ tipo: 'planejar', id: a.id, data: String(f.get('data')) })
    )
  }

  if (dialogo.tipo === 'mover') {
    const a = ativ(e, dialogo.id)
    if (!a) return null
    return caixa(
      'Mover para outra seção',
      <>
        <p className="mt-0">
          “{a.texto}”{a.parentId ? ' (vira item de 1º nível)' : filhos(e, a.id).length ? ' e seus sub-itens' : ''}
        </p>
        <select className="campo" name="secao" data-autofoco>
          {secoesAtivas(e)
            .filter((s) => s.id !== a.secaoId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
        </select>
      </>,
      'Mover',
      async (f) => cmd({ tipo: 'moverSecao', id: a.id, secaoId: String(f.get('secao')) })
    )
  }

  const s = secao(e, dialogo.id)
  if (!s) return null
  return caixa(
    `Arquivar “${s.nome}”`,
    <>
      <p className="mt-0">
        Esta seção tem <b>{pendentesNaSecao(e, s.id)}</b> atividade(s) pendente(s). Para arquivá-la, mova as atividades
        para outra seção:
      </p>
      <select className="campo" name="destino" data-autofoco>
        {secoesAtivas(e)
          .filter((x) => x.id !== s.id)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
      </select>
    </>,
    'Mover e arquivar',
    async (f) => cmd({ tipo: 'arquivarSecao', id: s.id, destinoId: String(f.get('destino')) })
  )
}
