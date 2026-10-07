import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { degree } from '@/content/schools'
import {
  applyAction,
  calendarDate,
  checkLeaveSchool,
  checkReturnToSchool,
  checkStudyForConcurso,
  classesStartDay,
  courseOffer,
  feesOf,
  GRADUATION_OPTIONS,
  memberIncome,
  newGame,
  schoolFee,
  type Choice,
  type GameState,
  type PathOption,
} from '@/engine'
import {
  days,
  expectOk,
  lastMember,
  makeGame,
  makeStart,
  play,
  setMember,
  singlePolicy,
  START,
  withChild,
  withMoney,
  years,
} from '../helpers'

type PathChoice = Extract<Choice, { type: 'afterSchool' }>
type GraduationChoice = Extract<Choice, { type: 'graduation' }>

/** Quem funda a família com dinheiro de sobra e a nota do ENEM pedida. */
function withEnem(state: GameState, enem: number | null): GameState {
  const founder = state.members.m1
  return setMember(withMoney(state, 1_000_000), 'm1', {
    education: { ...founder.education, enem },
  })
}

/** Volta a estudar e devolve a escolha do que estudar. */
function returnToSchool(state: GameState): { state: GameState; choice: PathChoice } {
  const next = expectOk(applyAction(state, { type: 'returnToSchool', memberId: 'm1' })).state
  const choice = next.choices.find(
    (open): open is PathChoice => open.type === 'afterSchool' && open.memberId === 'm1',
  )
  if (!choice) throw new Error('A escolha do que estudar não abriu')
  return { state: next, choice }
}

/** Responde a escolha do que estudar com o primeiro caminho disponível que combina. */
function pick(state: GameState, choice: PathChoice, match: (option: PathOption) => boolean) {
  const option = choice.options.findIndex((candidate) => candidate.available && match(candidate))
  if (option < 0) throw new Error('Nenhum caminho disponível combina')
  const picks = [{ memberId: choice.memberId, option }]
  return expectOk(applyAction(state, { type: 'choose', picks })).state
}

/** Joga até a formatura de quem estuda à noite e devolve a escolha que ela abre. */
function graduate(state: GameState): { state: GameState; choice: GraduationChoice } {
  const next = play(state, years(7), 'graduation', singlePolicy)
  const choice = next.choices.find((open): open is GraduationChoice => open.type === 'graduation')
  if (!choice) throw new Error('A escolha da formatura não abriu')
  return { state: next, choice }
}

function answer(state: GameState, option: number): GameState {
  return expectOk(applyAction(state, { type: 'choose', picks: [{ memberId: 'm1', option }] })).state
}

/** À noite, a Licenciatura dura um ano a mais. */
const nightYears = degree('licenciatura').years + BALANCE.college.night.extraYears

const teaching = (option: PathOption) =>
  option.path === 'faculdade' && option.network === 'particular' && option.degree === 'licenciatura'

const computing = (option: PathOption) =>
  option.path === 'faculdade' && option.network === 'particular' && option.degree === 'computacao'

