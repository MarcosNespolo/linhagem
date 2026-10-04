import { BALANCE } from '../content/balance'

/**
 * O relógio conta o tempo em unidades inteiras, para que avançar de uma vez ou
 * aos poucos dê exatamente o mesmo resultado, sem erro de arredondamento. Um
 * dia tem TICKS_PER_DAY unidades; o valor faz 1 ms real virar um número
 * inteiro de unidades em qualquer ritmo com até duas casas decimais.
 */
export const TICKS_PER_DAY = 1_200_000

/** Unidades do relógio por milissegundo real, no ritmo de BALANCE.gameMonthsPerSecond. */
export const TICKS_PER_MS =
  (TICKS_PER_DAY * BALANCE.daysPerYear * BALANCE.gameMonthsPerSecond) / 12_000

if (!Number.isInteger(TICKS_PER_MS)) {
  throw new Error('BALANCE.gameMonthsPerSecond precisa ter no máximo duas casas decimais')
}

/** Milissegundos reais convertidos em unidades do relógio, arredondados para a unidade. */
export function msToTicks(ms: number): number {
  return Math.round(ms * TICKS_PER_MS)
}

/** Segundos reais que um intervalo em unidades do relógio representa. */
export function ticksToSeconds(ticks: number): number {
  return ticks / TICKS_PER_MS / 1000
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

/** Data do calendário (AAAA-MM-DD) que corresponde a um dia do jogo. */
export function calendarDate(startDate: string, day: number): string {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  return new Date(start + day * 86_400_000).toISOString().slice(0, 10)
}
