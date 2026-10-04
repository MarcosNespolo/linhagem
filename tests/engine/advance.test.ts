import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  advanceTo,
  ageOf,
  applyAction,
  bestOffer,
  calendarDate,
  familyRates,
  isEnrollmentDay,
  isWaiting,
  memberExpense,
  memberIncome,
  msToTicks,
  newGame,
  OFFLINE_CAP_MS,
  salaryPerMonth,
  TICKS_PER_DAY,
  ticksToMonths,
  type Choice,
  type GameState,
} from '@/engine'
import {
  chooseSuggested,
  days,
  expectClose,
  expectOk,
  expectSameState,
  founders,
  lastMember,
  makeGame,
  play,
  setMember,
  withChild,
  withMoney,
  workPolicy,
  years,
} from '../helpers'

/** A escolha do primeiro emprego aberta no estado. */
function jobChoice(state: GameState): Extract<Choice, { type: 'firstJob' }> {
  const choice = state.choices.find((open) => open.type === 'firstJob')
  if (choice?.type !== 'firstJob') throw new Error('Nenhuma escolha de emprego aberta')
  return choice
}

/**
 * Partida parada na escolha do primeiro emprego do primeiro filho do casal
 * fundador, que passou pela escola com as sugestões e foi trabalhar depois do
 * médio.
 */
function atFirstJobChoice(seed: number): { state: GameState; childId: string } {
  const born = withChild(makeGame(seed))
  const childId = lastMember(born).id
  return { state: play(born, years(BALANCE.adultAge + 1), 'firstJob', workPolicy), childId }
}

