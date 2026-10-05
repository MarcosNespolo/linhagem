import { trackMissions } from './missions'
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

/**
 * Registra no rascunho o que aconteceu: entra no histórico e conta para as
 * missões do dia.
 */
export function recordEvents(draft: GameState, events: readonly GameEvent[]): void {
  appendLog(draft, events)
  trackMissions(draft, events)
}

/**
 * Acrescenta ao histórico do rascunho os acontecimentos, respeitando o limite.
 * O histórico vira uma lista nova, porque o rascunho divide a anterior com o
 * estado original.
 */
export function appendLog(draft: GameState, events: readonly GameEvent[]): void {
  const logged = events.filter(isLogEvent)
  if (logged.length === 0) return
  const log = draft.log.concat(logged)
  draft.log = log.length > LOG_LIMIT ? log.slice(log.length - LOG_LIMIT) : log
}
