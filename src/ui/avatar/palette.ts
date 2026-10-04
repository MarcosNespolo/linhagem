/**
 * Cores dos avatares. A ordem de pele, cabelo e olhos segue os pesos de
 * src/content/appearance.ts: o índice guardado no save é a posição aqui.
 */

/** Tons de pele, do mais claro ao mais escuro. */
export const SKIN = [
  '#FBE3D2',
  '#F4D0B5',
  '#E9B892',
  '#D9A06F',
  '#BF8350',
  '#A86F45',
  '#8A5634',
  '#68402A',
] as const

/** Preto, castanho-escuro, castanho, castanho-claro, acobreado, ruivo, loiro, loiro-claro. */
export const HAIR = [
  '#16110F',
  '#2F2119',
  '#5E3E26',
  '#8C623E',
  '#8E3F22',
  '#C2562F',
  '#D6A64B',
  '#EAD49A',
] as const

/** Castanho-escuro, castanho, mel, verde, azul, cinza. */
export const EYES = ['#2E1D12', '#5A3A20', '#86683A', '#3F7148', '#3C6E9F', '#6F7E8A'] as const

/** Cabelo branco de quem já passou dos 80. O grisalho é uma mistura até ele. */
export const SILVER = '#E4E1DA'

/** Fundos claros sorteados por pessoa. */
export const BACKGROUNDS = [
  '#F6DFD6',
  '#DCEBDD',
  '#DCE5F2',
  '#F5EBCB',
  '#E8DDF0',
  '#D5ECEF',
  '#F3E0CC',
  '#E2EBD2',
] as const

/** Cores de roupa sorteadas por pessoa. */
export const SHIRTS = [
  '#D9694F',
  '#3E5C76',
  '#5E9C7A',
  '#E3B04B',
  '#7A5C8F',
  '#3F8A8C',
  '#C95D79',
  '#56739E',
] as const

export const GLASSES = ['#2F2F33', '#7A4B2A', '#A9884F'] as const
export const MOUTH = '#7A3328'
export const BLUSH = '#EE7B78'

/** Mistura duas cores em hexadecimal. `amount` 0 devolve `from`, 1 devolve `to`. */
export function mixColor(from: string, to: string, amount: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * amount)
  return `#${[0, 1, 2].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`
}

/** Escurece uma cor misturando com preto. */
export function shade(color: string, amount: number): string {
  return mixColor(color, '#000000', amount)
}

function parseHex(color: string): [number, number, number] {
  const value = color.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number]
}
