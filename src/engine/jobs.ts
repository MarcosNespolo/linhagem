import { BALANCE } from '../content/balance'
import { CAREER_IDS, careerLevel, type CareerId } from '../content/careers'
import { degree, techCourse } from '../content/schools'
import type { Rng } from './rng'
import type { Formation, GameState, JobOffer, Member } from './types'

/** Carreira da área da formação, quando ela já existe no jogo. */
export function formationCareer(formation: Formation | null): CareerId | null {
  if (formation?.level === 'superior') return degree(formation.degree).careerId ?? null
  if (formation?.level === 'tecnico') return techCourse(formation.course).careerId ?? null
  return null
}

/**
 * Sorteia vagas de carreiras diferentes para o primeiro emprego. A carreira da
 * área da formação, se houver, entra sempre, como a primeira.
 */
export function rollJobOffers(rng: Rng, preferred: CareerId | null = null): JobOffer[] {
  const pool = CAREER_IDS.filter((id) => id !== preferred)
  const offers: JobOffer[] = preferred ? [{ careerId: preferred }] : []
  const count = Math.min(BALANCE.jobs.offersPerChoice, pool.length + offers.length)
  while (offers.length < count) {
    const index = rng.int(0, pool.length - 1)
    offers.push({ careerId: pool[index] })
    pool.splice(index, 1)
  }
  return offers
}

/** Salário por mês de uma vaga, que é sempre o primeiro nível da carreira. */
export function offerSalary(offer: JobOffer): number {
  return careerLevel(offer.careerId, 0).salaryPerMonth
}

/** Índice da vaga de maior salário. No empate, fica a primeira. */
export function bestOffer(offers: readonly JobOffer[]): number {
  let best = 0
  offers.forEach((offer, index) => {
    if (offerSalary(offer) > offerSalary(offers[best])) best = index
  })
  return best
}

/**
 * Abre no rascunho a escolha do primeiro emprego. A sugestão é a vaga da área
 * da formação, ou a de maior salário. O relógio para até o jogador escolher.
 */
export function openFirstJobChoice(draft: GameState, rng: Rng, member: Member): void {
  const preferred = formationCareer(member.education.formation)
  const offers = rollJobOffers(rng, preferred)
  draft.choices.push({
    type: 'firstJob',
    memberId: member.id,
    day: draft.clock.day,
    offers,
    suggested: preferred ? 0 : bestOffer(offers),
  })
}
