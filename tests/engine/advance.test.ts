import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  advanceTo,
  ageOf,
  applyAction,
  bestOffer,
  calendarDate,
  daysToBankruptcy,
  elapsedToGameMs,
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
  withPartner,
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

  it('o histórico cresce numa lista nova, sem mexer no do estado recebido', () => {
    const start = makeGame()
    const [first] = founders(start)
    // No próximo aniversário, a fundadora morre, e a morte entra no histórico.
    const state = setMember(start, first.id, { lifespan: ageOf(first, 0) + 1 })
    const before = state.log.length
    const { state: next } = advance(state, years(1))
    expect(next.log.slice(0, before)).toEqual(state.log)
    expect(next.log.slice(before)).toContainEqual(
      expect.objectContaining({ type: 'died', memberId: first.id }),
    )
    expect(state.log).toHaveLength(before)
  })

  it('não copia quem já morreu, que continua o mesmo objeto no estado novo', () => {
    const start = makeGame(2)
    const [first, second] = founders(start)
    // Com a seed 2, o par é servidor e seria promovido nesses dias; numa carreira privada, nada muda.
    const settled = setMember(start, second.id, {
      career: { id: 'comercio', level: 1, levelSince: 0 },
    })
    const widowed = setMember(settled, first.id, { deathDay: 0 })
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
    const start = withChild(withPartner(newGame({ seed: 4, now: 0, startDate: '2026-08-02' })))
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
    // Sem escola, fica só o custo de vida de adulto, de ônibus e no SUS enquanto não tem salário.
    const { adult, transport } = BALANCE.living
    expect(memberExpense(grown, 1)).toBe(adult + transport.bus)
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
    const { careerId, level } = choice.offers[option]
    const day = state.clock.day
    const firstJob = { type: 'firstJob', day, memberId: childId, careerId, level }
    expect(result.state.members[childId].career).toEqual({ id: careerId, level, levelSince: day })
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

  it('fecha o dinheiro por mês: a renda entra e a despesa sai só na virada para o dia 1º', () => {
    const start = withMoney(makeGame(3), 50_000)
    const firstOfMonth = 29
    expect(calendarDate(start.startDate, firstOfMonth)).toBe('2026-11-01')

    // Até o fim de outubro, nada entra nem sai.
    const october = advance(start, days(firstOfMonth - 1)).state
    expect(october.money).toBe(start.money)
    expect(october.stats.totalEarned).toBe(start.stats.totalEarned)

    // Na virada para 1º de novembro, entra a renda e sai a despesa do mês inteiro.
    const { income, expense } = familyRates(start)
    const november = advance(start, days(firstOfMonth)).state
    expectClose(november.money, start.money + income - expense)
    expectClose(november.stats.totalEarned, start.stats.totalEarned + income)
    expectClose(november.stats.totalSpent, start.stats.totalSpent + expense)

    // Avançar de uma vez ou aos poucos fecha o mesmo mês.
    let steps = start
    for (let day = 0; day < firstOfMonth; day++) steps = advance(steps, days(1)).state
    expect(steps.clock).toEqual(november.clock)
    expectClose(steps.money, november.money)
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
    // Até 20 de dezembro fecham dois meses: 1º de novembro e 1º de dezembro.
    expectClose(state.money, retiree.money + 2 * familyRates(retiree).net + amount)
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

  it('sem renda para as despesas, o saldo fica negativo e o relógio para no dia em que entra no vermelho', () => {
    const start = broke()
    const { state, events } = advance(start, days(60))
    expect(state.money).toBeLessThan(0)
    expect(state.clock.day).toBeLessThan(60)
    expect(state.debtSince).toBe(state.clock.day)
    expect(state.clock.paused).toBe(true)
    expect(events.at(-1)).toEqual({ type: 'inDebt', day: state.clock.day })
    expect(daysToBankruptcy(state)).toBe(BALANCE.debt.graceDays)
    expectClose(state.stats.totalSpent - start.stats.totalSpent, 90 - state.money)
  })

  it('um ano no vermelho leva à falência, e depois dela o relógio não anda mais', () => {
    const red = advance(broke(), days(60)).state
    // O jogador continua e responde as matrículas do filho, sem dinheiro entrando.
    const state = play(red, years(2))
    const day = red.debtSince! + BALANCE.debt.graceDays
    expect(state.bankruptDay).toBe(day)
    expect(state.clock.day).toBe(day)
    expect(state.log.at(-1)).toEqual({ type: 'bankrupt', day })
    expect(isWaiting(state)).toBe(true)
    const again = expectOk(applyAction(state, { type: 'resume' })).state
    expect(advance(again, years(1)).state.clock.day).toBe(day)
  })

  it('voltando ao azul antes do prazo, o prazo some', () => {
    const red = advance(broke(), days(60)).state
    const saved = withMoney(expectOk(applyAction(red, { type: 'resume' })).state, 1_000_000)
    const { state, events } = advance(saved, days(1))
    expect(state.debtSince).toBeNull()
    expect(daysToBankruptcy(state)).toBeNull()
    expect(events).toContainEqual({ type: 'outOfDebt', day: state.clock.day })
  })
})

/** Família sem renda, com um filho e R$ 90 no caixa: entra no vermelho no primeiro dia. */
function broke() {
  let state = withChild(makeGame(10))
  for (const member of founders(state)) state = setMember(state, member.id, { career: null })
  return withMoney(state, 90)
}

describe('elapsedToGameMs', () => {
  const minute = 60_000
  const month = days(BALANCE.daysPerYear / 12)

  it('até a folga de BALANCE.away.graceSeconds, anda no ritmo normal, o do loop do jogo', () => {
    const grace = BALANCE.away.graceSeconds * 1000
    expect(elapsedToGameMs(1_000)).toBe(1_000)
    expect(elapsedToGameMs(grace)).toBe(grace)
  })

  it('fora do jogo, cada minuto vale BALANCE.away.monthsPerMinute meses do jogo', () => {
    expectClose(elapsedToGameMs(5 * minute), 5 * BALANCE.away.monthsPerMinute * month)
    expectClose(elapsedToGameMs(10 * minute), 10 * BALANCE.away.monthsPerMinute * month)
  })

  it('para no teto de BALANCE.away.capYears anos do jogo', () => {
    expect(OFFLINE_CAP_MS).toBe(years(BALANCE.away.capYears))
    expect(elapsedToGameMs(10 * 60 * minute)).toBe(OFFLINE_CAP_MS)
  })

  it('mais tempo fora nunca dá menos tempo de jogo', () => {
    let previous = 0
    for (let elapsed = 0; elapsed <= 20 * minute; elapsed += 250) {
      const ms = elapsedToGameMs(elapsed)
      expect(ms).toBeGreaterThanOrEqual(previous)
      previous = ms
    }
  })

  it('não anda se o relógio do aparelho voltar no tempo', () => {
    expect(elapsedToGameMs(-60_000)).toBe(0)
  })
})

describe('advanceTo', () => {
  it('no loop do jogo, anda o tempo real desde a última simulação', () => {
    const start = makeGame()
    const { state } = advanceTo(start, start.lastSimulatedAt + 1_000)
    expect(state.stats.simulatedMs).toBe(1_000)
    expect(state.lastSimulatedAt).toBe(start.lastSimulatedAt + 1_000)
  })

  it('fora do jogo, o tempo passa mais devagar', () => {
    const start = makeGame()
    const back = start.lastSimulatedAt + 5 * 60_000
    const { state } = advanceTo(start, back)
    const months = 5 * BALANCE.away.monthsPerMinute
    expectClose(state.stats.simulatedMs, days((months * BALANCE.daysPerYear) / 12))
    expect(state.clock.day).toBe(Math.floor((months * BALANCE.daysPerYear) / 12))
    expect(state.lastSimulatedAt).toBe(back)
  })

  it('limita o tempo fora a BALANCE.away.capYears anos do jogo', () => {
    const start = makeGame()
    const farFuture = start.lastSimulatedAt + 10 * 3_600_000
    const { state } = advanceTo(start, farFuture)
    expect(state.stats.simulatedMs).toBe(OFFLINE_CAP_MS)
    expect(state.clock.day).toBe(BALANCE.away.capYears * BALANCE.daysPerYear)
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
    // O filho escolhe o caminho depois do médio num janeiro; meio ano antes, a família sai do jogo.
    const choiceDay = play(born, years(BALANCE.adultAge + 2), 'afterSchool').clock.day
    const teen = play(born, days(choiceDay - born.clock.day) - years(0.5))
    const { state } = advanceTo(teen, teen.lastSimulatedAt + 10 * 3_600_000)
    expect(state.clock.day).toBe(choiceDay)
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
