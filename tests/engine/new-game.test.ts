import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { ageOf, CURRENT_SCHEMA_VERSION, isAlive, newGame } from '@/engine'
import { founders, makeGame, START } from '../helpers'

describe('newGame', () => {
  it('é determinístico: mesma seed, mesma partida', () => {
    expect(makeGame(5)).toEqual(makeGame(5))
  })

  it('muda com a seed', () => {
    expect(makeGame(5)).not.toEqual(makeGame(6))
  })

  it('começa com um casal fundador adulto e empregado', () => {
    const state = makeGame()
    expect(Object.keys(state.members)).toHaveLength(2)
    const [first, second] = founders(state)
    expect(first.partnerId).toBe(second.id)
    expect(second.partnerId).toBe(first.id)
    for (const member of [first, second]) {
      const age = ageOf(member, 0)
      expect(age).toBeGreaterThanOrEqual(BALANCE.startingAge.min)
      expect(age).toBeLessThanOrEqual(BALANCE.startingAge.max)
      expect(member.career).not.toBeNull()
      expect(member.generation).toBe(0)
      expect(isAlive(member)).toBe(true)
      expect(member.lifespan).toBeGreaterThanOrEqual(BALANCE.lifespan.min)
      expect(member.lifespan).toBeLessThanOrEqual(
        BALANCE.lifespan.min + 2 * BALANCE.lifespan.spread,
      )
    }
  })

  it('começa no dia 0, com o dinheiro inicial e o formato de save atual', () => {
    const state = makeGame()
    expect(state.clock).toEqual({ day: 0, tickOfDay: 0, paused: false })
    expect(state.money).toBe(BALANCE.startingMoney)
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(state.lastSimulatedAt).toBe(START.now)
  })

  it('usa o nome de família informado, sem espaços nas pontas', () => {
    expect(newGame({ seed: 1, ...START, familyName: '  Souza ' }).familyName).toBe('Souza')
  })

  it('sorteia um sobrenome quando o nome vem vazio', () => {
    expect(newGame({ seed: 1, ...START, familyName: '   ' }).familyName).not.toBe('')
  })
})
