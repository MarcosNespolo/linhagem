import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  applyAction,
  calendarDate,
  deserialize,
  memberExpense,
  yearlyPoints,
  type GameState,
} from '@/engine'
import {
  days,
  expectClose,
  expectOk,
  founders,
  lastMember,
  makeGame,
  play,
  withChild,
  withMoney,
  years,
} from '../helpers'

const { fee, pointsPerYear } = BALANCE.school.tutor

/** Filho do casal fundador já na escola, com dinheiro de sobra. */
function childInSchool(seed: number, age = 6): { state: GameState; childId: string } {
  const born = withChild(makeGame(seed))
  const childId = lastMember(born).id
  const state = withMoney(play(born, years(age)), 1e8)
  return { state, childId }
}

function setTutor(state: GameState, memberId: string, active: boolean): GameState {
  return expectOk(applyAction(state, { type: 'setTutor', memberId, active })).state
}

/** Dias até o próximo dia das matrículas. */
function daysUntilJanuary(state: GameState): number {
  let wait = 1
  while (calendarDate(state.startDate, state.clock.day + wait).slice(5) !== '01-01') wait += 1
  return wait
}

describe('professor particular', () => {
  it('cobra a mensalidade e soma pontos em janeiro, em proporção ao tempo', () => {
    const { state, childId } = childInSchool(41)
    const school = state.members[childId].education.school!
    expect(school.stage).toBe('escola')
    const hired = setTutor(state, childId, true)
    const day = state.clock.day
    expect(hired.members[childId].education.tutorSince).toBe(day)
    expect(
      memberExpense(hired.members[childId], day) - memberExpense(state.members[childId], day),
    ).toBe(fee)

    const wait = daysUntilJanuary(hired)
    const january = advance(hired, days(wait)).state
    const gained =
      january.members[childId].education.points - hired.members[childId].education.points
    expectClose(
      gained,
      (pointsPerYear * wait) / BALANCE.daysPerYear + yearlyPoints('escola', school.network),
    )
    expect(january.members[childId].education.tutorSince).toBe(january.clock.day)
  })

  it('dispensar soma o que o professor já ensinou e para a mensalidade', () => {
    const { state, childId } = childInSchool(42)
    const hired = setTutor(state, childId, true)
    const later = advance(hired, days(100)).state
    // Se um janeiro passou no meio, os pontos até ali já entraram e a conta recomeçou.
    const since = later.members[childId].education.tutorSince!
    const dismissed = setTutor(later, childId, false)
    const member = dismissed.members[childId]
    expect(member.education.tutorSince).toBeNull()
    expectClose(
      member.education.points - later.members[childId].education.points,
      (pointsPerYear * (later.clock.day - since)) / BALANCE.daysPerYear,
    )
    expect(memberExpense(member, dismissed.clock.day)).toBe(
      memberExpense(later.members[childId], later.clock.day) - fee,
    )
  })

  it('só vale para quem está na escola ou no ensino médio', () => {
    const { state } = childInSchool(43)
    const [mother] = founders(state)
    expect(applyAction(state, { type: 'setTutor', memberId: mother.id, active: true })).toEqual({
      ok: false,
      error: 'notStudying',
    })
    const baby = withChild(withMoney(makeGame(44), 1e7))
    const babyId = lastMember(baby).id
    expect(applyAction(baby, { type: 'setTutor', memberId: babyId, active: true })).toEqual({
      ok: false,
      error: 'notStudying',
    })
  })

  it('vai embora no fim do médio, com os pontos do último ano na nota do ENEM', () => {
    // Contratado no janeiro em que começa o médio: são três anos letivos inteiros.
    const { state, childId } = childInSchool(45, 14)
    const start = play(state, years(1), 'school')
    const choice = start.choices.find((open) => open.memberId === childId)
    expect(choice?.type === 'school' && choice.stage).toBe('medio')
    const enrolled = expectOk(
      applyAction(start, {
        type: 'choose',
        picks: [{ memberId: childId, option: choice!.suggested }],
      }),
    ).state
    const network = enrolled.members[childId].education.school!.network
    const hired = setTutor(enrolled, childId, true)
    const before = hired.members[childId].education.points

    const done = play(hired, years(4), 'afterSchool')
    const member = done.members[childId]
    expect(member.education.school).toBeNull()
    expect(member.education.tutorSince).toBeNull()
    expectClose(
      member.education.points - before,
      3 * pointsPerYear + 2 * yearlyPoints('medio', network),
    )
  })

  it('o save da versão 8 começa sem professor particular', () => {
    const json = readFileSync(new URL('../fixtures/save-v8.json', import.meta.url), 'utf8')
    for (const member of Object.values(deserialize(json).members)) {
      expect(member.education.tutorSince).toBeNull()
    }
  })
})

describe('filhos', () => {
  it('só a partir da idade mínima e com dois anos entre um e outro', () => {
    let state = withMoney(makeGame(46), 1e8)
    const [mother] = founders(state)
    state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
    const soon = advance(state, days(BALANCE.children.cooldownDays - 1)).state
    expect(applyAction(soon, { type: 'haveChild', parentId: mother.id })).toEqual({
      ok: false,
      error: 'cooldown',
    })
    expect(BALANCE.children.cooldownDays).toBe(2 * BALANCE.daysPerYear)
    expect(BALANCE.children.minParentAge).toBeGreaterThan(BALANCE.adultAge)
  })
})
