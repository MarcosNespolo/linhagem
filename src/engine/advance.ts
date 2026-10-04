import { processNewDay } from './day'
import { familyRates, type Rates } from './economy'
import { appendLog } from './log'
import { createRng } from './rng'
import { msToTicks, OFFLINE_CAP_MS, TICKS_PER_DAY, ticksToSeconds } from './time'
import type { GameEvent, GameState } from './types'

export type AdvanceResult = {
  state: GameState
  events: GameEvent[]
}

/**
 * Avança a simulação em `ms` milissegundos reais de jogo.
 *
 * O relógio anda em unidades inteiras e os eventos acontecem na virada de cada
 * dia. O dinheiro acumula de forma contínua (taxa por segundo real vezes
 * tempo); como as taxas só mudam nesses eventos ou em ações do jogador, a
 * renda entre duas viradas é calculada de uma vez. Avançar um minuto numa
 * chamada deixa o relógio igual a avançar 60 vezes um segundo, e o dinheiro
 * igual a menos de arredondamento.
 *
 * Função pura: não altera `state` e devolve um estado novo.
 */
export function advance(state: GameState, ms: number): AdvanceResult {
  if (!Number.isFinite(ms)) throw new RangeError(`Tempo inválido: ${ms}`)
  const ticks = msToTicks(ms)
  if (state.clock.paused || ticks <= 0) return { state, events: [] }

  const draft = structuredClone(state)
  const rng = createRng(draft.rngState)
  const events: GameEvent[] = []
  let rates = familyRates(draft)
  let remaining = ticks

  while (remaining > 0) {
    const untilNextDay = TICKS_PER_DAY - draft.clock.tickOfDay
    if (remaining < untilNextDay) {
      accrue(draft, rates, remaining)
      draft.clock.tickOfDay += remaining
      break
    }
    accrue(draft, rates, untilNextDay)
    remaining -= untilNextDay
    draft.clock.day += 1
    draft.clock.tickOfDay = 0
    if (processNewDay(draft, rng, events)) rates = familyRates(draft)
  }

  draft.rngState = rng.state
  draft.stats.simulatedMs += ms
  appendLog(draft, events)
  return { state: draft, events }
}

/**
 * Avança até o instante real `now` (epoch em ms), a partir de
 * `lastSimulatedAt`. Serve ao loop do jogo e ao progresso offline: o tempo
 * simulado é limitado a OFFLINE_CAP_MS e, com o jogo pausado, o relógio fica
 * parado mesmo com o jogo fechado.
 */
export function advanceTo(state: GameState, now: number): AdvanceResult {
  const elapsed = now - state.lastSimulatedAt
  const ms = state.clock.paused ? 0 : Math.min(Math.max(elapsed, 0), OFFLINE_CAP_MS)
  const result = ms > 0 ? advance(state, ms) : { state, events: [] }
  return { state: { ...result.state, lastSimulatedAt: now }, events: result.events }
}

/** Soma a renda e desconta a despesa de um intervalo com taxas constantes. */
function accrue(draft: GameState, rates: Rates, ticks: number): void {
  const seconds = ticksToSeconds(ticks)
  const earned = rates.income * seconds
  const owed = rates.expense * seconds
  const balance = draft.money + earned - owed
  // O saldo nunca fica negativo: a despesa que não cabe no caixa não é cobrada.
  const unpaid = balance < 0 ? -balance : 0
  draft.money = balance + unpaid
  draft.stats.totalEarned += earned
  draft.stats.totalSpent += owed - unpaid
}
