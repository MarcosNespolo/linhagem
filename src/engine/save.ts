import { migrate, SaveError } from './migrations'
import type { GameState } from './types'

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

/** Lê um save em JSON, migra para a versão atual e valida. Lança SaveError se não der. */
export function deserialize(json: string): GameState {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new SaveError('corrupt', 'O save não é um JSON válido')
  }
  return migrate(raw)
}
