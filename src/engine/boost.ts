import { BALANCE } from '../content/balance'
import { TICKS_PER_DAY } from './time'
import type { GameState } from './types'

/** Posição do relógio em unidades desde o dia 0. */
export function clockPosition(state: GameState): number {
  return state.clock.day * TICKS_PER_DAY + state.clock.tickOfDay
}

/** Unidades do relógio que faltam na renda em dobro, ou zero sem bônus. */
export function boostTicksLeft(state: GameState): number {
  return Math.max(0, state.boosts.incomeUntil - clockPosition(state))
}

/** O bônus das missões está valendo agora. */
export function isBoosted(state: GameState): boolean {
  return boostTicksLeft(state) > 0
}

/** Por quanto a renda da família é multiplicada agora: o bônus das missões, ou 1. */
export function boostFactor(state: GameState): number {
  return isBoosted(state) ? BALANCE.missions.boost.factor : 1
}

/**
 * Dá o bônus na renda por `BALANCE.missions.boost.years` anos do jogo. Com um
 * bônus valendo, soma ao que falta. O bônus conta o tempo de jogo andando,
 * então para nas pausas. Altera o rascunho.
 */
export function addBoost(draft: GameState): void {
  const start = Math.max(clockPosition(draft), draft.boosts.incomeUntil)
  const { years } = BALANCE.missions.boost
  draft.boosts = { incomeUntil: start + years * BALANCE.daysPerYear * TICKS_PER_DAY }
}
