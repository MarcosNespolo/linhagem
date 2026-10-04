import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  advanceTo,
  ageOf,
  applyAction,
  familyRates,
  memberExpense,
  memberIncome,
  msToTicks,
  OFFLINE_CAP_MS,
  salaryPerSecond,
  type GameState,
} from '@/engine'
import {
  days,
  expectClose,
  expectOk,
  expectSameState,
  founders,
  lastMember,
  makeGame,
  setMember,
  withChild,
  withMoney,
  years,
} from '../helpers'

describe('advance', () => {
  it('passa um ano do jogo a cada 12 s reais, no ritmo de 1 mês por segundo', () => {
    expect(BALANCE.gameMonthsPerSecond).toBe(1)
    const { state } = advance(makeGame(), 12_000)
    expect(state.clock).toEqual({ day: BALANCE.daysPerYear, tickOfDay: 0, paused: false })
  })

  it('acumula dinheiro pela taxa líquida por segundo real', () => {
    const state = makeGame()
    const { net } = familyRates(state)
    const { state: next } = advance(state, 10)
    expectClose(next.money, state.money + net * 0.01)
    expect(next.clock).toEqual({ day: 0, tickOfDay: msToTicks(10), paused: false })
  })

  it('vira o dia quando o relógio completa um dia', () => {
    const { state } = advance(makeGame(), days(3) + 10)
    expect(state.clock.day).toBe(3)
    expect(state.clock.tickOfDay).toBe(msToTicks(10))
  })

  it('não altera o estado recebido', () => {
    const state = withChild(makeGame())
    const copy = structuredClone(state)
    advance(state, years(1))
    expect(state).toEqual(copy)
  })

  it('não anda com o jogo pausado', () => {
    const state = makeGame()
    const paused: GameState = { ...state, clock: { ...state.clock, paused: true } }
    const result = advance(paused, 1_000)
    expect(result.state).toBe(paused)
    expect(result.events).toEqual([])
  })

  it('ignora tempo zero ou negativo e recusa tempo infinito', () => {
    const state = makeGame()
    expect(advance(state, 0).state).toBe(state)
    expect(advance(state, -5).state).toBe(state)
    expect(() => advance(state, Infinity)).toThrow(RangeError)
    expect(() => advance(state, Number.NaN)).toThrow(RangeError)
  })

  it('dá o mesmo resultado avançando de uma vez ou segundo a segundo', () => {
    const start = withChild(makeGame(3))
    const steps = 600
    const atOnce = advance(start, steps * 1_000).state
    let stepwise = start
    for (let i = 0; i < steps; i++) stepwise = advance(stepwise, 1_000).state
    expectSameState(atOnce, stepwise)
  })

  it('dá o mesmo resultado com passos fracionados e atravessando aniversários', () => {
    const start = withChild(makeGame(4))
    const total = years(2)
    const atOnce = advance(start, total).state
    let stepwise = start
    for (let elapsed = 0; elapsed < total; elapsed += 2.5) stepwise = advance(stepwise, 2.5).state
    expectSameState(atOnce, stepwise)
  })

  it('é determinístico para a mesma sequência de passos e ações', () => {
    const run = () => {
      let state = withMoney(makeGame(11), 1_000_000)
      state = advance(state, years(1)).state
      const [first] = founders(state)
      state = expectOk(applyAction(state, { type: 'haveChild', parentId: first.id })).state
      return advance(state, years(20)).state
    }
    expect(run()).toEqual(run())
  })

  it('a criança vira adulta aos 18, consegue um emprego e para de custar', () => {
    const start = withChild(makeGame(4))
    const child = lastMember(start)
    expect(memberExpense(child, start.clock.day)).toBeGreaterThan(0)

    const { state, events } = advance(start, years(BALANCE.adultAge))
    const grown = state.members[child.id]
    expect(ageOf(grown, state.clock.day)).toBe(BALANCE.adultAge)
    expect(events).toContainEqual({ type: 'becameAdult', day: state.clock.day, memberId: child.id })
    expect(grown.career).not.toBeNull()
    expect(events).toContainEqual({
      type: 'firstJob',
      day: state.clock.day,
      memberId: child.id,
      careerId: grown.career?.id,
    })
    expect(memberExpense(grown, state.clock.day)).toBe(0)
    expect(memberIncome(grown, state.clock.day)).toBeGreaterThan(0)
  })

  it('aposenta aos 65 com pensão', () => {
    const start = makeGame(8)
    const [first] = founders(start)
    const oneDayBefore = -(BALANCE.retirementAge * BALANCE.daysPerYear) + 1
    const aging = setMember(start, first.id, { birthDay: oneDayBefore, lifespan: 100 })

    const { state, events } = advance(aging, days(1))
    expect(events).toContainEqual({ type: 'retired', day: 1, memberId: first.id })
    expect(memberIncome(state.members[first.id], 1)).toBe(
      salaryPerSecond(first) * BALANCE.pensionRatio,
    )
  })

  it('morre ao chegar à expectativa de vida e sai da conta', () => {
    const start = makeGame(9)
    const [first] = founders(start)
    const age = ageOf(first, 0)
    const shortLife = setMember(start, first.id, { lifespan: age + 1 })
    const daysToBirthday = (age + 1) * BALANCE.daysPerYear + first.birthDay

    const { state, events } = advance(shortLife, days(daysToBirthday))
    const dead = state.members[first.id]
    expect(dead.deathDay).toBe(daysToBirthday)
    expect(events).toContainEqual({
      type: 'died',
      day: daysToBirthday,
      memberId: first.id,
      age: age + 1,
    })
    expect(memberIncome(dead, state.clock.day)).toBe(0)
    expect(familyRates(state).income).toBe(
      memberIncome(state.members[founders(state)[1].id], state.clock.day),
    )
  })

  it('nunca deixa o saldo negativo e só registra a despesa paga', () => {
    let start = withChild(makeGame(10))
    for (const member of founders(start)) start = setMember(start, member.id, { career: null })
    start = withMoney(start, 0.5)

    const { state } = advance(start, days(60))
    expect(state.money).toBe(0)
    expectClose(state.stats.totalSpent - start.stats.totalSpent, 0.5)
  })
})

