import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import type { Network, SchoolStage } from '@/content/schools'
import {
  advance,
  ageOf,
  applyAction,
  calendarDate,
  deserialize,
  familyRates,
  halfTimeCaregivers,
  incomeOf,
  isMemberEvent,
  memberExpense,
  memberIncome,
  schoolScore,
  serialize,
  stageFee,
  yearlyPoints,
  type Choice,
  type GameState,
} from '@/engine'
import {
  chooseSuggested,
  days,
  expectClose,
  expectOk,
  founders,
  lastMember,
  makeGame,
  marryMember,
  play,
  setMember,
  untilParentAge,
  withAdultChild,
  withAptitude,
  withChild,
  withMoney,
  years,
} from '../helpers'

type SchoolChoice = Extract<Choice, { type: 'school' }>

/** Joga com as sugestões até abrir a matrícula pedida, que fica aberta. */
function untilEnrollment(
  start: GameState,
  memberId: string,
  stage: SchoolStage,
): { state: GameState; choice: SchoolChoice } {
  let state = start
  for (let round = 0; round < 40; round++) {
    state = play(state, years(30), 'school')
    const choice = state.choices.find(
      (open): open is SchoolChoice =>
        open.type === 'school' && open.memberId === memberId && open.stage === stage,
    )
    if (choice) return { state, choice }
    state = chooseSuggested(state)
  }
  throw new Error(`A matrícula de ${stage} não abriu`)
}

/** Responde a matrícula aberta com a rede pedida (a primeira opção dela que dá para escolher). */
function enroll(state: GameState, choice: SchoolChoice, network: Network): GameState {
  const option = choice.options.findIndex(
    (candidate) => candidate.network === network && candidate.available,
  )
  if (option < 0) throw new Error(`A rede ${network} não está disponível`)
  const picks = [{ memberId: choice.memberId, option }]
  return expectOk(applyAction(state, { type: 'choose', picks })).state
}

