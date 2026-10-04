import { create } from 'zustand'
import {
  advanceTo,
  applyAction,
  migrate,
  OFFLINE_CAP_MS,
  SaveError,
  type Action,
  type ActionResult,
  type GameEvent,
  type GameState,
} from '@/engine'
import {
  getCloud,
  type CloudApi,
  type CloudProblem,
  type CloudResult,
  type CloudUser,
} from './cloud'
import { backupReplacedSave, loadSave, loadSyncMeta, writeSave, writeSyncMeta } from './persistence'
import { freshMeta, nextStep } from './sync'

/** O que aconteceu enquanto o jogo esteve fechado ou em segundo plano. */
export type AwaySummary = {
  /** Dias do jogo que passaram. */
  days: number
  earned: number
  events: GameEvent[]
  /** O tempo fora passou do limite do progresso offline. */
  capped: boolean
  /** O relógio parou numa escolha que espera o jogador. */
  waiting: boolean
}

export type Toast = { id: number; event: GameEvent }

/** A partir disso (em tempo real simulado de uma vez), a volta ao jogo mostra um resumo. */
const AWAY_SUMMARY_MIN_MS = 10_000
/** Quantos avisos ficam na tela ao mesmo tempo. */
const TOAST_LIMIT = 3

/** Rascunho da tela de criar família: a semente do casal mostrado e o instante de início. */
export type SetupDraft = { seed: number; now: number }

/** Família da nuvem diferente da deste aparelho, esperando o jogador escolher qual continuar. */
export type CloudConflict = {
  /** Família salva na nuvem, já na versão atual do save e avançada até o momento do conflito. */
  cloud: GameState
  revision: number
  /** Instante da gravação na nuvem (ISO 8601). */
  savedAt: string
}

/**
 * Problema na última tentativa de sincronizar: sem conexão, falha do servidor, save da nuvem de
 * uma versão mais nova do jogo, ou save da nuvem que não pôde ser lido.
 */
export type SyncProblem = 'offline' | 'failed' | 'futureVersion' | 'unreadable'

export type CloudState = {
  /** disabled: este build não tem a nuvem configurada. loading: ainda lendo a sessão. */
  mode: 'disabled' | 'loading' | 'signedOut' | 'signedIn'
  email: string | null
  /** Quando este aparelho e a nuvem ficaram iguais pela última vez (epoch em ms). */
  syncedAt: number | null
  problem: SyncProblem | null
  conflict: CloudConflict | null
  /** O jogador fechou o painel do conflito para decidir depois. */
  conflictHidden: boolean
}

type GameStore = {
  game: GameState | null
  away: AwaySummary | null
  toasts: Toast[]
  notice: string | null
  /** O save é de uma versão mais nova e o jogo não pode continuar neste aparelho. */
  blocked: boolean
  /** Tela de criar família aberta: no primeiro acesso ou quando o jogador pede outra. */
  setup: SetupDraft | null
  cloud: CloudState
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
  /** Liga a nuvem depois de carregar o save. Chamado uma vez, no navegador. */
  startCloud: () => void
  sendLoginCode: (email: string) => Promise<CloudResult<null>>
  verifyLoginCode: (email: string, code: string) => Promise<CloudResult<CloudUser>>
  signOut: () => Promise<CloudResult<null>>
  /** Sincroniza com a nuvem, se houver conta conectada. */
  syncCloud: () => void
  /** Escolhe qual família continuar: a da nuvem ou a deste aparelho, que vai para a nuvem. */
  resolveConflict: (keep: 'cloud' | 'local') => void
  setConflictHidden: (hidden: boolean) => void
}

let nextToastId = 1

function newDraft(): SetupDraft {
  return { seed: randomSeed(), now: Date.now() }
}

/**
 * Estado da partida no navegador. É o único ponto que chama a engine, grava o
 * save e sincroniza com a nuvem.
 */
