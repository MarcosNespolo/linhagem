import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  advance,
  CURRENT_SCHEMA_VERSION,
  deserialize,
  migrate,
  REAIS_PER_DOLLAR,
  SaveError,
  serialize,
  type GameState,
} from '@/engine'
import { chooseSuggested, makeGame, withChild, years } from '../helpers'

const FIXTURES = new URL('../fixtures/', import.meta.url)
const fixtureFiles = readdirSync(FIXTURES).filter((file) => /^save-v\d+\.json$/.test(file))

function errorFrom(fn: () => unknown): SaveError {
  try {
    fn()
  } catch (error) {
    if (error instanceof SaveError) return error
    throw error
  }
  throw new Error('Era esperado um SaveError')
}

describe('save', () => {
  it('serializa e lê de volta sem perder nada', () => {
    const state = advance(withChild(makeGame()), years(3)).state
    expect(deserialize(serialize(state))).toEqual(state)
  })

  it('tem um save de exemplo da versão atual', () => {
    expect(fixtureFiles).toContain(`save-v${CURRENT_SCHEMA_VERSION}.json`)
  })

  it.each(fixtureFiles)('abre %s, migra e continua o jogo', (file) => {
    const state = chooseSuggested(deserialize(readFileSync(new URL(file, FIXTURES), 'utf8')))
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    const { state: next } = advance(state, 3_600)
    expect(next.clock.day).toBeGreaterThan(state.clock.day)
  })

  it('o save de exemplo da versão atual tem uma escolha aberta, com o relógio parado', () => {
    const json = readFileSync(new URL(`save-v${CURRENT_SCHEMA_VERSION}.json`, FIXTURES), 'utf8')
    const state = deserialize(json)
    expect(state.choices).toHaveLength(1)
    expect(advance(state, 3_600).state).toBe(state)
  })

  it('recusa save de uma versão mais nova que o jogo', () => {
    const json = serialize({ ...makeGame(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 })
    expect(errorFrom(() => deserialize(json)).code).toBe('futureVersion')
  })

  it('recusa JSON inválido e save incompleto', () => {
    expect(errorFrom(() => deserialize('{"schemaVersion": 1, ')).code).toBe('corrupt')
    expect(errorFrom(() => deserialize('[]')).code).toBe('corrupt')
    const withoutMoney: Partial<GameState> = makeGame()
    delete withoutMoney.money
    expect(errorFrom(() => deserialize(JSON.stringify(withoutMoney))).code).toBe('corrupt')
  })

  it('aplica as migrações em sequência até a versão alvo', () => {
    const v0 = { ...makeGame(), schemaVersion: 0 }
    const migrations = {
      0: (save: Record<string, unknown>) => ({ ...save, first: true }),
      1: (save: Record<string, unknown>) => ({ ...save, second: true }),
    }
    const migrated = migrate(v0, migrations, 2) as GameState & { first: boolean; second: boolean }
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.first).toBe(true)
    expect(migrated.second).toBe(true)
  })

  it('avisa quando falta uma migração no caminho', () => {
    const v0 = { ...makeGame(), schemaVersion: 0 }
    expect(errorFrom(() => migrate(v0, {}, 1)).code).toBe('missingMigration')
  })

  it('a versão 1 ganha aparência, origem, sugestões e histórico, sempre iguais', () => {
    const json = readFileSync(new URL('save-v1.json', FIXTURES), 'utf8')
    const v1 = JSON.parse(json) as { members: Record<string, { generation: number }> }
    const state = deserialize(json)

    expect(state.suitors).toEqual({})
    expect(state.log).toEqual([])
    for (const member of Object.values(state.members)) {
      const before = v1.members[member.id]
      expect(member.origin).toBe(before.generation === 0 ? 'founder' : 'born')
      expect(member.appearance.skin).toBeGreaterThanOrEqual(0)
    }
    expect(deserialize(json)).toEqual(state)
  })

  it('a versão 2 passa o dinheiro para reais, com o mesmo poder de compra, e sem escolhas', () => {
    const json = readFileSync(new URL('save-v2.json', FIXTURES), 'utf8')
    const v2 = JSON.parse(json) as GameState
    const state = deserialize(json)

    expect(state.money).toBe(v2.money * REAIS_PER_DOLLAR)
    expect(state.stats.totalEarned).toBe(v2.stats.totalEarned * REAIS_PER_DOLLAR)
    expect(state.stats.totalSpent).toBe(v2.stats.totalSpent * REAIS_PER_DOLLAR)
    expect(state.stats.simulatedMs).toBe(v2.stats.simulatedMs)
    expect(state.clock).toEqual(v2.clock)
    expect(state.choices).toEqual([])
    expect(state.members).toEqual(v2.members)
  })
})
