import { BALANCE } from '../content/balance'
import {
  isHigherStage,
  TECH_COURSES,
  type Network,
  type SchoolStage,
  type TechCourseId,
} from '../content/schools'
import { advanceHigherEducation, openAfterSchoolChoice } from './college'
import { memberIncome } from './economy'
import { refuse, type Refusal } from './errors'
import { isAlive } from './members'
import type { Rng } from './rng'
import { halfTimeCaregivers, schoolScore, stageFee, stageForAge, yearlyPoints } from './school'
import { ageInYears, calendarDate, lastDayOfYear } from './time'
import { canHaveTutor, settleTutor } from './tutor'
import type {
  Choice,
  Enrollment,
  GameEvent,
  GameState,
  Member,
  MemberId,
  SchoolOption,
} from './types'

type SchoolChoice = Extract<Choice, { type: 'school' }>

/** Hoje é o dia das matrículas no calendário? */
export function isEnrollmentDay(state: GameState): boolean {
  return calendarDate(state.startDate, state.clock.day).slice(5) === BALANCE.school.enrollmentDate
}

/** Idade que a pessoa faz no ano do calendário do dia `day`. */
export function ageThisYear(member: Member, startDate: string, day: number): number {
  return ageInYears(member.birthDay, lastDayOfYear(startDate, day))
}

/**
 * Matrículas do ano, no dia das matrículas. Quem continua na mesma etapa soma
 * os pontos do ano (e muda de rede, se o jogador pediu); quem termina o ensino
 * médio ganha a formação e faz o ENEM; quem começa uma etapa nova ganha uma
 * escolha aberta, e o relógio para até o jogador responder. Cursinho, técnico e
 * faculdade andam um ano. Os pontos do professor particular entram antes, e ele
 * vai embora com quem sai da escola. Altera o rascunho.
 */
export function processEnrollment(draft: GameState, rng: Rng, events: GameEvent[]): void {
  const day = draft.clock.day
  for (const member of Object.values(draft.members)) {
    if (member.deathDay !== null) continue
    settleTutor(member, day)
    enrollMember(draft, rng, member, events)
    if (member.education.tutorSince !== null && !canHaveTutor(member)) {
      member.education.tutorSince = null
    }
  }
}

function enrollMember(draft: GameState, rng: Rng, member: Member, events: GameEvent[]): void {
  const day = draft.clock.day
  const school = member.education.school
  if (school && isHigherStage(school.stage)) {
    advanceHigherEducation(draft, rng, member, school, events)
    return
  }
  const stage = stageForAge(ageThisYear(member, draft.startDate, day))
  if (!stage) {
    if (school) finishSchool(draft, rng, member, school, events)
    return
  }
  if (school?.stage === stage) {
    continueSchool(member, school, stage, day, events)
    return
  }
  openSchoolChoice(draft, rng, member, stage)
}

function finishSchool(
  draft: GameState,
  rng: Rng,
  member: Member,
  school: Enrollment,
  events: GameEvent[],
): void {
  member.education.school = null
  member.education.past[school.stage] = school.network
  if (school.stage !== 'medio') return
  const formation =
    school.network === 'federal' && school.course
      ? { level: 'tecnico' as const, course: school.course }
      : { level: 'medio' as const }
  member.education.formation = formation
  events.push({ type: 'schoolFinished', day: draft.clock.day, memberId: member.id, formation })
  openAfterSchoolChoice(draft, rng, member, events)
}

function continueSchool(
  member: Member,
  school: Enrollment,
  stage: SchoolStage,
  day: number,
  events: GameEvent[],
) {
  if (school.next && school.next !== school.network) {
    school.network = school.next
    delete school.course
    events.push({ type: 'schoolChanged', day, memberId: member.id, network: school.network })
  }
  delete school.next
  member.education.points += yearlyPoints(stage, school.network)
}

function openSchoolChoice(draft: GameState, rng: Rng, member: Member, stage: SchoolStage): void {
  const options = schoolOptions(draft, rng, member, stage)
  draft.choices.push({
    type: 'school',
    memberId: member.id,
    day: draft.clock.day,
    stage,
    options,
    suggested: suggestSchool(draft, member, stage, options),
  })
}

/** Opções de matrícula da etapa. As que não dá para escolher aparecem com o motivo na tela. */
function schoolOptions(
  draft: GameState,
  rng: Rng,
  member: Member,
  stage: SchoolStage,
): SchoolOption[] {
  switch (stage) {
    case 'creche': {
      const vacancy = rng.chance(BALANCE.school.daycareVacancyChance)
      const options: SchoolOption[] = [
        { network: 'publica', available: vacancy },
        { network: 'particular', available: true },
      ]
      if (retiredGrandparents(draft, member).length > 0) {
        options.push({ network: 'avos', available: true })
      }
      options.push({ network: 'casa', available: true })
      return options
    }
    case 'escola':
      return [
        { network: 'publica', available: true },
        { network: 'particular', available: true },
      ]
    case 'medio': {
      const courses = rollFederalCourses(rng)
      const options: SchoolOption[] = [
        { network: 'publica', available: true },
        { network: 'particular', available: true },
      ]
      if (schoolScore(member) >= BALANCE.school.federalCutoff) {
        for (const course of courses) options.push({ network: 'federal', course, available: true })
      } else {
        options.push({ network: 'federal', available: false })
      }
      return options
    }
  }
}