describe('advance', () => {
  it('passa um ano do jogo a cada minuto real, no ritmo de 1 mês a cada 5 s', () => {
    expect(BALANCE.secondsPerGameMonth).toBe(5)
    const { state } = advance(makeGame(), 60_000)
    expect(state.clock).toEqual({ day: BALANCE.daysPerYear, tickOfDay: 0, paused: false })
  })

  it('acumula dinheiro pela taxa líquida por mês do jogo', () => {
    const state = makeGame()
    const { net } = familyRates(state)
    const { state: next } = advance(state, BALANCE.secondsPerGameMonth * 1_000)
    expectClose(next.money, state.money + net)
    const tickOfDay = msToTicks(BALANCE.secondsPerGameMonth * 1_000) - 30 * TICKS_PER_DAY
    expect(next.clock).toEqual({ day: 30, tickOfDay, paused: false })
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

  it('não copia quem já morreu, que continua o mesmo objeto no estado novo', () => {
    const start = makeGame(2)
    const [first, second] = founders(start)
    const widowed = setMember(start, first.id, { deathDay: 0 })
    const { state } = advance(widowed, days(10))
    expect(state.members[first.id]).toBe(widowed.members[first.id])
    expect(state.members[second.id]).not.toBe(widowed.members[second.id])
    expect(state.members[second.id]).toEqual(widowed.members[second.id])
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
    // Começa em agosto para o 13º caber antes das matrículas de janeiro, que param o relógio.
    const start = withChild(newGame({ seed: 4, now: 0, startDate: '2026-08-02' }))
    // 146 dias: 24 s reais, múltiplo exato dos passos de 2,5 ms.
    const total = days(146)
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
      state = chooseSuggested(advance(state, years(20)).state)
      return advance(state, years(5)).state
    }
    expect(run()).toEqual(run())
  })

  it('quem chega aos 18 sem estudar nem trabalhar ganha a escolha do primeiro emprego', () => {
    const start = withChild(makeGame(4))
    const child = lastMember(start)
    const teen = setMember(start, child.id, {
      birthDay: start.clock.day - BALANCE.adultAge * BALANCE.daysPerYear + 1,
      education: { ...child.education, formation: { level: 'medio' } },
    })
    expect(memberExpense(teen.members[child.id], teen.clock.day)).toBeGreaterThan(0)

    const { state, events } = advance(teen, days(2))
    expect(state.clock).toEqual({ day: 1, tickOfDay: 0, paused: false })
    const grown = state.members[child.id]
    expect(ageOf(grown, state.clock.day)).toBe(BALANCE.adultAge)
    expect(events).toContainEqual({ type: 'becameAdult', day: 1, memberId: child.id })
    expect(events.some((event) => event.type === 'firstJob')).toBe(false)
    expect(grown.career).toBeNull()
    expect(memberExpense(grown, 1)).toBe(0)
    expect(memberIncome(grown, 1)).toBe(0)

    const choice = jobChoice(state)
    expect(state.choices).toHaveLength(1)
    expect(choice).toMatchObject({ type: 'firstJob', memberId: child.id, day: 1 })
    expect(new Set(choice.offers.map((offer) => offer.careerId)).size).toBe(
      BALANCE.jobs.offersPerChoice,
    )
    expect(choice.suggested).toBe(bestOffer(choice.offers))
    expect(isWaiting(state)).toBe(true)
    expect(advance(state, 1_000).state).toBe(state)
  })

  it('escolher o emprego dá a carreira, entra no histórico e solta o relógio', () => {
    const { state, childId } = atFirstJobChoice(4)
    const choice = jobChoice(state)
    const option = (choice.suggested + 1) % choice.offers.length
    const result = expectOk(
      applyAction(state, { type: 'choose', picks: [{ memberId: childId, option }] }),
    )
    const careerId = choice.offers[option].careerId
    const firstJob = { type: 'firstJob', day: state.clock.day, memberId: childId, careerId }
    expect(result.state.members[childId].career).toEqual({ id: careerId, level: 0, xp: 0 })
    expect(result.state.choices).toEqual([])
    expect(result.events).toEqual([firstJob])
    expect(result.state.log.at(-1)).toEqual(firstJob)
    expect(memberIncome(result.state.members[childId], state.clock.day)).toBeGreaterThan(0)
    expect(advance(result.state, 1_000).state.clock.tickOfDay).toBeGreaterThan(0)
  })

  it('dá o mesmo resultado de uma vez ou aos poucos até parar na escolha', () => {
    const start = withChild(makeGame(5))
    const total = years(BALANCE.adultAge + 1)
    const atOnce = advance(start, total).state
    let stepwise = start
    for (let elapsed = 0; elapsed < total; elapsed += 1_000) {
      stepwise = advance(stepwise, 1_000).state
    }
    expect(atOnce.choices).toHaveLength(1)
    expectSameState(atOnce, stepwise)
  })

  it('paga o 13º em 20 de dezembro a quem trabalha e a quem é aposentado', () => {
    const start = makeGame(6)
    const [first, second] = founders(start)
    const retiree = setMember(start, first.id, {
      birthDay: -(BALANCE.retirementAge + 1) * BALANCE.daysPerYear,
      lifespan: 100,
    })
    const day = 78
    expect(calendarDate(retiree.startDate, day)).toBe('2026-12-20')

    const before = advance(retiree, days(day - 1))
    expect(before.events.some((event) => event.type === 'thirteenth')).toBe(false)

    const { state, events } = advance(retiree, days(day))
    const amount = salaryPerMonth(second) + salaryPerMonth(first) * BALANCE.pensionRatio
    expect(events).toContainEqual({ type: 'thirteenth', day, amount })
    const accrued = familyRates(retiree).net * ticksToMonths(day * TICKS_PER_DAY)
    expectClose(state.money, retiree.money + accrued + amount)
    expect(state.log.map((event) => String(event.type))).not.toContain('thirteenth')
  })

  it('aposenta aos 65 com pensão', () => {
    const start = makeGame(8)
    const [first] = founders(start)
    const oneDayBefore = -(BALANCE.retirementAge * BALANCE.daysPerYear) + 1
    const aging = setMember(start, first.id, { birthDay: oneDayBefore, lifespan: 100 })

    const { state, events } = advance(aging, days(1))
    expect(events).toContainEqual({ type: 'retired', day: 1, memberId: first.id })
    expect(memberIncome(state.members[first.id], 1)).toBe(
      salaryPerMonth(first) * BALANCE.pensionRatio,
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
    start = withMoney(start, 90)

    const { state } = advance(start, days(60))
    expect(state.money).toBe(0)
    expectClose(state.stats.totalSpent - start.stats.totalSpent, 90)
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

  it('com o jogo fechado, para na primeira escolha e espera por ela', () => {
    const born = withChild(makeGame(12))
    const teen = play(born, years(BALANCE.adultAge - 1))
    const { state } = advanceTo(teen, teen.lastSimulatedAt + years(3))
    expect(isEnrollmentDay(state)).toBe(true)
    expect(state.choices.map((choice) => choice.type)).toEqual(['afterSchool'])

    // Uma hora depois, nada andou: só a âncora de tempo.
    const later = state.lastSimulatedAt + 3_600_000
    const waited = advanceTo(state, later).state
    expect(waited).toEqual({ ...state, lastSimulatedAt: later })

    // Depois das escolhas, o relógio volta a andar a partir dali.
    let chosen = waited
    while (chosen.choices.length > 0) chosen = chooseSuggested(chosen)
    const resumed = advanceTo(chosen, later + 1_000).state
    expect(resumed.stats.simulatedMs).toBe(state.stats.simulatedMs + 1_000)
  })

  it('não anda para trás se o relógio do aparelho voltar no tempo', () => {
    const start = makeGame()
    const earlier = start.lastSimulatedAt - 60_000
    const { state } = advanceTo(start, earlier)
    expect(state).toEqual({ ...start, lastSimulatedAt: earlier })
  })
})
