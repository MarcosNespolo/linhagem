import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { PUBLIC_CAREERS } from '@/content/careers'
import {
  advance,
  hashUnit,
  isUnemployed,
  livingCost,
  memberExpense,
  memberIncome,
  salaryPerMonth,
  type GameEvent,
  type GameState,
} from '@/engine'
import { days, founders, makeGame, setMember, withMoney } from '../helpers'

const { layoff, surgery, car } = BALANCE.mishaps
const perDay = (perYear: number) => perYear / BALANCE.daysPerYear
const LAYOFF = perDay(layoff.perYear)
const SURGERY = perDay(surgery.perYear)
const CAR = perDay(car.perYear)

/**
 * Primeira partida e primeiro dia em que o sorteio do dia da fundadora cai
 * entre `from` e `to`, com ela adulta e antes da aposentadoria.
 */
function findDay(from: number, to: number): { state: GameState; day: number } {
  for (let seed = 1; seed < 500; seed++) {
    const state = makeGame(seed)
    const [founder] = founders(state)
    const id = Number(founder.id.slice(1))
    const last = founder.birthDay + (BALANCE.retirementAge - 1) * BALANCE.daysPerYear
    for (let day = 1; day < last; day++) {
      const roll = hashUnit(state.seed, day, id, 1)
      if (roll >= from && roll < to) return { state, day }
    }
  }
  throw new Error('Nenhum dia com esse sorteio')
}

/** Leva o relógio para o começo de `day - 1` e avança um dia: processa o dia `day`. */
function liveDay(state: GameState, day: number): { state: GameState; events: GameEvent[] } {
  const before: GameState = { ...state, clock: { day: day - 1, tickOfDay: 0, paused: false } }
  return advance(before, days(1))
}

function eventsOf(events: GameEvent[], memberId: string) {
  return events.filter((event) => 'memberId' in event && event.memberId === memberId)
}

describe('imprevistos', () => {
  it('demissão: recebe o seguro-desemprego pelos meses sorteados e volta no mesmo nível', () => {
    const { state, day } = findDay(0, LAYOFF)
    const [founder] = founders(state)
    const fired = liveDay(state, day)
    const member = fired.state.members[founder.id]
    const until = member.unemployedUntil!
    const months = ((until - day) * 12) / BALANCE.daysPerYear
    expect(months).toBeGreaterThanOrEqual(layoff.months.min - 0.1)
    expect(months).toBeLessThanOrEqual(layoff.months.max + 0.1)
    expect(eventsOf(fired.events, founder.id)).toContainEqual({
      type: 'laidOff',
      day,
      memberId: founder.id,
      until,
    })
    expect(isUnemployed(member, day)).toBe(true)
    const { share, max } = layoff.unemploymentPay
    expect(memberIncome(member, day)).toBe(Math.min(salaryPerMonth(member) * share, max))
    // Fora do serviço público, a promoção vem do curso: o nível e o dia em que chegou a ele ficam.
    expect(member.career).toEqual(state.members[founder.id].career)

    const back = liveDay(fired.state, until)
    const rehired = back.state.members[founder.id]
    expect(eventsOf(back.events, founder.id)).toContainEqual({
      type: 'rehired',
      day: until,
      memberId: founder.id,
    })
    expect(rehired.unemployedUntil).toBeNull()
    expect(rehired.career?.id).toBe(member.career?.id)
    expect(memberIncome(rehired, until)).toBe(salaryPerMonth(rehired))
  })

  it('quem é demitido no meio do curso tranca: sem mensalidade, e o curso acaba mais tarde', () => {
    const { state, day } = findDay(0, LAYOFF)
    const [founder] = founders(state)
    // O curso começou antes da demissão e acabaria depois dela.
    const course = { since: day - 10, until: day + 100, dedicated: false, fee: 500 }
    const fired = liveDay(setMember(state, founder.id, { course }), day).state
    const member = fired.members[founder.id]
    const back = member.unemployedUntil!
    expect(member.course).toEqual({ ...course, until: course.until + (back - day) })
    expect(memberExpense(member, day)).toBe(livingCost(member, day))
    // De volta ao trabalho, a mensalidade volta até o fim do curso.
    expect(memberExpense(member, back)).toBe(livingCost(member, back) + course.fee)
  })

  it('servidor público não é demitido, em nenhum dos cargos', () => {
    const { state, day } = findDay(0, LAYOFF)
    const [founder] = founders(state)
    for (const id of PUBLIC_CAREERS) {
      const servant = setMember(state, founder.id, { career: { id, level: 0, levelSince: 0 } })
      const after = liveDay(servant, day)
      expect(eventsOf(after.events, founder.id).map((event) => event.type)).not.toContain('laidOff')
      expect(after.state.members[founder.id].unemployedUntil).toBeNull()
    }
  })

  it('cirurgia: a família paga a conta, ou o que tiver no caixa', () => {
    const { state, day } = findDay(LAYOFF, LAYOFF + SURGERY)
    const [founder] = founders(state)
    const rich = liveDay(withMoney(state, 1_000_000), day)
    const [bill] = eventsOf(rich.events, founder.id).filter((event) => event.type === 'mishap')
    expect(bill).toMatchObject({ type: 'mishap', kind: 'surgery', day })
    const cost = bill.type === 'mishap' ? bill.cost : 0
    expect(cost).toBeGreaterThanOrEqual(surgery.cost.min)
    expect(cost).toBeLessThanOrEqual(surgery.cost.max)
    expect(cost % 100).toBe(0)

    // Com pouco no caixa, a conta leva tudo o que havia, e o resto fica para o SUS e os amigos.
    const poor = liveDay(withMoney(state, 1_000), day)
    const [small] = eventsOf(poor.events, founder.id).filter((event) => event.type === 'mishap')
    expect(small).toMatchObject({ kind: 'surgery' })
    expect(small.type === 'mishap' && small.cost).toBeLessThan(surgery.cost.min)
    expect(poor.state.money).toBeCloseTo(0)
  })

  it('carro: só quem tem carro paga o conserto', () => {
    const { state, day } = findDay(LAYOFF + SURGERY, LAYOFF + SURGERY + CAR)
    const [founder] = founders(state)
    const bus = setMember(state, founder.id, {
      career: { id: 'comercio', level: 0, levelSince: 0 },
    })
    const withoutCar = liveDay(withMoney(bus, 1_000_000), day)
    const mishaps = eventsOf(withoutCar.events, founder.id).filter(
      (event) => event.type === 'mishap',
    )
    expect(mishaps).toEqual([])

    const driver = setMember(state, founder.id, {
      career: { id: 'direito', level: 4, levelSince: 0 },
    })
    const withCar = liveDay(withMoney(driver, 1_000_000), day)
    const [repair] = eventsOf(withCar.events, founder.id).filter((event) => event.type === 'mishap')
    expect(repair).toMatchObject({ type: 'mishap', kind: 'car', day })
    const cost = repair.type === 'mishap' ? repair.cost : 0
    expect(cost).toBeGreaterThanOrEqual(car.cost.min)
    expect(cost).toBeLessThanOrEqual(car.cost.max)
  })

  it('o sorteio não gasta o gerador do jogo', () => {
    const { state, day } = findDay(LAYOFF, LAYOFF + SURGERY)
    const after = liveDay(withMoney(state, 1_000_000), day)
    expect(after.events.some((event) => event.type === 'mishap')).toBe(true)
    expect(after.state.rngState).toBe(state.rngState)
  })
})
