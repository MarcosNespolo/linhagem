import { BALANCE } from '../content/balance'

/**
 * O relógio conta o tempo em unidades inteiras, para que avançar de uma vez ou
 * aos poucos dê exatamente o mesmo resultado, sem erro de arredondamento. Um
 * dia tem TICKS_PER_DAY unidades; o valor faz 1 ms real virar um número
 * inteiro de unidades em ritmos como 1, 2, 4, 5 ou 10 segundos por mês do jogo.
 */
export const TICKS_PER_DAY = 1_200_000

/** Unidades do relógio num mês do jogo, que é um doze avos do ano. */
export const TICKS_PER_MONTH = (TICKS_PER_DAY * BALANCE.daysPerYear) / 12

/** Unidades do relógio por milissegundo real, no ritmo de BALANCE.secondsPerGameMonth. */
export const TICKS_PER_MS = TICKS_PER_MONTH / (BALANCE.secondsPerGameMonth * 1000)

if (!Number.isInteger(TICKS_PER_MONTH) || !Number.isInteger(TICKS_PER_MS)) {
  throw new Error(
    'BALANCE.secondsPerGameMonth precisa dar um número inteiro de unidades do relógio por milissegundo',
  )
}

/** Milissegundos reais convertidos em unidades do relógio, arredondados para a unidade. */
export function msToTicks(ms: number): number {
  return Math.round(ms * TICKS_PER_MS)
}

/** Meses do jogo que um intervalo em unidades do relógio representa. */
export function ticksToMonths(ticks: number): number {
  return ticks / TICKS_PER_MONTH
}

/** Milissegundos reais que `days` dias do jogo levam para passar. */
export function daysToMs(days: number): number {
  return (days * TICKS_PER_DAY) / TICKS_PER_MS
}

/** Segundos reais que `days` dias do jogo levam para passar. */
export function daysToSeconds(days: number): number {
  return daysToMs(days) / 1000
}

/** Teto do progresso offline, em milissegundos reais. */
export const OFFLINE_CAP_MS = daysToMs(BALANCE.offlineCapYears * BALANCE.daysPerYear)

/** Idade em anos completos de quem nasceu em `birthDay`, no dia `day`. */
export function ageInYears(birthDay: number, day: number): number {
  return Math.floor((day - birthDay) / BALANCE.daysPerYear)
}

/** Dia do jogo que cai em 31 de dezembro, no ano do calendário do dia `day`. */
export function lastDayOfYear(startDate: string, day: number): number {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const year = new Date(start + day * 86_400_000).getUTCFullYear()
  return Math.round((Date.UTC(year, 11, 31) - start) / 86_400_000)
}

/** Data do calendário (AAAA-MM-DD) que corresponde a um dia do jogo. */
export function calendarDate(startDate: string, day: number): string {
  if (lastDate.day === day && lastDate.startDate === startDate) return lastDate.date
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const date = new Date(start + day * 86_400_000).toISOString().slice(0, 10)
  lastDate = { startDate, day, date }
  return date
}

/** A última data calculada: a virada do dia pergunta a mesma data várias vezes. */
let lastDate = { startDate: '', day: Number.NaN, date: '' }
