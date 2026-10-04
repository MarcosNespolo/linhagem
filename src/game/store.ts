import { create } from 'zustand'
import {
  advanceTo,
  applyAction,
  newGame,
  OFFLINE_CAP_MS,
  type Action,
  type ActionResult,
  type GameEvent,
  type GameState,
} from '@/engine'
import { loadSave, writeSave } from './persistence'

/** O que aconteceu enquanto o jogo esteve fechado ou em segundo plano. */
export type AwaySummary = {
  /** Dias do jogo que passaram. */
  days: number
  earned: number
  events: GameEvent[]
  /** O tempo fora passou do limite do progresso offline. */
  capped: boolean
}

/** Abaixo disso (em tempo real simulado de uma vez), a volta ao jogo não mostra resumo. */
const AWAY_SUMMARY_MIN_MS = 10_000
/** Quantos acontecimentos recentes a interface mostra. */
const RECENT_EVENTS_LIMIT = 20

type GameStore = {
  game: GameState | null
  away: AwaySummary | null
  /** Acontecimentos recentes, do mais novo para o mais antigo. */
  recent: GameEvent[]
  notice: string | null
  /** O save é de uma versão mais nova e o jogo não pode continuar neste aparelho. */
  blocked: boolean
  hydrate: () => void
  tick: () => void
  dispatch: (action: Action) => ActionResult
  persist: () => void
  startNewFamily: (familyName?: string) => void
  dismissAway: () => void
  dismissNotice: () => void
}

/**
 * Estado da partida no navegador. É o único ponto que chama a engine, grava o
 * save e, a partir da Fase 3, sincroniza com a nuvem.
 */
export const useGameStore = create<GameStore>()((set, get) => ({
  game: null,
  away: null,
  recent: [],
  notice: null,
  blocked: false,

  hydrate: () => {
    if (get().game || get().blocked) return
    const loaded = loadSave()
    if (loaded.blocked) {
      set({ blocked: true, notice: loaded.notice })
      return
    }
    const now = Date.now()
    const start = loaded.state ?? createGame(now)
    const { state, events } = advanceTo(start, now)
    set({ game: state, notice: loaded.notice, ...catchUp(get(), start, state, events, now) })
    writeSave(state)
  },

  tick: () => {
    const game = get().game
    if (!game) return
    const now = Date.now()
    const { state, events } = advanceTo(game, now)
    set({ game: state, ...catchUp(get(), game, state, events, now) })
  },

  dispatch: (action) => {
    const game = get().game
    if (!game) throw new Error('O jogo ainda não carregou')
    const now = Date.now()
    const current = advanceTo(game, now)
    const result = applyAction(current.state, action)
    const next = result.ok ? result.state : current.state
    const events = result.ok ? [...current.events, ...result.events] : current.events
    set({ game: next, ...catchUp(get(), game, current.state, events, now) })
    if (result.ok) writeSave(next)
    return result
  },

  persist: () => {
    const game = get().game
    if (game) writeSave(game)
  },

  startNewFamily: (familyName) => {
    const game = createGame(Date.now(), familyName)
    set({ game, away: null, recent: [], notice: null })
    writeSave(game)
  },

  dismissAway: () => set({ away: null }),
  dismissNotice: () => set({ notice: null }),
}))

/** Atualiza a lista de acontecimentos e o resumo de ausência depois de avançar o relógio. */
function catchUp(
  store: GameStore,
  before: GameState,
  after: GameState,
  events: GameEvent[],
  now: number,
): Partial<GameStore> {
  const update: Partial<GameStore> = {}
  if (events.length > 0) {
    update.recent = [...events].reverse().concat(store.recent).slice(0, RECENT_EVENTS_LIMIT)
  }
  const simulatedMs = after.stats.simulatedMs - before.stats.simulatedMs
  if (simulatedMs >= AWAY_SUMMARY_MIN_MS) {
    update.away = {
      days: after.clock.day - before.clock.day,
      earned: after.stats.totalEarned - before.stats.totalEarned,
      events,
      capped: now - before.lastSimulatedAt > OFFLINE_CAP_MS,
    }
  }
  return update
}

function createGame(now: number, familyName?: string): GameState {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]
  return newGame({ seed, now, startDate: localDate(now), familyName })
}

/** Data local do aparelho no formato AAAA-MM-DD. */
function localDate(now: number): string {
  const date = new Date(now)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
