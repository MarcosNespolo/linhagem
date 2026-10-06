import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { concursoOf } from '@/content/careers'
import {
  advance,
  applyAction,
  calendarDate,
  checkStudyForConcurso,
  familyRates,
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
  makeStart,
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

  it('com ensino médio, quem passa com nota alta toma posse como técnico federal, o cargo mais alto que o médio permite', () => {
    // 760 de partida e dois meses de estudo passam de 700 mesmo com o sorteio contra.
    const { state, memberId } = atJobChoice(21, { enem: 760 })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    const choice = resultChoice(passed)
    const day = passed.clock.day
    expect(examDate(passed)).toBe(BALANCE.concurso.examDates[0])
    expect(choice.options).toEqual([
      { kind: 'posse', careerId: 'tecnicoFederal' },
      { kind: 'privada' },
    ])
    expect(choice.score).toBeGreaterThanOrEqual(concursoOf('tecnicoFederal').cutoff)
    expect(passed.log).toContainEqual({
      type: 'concurso',
      day,
      memberId,
      score: choice.score,
      careerId: 'tecnicoFederal',
    })

    const hired = expectOk(
      applyAction(passed, { type: 'choose', picks: [{ memberId, option: 0 }] }),
    )
    const member = hired.state.members[memberId]
    expect(member.career).toEqual({ id: 'tecnicoFederal', level: 0, levelSince: day })
    expect(member.concurso).toBeNull()
    expect(hired.events).toEqual([
      { type: 'firstJob', day, memberId, careerId: 'tecnicoFederal', level: 0 },
    ])
    expect(memberIncome(member, day)).toBeGreaterThan(0)
  })

  it('com nota mais baixa, passa para um cargo menor e pode seguir estudando para o maior', () => {
    // 560 e dois meses de estudo: entre 540 e 620, passa só para a prefeitura.
    const { state, memberId } = atJobChoice(21, { enem: 560 })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    expect(resultChoice(passed).options).toEqual([
      { kind: 'posse', careerId: 'prefeitura' },
      { kind: 'estudar' },
      { kind: 'privada' },
    ])
  })

  it('desistir do cargo abre a escolha de emprego, sem o concurso', () => {
    const { state, memberId } = atJobChoice(21, { enem: 760 })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    const declined = expectOk(
      applyAction(passed, { type: 'choose', picks: [{ memberId, option: 1 }] }),
    ).state
    expect(declined.members[memberId].concurso).toBeNull()
    expect(declined.choices.map((choice) => choice.type)).toEqual(['firstJob'])
    expect((declined.choices[0] as JobChoice).concurso).toBe(false)
  })

  it('quem não passa em nenhuma das quatro provas decide se continua estudando ou vai trabalhar', () => {
    // 300 de partida e 11 meses de estudo não chegam a nenhum corte, nem com o sorteio a favor.
    const { state, memberId } = atJobChoice(22, { enem: 300 })
    const studying = chooseConcurso(state, memberId).state
    const since = studying.members[memberId].concurso!.since
    const after = play(studying, years(2), 'firstJob')
    expect(after.choices.map((choice) => choice.type)).toEqual(['firstJob'])
    const choice = after.choices[0] as JobChoice
    expect(choice.concurso).toBe(true)
    expect(examDate(after)).toBe(BALANCE.concurso.examDates[BALANCE.concurso.maxExams - 1])
    // O estudo fica de pé, com a nota que juntou, até a resposta.
    expect(after.members[memberId].concurso).toMatchObject({
      since,
      exams: BALANCE.concurso.maxExams,
    })
    const results = after.log.filter(
      (event) => event.type === 'concurso' && event.memberId === memberId,
    )
    expect(results).toEqual([expect.objectContaining({ careerId: null })])

    // Continuar: mais uma tentativa, contando os meses desde o começo, sem acontecimento novo.
    const continued = expectOk(
      applyAction(after, { type: 'choose', picks: [{ memberId, option: choice.offers.length }] }),
    )
    expect(continued.events).toEqual([])
    expect(continued.state.members[memberId].concurso).toEqual({
      since,
      exams: 0,
      lastScore: expect.any(Number),
    })

    // Trabalhar: o estudo acaba.
    const working = expectOk(
      applyAction(after, { type: 'choose', picks: [{ memberId, option: 0 }] }),
    ).state
    expect(working.members[memberId].concurso).toBeNull()
    expect(working.members[memberId].career).toMatchObject({ id: choice.offers[0].careerId })
  })

  it('com faculdade, quem passa só para técnico pode continuar estudando para analista', () => {
    const { state, memberId } = atJobChoice(23, {
      enem: 640,
      formation: { level: 'superior', degree: 'direito' },
    })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    expect(resultChoice(passed).options).toEqual([
      { kind: 'posse', careerId: expect.stringMatching(/^(estado|tecnicoFederal)$/) },
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
    expect(hired.state.members[memberId].career).toMatchObject({
      id: top.kind === 'posse' ? top.careerId : '',
      level: 0,
    })
  })

  it('só com faculdade dá para chegar a analista e à auditoria, com nota bem alta', () => {
    const { state, memberId } = atJobChoice(23, {
      enem: 900,
      formation: { level: 'superior', degree: 'direito' },
    })
    const passed = play(chooseConcurso(state, memberId).state, years(1), 'concurso')
    expect(resultChoice(passed).options).toEqual([
      { kind: 'posse', careerId: 'auditoria' },
      { kind: 'privada' },
    ])
    const medio = atJobChoice(23, { enem: 900 })
    const passedMedio = play(
      chooseConcurso(medio.state, medio.memberId).state,
      years(1),
      'concurso',
    )
    expect(resultChoice(passedMedio).options[0]).toEqual({
      kind: 'posse',
      careerId: 'tecnicoFederal',
    })
  })

  it('quem trabalha e tem o ensino médio pode largar o emprego para estudar', () => {
    const start = makeStart(25)
    const [founder] = Object.values(start.members)
    expect(checkStudyForConcurso(start, founder.id)).toEqual({ ok: true })
    const quit = expectOk(applyAction(start, { type: 'studyForConcurso', memberId: founder.id }))
    expect(quit.events).toEqual([
      { type: 'quitJob', day: 0, memberId: founder.id },
      { type: 'concursoStarted', day: 0, memberId: founder.id },
    ])
    const member = quit.state.members[founder.id]
    expect(member.career).toBeNull()
    expect(member.concurso).toEqual({ since: 0, exams: 0, lastScore: null })
    expect(memberIncome(member, 0)).toBe(0)
    // Na casa dos pais, sem salário, só paga o custo de vida e o cursinho.
    expect(familyRates(quit.state).income).toBe(0)
    expect(familyRates(quit.state).expense).toBe(memberExpense(member, 0))
    expect(quit.state.log.map((event) => event.type)).toEqual(['quitJob', 'concursoStarted'])

    // Com a nota de partida alta, passa na primeira prova e toma posse.
    const strong = setMember(quit.state, founder.id, { aptitude: 700 })
    const passed = play(strong, years(1), 'concurso')
    expect(resultChoice(passed).options[0]).toMatchObject({ kind: 'posse' })

    // Quem não trabalha, está em curso, aposentou ou tem escolha aberta não larga nada.
    expect(checkStudyForConcurso(quit.state, founder.id)).toEqual({
      ok: false,
      error: 'notWorking',
    })
    const studying = expectOk(
      applyAction(start, { type: 'startCourse', memberId: founder.id, dedicated: false }),
    ).state
    expect(checkStudyForConcurso(studying, founder.id)).toEqual({ ok: false, error: 'inCourse' })
    const retired = setMember(start, founder.id, {
      birthDay: -BALANCE.retirementAge * BALANCE.daysPerYear,
    })
    expect(checkStudyForConcurso(retired, founder.id)).toEqual({ ok: false, error: 'notWorking' })
    expect(applyAction(start, { type: 'studyForConcurso', memberId: 'm99' })).toEqual({
      ok: false,
      error: 'memberNotFound',
    })
  })

  it('dá o mesmo resultado de uma vez ou aos poucos até o resultado do concurso', () => {
    const { state, memberId } = atJobChoice(24, { enem: 760 })
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
