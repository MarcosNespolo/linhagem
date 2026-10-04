import { BALANCE } from '../content/balance'
import { degree, DEGREES, TECH_COURSES } from '../content/schools'
import { openFirstJobChoice } from './jobs'
import type { Rng } from './rng'
import { higherFormation, schoolScore } from './school'
import type {
  Choice,
  Enrollment,
  Formation,
  GameEvent,
  GameState,
  Member,
  PathOption,
} from './types'

type PathChoice = Extract<Choice, { type: 'afterSchool' }>

/** Nota do ENEM: a nota da escola mais um sorteio, entre 0 e 1.000. */
export function rollEnem(rng: Rng, member: Member): number {
  const spread = BALANCE.college.enemSpread
  const score = Math.round(schoolScore(member)) + rng.int(-spread, spread)
  return Math.min(1000, Math.max(0, score))
}

/**
 * Faz o ENEM e abre no rascunho a escolha do que fazer depois do médio. O
 * relógio para até o jogador responder.
 */
export function openAfterSchoolChoice(
  draft: GameState,
  rng: Rng,
  member: Member,
  events: GameEvent[],
): void {
  const day = draft.clock.day
  const enem = rollEnem(rng, member)
  member.education.enem = enem
  events.push({ type: 'enem', day, memberId: member.id, score: enem })
  const options = pathOptions(enem)
  draft.choices.push({
    type: 'afterSchool',
    memberId: member.id,
    day,
    enem,
    options,
    suggested: suggestPath(member, options),
  })
}

/**
 * Caminhos depois do médio: cada curso na universidade federal (só os que a
 * nota alcança) e na faculdade particular, cada área do técnico (no instituto
 * federal para quem tem a nota, senão particular), o cursinho e trabalhar.
 */
function pathOptions(enem: number): PathOption[] {
  const options: PathOption[] = []
  for (const course of DEGREES) {
    options.push({
      path: 'faculdade',
      network: 'federal',
      degree: course.id,
      available: enem >= course.cutoff,
    })
  }
  for (const course of DEGREES) {
    options.push({ path: 'faculdade', network: 'particular', degree: course.id, available: true })
  }
  const network = enem >= BALANCE.college.federalTechCutoff ? 'federal' : 'particular'
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
 * Aplica no rascunho o caminho escolhido. Trabalhar abre na hora a escolha do
 * primeiro emprego; os outros caminhos viram matrícula.
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
      openFirstJobChoice(draft, rng, member)
      return []
    case 'cursinho':
      return [
        enroll(member, day, {
          stage: 'cursinho',
          network: 'particular',
          yearsLeft: BALANCE.college.prep.years,
        }),
      ]
    case 'tecnico':
      return [
        enroll(member, day, {
          stage: 'tecnico',
          network: path.network,
          course: path.course,
          yearsLeft: BALANCE.college.technical.years,
        }),
      ]
    case 'faculdade':
      return [
        enroll(member, day, {
          stage: 'faculdade',
          network: path.network,
          degree: path.degree,
          yearsLeft: degree(path.degree).years,
        }),
      ]
  }
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
 * faculdade dão a formação e abrem a escolha do primeiro emprego.
 */
export function advanceHigherEducation(
  draft: GameState,
  rng: Rng,
  member: Member,
  school: Enrollment,
  events: GameEvent[],
): void {
  const yearsLeft = school.yearsLeft ?? 1
  if (yearsLeft > 1) {
    school.yearsLeft = yearsLeft - 1
    return
  }
  member.education.school = null
  member.education.past[school.stage] = school.network
  if (school.stage === 'cursinho') {
    member.education.points += BALANCE.college.prep.points
    openAfterSchoolChoice(draft, rng, member, events)
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
}