/** Cursos técnicos que o instituto federal oferece nesta matrícula, sem repetir. */
function rollFederalCourses(rng: Rng): TechCourseId[] {
  const pool: TechCourseId[] = TECH_COURSES.map((course) => course.id)
  const courses: TechCourseId[] = []
  const count = Math.min(BALANCE.school.federalCourses, pool.length)
  for (let i = 0; i < count; i++) {
    const index = rng.int(0, pool.length - 1)
    courses.push(pool[index])
    pool.splice(index, 1)
  }
  return courses
}

/**
 * Sugestão de matrícula: o instituto federal para quem passou na prova (é
 * gratuito e soma mais pontos), senão a rede do irmão mais velho nessa etapa,
 * senão a opção mais barata.
 */
function suggestSchool(
  draft: GameState,
  member: Member,
  stage: SchoolStage,
  options: readonly SchoolOption[],
): number {
  const find = (network: Network) =>
    options.findIndex((option) => option.available && option.network === network)

  const federal = find('federal')
  if (federal >= 0) return federal

  const sibling = siblingNetwork(draft, member, stage)
  if (sibling && find(sibling) >= 0) return find(sibling)

  if (stage === 'creche') {
    for (const network of ['publica', 'avos'] as const) {
      if (find(network) >= 0) return find(network)
    }
    return homeCareCost(draft, member) <= stageFee('creche', 'particular')
      ? find('casa')
      : find('particular')
  }
  return find('publica')
}

/** Rede em que o irmão mais velho mais próximo fez (ou faz) essa etapa. */
function siblingNetwork(draft: GameState, member: Member, stage: SchoolStage): Network | null {
  const older = siblingsOf(draft, member)
    .filter((sibling) => sibling.birthDay < member.birthDay)
    .sort((a, b) => b.birthDay - a.birthDay)
  for (const sibling of older) {
    const { school, past } = sibling.education
    const network = school?.stage === stage ? school.network : past[stage]
    if (network) return network
  }
  return null
}

/** Irmãos: filhos dos mesmos pais. */
function siblingsOf(draft: GameState, member: Member): Member[] {
  if (member.parentIds.length === 0) return []
  const parents = [...member.parentIds].sort().join(',')
  return Object.values(draft.members).filter(
    (other) => other.id !== member.id && [...other.parentIds].sort().join(',') === parents,
  )
}

/** Avós vivos e aposentados, que podem cuidar da criança. */
export function retiredGrandparents(state: GameState, member: Member): Member[] {
  const grandparents = member.parentIds.flatMap((id) => state.members[id]?.parentIds ?? [])
  return grandparents
    .map((id) => state.members[id])
    .filter(
      (person): person is Member =>
        person !== undefined &&
        isAlive(person) &&
        ageInYears(person.birthDay, state.clock.day) >= BALANCE.retirementAge,
    )
}

/** Quem fica em meio período se a criança ficar em casa: o pai ou a mãe vivo que ganha menos. */
export function homeCaregiver(state: GameState, member: Member): Member | undefined {
  const parents = member.parentIds
    .map((id) => state.members[id])
    .filter((parent): parent is Member => parent !== undefined && isAlive(parent))
  let caregiver: Member | undefined
  for (const parent of parents) {
    if (
      !caregiver ||
      memberIncome(parent, state.clock.day) < memberIncome(caregiver, state.clock.day)
    ) {
      caregiver = parent
    }
  }
  return caregiver
}

/**
 * Quanto a família deixa de ganhar por mês se a criança ficar em casa. Zero se
 * quem cuida já está em meio período por um irmão, ou se não trabalha.
 */
export function homeCareCost(state: GameState, member: Member): number {
  const caregiver = homeCaregiver(state, member)
  if (!caregiver || halfTimeCaregivers(state).has(caregiver.id)) return 0
  return memberIncome(caregiver, state.clock.day) * (1 - BALANCE.school.halfTimeRatio)
}

/** Aplica no rascunho a opção escolhida numa matrícula e devolve o acontecimento. */
export function applySchoolPick(draft: GameState, choice: SchoolChoice, option: number): GameEvent {
  const member = draft.members[choice.memberId]
  const { network, course } = choice.options[option]
  const previous = member.education.school
  if (previous) member.education.past[previous.stage] = previous.network

  const school: Enrollment = { stage: choice.stage, network }
  if (course) school.course = course
  if (network === 'casa') {
    const caregiver = homeCaregiver(draft, member)
    if (caregiver) school.caregiverId = caregiver.id
  }
  member.education.school = school
  member.education.points += yearlyPoints(choice.stage, network)

  const event: Extract<GameEvent, { type: 'schoolStarted' }> = {
    type: 'schoolStarted',
    day: draft.clock.day,
    memberId: member.id,
    stage: choice.stage,
    network,
  }
  if (course) event.course = course
  return event
}

/** Confere um pedido de troca de rede para a próxima matrícula. */
export function checkChangeSchool(
  state: GameState,
  memberId: MemberId,
  network: Network,
): { ok: true; school: Enrollment } | Refusal {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  const school = member.education.school
  if (!school || school.stage === 'creche') return refuse('notStudying')
  if (network !== 'publica' && network !== 'particular') return refuse('invalidSchool')
  return { ok: true, school }
}
