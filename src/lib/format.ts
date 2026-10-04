const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'] as const

/** Dinheiro no estilo dos idle games: $950, $26,3K, $1,23M. */
export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${compact(Math.abs(value), 0)}`
}

/** Taxa por segundo com sinal: +$153/s, -$3,5/s. */
export function formatRate(perSecond: number): string {
  const sign = perSecond < 0 ? '-' : '+'
  return `${sign}$${compact(Math.abs(perSecond), 1)}/s`
}

/** Data AAAA-MM-DD no formato brasileiro: 03/10/2026. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
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
 * Número compacto com vírgula decimal. Abaixo de 100 usa até `smallDecimals`
 * casas; a partir de mil, três algarismos e um sufixo. Sempre trunca, para que
 * $999,9K nunca apareça como $1.000K.
 */
function compact(value: number, smallDecimals: number): string {
  if (!Number.isFinite(value)) return '∞'
  if (value < 1000) {
    const digits = value < 100 ? smallDecimals : 0
    return decimal(truncate(value, digits), digits, true)
  }
  let scaled = value
  let index = 0
  while (scaled >= 1000 && index < SUFFIXES.length - 1) {
    scaled /= 1000
    index += 1
  }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
  return `${decimal(truncate(scaled, digits), digits, false)}${SUFFIXES[index]}`
}

function truncate(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.floor(value * factor + 1e-9) / factor
}

function decimal(value: number, digits: number, trimZeros: boolean): string {
  let text = value.toFixed(digits)
  if (trimZeros && digits > 0) text = text.replace(/\.?0+$/, '')
  return text.replace('.', ',')
}
