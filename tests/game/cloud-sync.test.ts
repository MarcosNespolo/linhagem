import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newGame, serialize, type GameState } from '@/engine'
import type { CloudApi, CloudResult, CloudUser } from '@/game/cloud'
import { makeGame, START } from '../helpers'

/** Store do jogo ligada a uma nuvem falsa em memória, num navegador falso. */

const USER: CloudUser = { id: 'u1', email: 'jogador@exemplo.com' }

type Row = { state: GameState; revision: number; savedAt: string }

function fakeCloud() {
  let listener: ((user: CloudUser | null) => void) | null = null
  const server = { row: null as Row | null, offline: false }
  const offline = (): { ok: false; problem: 'offline'; message: string } => ({
    ok: false,
    problem: 'offline',
    message: 'sem rede',
  })
  const write = (state: GameState): number => {
    const revision = (server.row?.revision ?? 0) + 1
    server.row = { state: structuredClone(state), revision, savedAt: new Date().toISOString() }
    return revision
  }
  const ok = <T>(value: T): CloudResult<T> => ({ ok: true, value })

  const api: CloudApi = {
    onUserChange(callback) {
      listener = callback
      return () => {
        listener = null
      }
    },
    sendCode: async () => ok(null),
    verifyCode: async (email) => ok({ id: USER.id, email }),
    signOut: async () => ok(null),
    fetchRevision: async () => (server.offline ? offline() : ok(server.row?.revision ?? null)),
    fetchSave: async () =>
      server.offline
        ? offline()
        : ok(server.row && { ...server.row, state: structuredClone(server.row.state) }),
    createSave: async (_user, state) => {
      if (server.offline) return offline()
      return ok(server.row ? null : write(state))
    },
    updateSave: async (_user, state, base) => {
      if (server.offline) return offline()
      return ok(server.row?.revision === base ? write(state) : null)
    },
    replaceSave: async (_user, state) => (server.offline ? offline() : ok(write(state))),
  }

  return {
    api,
    server,
    signIn: () => listener?.(USER),
    signOut: () => listener?.(null),
    /** Outro aparelho grava uma versão da família. */
    otherDeviceWrites: (state: GameState) => write(state),
  }
}

class MemoryStorage {
  private items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value))
  }
  removeItem(key: string) {
    this.items.delete(key)
  }
}

let storage: MemoryStorage
let cloud: ReturnType<typeof fakeCloud>

beforeEach(() => {
  storage = new MemoryStorage()
  cloud = fakeCloud()
  vi.stubGlobal('window', { localStorage: storage, setTimeout: globalThis.setTimeout })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(START.now + 1_000)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.doUnmock('@/game/cloud')
})

/** Abre o jogo com o save local dado (ou nenhum) e liga a nuvem falsa. */
async function openGame(local: GameState | null) {
  if (local) storage.setItem('linhagem:save', serialize(local))
  vi.resetModules()
  vi.doMock('@/game/cloud', () => ({ getCloud: () => cloud.api }))
  const { useGameStore } = await import('@/game/store')
  useGameStore.getState().hydrate()
  useGameStore.getState().startCloud()
  return useGameStore.getState
}

/** Espera as idas à nuvem falsa terminarem. */
async function settle() {
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}

async function syncNow(store: Awaited<ReturnType<typeof openGame>>) {
  store().syncCloud()
  await settle()
}

/** Abre o jogo já sincronizado: a família local foi para a nuvem vazia. */
async function openSynced() {
  const store = await openGame(makeGame(1))
  cloud.signIn()
  await settle()
  return store
}

