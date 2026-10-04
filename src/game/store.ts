import { create } from 'zustand'
import {
  advanceTo,
  applyAction,
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

export type Toast = { id: number; event: GameEvent }

/** A partir disso (em tempo real simulado de uma vez), a volta ao jogo mostra um resumo. */
const AWAY_SUMMARY_MIN_MS = 10_000
/** Quantos avisos ficam na tela ao mesmo tempo. */
const TOAST_LIMIT = 3

/** Rascunho da tela de criar família: a semente do casal mostrado e o instante de início. */
export type SetupDraft = { seed: number; now: number }

type GameStore = {
  game: GameState | null
  away: AwaySummary | null
  toasts: Toast[]
  notice: string | null
  /** O save é de uma versão mais nova e o jogo não pode continuar neste aparelho. */
  blocked: boolean
  /** Tela de criar família aberta: no primeiro acesso ou quando o jogador pede outra. */
  setup: SetupDraft | null
  hydrate: () => void
  tick: () => void
  dispatch: (action: Action) => ActionResult
  persist: () => void
  startWithGame: (game: GameState) => void
  openSetup: () => void
  rerollSetup: () => void
  closeSetup: () => void
  dismissAway: () => void
  dismissNotice: () => void
  dismissToast: (id: number) => void
}

let nextToastId = 1

function newDraft(): SetupDraft {
  return { seed: randomSeed(), now: Date.now() }
}

/**
 * Estado da partida no navegador. É o único ponto que chama a engine, grava o
 * save e, a partir da Fase 3, sincroniza com a nuvem.
 */
export const useGameStore = create<GameStore>()((set, get) => ({
  game: null,
  away: null,
  toasts: [],
  notice: null,
  blocked: false,
  setup: null,

  hydrate: () => {
    if (get().game || get().blocked || get().setup) return
    const loaded = loadSave()
    if (loaded.blocked) {
      set({ blocked: true, notice: loaded.notice })
      return
    }
    if (!loaded.state) {
      set({ setup: newDraft(), notice: loaded.notice })
      return
    }
    const now = Date.now()
    const start = loaded.state
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

  startWithGame: (game) => {
    const started = { ...game, lastSimulatedAt: Date.now() }
    set({ game: started, setup: null, away: null, toasts: [], notice: null })
    writeSave(started)
  },

  openSetup: () => set({ setup: newDraft() }),
  rerollSetup: () => set({ setup: newDraft() }),
  closeSetup: () => {
    if (get().game) set({ setup: null })
  },
  dismissAway: () => set({ away: null }),
  dismissNotice: () => set({ notice: null }),
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}))

/**
 * Depois de avançar o relógio: um intervalo longo vira resumo da ausência; um
 * curto vira avisos na tela.
 */
function catchUp(
  store: GameStore,
  before: GameState,
  after: GameState,
  events: GameEvent[],
  now: number,
): Partial<GameStore> {
  const simulatedMs = after.stats.simulatedMs - before.stats.simulatedMs
  if (simulatedMs >= AWAY_SUMMARY_MIN_MS) {
    return {
      away: {
        days: after.clock.day - before.clock.day,
        earned: after.stats.totalEarned - before.stats.totalEarned,
        events,
        capped: now - before.lastSimulatedAt > OFFLINE_CAP_MS,
      },
    }
  }
  // Aposentadoria e primeiro emprego ficam só no histórico, para os avisos não cobrirem a tela.
  const worthShowing = events.filter((event) => !QUIET_EVENTS.has(event.type))
  if (worthShowing.length === 0) return {}
  const added = worthShowing.map((event) => ({ id: nextToastId++, event }))
  return { toasts: [...store.toasts, ...added].slice(-TOAST_LIMIT) }
}

const QUIET_EVENTS = new Set<GameEvent['type']>(['firstJob', 'retired'])

/** Semente aleatória para uma partida nova. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]
}

/** Data local do aparelho no formato AAAA-MM-DD. */
export function localDate(now: number): string {
  const date = new Date(now)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
