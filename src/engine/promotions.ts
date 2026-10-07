import { BALANCE } from '../content/balance'
import { careerLevel, isPublicCareer, topLevel } from '../content/careers'
import { isUnemployed } from './economy'
import { ageOf } from './members'
import type { CareerState, GameEvent, GameState, Member, MemberId } from './types'

/** Quem trabalha: vivo, empregado e antes da aposentadoria. */
type Worker = Member & { career: CareerState }

function isWorker(member: Member, day: number): member is Worker {
  return (
    member.deathDay === null &&
    member.career !== null &&
    !isUnemployed(member, day) &&
    ageOf(member, day) < BALANCE.retirementAge
  )
}

/** No serviço público, a promoção vem com o tempo; nas outras carreiras, com um curso. */
export function promotesByTime(career: CareerState): boolean {
  return isPublicCareer(career.id)
}

/** Dia em que quem é do serviço público completa o tempo no nível para subir, ou null. */
export function promotionDay(career: CareerState): number | null {
  if (!promotesByTime(career) || career.level >= topLevel(career.id)) return null
  return career.levelSince + BALANCE.careers.yearsToPromote[career.level] * BALANCE.daysPerYear
}

/** Curso para o próximo nível, no ritmo normal ou com dedicação. */
export type CourseOffer = {
  memberId: MemberId
  /** Nível (índice) a que o curso leva. */
  level: number
  dedicated: boolean
  /** Duração, em dias do jogo. */
  days: number
  /** Mensalidade, em reais por mês. */
  fee: number
}

/** Dia em que a pessoa completa o tempo no nível atual para poder começar o curso do próximo. */
export function courseAvailableDay(career: CareerState): number {
  return career.levelSince + BALANCE.careers.minYearsInLevel * BALANCE.daysPerYear
}

/**
 * O curso que a pessoa pode começar agora: quem trabalha fora do serviço
 * público, há `minYearsInLevel` anos no nível, sem outro curso, sem estar
 * estudando à noite e antes do topo da carreira. Com dedicação, dura a metade
 * e a mensalidade dobra. Para os outros, null.
 */
export function courseOffer(member: Member, day: number, dedicated: boolean): CourseOffer | null {
  if (!isWorker(member, day) || member.course || member.education.school) return null
  if (promotesByTime(member.career)) return null
  const { id, level } = member.career
  if (level >= topLevel(id) || day < courseAvailableDay(member.career)) return null
  const raise = careerLevel(id, level + 1).salaryPerMonth - careerLevel(id, level).salaryPerMonth
  const pace = dedicated ? 2 : 1
  const { courseYears, courseFeeShare } = BALANCE.careers
  return {
    memberId: member.id,
    level: level + 1,
    dedicated,
    days: Math.round((courseYears[level] * BALANCE.daysPerYear) / pace),
    fee: courseFeeShare * raise * pace,
  }
}

/** Quem pode começar um curso agora. */
export function courseCandidates(state: GameState): Member[] {
  const day = state.clock.day
  return Object.values(state.members).filter((member) => courseOffer(member, day, false) !== null)
}

/** Começa o curso oferecido. Altera o rascunho. */
export function beginCourse(member: Member, offer: CourseOffer, day: number): void {
  member.course = {
    since: day,
    until: day + offer.days,
    dedicated: offer.dedicated,
    fee: offer.fee,
  }
}

/** Sobe a pessoa um nível a partir de hoje. Altera o rascunho. */
function promote(member: Worker, day: number): GameEvent {
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
 * Na virada do dia, sobe quem terminou o curso e, no serviço público, quem
 * completou o tempo no nível. Altera o rascunho e devolve true quando alguém
 * subiu.
 */
export function processPromotions(
  draft: GameState,
  events: GameEvent[],
  members: readonly Member[] = Object.values(draft.members),
): boolean {
  const day = draft.clock.day
  let promoted = false
  for (const member of members) {
    if (member.deathDay !== null || !member.career) continue
    if (member.course) {
      if (day < member.course.until) continue
      member.course = null
      // Quem foi demitido no meio do curso também sobe: volta ao trabalho no nível novo.
      events.push(promote(member as Worker, day))
      promoted = true
      continue
    }
    if (!isWorker(member, day)) continue
    const due = promotionDay(member.career)
    if (due === null || day < due) continue
    events.push(promote(member, day))
    promoted = true
  }
  return promoted
}
