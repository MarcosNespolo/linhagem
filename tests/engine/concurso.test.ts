import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { PUBLIC_CAREER } from '@/content/careers'
import {
  advance,
  applyAction,
  calendarDate,
  memberExpense,
  memberIncome,
  type Choice,
  type Education,
  type GameState,
} from '@/engine'
import {
  expectOk,
  expectSameState,
  lastMember,
  makeGame,
  play,
  setMember,
  withChild,
  withMoney,
  workPolicy,
  years,
} from '../helpers'

type JobChoice = Extract<Choice, { type: 'firstJob' }>
type ConcursoChoice = Extract<Choice, { type: 'concurso' }>

/**
 * Filho do casal fundador na escolha do primeiro emprego, em janeiro, depois
 * do médio, com a vida escolar ajustada por `patch` (a nota do ENEM, por exemplo).
 */
function atJobChoice(seed: number, patch: Partial<Education> = {}) {
  const born = withChild(makeGame(seed))
  const memberId = lastMember(born).id
  const grown = withMoney(play(born, years(25), 'firstJob', workPolicy), 50_000_000)
  const education = { ...grown.members[memberId].education, ...patch }
  return { state: setMember(grown, memberId, { education }), memberId }
}

function chooseConcurso(state: GameState, memberId: string) {
  const choice = state.choices.find(
    (open): open is JobChoice => open.type === 'firstJob' && open.memberId === memberId,
  )
  if (!choice) throw new Error('A escolha do emprego não está aberta')
  expect(choice.concurso).toBe(true)
  const picks = [{ memberId, option: choice.offers.length }]
  return expectOk(applyAction(state, { type: 'choose', picks }))
}

function resultChoice(state: GameState): ConcursoChoice {
  const [choice] = state.choices
  if (choice?.type !== 'concurso') throw new Error('O resultado do concurso não abriu')
  return choice
}

const examDate = (state: GameState) => calendarDate(state.startDate, state.clock.day).slice(5)

describe('concurso público', () => {
  it('estudar para concurso: sem salário, com o cursinho, até a primeira prova', () => {
    const { state, memberId } = atJobChoice(21, { enem: 700 })
    const day = state.clock.day
    const result = chooseConcurso(state, memberId)
    expect(result.events).toEqual([{ type: 'concursoStarted', day, memberId }])
    expect(result.state.choices).toEqual([])

    const member = result.state.members[memberId]
    expect(member.concurso).toEqual({ since: day, exams: 0, lastScore: null })
    expect(member.career).toBeNull()
    expect(memberIncome(member, day)).toBe(0)
    const without = { ...member, concurso: null }
    expect(memberExpense(member, day) - memberExpense(without, day)).toBe(BALANCE.concurso.fee)
  })

  it('quem passa toma posse como técnico do serviço público', () => {
    const { state, memberId } = atJobChoice(21, { enem: 700 })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    const choice = resultChoice(passed)
    const day = passed.clock.day
    expect(examDate(passed)).toBe(BALANCE.concurso.examDates[0])
    expect(choice.options).toEqual([{ kind: 'posse', level: 0 }, { kind: 'privada' }])
    expect(choice.score).toBeGreaterThanOrEqual(BALANCE.concurso.cutoffs[0])
    expect(passed.log).toContainEqual({
      type: 'concurso',
      day,
      memberId,
      score: choice.score,
      level: 0,
    })

    const hired = expectOk(
      applyAction(passed, { type: 'choose', picks: [{ memberId, option: 0 }] }),
    )
    const member = hired.state.members[memberId]
    expect(member.career).toEqual({ id: PUBLIC_CAREER, level: 0, levelSince: day })
    expect(member.concurso).toBeNull()
    expect(hired.events).toEqual([
      { type: 'firstJob', day, memberId, careerId: PUBLIC_CAREER, level: 0 },
    ])
    expect(memberIncome(member, day)).toBeGreaterThan(0)
  })

  it('desistir do cargo abre a escolha de emprego, sem o concurso', () => {
    const { state, memberId } = atJobChoice(21, { enem: 700 })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    const declined = expectOk(
      applyAction(passed, { type: 'choose', picks: [{ memberId, option: 1 }] }),
    ).state
    expect(declined.members[memberId].concurso).toBeNull()
    expect(declined.choices.map((choice) => choice.type)).toEqual(['firstJob'])
    expect((declined.choices[0] as JobChoice).concurso).toBe(false)
  })

  it('quem não passa em nenhuma das quatro provas volta à escolha de emprego', () => {
    // 400 de partida e 11 meses de estudo não chegam ao corte, nem com o sorteio a favor.
    const { state, memberId } = atJobChoice(22, { enem: 400 })
    const studying = chooseConcurso(state, memberId).state
    const after = play(studying, years(2), 'firstJob')
    expect(after.choices.map((choice) => choice.type)).toEqual(['firstJob'])
    expect((after.choices[0] as JobChoice).concurso).toBe(true)
    expect(examDate(after)).toBe(BALANCE.concurso.examDates[BALANCE.concurso.maxExams - 1])
    expect(after.members[memberId].concurso).toBeNull()
    const results = after.log.filter(
      (event) => event.type === 'concurso' && event.memberId === memberId,
    )
    expect(results).toEqual([expect.objectContaining({ level: null })])
  })

  it('com faculdade, quem passa só para técnico pode continuar estudando para analista', () => {
    const { state, memberId } = atJobChoice(23, {
      enem: 640,
      formation: { level: 'superior', degree: 'direito' },
    })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    expect(resultChoice(passed).options).toEqual([
      { kind: 'posse', level: 0 },
      { kind: 'estudar' },
      { kind: 'privada' },
    ])

    const studying = expectOk(
      applyAction(passed, { type: 'choose', picks: [{ memberId, option: 1 }] }),
    ).state
    expect(studying.members[memberId].concurso).toMatchObject({ exams: 1 })
    expect(studying.members[memberId].career).toBeNull()

    const next = play(studying, years(1), 'concurso')
    expect(examDate(next)).toBe(BALANCE.concurso.examDates[1])
    const [top] = resultChoice(next).options
    const hired = expectOk(applyAction(next, { type: 'choose', picks: [{ memberId, option: 0 }] }))
    expect(top.kind).toBe('posse')
    expect(hired.state.members[memberId].career?.level).toBe(top.kind === 'posse' ? top.level : -1)
  })

  it('dá o mesmo resultado de uma vez ou aos poucos até o resultado do concurso', () => {
    const { state, memberId } = atJobChoice(24, { enem: 700 })
    const studying = chooseConcurso(state, memberId).state
    const atOnce = advance(studying, years(1)).state
    let stepwise = studying
    for (let elapsed = 0; elapsed < years(1); elapsed += 1_000) {
      stepwise = advance(stepwise, 1_000).state
    }
    expect(resultChoice(atOnce).memberId).toBe(memberId)
    expectSameState(atOnce, stepwise)
  })
})
