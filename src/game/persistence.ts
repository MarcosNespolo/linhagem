import { deserialize, SaveError, serialize, type GameState } from '@/engine'

const SAVE_KEY = 'linhagem:save'
/** Saves que não puderam ser lidos ficam guardados com este prefixo, para recuperação manual. */
const UNREADABLE_PREFIX = 'linhagem:save-ilegivel:'

export type LoadResult = {
  state: GameState | null
  /** Aviso para o jogador sobre o que aconteceu com o save. */
  notice: string | null
  /** O save é de uma versão mais nova do jogo: não carregar e não sobrescrever. */
  blocked: boolean
}

export function loadSave(): LoadResult {
  const raw = readItem(SAVE_KEY)
  if (raw === null) return { state: null, notice: null, blocked: false }
  try {
    return { state: deserialize(raw), notice: null, blocked: false }
  } catch (error) {
    if (error instanceof SaveError && error.code === 'futureVersion') {
      return {
        state: null,
        notice:
          'Este aparelho tem um save de uma versão mais nova do jogo. Recarregue para atualizar.',
        blocked: true,
      }
    }
    writeItem(`${UNREADABLE_PREFIX}${Date.now()}`, raw)
    return {
      state: null,
      notice:
        'O save deste aparelho não pôde ser lido. Uma cópia foi guardada e uma família nova começou.',
      blocked: false,
    }
  }
}

export function writeSave(state: GameState): boolean {
  return writeItem(SAVE_KEY, serialize(state))
}

function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