describe('matrículas', () => {
  it('abrem no primeiro janeiro depois de nascer, com a creche, e param o relógio', () => {
    const born = withChild(makeGame(2))
    const child = lastMember(born)
    const { state, events } = advance(born, years(1))

    expect(calendarDate(state.startDate, state.clock.day)).toBe('2027-01-01')
    expect(state.choices).toHaveLength(1)
    const choice = state.choices[0] as SchoolChoice
    expect(choice).toMatchObject({ type: 'school', memberId: child.id, stage: 'creche' })
    // Sem avós aposentados, a opção de deixar com eles nem aparece.
    expect(choice.options.map((option) => option.network)).toEqual([
      'publica',
      'particular',
      'casa',
    ])
    expect(choice.options[choice.suggested].available).toBe(true)
    expect(events.some((event) => event.type === 'schoolStarted')).toBe(false)
    expect(advance(state, 1_000).state).toBe(state)
  })

  it('a vaga na creche pública sai para cerca de metade das crianças', () => {
    let vacancies = 0
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = advance(withChild(makeGame(seed)), years(1))
      const choice = state.choices[0] as SchoolChoice
      if (choice.options[0].available) vacancies += 1
    }
    expect(vacancies).toBeGreaterThan(10)
    expect(vacancies).toBeLessThan(30)
  })

  it('a creche particular entra na despesa e soma pontos na nota', () => {
    const born = withChild(makeGame(3))
    const { state: waiting, choice } = untilEnrollment(born, lastMember(born).id, 'creche')
    const state = enroll(waiting, choice, 'particular')
    const child = state.members[choice.memberId]

    expect(child.education.school).toEqual({ stage: 'creche', network: 'particular' })
    expectClose(child.education.points, yearlyPoints('creche', 'particular'))
    expect(memberExpense(child, state.clock.day)).toBe(
      BALANCE.children.expenseBase + stageFee('creche', 'particular'),
    )
    expect(state.log.at(-1)).toEqual({
      type: 'schoolStarted',
      day: state.clock.day,
      memberId: child.id,
      stage: 'creche',
      network: 'particular',
    })
  })

  it('em casa, quem ganha menos no casal trabalha meio período até a criança sair da creche', () => {
    const born = withChild(makeGame(4))
    const childId = lastMember(born).id
    const { state: waiting, choice } = untilEnrollment(born, childId, 'creche')
    const state = enroll(waiting, choice, 'casa')
    const [first, second] = founders(state)
    const day = state.clock.day
    const caregiver = memberIncome(first, day) <= memberIncome(second, day) ? first : second

    expect(state.members[childId].education.school?.caregiverId).toBe(caregiver.id)
    expect(incomeOf(state, caregiver)).toBe(
      memberIncome(caregiver, day) * BALANCE.school.halfTimeRatio,
    )
    expect(familyRates(state).income).toBe(incomeOf(state, first) + incomeOf(state, second))

    const atSchool = untilEnrollment(state, childId, 'escola')
    const back = enroll(atSchool.state, atSchool.choice, 'publica')
    expect(halfTimeCaregivers(back).size).toBe(0)
    expect(incomeOf(back, back.members[caregiver.id])).toBe(
      memberIncome(back.members[caregiver.id], back.clock.day),
    )
  })

  it('deixar com os avós só aparece com avô ou avó aposentado vivo', () => {
    const { state: adult, childId } = withAdultChild(5)
    const married = untilParentAge(marryMember(adult, childId))
    const withGrandchild = (state: GameState) => {
      const born = expectOk(applyAction(state, { type: 'haveChild', parentId: childId })).state
      return advance(born, years(1)).state.choices.find(
        (open): open is SchoolChoice => open.type === 'school' && open.stage === 'creche',
      )
    }
    const networks = (choice?: SchoolChoice) => choice?.options.map((option) => option.network)

    expect(networks(withGrandchild(married))).not.toContain('avos')

    let retired = married
    for (const founder of founders(married)) {
      retired = setMember(retired, founder.id, {
        birthDay: married.clock.day - (BALANCE.retirementAge + 1) * BALANCE.daysPerYear,
        lifespan: 100,
      })
    }
    expect(networks(withGrandchild(retired))).toContain('avos')
  })

  it('a escola começa no ano em que a criança faz 4, sugerindo a rede do irmão mais velho', () => {
    let state = withMoney(withChild(makeGame(6)), 10_000_000)
    const olderId = lastMember(state).id
    state = play(state, days(BALANCE.children.cooldownDays))
    const [mother] = founders(state)
    state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
    const youngerId = lastMember(state).id

    const older = untilEnrollment(state, olderId, 'escola')
    const turns = Number(calendarDate(older.state.startDate, older.state.clock.day).slice(0, 4))
    const born = Number(
      calendarDate(older.state.startDate, state.members[olderId].birthDay).slice(0, 4),
    )
    expect(turns - born).toBe(BALANCE.school.stages.escola.firstAge)
    expect(older.choice.options[older.choice.suggested].network).toBe('publica')

    state = enroll(older.state, older.choice, 'particular')
    const younger = untilEnrollment(state, youngerId, 'escola')
    expect(younger.choice.options[younger.choice.suggested].network).toBe('particular')
  })

  it('o colégio particular soma os pontos da etapa ao longo dos anos dela', () => {
    const born = withChild(makeGame(7))
    const childId = lastMember(born).id
    const atSchool = untilEnrollment(born, childId, 'escola')
    const pointsBefore = atSchool.state.members[childId].education.points
    const start = enroll(atSchool.state, atSchool.choice, 'particular')

    const atHighSchool = untilEnrollment(start, childId, 'medio')
    const gained = atHighSchool.state.members[childId].education.points - pointsBefore
    expectClose(gained, BALANCE.school.stages.escola.points.particular)
  })

  it('o instituto federal aprova quem chega à nota de corte e vira a sugestão', () => {
    const born = withChild(makeGame(8))
    const child = lastMember(born)
    const strong = withAptitude(born, child.id, 650, 700)
    const { choice } = untilEnrollment(strong, child.id, 'medio')
    const federal = choice.options.filter((option) => option.network === 'federal')
    expect(federal).toHaveLength(BALANCE.school.federalCourses)
    expect(federal.every((option) => option.available && option.course)).toBe(true)
    expect(choice.options[choice.suggested].network).toBe('federal')

    const weak = withAptitude(born, child.id, 400, 450)
    const failed = untilEnrollment(weak, child.id, 'medio')
    expect(schoolScore(failed.state.members[child.id])).toBeLessThan(BALANCE.school.federalCutoff)
    expect(failed.choice.options.filter((option) => option.network === 'federal')).toEqual([
      { network: 'federal', available: false },
    ])
    const refused = applyAction(failed.state, {
      type: 'choose',
      picks: [{ memberId: child.id, option: failed.choice.options.length - 1 }],
    })
    expect(refused).toEqual({ ok: false, error: 'optionUnavailable' })
  })

  it('no ano em que faz 18, termina o médio com a formação e para de pagar mensalidade', () => {
    const born = withChild(makeGame(9))
    const child = lastMember(born)
    const strong = withAptitude(born, child.id, 650, 700)
    const { state: waiting, choice } = untilEnrollment(strong, child.id, 'medio')
    const federal = choice.options.find((option) => option.network === 'federal')
    let state = enroll(waiting, choice, 'federal')
    state = play(state, years(4), 'afterSchool')

    const grown = state.members[child.id]
    expect(grown.education.school).toBeNull()
    expect(grown.education.formation).toEqual({ level: 'tecnico', course: federal?.course })
    expect(grown.education.past).toMatchObject({ medio: 'federal' })
    expect(state.log).toContainEqual(
      expect.objectContaining({ type: 'schoolFinished', memberId: child.id }),
    )
    const age = ageOf(grown, state.clock.day)
    expect(memberExpense(grown, state.clock.day)).toBe(
      BALANCE.children.expenseBase + BALANCE.children.expensePerYear * age,
    )
  })

  it('trocar de rede vale na matrícula seguinte', () => {
    const born = withChild(makeGame(10))
    const childId = lastMember(born).id
    const atSchool = untilEnrollment(born, childId, 'escola')
    const state = enroll(atSchool.state, atSchool.choice, 'publica')

    const asked = expectOk(
      applyAction(state, { type: 'changeSchool', memberId: childId, network: 'particular' }),
    ).state
    expect(asked.members[childId].education.school).toEqual({
      stage: 'escola',
      network: 'publica',
      next: 'particular',
    })
    const undone = expectOk(
      applyAction(asked, { type: 'changeSchool', memberId: childId, network: 'publica' }),
    ).state
    expect(undone.members[childId].education.school).toEqual({
      stage: 'escola',
      network: 'publica',
    })

    const nextYear = play(asked, years(1))
    expect(nextYear.members[childId].education.school).toEqual({
      stage: 'escola',
      network: 'particular',
    })
    expect(nextYear.log).toContainEqual(
      expect.objectContaining({ type: 'schoolChanged', memberId: childId, network: 'particular' }),
    )

    expect(
      applyAction(state, { type: 'changeSchool', memberId: childId, network: 'federal' }),
    ).toEqual({ ok: false, error: 'invalidSchool' })
    const [founder] = founders(state)
    expect(
      applyAction(state, { type: 'changeSchool', memberId: founder.id, network: 'particular' }),
    ).toEqual({ ok: false, error: 'notStudying' })
  })

  it('três filhos passam por todas as matrículas até os 17 anos', () => {
    let state = withMoney(makeGame(11), 10_000_000)
    const [mother] = founders(state)
    const children: string[] = []
    for (let i = 0; i < 3; i++) {
      state = expectOk(applyAction(state, { type: 'haveChild', parentId: mother.id })).state
      children.push(lastMember(state).id)
      state = play(state, days(BALANCE.children.cooldownDays))
    }
    state = play(state, years(20))

    for (const childId of children) {
      const events = state.log.filter(isMemberEvent).filter((event) => event.memberId === childId)
      const started = events.flatMap((event) =>
        event.type === 'schoolStarted' ? [event.stage] : [],
      )
      expect(started.slice(0, 3)).toEqual(['creche', 'escola', 'medio'])
      expect(events.some((event) => event.type === 'schoolFinished')).toBe(true)
      expect(state.members[childId].education.formation).not.toBeNull()
    }
  })

  it('o save da versão 3 põe crianças e jovens na rede pública da idade', () => {
    let state = withChild(makeGame(12))
    const childId = lastMember(state).id
    const [first] = founders(state)
    state = setMember(state, childId, { birthDay: -7 * BALANCE.daysPerYear })
    const raw = JSON.parse(serialize(state)) as {
      schemaVersion: number
      members: Record<string, Record<string, unknown>>
    }
    raw.schemaVersion = 3
    for (const member of Object.values(raw.members)) delete member.education

    const migrated = deserialize(JSON.stringify(raw))
    expect(migrated.members[childId].education).toEqual({
      school: { stage: 'escola', network: 'publica' },
      points: 0,
      past: {},
      formation: null,
      enem: null,
      tutorSince: null,
    })
    expect(migrated.members[first.id].education.formation).toEqual({ level: 'medio' })
  })
})
