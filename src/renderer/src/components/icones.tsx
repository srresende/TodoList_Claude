import type { ReactElement } from 'react'
import logoOriginal from '../assets/logo-salada-mista.jpg'
import logoBrancoSrc from '../assets/logo-salada-mista-branco.png'

const caminhos = {
  editar: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  sub: (
    <>
      <polyline points="15 10 20 15 15 20" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  subir: <polyline points="18 15 12 9 6 15" />,
  descer: <polyline points="6 9 12 15 18 9" />,
  mover: (
    <>
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </>
  ),
  lixeira: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  impressora: (
    <>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  caixa: (
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  grade: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  fechar: <path d="M18 6 6 18M6 6l12 12" />,
  ok: <polyline points="20 6 9 17 4 12" />
} as const

export type NomeIcone = keyof typeof caminhos

export function Icone({ nome }: { nome: NomeIcone }): ReactElement {
  return (
    <svg
      className="h-4 w-4 flex-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {caminhos[nome]}
    </svg>
  )
}

/** Logo com fundo branco: header e rodapé do paper (RF-56, RF-60). */
export function LogoBranco({ altura }: { altura: number | string }): ReactElement {
  return <img src={logoBrancoSrc} style={{ height: altura, width: 'auto' }} alt="saladaMista" className="block" />
}

/** Logo original (fundo escuro): janela "Sobre". */
export function LogoOriginal({ altura }: { altura: number }): ReactElement {
  return <img src={logoOriginal} style={{ height: altura, width: 'auto' }} alt="saladaMista" className="mx-auto block rounded" />
}

export const corTexto = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return l < 0.55 ? '#fff' : '#000'
}
