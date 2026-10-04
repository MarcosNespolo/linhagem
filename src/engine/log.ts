import type { GameEvent, GameState, MemberEvent } from './types'

/** Quantos acontecimentos o save guarda. Os mais antigos saem primeiro. */
export const LOG_LIMIT = 300

/** Acontecimentos que entram no histórico: os de uma pessoa da família. */
export function isMemberEvent(event: GameEvent): event is MemberEvent {
  return event.type !== 'thirteenth'
}

/** Acrescenta ao histórico do rascunho os acontecimentos das pessoas, respeitando o limite. */
export function appendLog(draft: GameState, events: readonly GameEvent[]): void {
  const logged = events.filter(isMemberEvent)
  if (logged.length === 0) return
  draft.log.push(...logged)
  const excess = draft.log.length - LOG_LIMIT
  if (excess > 0) draft.log.splice(0, excess)
}