describe('sincronização com a nuvem', () => {
  it('envia a família na primeira vez, com a nuvem vazia', async () => {
    const store = await openGame(makeGame(1))
    cloud.signIn()
    await settle()

    expect(cloud.server.row?.revision).toBe(1)
    expect(cloud.server.row?.state.seed).toBe(store().game?.seed)
    expect(store().cloud).toMatchObject({ mode: 'signedIn', problem: null, conflict: null })
    expect(store().cloud.syncedAt).not.toBeNull()
  })

  it('continua a família da nuvem num aparelho que ainda não tem uma', async () => {
    cloud.otherDeviceWrites(makeGame(2))
    const store = await openGame(null)
    expect(store().setup).not.toBeNull()

    cloud.signIn()
    await settle()

    expect(store().setup).toBeNull()
    expect(store().game?.seed).toBe(makeGame(2).seed)
    expect(store().notice).toContain('carregada da nuvem')
  })

  it('envia as ações do jogador com a revisão que conhece', async () => {
    const store = await openSynced()
    store().dispatch({ type: 'renameFamily', name: 'Nespolo' })
    await syncNow(store)

    expect(cloud.server.row?.revision).toBe(2)
    expect(cloud.server.row?.state.familyName).toBe('Nespolo')
  })

  it('não grava nada quando só o tempo passou', async () => {
    const store = await openSynced()
    vi.setSystemTime(START.now + 60_000)
    store().tick()
    await syncNow(store)

    expect(cloud.server.row?.revision).toBe(1)
  })

  it('adota o que outro aparelho gravou quando aqui nada mudou', async () => {
    const store = await openSynced()
    cloud.otherDeviceWrites({ ...makeGame(1), familyName: 'Outra' })
    await syncNow(store)

    expect(store().game?.familyName).toBe('Outra')
    expect(store().cloud.conflict).toBeNull()
    expect(cloud.server.row?.revision).toBe(2)
  })

  it('pergunta quando este aparelho e outro mudaram, e guarda a versão trocada', async () => {
    const store = await openSynced()
    cloud.otherDeviceWrites({ ...makeGame(1), familyName: 'Nuvem' })
    store().dispatch({ type: 'renameFamily', name: 'Aparelho' })
    await syncNow(store)

    expect(store().cloud.conflict?.cloud.familyName).toBe('Nuvem')
    expect(store().game?.familyName).toBe('Aparelho')

    store().resolveConflict('cloud')
    await settle()

    expect(store().game?.familyName).toBe('Nuvem')
    expect(store().cloud.conflict).toBeNull()
    expect(storage.getItem('linhagem:save-substituido')).toContain('Aparelho')
    expect(cloud.server.row?.revision).toBe(2)
  })

  it('grava a família deste aparelho por cima quando o jogador escolhe ficar com ela', async () => {
    const store = await openSynced()
    cloud.otherDeviceWrites({ ...makeGame(1), familyName: 'Nuvem' })
    store().dispatch({ type: 'renameFamily', name: 'Aparelho' })
    await syncNow(store)

    store().resolveConflict('local')
    await settle()

    expect(cloud.server.row?.state.familyName).toBe('Aparelho')
    expect(cloud.server.row?.revision).toBe(3)
    expect(store().cloud.conflict).toBeNull()
  })

  it('substitui a família da nuvem quando outra começa com a conta conectada', async () => {
    const store = await openSynced()
    store().startWithGame(newGame({ seed: 99, ...START }))
    await settle()

    expect(cloud.server.row?.state.seed).toBe(99)
    expect(store().cloud.conflict).toBeNull()
  })

  it('pergunta antes de trocar a nuvem por uma família começada sem a conta conectada', async () => {
    const store = await openSynced()
    cloud.signOut()
    await settle()
    store().startWithGame(newGame({ seed: 99, ...START }))
    cloud.signIn()
    await settle()

    expect(cloud.server.row?.state.seed).toBe(makeGame(1).seed)
    expect(store().cloud.conflict?.cloud.seed).toBe(makeGame(1).seed)
  })

  it('avisa quando está sem conexão e envia quando ela volta', async () => {
    const store = await openSynced()
    cloud.server.offline = true
    store().dispatch({ type: 'renameFamily', name: 'Offline' })
    await syncNow(store)

    expect(store().cloud.problem).toBe('offline')
    expect(cloud.server.row?.state.familyName).not.toBe('Offline')

    cloud.server.offline = false
    await syncNow(store)

    expect(store().cloud.problem).toBeNull()
    expect(cloud.server.row?.state.familyName).toBe('Offline')
  })

  it('não adota um save da nuvem de uma versão mais nova do jogo', async () => {
    const store = await openSynced()
    const local = store().game
    cloud.otherDeviceWrites({ ...makeGame(1), schemaVersion: 999 })
    await syncNow(store)

    expect(store().cloud.problem).toBe('futureVersion')
    expect(store().game).toBe(local)
  })
})
