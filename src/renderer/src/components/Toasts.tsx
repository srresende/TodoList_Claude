import type { ReactElement } from 'react'
import { useLoja } from '../store'

export function Toasts(): ReactElement {
  const { toasts, fecharToast } = useLoja()
  return (
    <div className="fixed bottom-5 left-1/2 z-[70] flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-center gap-3.5 rounded-lg bg-[#263038] px-3.5 py-2 text-white shadow-[0_6px_18px_rgba(0,0,0,.25)]">
          <span>{t.msg}</span>
          {t.desfazer && (
            <button
              type="button"
              className="border-0 bg-transparent p-0 font-semibold text-[#ffd166]"
              onClick={() => {
                fecharToast(t.id)
                t.desfazer!()
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