describe('voltar a estudar trabalhando', () => {
  it('quem nunca fez o ENEM faz agora e ganha os caminhos de quem termina o médio', () => {
    const start = withEnem(makeStart(), null)
    expect(checkReturnToSchool(start, 'm1')).toEqual({ ok: true })
    const { state, choice } = returnToSchool(start)
    expect(state.members.m1.education.enem).toBe(choice.enem)
    expect(state.log.at(-1)).toEqual({ type: 'enem', day: 0, memberId: 'm1', score: choice.enem })
    expect(new Set(choice.options.map((option) => option.path))).toEqual(
      new Set(['faculdade', 'tecnico', 'cursinho', 'trabalho']),
    )
  })

  it('quem já fez o ENEM volta com a nota que tem, sem prova nova', () => {
    const { state, choice } = returnToSchool(withEnem(makeStart(), 650))
    expect(choice.enem).toBe(650)
    expect(state.log.some((event) => event.type === 'enem')).toBe(false)
  })

  it('à noite, só nas particulares: a federal e o instituto federal são em tempo integral', () => {
    const { choice } = returnToSchool(withEnem(makeStart(), 900))
    const federal = choice.options.filter(
      (option) => option.path === 'faculdade' && option.network === 'federal',
    )
    expect(federal.length).toBeGreaterThan(0)
    expect(federal.every((option) => !option.available)).toBe(true)
    const technical = choice.options.filter((option) => option.path === 'tecnico')
    expect(
      technical.every((option) => option.path === 'tecnico' && option.network === 'particular'),
    ).toBe(true)
    // Sem a federal, a sugestão é não estudar agora.
    expect(choice.options[choice.suggested].path).toBe('trabalho')
  })

  it('não estudar agora fecha a escolha, e a pessoa continua no emprego', () => {
    const start = withEnem(makeStart(), 650)
    const { state, choice } = returnToSchool(start)
    const kept = pick(state, choice, (option) => option.path === 'trabalho')
    expect(kept.choices).toEqual([])
    expect(kept.members.m1.career).toEqual(start.members.m1.career)
    expect(kept.members.m1.education.school).toBeNull()
  })

  it('no meio do ano, as aulas começam em janeiro; o salário continua e o curso de promoção espera', () => {
    const start = withEnem(makeStart(), 650)
    expect(courseOffer(start.members.m1, 0, false)).not.toBeNull()
    const { state, choice } = returnToSchool(start)
    const enrolled = pick(state, choice, teaching)
    const member = enrolled.members.m1
    const startsOn = classesStartDay(enrolled)
    expect(startsOn).toBeGreaterThan(0)
    expect(calendarDate(enrolled.startDate, startsOn).slice(5)).toBe(BALANCE.school.enrollmentDate)
    expect(member.education.school).toEqual({
      stage: 'faculdade',
      network: 'particular',
      degree: 'licenciatura',
      yearsLeft: nightYears,
      startsOn,
      night: true,
    })
    // Até janeiro, nada de mensalidade.
    expect(feesOf(member, 0)).toBe(0)
    expect(memberIncome(member, 0)).toBe(memberIncome(start.members.m1, 0))
    expect(courseOffer(member, 0, false)).toBeNull()

    const january = play(enrolled, days(startsOn + 1), undefined, singlePolicy)
    const student = january.members.m1
    expect(student.education.school?.startsOn).toBeUndefined()
    expect(student.education.school?.yearsLeft).toBe(nightYears)
    expect(feesOf(student, january.clock.day)).toBe(schoolFee(student.education.school))
  })

  it('em janeiro, as aulas começam na hora', () => {
    const start = withEnem(newGame({ seed: 1, now: START.now, startDate: '2027-01-01' }), 650)
    const { state, choice } = returnToSchool(start)
    const enrolled = pick(state, choice, teaching)
    expect(enrolled.members.m1.education.school?.startsOn).toBeUndefined()
    expect(enrolled.members.m1.education.school?.yearsLeft).toBe(nightYears)
    expect(feesOf(enrolled.members.m1, 0)).toBe(degree('licenciatura').fee)
  })

  it('formado, escolhe entre continuar no emprego e começar do zero na área', () => {
    const { state, choice } = returnToSchool(withEnem(makeStart(), 650))
    const graduated = graduate(pick(state, choice, teaching))
    const member = graduated.state.members.m1
    expect(member.education.formation).toEqual({ level: 'superior', degree: 'licenciatura' })
    expect(member.education.school).toBeNull()
    expect(graduated.choice.offer).toEqual({ careerId: 'educacao', level: 0 })
    // Professor ganha mais que o primeiro nível de quem fundou a família: a sugestão é a área.
    expect(graduated.choice.suggested).toBe(GRADUATION_OPTIONS.start)

    const day = graduated.state.clock.day
    const started = answer(graduated.state, GRADUATION_OPTIONS.start)
    expect(started.members.m1.career).toEqual({ id: 'educacao', level: 0, levelSince: day })
    expect(started.log.at(-1)).toEqual({
      type: 'startedOver',
      day,
      memberId: 'm1',
      careerId: 'educacao',
      level: 0,
    })
    const stayed = answer(graduated.state, GRADUATION_OPTIONS.stay)
    expect(stayed.members.m1.career).toEqual(member.career)
  })

  it('na mesma carreira, um nível acima, a formatura é uma promoção', () => {
    const base = withEnem(makeStart(), 720)
    const start = setMember(base, 'm1', {
      career: { id: 'tecnologia', level: 0, levelSince: 0 },
      education: {
        ...base.members.m1.education,
        formation: { level: 'tecnico', course: 'informatica' },
      },
    })
    const { state, choice } = returnToSchool(start)
    const graduated = graduate(pick(state, choice, computing))
    expect(graduated.choice.offer).toEqual({ careerId: 'tecnologia', level: 1 })
    const promoted = answer(graduated.state, GRADUATION_OPTIONS.start)
    const day = graduated.state.clock.day
    expect(promoted.members.m1.career).toEqual({ id: 'tecnologia', level: 1, levelSince: day })
    expect(promoted.log.at(-1)?.type).toBe('promoted')
  })

  it('quem já passou do nível da área se forma sem escolha nenhuma', () => {
    const base = withEnem(makeStart(), 720)
    const start = setMember(base, 'm1', {
      career: { id: 'tecnologia', level: 2, levelSince: 0 },
      education: {
        ...base.members.m1.education,
        formation: { level: 'tecnico', course: 'informatica' },
      },
    })
    const { state, choice } = returnToSchool(start)
    const later = play(pick(state, choice, computing), years(7), 'graduation', singlePolicy)
    expect(later.choices.some((open) => open.type === 'graduation')).toBe(false)
    expect(later.members.m1.education.formation).toEqual({
      level: 'superior',
      degree: 'computacao',
    })
    expect(later.members.m1.career?.id).toBe('tecnologia')
  })

  it('cursinho à noite: o ENEM seguinte vem com os pontos, e a escolha volta', () => {
    const { state, choice } = returnToSchool(withEnem(makeStart(), 600))
    const preparing = pick(state, choice, (option) => option.path === 'cursinho')
    const again = play(preparing, years(3), 'afterSchool', singlePolicy)
    const reopened = again.choices.find((open): open is PathChoice => open.type === 'afterSchool')
    expect(reopened?.enem).toBe(600 + BALANCE.college.prep.points)
    if (!reopened) return
    const kept = pick(again, reopened, (option) => option.path === 'trabalho')
    expect(kept.choices).toEqual([])
    expect(kept.members.m1.career).not.toBeNull()
  })

  it('parar de estudar tira a matrícula, sem formação', () => {
    const { state, choice } = returnToSchool(withEnem(makeStart(), 650))
    const enrolled = pick(state, choice, teaching)
    expect(checkLeaveSchool(enrolled, 'm1')).toEqual({ ok: true })
    const left = expectOk(applyAction(enrolled, { type: 'leaveSchool', memberId: 'm1' })).state
    expect(left.members.m1.education.school).toBeNull()
    expect(checkLeaveSchool(left, 'm1')).toEqual({ ok: false, error: 'notStudying' })
    const later = play(left, years(6), 'graduation', singlePolicy)
    expect(later.members.m1.education.formation).toEqual({ level: 'medio' })
  })

  it('quem não trabalha, faz curso, tem escolha aberta ou já estuda não volta a estudar', () => {
    const family = withChild(makeGame())
    expect(checkReturnToSchool(family, lastMember(family).id)).toEqual({
      ok: false,
      error: 'notWorking',
    })
    const start = withEnem(makeStart(), 650)
    const retired = setMember(start, 'm1', {
      birthDay: -BALANCE.retirementAge * BALANCE.daysPerYear,
    })
    expect(checkReturnToSchool(retired, 'm1')).toEqual({ ok: false, error: 'notWorking' })
    const inCourse = expectOk(
      applyAction(start, { type: 'startCourse', memberId: 'm1', dedicated: false }),
    ).state
    expect(checkReturnToSchool(inCourse, 'm1')).toEqual({ ok: false, error: 'inCourse' })
    const { state, choice } = returnToSchool(start)
    expect(checkReturnToSchool(state, 'm1')).toEqual({ ok: false, error: 'choiceOpen' })
    const enrolled = pick(state, choice, teaching)
    expect(checkReturnToSchool(enrolled, 'm1')).toEqual({ ok: false, error: 'alreadyStudying' })
    // Quem estuda à noite também não larga o emprego para o concurso.
    expect(checkStudyForConcurso(enrolled, 'm1')).toEqual({ ok: false, error: 'alreadyStudying' })
  })
})
