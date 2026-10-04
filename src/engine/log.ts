import type { GameEvent, GameState, LogEvent, MemberEvent } from './types'

/** Quantos acontecimentos o save guarda. Os mais antigos saem primeiro. */
export const LOG_LIMIT = 300

/** Acontecimentos de uma pessoa da família. */
export function isMemberEvent(event: GameEvent): event is MemberEvent {
  return 'memberId' in event
}

/** Acontecimentos que entram no histórico: os das pessoas e as compras da família. */
export function isLogEvent(event: GameEvent): event is LogEvent {
  return event.type !== 'thirteenth'
}

/** Acrescenta ao histórico do rascunho os acontecimentos, respeitando o limite. */
export function appendLog(draft: GameState, events: readonly GameEvent[]): void {
  const logged = events.filter(isLogEvent)
  if (logged.length === 0) return
  draft.log.push(...logged)
  const excess = draft.log.length - LOG_LIMIT
  if (excess > 0) draft.log.splice(0, excess)
}
