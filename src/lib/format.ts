/** Espaço que não quebra a linha, para "R$ 561 mil" nunca ficar dividido. */
const NBSP = '\u00a0'

/** Sufixos dos valores grandes, como o noticiário escreve: mil, mi, bi, tri. */
const SUFFIXES = [
  '',
  'mil',
  'mi',
  'bi',
  'tri',
  'quatri',
  'quinti',
  'sexti',
  'septi',
  'octi',
  'noni',
  'deci',
] as const

/** Dinheiro em reais: R$ 950, R$ 9.999, R$ 26,3 mil, R$ 1,23 mi. */
export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}R$${NBSP}${compact(Math.abs(value))}`
}

/** O valor sem o símbolo da moeda, para quem desenha o "R$" à parte: 18,4 mi. */
export function formatAmount(value: number): string {
  return `${value < 0 ? '-' : ''}${compact(Math.abs(value))}`
}

/** Renda ou despesa por mês do jogo, com sinal: +R$ 1.800/mês, -R$ 180/mês. */
export function formatRate(perMonth: number): string {
  return `${formatSignedMoney(perMonth)}/mês`
}

/** Valor com sinal e sem a unidade de tempo, para espaços curtos: +R$ 1.800, -R$ 180. */
export function formatSignedMoney(value: number): string {
  const sign = value < 0 ? '-' : '+'
  return `${sign}R$${NBSP}${compact(Math.abs(value))}`
}

/** Data AAAA-MM-DD no formato brasileiro: 03/10/2026. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

/** Mês e ano de uma data AAAA-MM-DD: "outubro de 2026", ou "out 2026" no formato curto. */
export function formatMonthYear(isoDate: string, style: 'long' | 'short' = 'long'): string {
  const [year, month] = isoDate.split('-')
  const name = MONTHS[Number(month) - 1] ?? ''
  return style === 'long' ? `${name} de ${year}` : `${name.slice(0, 3)} ${year}`
}

/** Mês abreviado de uma data AAAA-MM-DD: "out". */
export function formatShortMonth(isoDate: string): string {
  return (MONTHS[Number(isoDate.split('-')[1]) - 1] ?? '').slice(0, 3)
}

/** Idade em texto: "1 ano", "26 anos". */
export function formatAge(age: number): string {
  return age === 1 ? '1 ano' : `${age} anos`
}

/** Duração em tempo real, curta e arredondada para cima: 1 s, 45 s, 12 min, 3 h 5 min. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds))
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

/** Período em tempo do jogo: 12 dias, 10 meses, 5 anos, 2 anos e 3 meses. */
export function formatGameSpan(days: number, daysPerYear: number): string {
  const totalMonths = Math.floor((days * 12) / daysPerYear + 1e-9)
  if (totalMonths === 0) return days === 1 ? '1 dia' : `${days} dias`
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const yearText = years === 1 ? '1 ano' : `${years} anos`
  const monthText = months === 1 ? '1 mês' : `${months} meses`
  if (years === 0) return monthText
  if (months === 0) return yearText
  return `${yearText} e ${monthText}`
}

/**
 * Número compacto com vírgula decimal. Abaixo de 10 mil, o valor inteiro com
 * ponto de milhar; daí em diante, três algarismos e um sufixo, sem zeros no
 * fim. Sempre trunca, para que R$ 999,9 mil nunca apareça como R$ 1.000 mil.
 */
function compact(value: number): string {
  if (!Number.isFinite(value)) return '∞'
  if (value < 10_000) return thousands(Math.floor(value + 1e-9))
  let scaled = value
  let index = 0
  while (scaled >= 1000 && index < SUFFIXES.length - 1) {
    scaled /= 1000
    index += 1
  }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
  return `${decimal(truncate(scaled, digits), digits)}${NBSP}${SUFFIXES[index]}`
}

/** Inteiro com ponto de milhar: 1.800. */
function thousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function truncate(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.floor(value * factor + 1e-9) / factor
}

/** Número com até `digits` casas, vírgula decimal e sem zeros no fim: 26,3 e 1,2. */
function decimal(value: number, digits: number): string {
  let text = value.toFixed(digits)
  if (digits > 0) text = text.replace(/\.?0+$/, '')
  return text.replace('.', ',')
}
