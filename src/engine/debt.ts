import { BALANCE } from '../content/balance'
import type { GameEvent, GameState } from './types'

/**
 * Na virada do dia, confere o saldo. Ao entrar no vermelho, começa o prazo e o
 * relógio para, para o jogador ver o aviso; ao voltar ao azul, o prazo some.
 * Com o prazo vencido e o saldo ainda negativo, a família vai à falência e a
 * partida acaba. Altera o rascunho e devolve true quando o relógio parou.
 */
export function checkDebt(draft: GameState, events: GameEvent[]): boolean {
  const day = draft.clock.day
  if (draft.money >= 0) {
    if (draft.debtSince !== null) {
      draft.debtSince = null
      events.push({ type: 'outOfDebt', day })
    }
    return false
  }
  if (draft.debtSince === null) {
    draft.debtSince = day
    draft.clock.paused = true
    events.push({ type: 'inDebt', day })
    return true
  }
  if (day - draft.debtSince >= BALANCE.debt.graceDays) {
    draft.bankruptDay = day
    events.push({ type: 'bankrupt', day })
    return true
  }
  return false
}

/** Dias do jogo que faltam para a falência, ou null com o saldo no azul. */
export function daysToBankruptcy(state: GameState): number | null {
  if (state.debtSince === null) return null
  return Math.max(0, state.debtSince + BALANCE.debt.graceDays - state.clock.day)
}
