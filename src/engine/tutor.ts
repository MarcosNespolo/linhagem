import { BALANCE } from '../content/balance'
import type { Member } from './types'

/** Quem pode ter professor particular: quem está vivo e estuda na escola ou no ensino médio. */
export function canHaveTutor(member: Member): boolean {
  const stage = member.education.school?.stage
  return member.deathDay === null && (stage === 'escola' || stage === 'medio')
}

/** Pontos do professor desde o último acerto até o dia, em proporção ao tempo. */
export function tutorPoints(member: Member, day: number): number {
  const since = member.education.tutorSince
  if (since === null) return 0
  const { pointsPerYear } = BALANCE.school.tutor
  return (pointsPerYear * Math.max(0, day - since)) / BALANCE.daysPerYear
}

/** Soma à nota os pontos do professor até o dia e recomeça a contar dali. Altera o membro. */
export function settleTutor(member: Member, day: number): void {
  if (member.education.tutorSince === null) return
  member.education.points += tutorPoints(member, day)
  member.education.tutorSince = day
}

/** Contrata o professor a partir do dia, ou o dispensa somando o que ele já ensinou. */
export function setTutor(member: Member, day: number, active: boolean): void {
  if (active) {
    if (member.education.tutorSince === null) member.education.tutorSince = day
    return
  }
  settleTutor(member, day)
  member.education.tutorSince = null
}