describe('advanceTo', () => {
  it('simula o tempo real desde a última simulação', () => {
    const start = makeGame()
    const { state } = advanceTo(start, start.lastSimulatedAt + 10_000)
    expect(state.stats.simulatedMs).toBe(10_000)
    expect(state.lastSimulatedAt).toBe(start.lastSimulatedAt + 10_000)
  })

  it('limita o progresso offline a BALANCE.offlineCapYears anos do jogo', () => {
    const start = makeGame()
    const farFuture = start.lastSimulatedAt + OFFLINE_CAP_MS + 3_600_000
    const { state } = advanceTo(start, farFuture)
    expect(state.stats.simulatedMs).toBe(OFFLINE_CAP_MS)
    expect(state.clock.day).toBe(BALANCE.offlineCapYears * BALANCE.daysPerYear)
    expect(state.lastSimulatedAt).toBe(farFuture)
  })

  it('com o jogo pausado, só move a âncora de tempo', () => {
    const start = makeGame()
    const paused = expectOk(applyAction(start, { type: 'pause' })).state
    const later = paused.lastSimulatedAt + 3_600_000
    const { state } = advanceTo(paused, later)
    expect(state).toEqual({ ...paused, lastSimulatedAt: later })
  })

  it('não anda para trás se o relógio do aparelho voltar no tempo', () => {
    const start = makeGame()
    const earlier = start.lastSimulatedAt - 60_000
    const { state } = advanceTo(start, earlier)
    expect(state).toEqual({ ...start, lastSimulatedAt: earlier })
  })
})