export const useGameStore = create<GameStore>()((set, get) => ({
  game: null,
  away: null,
  toasts: [],
  notice: null,
  blocked: false,
  setup: null,
  cloud: {
    mode: 'loading',
    email: null,
    syncedAt: null,
    problem: null,
    conflict: null,
    conflictHidden: false,
  },

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
    if (result.ok) {
      writeSave(next)
      markChanged(false)
    }
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
    // Com a conta conectada, a família nova substitui a da nuvem, como o jogador confirmou.
    markChanged(cloudUser !== null)
    void runSync()
  },

  openSetup: () => set({ setup: newDraft() }),
  rerollSetup: () => set({ setup: newDraft() }),
  closeSetup: () => {
    if (get().game) set({ setup: null })
  },
  dismissAway: () => set({ away: null }),
  dismissNotice: () => set({ notice: null }),
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),

  startCloud: () => {
    if (cloudStarted) return
    cloudStarted = true
    const api = getCloud()
    if (!api) {
      setCloud({ mode: 'disabled' })
      return
    }
    // O Supabase pede que nada dele seja chamado dentro do próprio aviso de sessão.
    api.onUserChange((user) => window.setTimeout(() => onUser(user), 0))
  },

  sendLoginCode: async (email) => {
    const api = getCloud()
    if (!api) return { ok: false, problem: 'unavailable', message: 'Nuvem desligada' }
    return api.sendCode(email.trim())
  },

  verifyLoginCode: async (email, code) => {
    const api = getCloud()
    if (!api) return { ok: false, problem: 'unavailable', message: 'Nuvem desligada' }
    const result = await api.verifyCode(email.trim(), code.replace(/\D/g, ''))
    if (result.ok) onUser(result.value)
    return result
  },

  signOut: async () => {
    const api = getCloud()
    if (!api) return { ok: false, problem: 'unavailable', message: 'Nuvem desligada' }
    const result = await api.signOut()
    if (result.ok) onUser(null)
    return result
  },

  syncCloud: () => void runSync(),

  resolveConflict: (keep) => {
    const user = cloudUser
    if (!user) return
    const { cloud, game } = get()
    if (keep === 'cloud') {
      if (!cloud.conflict) return
      if (game) backupReplacedSave(game)
      setCloud({ conflict: null, conflictHidden: false })
      adopt(cloud.conflict.cloud, cloud.conflict.revision, user)
      return
    }
    const meta = loadSyncMeta() ?? freshMeta(user.id)
    writeSyncMeta({ ...meta, userId: user.id, dirty: true, replace: true })
    setCloud({ conflict: null, conflictHidden: false, problem: null })
    void runSync()
  },

  setConflictHidden: (hidden) => setCloud({ conflictHidden: hidden }),
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
    const waiting = after.choices.length > 0
    return {
      away: {
        days: after.clock.day - before.clock.day,
        earned: after.stats.totalEarned - before.stats.totalEarned,
        events,
        capped: !waiting && now - before.lastSimulatedAt > OFFLINE_CAP_MS,
        waiting,
      },
    }
  }
  // Aposentadoria, emprego e matrículas (que o jogador acabou de escolher) ficam só no
  // histórico, para os avisos não cobrirem a tela.
  const worthShowing = events.filter((event) => !QUIET_EVENTS.has(event.type))
  if (worthShowing.length === 0) return {}
  const added = worthShowing.map((event) => ({ id: nextToastId++, event }))
  return { toasts: [...store.toasts, ...added].slice(-TOAST_LIMIT) }
}

const QUIET_EVENTS = new Set<GameEvent['type']>([
  'firstJob',
  'retired',
  'schoolStarted',
  'schoolChanged',
])

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

// Nuvem. As regras de quando enviar, adotar ou perguntar ficam em sync.ts; aqui elas são executadas.

/** Conta conectada neste navegador. */
let cloudUser: CloudUser | null = null
let cloudStarted = false
let syncRunning = false
let syncAgain = false
/** Conta as mudanças do jogador, para saber se alguma aconteceu durante uma ida à nuvem. */
let changes = 0

function setCloud(patch: Partial<CloudState>): void {
  useGameStore.setState((store) => ({ cloud: { ...store.cloud, ...patch } }))
}

function onUser(user: CloudUser | null): void {
  const previous = cloudUser
  cloudUser = user
  if (!user) {
    setCloud({
      mode: 'signedOut',
      email: null,
      syncedAt: null,
      problem: null,
      conflict: null,
      conflictHidden: false,
    })
    return
  }
  if (previous?.id === user.id && useGameStore.getState().cloud.mode === 'signedIn') return
  if (loadSyncMeta()?.userId !== user.id) writeSyncMeta(freshMeta(user.id))
  setCloud({ mode: 'signedIn', email: user.email, syncedAt: null, problem: null })
  void runSync()
}

