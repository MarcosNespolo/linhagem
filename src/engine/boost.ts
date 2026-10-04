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

/** A renda está em dobro agora. */
export function isBoosted(state: GameState): boolean {
  return boostTicksLeft(state) > 0
}

/**
 * Põe a renda em dobro por `years` anos do jogo. Com um bônus valendo, soma ao
 * que falta. O bônus conta o tempo de jogo andando, então para nas pausas.
 * Altera o rascunho.
 */
export function addBoost(draft: GameState, years: number): void {
  const start = Math.max(clockPosition(draft), draft.boosts.incomeUntil)
  draft.boosts = { incomeUntil: start + years * BALANCE.daysPerYear * TICKS_PER_DAY }
}
