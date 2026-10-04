import type { GameEvent, GameState } from './types'

/** Quantos acontecimentos o save guarda. Os mais antigos saem primeiro. */
export const LOG_LIMIT = 300

/** Acrescenta acontecimentos ao histórico do rascunho, respeitando o limite. */
export function appendLog(draft: GameState, events: readonly GameEvent[]): void {
  if (events.length === 0) return
  draft.log.push(...events)
  const excess = draft.log.length - LOG_LIMIT
  if (excess > 0) draft.log.splice(0, excess)
}
