// Datas de calendário como 'AAAA-MM-DD', sempre no fuso local (RN-02). Exibição em dd/mm/aaaa (RNF-05).

export const DIAS_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado'
]

export function parseData(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isoData(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export const hojeLocal = (agora: Date = new Date()): string => isoData(agora)

export function addDias(s: string, n: number): string {
  const d = parseData(s)
  d.setDate(d.getDate() + n)
  return isoData(d)
}

export function fmt(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export function fmtCurto(s: string): string {
  const [, m, d] = s.split('-')
  return `${d}/${m}`
}

export const diaSemana = (s: string): string => DIAS_SEMANA[parseData(s).getDay()]

export const difDias = (a: string, b: string): number =>
  Math.round((parseData(b).getTime() - parseData(a).getTime()) / 864e5)

export const capitalizar = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
