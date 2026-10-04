import { BALANCE } from '../content/balance'
import { careerLevel, PUBLIC_CAREER, topLevel } from '../content/careers'
import { ageOf } from './members'
import type { CareerState, GameEvent, GameState, Member, MemberId } from './types'

/** Quem trabalha e ainda pode subir: vivo, com carreira e antes da aposentadoria. */
type Worker = Member & { career: CareerState }

function isWorker(member: Member, day: number): member is Worker {
  return (
    member.deathDay === null && member.career !== null && ageOf(member, day) < BALANCE.retirementAge
  )
}

/** Dia em que a pessoa completa o tempo no nível para subir, ou null no topo da carreira. */
export function promotionDay(career: CareerState): number | null {
  if (career.level >= topLevel(career.id)) return null
  const years = BALANCE.careers.yearsToPromote[career.level]
  return career.levelSince + years * BALANCE.daysPerYear
}

/** O próximo nível pede curso pago: o 4º e o 5º, menos no serviço público. */
export function needsCourse(career: CareerState): boolean {
  return career.id !== PUBLIC_CAREER && career.level + 1 >= BALANCE.careers.courseLevel
}

/** Preço do curso para o próximo nível: tantos meses do aumento que ele traz. */
export function courseCost(career: CareerState): number {
  const now = careerLevel(career.id, career.level).salaryPerMonth
  const next = careerLevel(career.id, career.level + 1).salaryPerMonth
  return BALANCE.careers.courseMonths * (next - now)
}

/** Curso que a família pode pagar para alguém subir de nível. */
export type CourseOffer = { memberId: MemberId; level: number; cost: number }

/**
 * Curso disponível para a pessoa: quem completou o tempo num nível que só sobe
 * com curso pago. Antes disso, ou fora dessas condições, null.
 */
export function courseFor(member: Member, day: number): CourseOffer | null {
  if (!isWorker(member, day) || !needsCourse(member.career)) return null
  const due = promotionDay(member.career)
  if (due === null || day < due) return null
  return { memberId: member.id, level: member.career.level + 1, cost: courseCost(member.career) }
}

/** Cursos disponíveis na família, do mais barato ao mais caro. */
export function availableCourses(state: GameState): CourseOffer[] {
  const day = state.clock.day
  const courses: CourseOffer[] = []
  for (const member of Object.values(state.members)) {
    const course = courseFor(member, day)
    if (course) courses.push(course)
  }
  return courses.sort((a, b) => a.cost - b.cost)
}

/** Cursos que cabem no dinheiro, pagando do mais barato ao mais caro. */
export function affordableCourses(state: GameState): CourseOffer[] {
  let money = state.money
  const affordable: CourseOffer[] = []
  for (const course of availableCourses(state)) {
    if (course.cost > money) break
    money -= course.cost
    affordable.push(course)
  }
  return affordable
}

/** Sobe a pessoa um nível a partir de hoje. Altera o rascunho. */
export function promote(member: Worker, day: number): GameEvent {
  member.career.level += 1
  member.career.levelSince = day
  return {
    type: 'promoted',
    day,
    memberId: member.id,
    careerId: member.career.id,
    level: member.career.level,
  }
}

/**
 * Na virada do dia, sobe quem completou o tempo num nível que não pede curso.
 * Altera o rascunho e devolve true quando alguém subiu.
 */
export function promoteByTime(draft: GameState, events: GameEvent[]): boolean {
  const day = draft.clock.day
  let promoted = false
  for (const member of Object.values(draft.members)) {
    if (!isWorker(member, day) || needsCourse(member.career)) continue
    const due = promotionDay(member.career)
    if (due === null || day < due) continue
    events.push(promote(member, day))
    promoted = true
  }
  return promoted
}

/** Paga o curso de quem está pronto para subir e promove na hora. Altera o rascunho. */
export function payCourse(draft: GameState, course: CourseOffer): GameEvent {
  const member = draft.members[course.memberId] as Worker
  draft.money -= course.cost
  draft.stats.totalSpent += course.cost
  return promote(member, draft.clock.day)
}
