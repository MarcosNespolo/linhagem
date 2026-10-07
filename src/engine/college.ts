import { BALANCE } from '../content/balance'
import { degree, DEGREES, isHigherStage, TECH_COURSES } from '../content/schools'
import { refuse, type Refusal } from './errors'
import { openFirstJobChoice, openGraduationChoice } from './jobs'
import { ageOf, isAlive } from './members'
import type { Rng } from './rng'
import { higherFormation, schoolScore } from './school'
import { calendarDate } from './time'
import type {
  Choice,
  Enrollment,
  Formation,
  GameEvent,
  GameState,
  Member,
  MemberId,
  PathOption,
} from './types'

type PathChoice = Extract<Choice, { type: 'afterSchool' }>

/** Nota do ENEM no dia: a nota da escola mais um sorteio, entre 0 e 1.000. */
export function rollEnem(rng: Rng, member: Member, day: number): number {
  const spread = BALANCE.college.enemSpread
  const score = Math.round(schoolScore(member, day)) + rng.int(-spread, spread)
  return Math.min(1000, Math.max(0, score))
}

/**
 * Faz o ENEM e abre no rascunho a escolha do que fazer depois do médio. O
 * relógio para até o jogador responder. Depois do cursinho, a nota vem pronta:
 * a do ENEM anterior mais os pontos do cursinho.
 */
export function openAfterSchoolChoice(
  draft: GameState,
  rng: Rng,
  member: Member,
  events: GameEvent[],
  enem: number = rollEnem(rng, member, draft.clock.day),
): void {
  member.education.enem = enem
  events.push({ type: 'enem', day: draft.clock.day, memberId: member.id, score: enem })
  pushPathChoice(draft, member, enem)
}

/**
 * Abre no rascunho a escolha dos caminhos que a nota do ENEM permite. Quem já
 * trabalha estuda à noite, só nas particulares.
 */
function pushPathChoice(draft: GameState, member: Member, enem: number): void {
  const options = pathOptions(enem, member.career !== null)
  draft.choices.push({
    type: 'afterSchool',
    memberId: member.id,
    day: draft.clock.day,
    enem,
    options,
    suggested: suggestPath(member, options),
  })
}

export type StudyCheck = { ok: true } | Refusal

/**
 * Diz se a pessoa pode voltar a estudar: viva, trabalhando (antes da
 * aposentadoria), com pelo menos o ensino médio, fora dos estudos, sem curso
 * de promoção em andamento e sem escolha aberta. Ela estuda à noite, sem
 * largar o emprego.
 */
export function checkReturnToSchool(state: GameState, memberId: MemberId): StudyCheck {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  if (!member.career || ageOf(member, state.clock.day) >= BALANCE.retirementAge) {
    return refuse('notWorking')
  }
  if (member.education.formation === null) return refuse('notStudying')
  if (member.education.school) return refuse('alreadyStudying')
  if (member.course) return refuse('inCourse')
  if (state.choices.some((choice) => choice.memberId === memberId)) return refuse('choiceOpen')
  return { ok: true }
}

/**
 * Abre a escolha de quem volta a estudar, com os caminhos de quem termina o
 * médio, à noite: faculdade particular, curso técnico particular e cursinho,
 * e trabalhar, que é não estudar agora. A universidade e o instituto federal
 * são em tempo integral, e aparecem fechados. Quem já fez o ENEM usa a nota
 * que tem; quem nunca fez, faz agora. Altera o rascunho.
 */
export function openReturnToSchool(
  draft: GameState,
  rng: Rng,
  member: Member,
  events: GameEvent[],
): void {
  const enem = member.education.enem
  if (enem === null) openAfterSchoolChoice(draft, rng, member, events)
  else pushPathChoice(draft, member, enem)
}

/**
 * Caminhos depois do médio: cada curso na universidade federal (só os que a
 * nota alcança) e na faculdade particular, cada área do técnico (no instituto
 * federal para quem tem a nota, senão particular), o cursinho e trabalhar. À
 * noite (`night`), para quem já trabalha, a federal fica fechada e o técnico é
 * o particular: as federais são em tempo integral.
 */
function pathOptions(enem: number, night: boolean): PathOption[] {
  const options: PathOption[] = []
  for (const course of DEGREES) {
    options.push({
      path: 'faculdade',
      network: 'federal',
      degree: course.id,
      available: !night && enem >= course.cutoff,
    })
  }
  for (const course of DEGREES) {
    options.push({ path: 'faculdade', network: 'particular', degree: course.id, available: true })
  }
  const network = !night && enem >= BALANCE.college.federalTechCutoff ? 'federal' : 'particular'
  for (const course of TECH_COURSES) {
    options.push({ path: 'tecnico', network, course: course.id, available: true })
  }
  options.push({ path: 'cursinho', available: true })
  options.push({ path: 'trabalho', available: true })
  return options
}

/**
 * Sugestão: o curso mais disputado que a nota alcança na universidade federal;
 * senão o técnico do instituto federal, para quem ainda não é técnico; senão
 * trabalhar.
 */
function suggestPath(member: Member, options: readonly PathOption[]): number {
  const federal = options.findIndex(
    (option) => option.path === 'faculdade' && option.network === 'federal' && option.available,
  )
  if (federal >= 0) return federal
  if (member.education.formation?.level !== 'tecnico') {
    const technical = options.findIndex(
      (option) => option.path === 'tecnico' && option.network === 'federal',
    )
    if (technical >= 0) return technical
  }
  return options.findIndex((option) => option.path === 'trabalho')
}

