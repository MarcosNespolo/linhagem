import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { careerLevel, getCareer } from '@/content/careers'
import { ageOf, CURRENT_SCHEMA_VERSION, isAlive, newGame } from '@/engine'
import { makeStart, START } from '../helpers'

describe('newGame', () => {
  it('é determinístico: mesma seed, mesma partida', () => {
    expect(makeStart(5)).toEqual(makeStart(5))
  })

  it('muda com a seed', () => {
    expect(makeStart(5)).not.toEqual(makeStart(6))
  })

  it('começa com uma pessoa de 18 anos, com ensino médio e o primeiro emprego da formação', () => {
    const genders = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      const state = makeStart(seed)
      const members = Object.values(state.members)
      expect(members).toHaveLength(1)
      const [founder] = members
      genders.add(founder.gender)
      expect(ageOf(founder, 0)).toBe(BALANCE.adultAge)
      expect(founder.partnerId).toBeNull()
      expect(founder.origin).toBe('founder')
      expect(founder.generation).toBe(0)
      expect(isAlive(founder)).toBe(true)
      expect(founder.education.formation).toEqual({ level: 'medio' })
      expect(founder.career?.level).toBe(0)
      expect(getCareer(founder.career!.id).requires).toBe('medio')
      expect(careerLevel(founder.career!.id, 0).salaryPerMonth).toBeGreaterThan(0)
      expect(founder.lifespan).toBeGreaterThanOrEqual(BALANCE.lifespan.min)
      expect(founder.lifespan).toBeLessThanOrEqual(
        BALANCE.lifespan.min + 2 * BALANCE.lifespan.spread,
      )
    }
    // Homens e mulheres aparecem.
    expect(genders).toEqual(new Set(['f', 'm']))
  })

  it('começa no dia 0, com o dinheiro inicial e o formato de save atual', () => {
    const state = makeStart()
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