/** Registra uma mudança do jogador que a nuvem ainda não tem. */
function markChanged(replace: boolean): void {
  changes += 1
  const meta = loadSyncMeta()
  if (meta) writeSyncMeta({ ...meta, dirty: true, replace: meta.replace || replace })
}

/** Sincroniza uma vez de cada vez. Um pedido no meio de outro roda logo depois. */
async function runSync(): Promise<void> {
  const api = getCloud()
  if (!api || !cloudUser) return
  if (syncRunning) {
    syncAgain = true
    return
  }
  syncRunning = true
  try {
    do {
      syncAgain = false
      if (cloudUser) await syncOnce(api, cloudUser)
    } while (syncAgain)
  } finally {
    syncRunning = false
  }
}

/** Uma rodada de sincronização. Decide de novo quando outro aparelho grava no meio do caminho. */
async function syncOnce(api: CloudApi, user: CloudUser): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!canSync(user)) return
    const remote = await api.fetchRevision(user.id)
    if (!canSync(user)) return
    if (!remote.ok) return reportProblem(remote.problem)

    const { game } = useGameStore.getState()
    const meta = loadSyncMeta() ?? freshMeta(user.id)
    const step = nextStep(game, meta, remote.value)
    if (step === 'none') return markSynced()

    if (step === 'adopt' || step === 'ask') {
      const changesBefore = changes
      const saved = await api.fetchSave(user.id)
      if (!canSync(user)) return
      if (!saved.ok) return reportProblem(saved.problem)
      // O save sumiu ou o jogador mexeu na família enquanto isso: decide de novo.
      if (!saved.value || changes !== changesBefore) continue
      const cloudGame = readCloudGame(saved.value.state)
      if (typeof cloudGame === 'string') return setCloud({ problem: cloudGame })
      if (step === 'adopt') return adopt(cloudGame, saved.value.revision, user)
      // A versão da nuvem aparece como estaria agora, para comparar com a deste aparelho.
      const { state } = advanceTo(cloudGame, Date.now())
      const { revision, savedAt } = saved.value
      return setCloud({ conflict: { cloud: state, revision, savedAt }, conflictHidden: false })
    }

    if (!game) return
    const changesBefore = changes
    const result =
      step === 'create'
        ? await api.createSave(user.id, game)
        : step === 'update'
          ? await api.updateSave(user.id, game, meta.revision ?? 0)
          : await api.replaceSave(user.id, game)
    if (!result.ok) return reportProblem(result.problem)
    // Outro aparelho gravou antes: decide de novo com o que está na nuvem agora.
    if (result.value === null) continue
    const changed = changes !== changesBefore
    const current = loadSyncMeta() ?? meta
    writeSyncMeta({
      userId: user.id,
      revision: result.value,
      familySeed: game.seed,
      dirty: changed,
      replace: changed && current.replace,
    })
    if (cloudUser?.id === user.id) markSynced()
    return
  }
}

function canSync(user: CloudUser): boolean {
  const store = useGameStore.getState()
  return (
    cloudUser?.id === user.id &&
    !store.blocked &&
    store.cloud.conflict === null &&
    store.cloud.problem !== 'futureVersion' &&
    // Escolhendo uma família nova: espera, para não trocar a família debaixo do jogador.
    !(store.setup && store.game)
  )
}

/** Continua a família da nuvem neste aparelho, avançando o tempo desde a gravação. */
function adopt(start: GameState, revision: number, user: CloudUser): void {
  const hadGame = useGameStore.getState().game !== null
  const { state } = advanceTo(start, Date.now())
  useGameStore.setState({
    game: state,
    setup: null,
    away: null,
    toasts: [],
    notice: hadGame
      ? 'A família foi atualizada com o que foi salvo em outro aparelho.'
      : `Família ${state.familyName} carregada da nuvem.`,
  })
  writeSave(state)
  writeSyncMeta({ userId: user.id, revision, familySeed: start.seed, dirty: false, replace: false })
  markSynced()
}

function readCloudGame(raw: unknown): GameState | 'futureVersion' | 'unreadable' {
  try {
    return migrate(raw)
  } catch (error) {
    if (error instanceof SaveError) {
      return error.code === 'futureVersion' ? 'futureVersion' : 'unreadable'
    }
    throw error
  }
}

function markSynced(): void {
  setCloud({ syncedAt: Date.now(), problem: null })
}

function reportProblem(problem: CloudProblem): void {
  setCloud({ problem: problem === 'offline' ? 'offline' : 'failed' })
}