/**
 * Dia em que começam as aulas de quem se matricula hoje: hoje, no dia das
 * matrículas, ou o próximo dia das matrículas, em janeiro, para quem se
 * matricula no meio do ano, como quem volta a estudar trabalhando.
 */
export function classesStartDay(state: GameState): number {
  let day = state.clock.day
  while (calendarDate(state.startDate, day).slice(5) !== BALANCE.school.enrollmentDate) day += 1
  return day
}

/**
 * A matrícula de quem começa hoje: à noite, para quem já trabalha, com os anos
 * a mais do curso noturno (o cursinho dura o mesmo), e com o dia de começo das
 * aulas quando elas só começam depois de hoje.
 */
function starting(state: GameState, member: Member, school: Enrollment): Enrollment {
  const next = { ...school }
  if (member.career) {
    next.night = true
    if (school.stage !== 'cursinho') {
      next.yearsLeft = (school.yearsLeft ?? 1) + BALANCE.college.night.extraYears
    }
  }
  const start = classesStartDay(state)
  if (start > state.clock.day) next.startsOn = start
  return next
}

/**
 * Aplica no rascunho o caminho escolhido. Trabalhar abre na hora a escolha do
 * primeiro emprego, e quem já trabalha continua no emprego; os outros caminhos
 * viram matrícula.
 */
export function applyPathPick(
  draft: GameState,
  rng: Rng,
  choice: PathChoice,
  option: number,
): GameEvent[] {
  const member = draft.members[choice.memberId]
  const path = choice.options[option]
  const day = draft.clock.day
  switch (path.path) {
    case 'trabalho':
      if (!member.career) openFirstJobChoice(draft, rng, member)
      return []
    case 'cursinho':
      return [
        enroll(
          member,
          day,
          starting(draft, member, {
            stage: 'cursinho',
            network: 'particular',
            yearsLeft: BALANCE.college.prep.years,
          }),
        ),
      ]
    case 'tecnico':
      return [
        enroll(
          member,
          day,
          starting(draft, member, {
            stage: 'tecnico',
            network: path.network,
            course: path.course,
            yearsLeft: BALANCE.college.technical.years,
          }),
        ),
      ]
    case 'faculdade':
      return [
        enroll(
          member,
          day,
          starting(draft, member, {
            stage: 'faculdade',
            network: path.network,
            degree: path.degree,
            yearsLeft: degree(path.degree).years,
          }),
        ),
      ]
  }
}

/**
 * Diz se a pessoa pode parar de estudar: quem trabalha e está na faculdade, no
 * técnico ou no cursinho, à noite.
 */
export function checkLeaveSchool(state: GameState, memberId: MemberId): StudyCheck {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  const school = member.education.school
  if (!member.career || !school || !isHigherStage(school.stage)) return refuse('notStudying')
  return { ok: true }
}

function enroll(member: Member, day: number, school: Enrollment): GameEvent {
  member.education.school = school
  const event: Extract<GameEvent, { type: 'schoolStarted' }> = {
    type: 'schoolStarted',
    day,
    memberId: member.id,
    stage: school.stage,
    network: school.network,
  }
  if (school.course) event.course = school.course
  if (school.degree) event.degree = school.degree
  return event
}

/**
 * Um ano a mais no cursinho, no técnico ou na faculdade, no dia das matrículas.
 * No último ano, o cursinho soma os pontos e leva a um ENEM novo; o técnico e a
 * faculdade dão a formação e abrem a escolha do primeiro emprego, ou, para quem
 * estudou trabalhando, a de começar na carreira da área.
 */
export function advanceHigherEducation(
  draft: GameState,
  rng: Rng,
  member: Member,
  school: Enrollment,
  events: GameEvent[],
): void {
  // Quem se matriculou no meio do ano começa as aulas agora: o primeiro ano conta daqui.
  if (school.startsOn !== undefined) {
    if (draft.clock.day >= school.startsOn) delete school.startsOn
    return
  }
  const yearsLeft = school.yearsLeft ?? 1
  if (yearsLeft > 1) {
    school.yearsLeft = yearsLeft - 1
    return
  }
  member.education.school = null
  member.education.past[school.stage] = school.network
  if (school.stage === 'cursinho') {
    // O cursinho soma os pontos no ENEM seguinte, sem novo sorteio: a nota não cai.
    const { points } = BALANCE.college.prep
    const previous = member.education.enem
    member.education.points += points
    if (previous === null) openAfterSchoolChoice(draft, rng, member, events)
    else openAfterSchoolChoice(draft, rng, member, events, Math.min(1000, previous + points))
    return
  }
  const formation: Formation | null =
    school.stage === 'faculdade' && school.degree
      ? { level: 'superior', degree: school.degree }
      : school.course
        ? { level: 'tecnico', course: school.course }
        : null
  if (formation) {
    member.education.formation = higherFormation(member.education.formation, formation)
    events.push({ type: 'schoolFinished', day: draft.clock.day, memberId: member.id, formation })
  }
  if (!member.career) openFirstJobChoice(draft, rng, member)
  else if (formation) openGraduationChoice(draft, member, formation)
}
