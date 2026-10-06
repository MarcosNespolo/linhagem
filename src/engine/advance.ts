import { processNewDay } from './day'
import { checkDebt } from './debt'
import { draftOf } from './draft'
import { settleMonth } from './economy'
import { recordEvents } from './log'
import { createRng } from './rng'
import { elapsedToGameMs, isFirstOfMonth, msToTicks, TICKS_PER_DAY, TICKS_PER_MS } from './time'
import type { GameEvent, GameState } from './types'

export type AdvanceResult = {
  state: GameState
  events: GameEvent[]
}

/** O relógio está parado: pausado pelo jogador, esperando uma escolha ou depois da falência. */
export function isWaiting(state: GameState): boolean {
  return state.clock.paused || state.choices.length > 0 || state.bankruptDay !== null
}

/**
 * Avança a simulação em `ms` milissegundos reais de jogo.
 *
 * O relógio anda em unidades inteiras e os eventos acontecem na virada de cada
 * dia. O dinheiro fecha por mês: na virada para o dia 1º, a família recebe a
 * renda e paga as despesas do mês que passou (`settleMonth`); entre uma
 * virada de mês e outra, ele só muda com as compras, os imprevistos, o 13º e
 * as recompensas. Avançar um minuto numa chamada deixa o estado igual a
 * avançar 60 vezes um segundo.
 *
 * Quando uma virada de dia abre uma escolha, deixa o saldo negativo ou leva à
 * falência, o relógio para ali e o resto do tempo é descartado, como na pausa.
 * O dia da parada é mais um ponto de corte, então avançar de uma vez ou aos
 * poucos continua dando o mesmo resultado.
 *
 * Função pura: não altera `state` e devolve um estado novo.
 */
export function advance(state: GameState, ms: number): AdvanceResult {
  if (!Number.isFinite(ms)) throw new RangeError(`Tempo inválido: ${ms}`)
  const ticks = msToTicks(ms)
  if (isWaiting(state) || ticks <= 0) return { state, events: [] }

  const draft = draftOf(state)
  // No meio do avanço ninguém entra na família, só sai quem morre: a lista de quem
  // está vivo no começo serve até o fim, e as contas do dia não passam pelos antepassados.
  const living = Object.values(draft.members).filter((member) => member.deathDay === null)
  const rng = createRng(draft.rngState)
  const events: GameEvent[] = []
  let remaining = ticks

  while (remaining > 0) {
    const untilNextDay = TICKS_PER_DAY - draft.clock.tickOfDay
    if (remaining < untilNextDay) {
      draft.clock.tickOfDay += remaining
      remaining = 0
      break
    }
    remaining -= untilNextDay
    draft.clock.day += 1
    draft.clock.tickOfDay = 0
    // O mês que passou fecha antes dos acontecimentos do dia 1º: quem morre ou se
    // aposenta nesse dia ainda recebe o mês inteiro.
    if (isFirstOfMonth(draft.startDate, draft.clock.day)) events.push(...settleMonth(draft, living))
    processNewDay(draft, rng, events, living)
    if (checkDebt(draft, events) || draft.choices.length > 0) break
  }

  draft.rngState = rng.state
  // Parado numa escolha, conta só o tempo que passou, em milissegundos inteiros.
  draft.stats.simulatedMs += remaining > 0 ? Math.round((ticks - remaining) / TICKS_PER_MS) : ms
  recordEvents(draft, events)
  return { state: draft, events }
}

/**
 * Avança até o instante real `now` (epoch em ms), a partir de
 * `lastSimulatedAt`. Serve ao loop do jogo, que anda a cada segundo no ritmo
 * normal, e à volta ao jogo: o tempo fora passa mais devagar e tem teto
 * (`elapsedToGameMs`). Com o jogo pausado ou esperando uma escolha, o relógio
 * fica parado mesmo com o jogo fechado.
 */
export function advanceTo(state: GameState, now: number): AdvanceResult {
  const elapsed = now - state.lastSimulatedAt
  const ms = isWaiting(state) ? 0 : elapsedToGameMs(elapsed)
  const result = ms > 0 ? advance(state, ms) : { state, events: [] }
  return { state: { ...result.state, lastSimulatedAt: now }, events: result.events }
}
