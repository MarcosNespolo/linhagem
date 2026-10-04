import { deserialize, SaveError, serialize, type GameState } from '@/engine'
import { parseSyncMeta, type SyncMeta } from './sync'

const SAVE_KEY = 'linhagem:save'
/** Saves que não puderam ser lidos ficam guardados com este prefixo, para recuperação manual. */
const UNREADABLE_PREFIX = 'linhagem:save-ilegivel:'
/** Família deste aparelho trocada pela da nuvem num conflito, guardada para recuperação manual. */
const REPLACED_KEY = 'linhagem:save-substituido'
const SYNC_KEY = 'linhagem:nuvem'
const DEVICE_KEY = 'linhagem:aparelho'

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

/** Guarda a família deste aparelho antes de trocá-la pela da nuvem. Só a última fica guardada. */
export function backupReplacedSave(state: GameState): boolean {
  return writeItem(REPLACED_KEY, serialize(state))
}

export function loadSyncMeta(): SyncMeta | null {
  return parseSyncMeta(readItem(SYNC_KEY))
}

export function writeSyncMeta(meta: SyncMeta): boolean {
  return writeItem(SYNC_KEY, JSON.stringify(meta))
}

/** Identificador deste aparelho, gravado junto com o save na nuvem. */
export function deviceId(): string {
  const saved = readItem(DEVICE_KEY)
  if (saved) return saved
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  writeItem(DEVICE_KEY, id)
  return id
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
