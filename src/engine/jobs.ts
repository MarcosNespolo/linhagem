import { BALANCE } from '../content/balance'
import {
  careerLevel,
  getCareer,
  MEDIO_CAREERS,
  PUBLIC_CAREER,
  type CareerId,
  type CareerRequirement,
} from '../content/careers'
import { DEGREES, degree, TECH_COURSES, techCourse } from '../content/schools'
import type { Rng } from './rng'
import type { CareerState, Formation, GameState, JobOffer, Member } from './types'

const FORMATION_RANK: Record<Formation['level'], number> = { medio: 0, tecnico: 1, superior: 2 }
const REQUIREMENT_RANK: Record<CareerRequirement, number> = {
  medio: 0,
  tecnico: 1,
  superior: 2,
  concurso: 3,
}

/** Carreira da área da formação: a do curso técnico ou a da faculdade. */
export function formationCareer(formation: Formation | null): CareerId | null {
  if (formation?.level === 'superior') return degree(formation.degree).careerId
  if (formation?.level === 'tecnico') return techCourse(formation.course).careerId
  return null
}

/**
 * Vaga da área da formação, no nível de entrada. Quem tem formação acima da que
 * a carreira pede entra um nível acima: quem se formou em Enfermagem entra na
 * Saúde como enfermeiro, e o técnico em Edificações, na Construção, no 2º nível.
 */
export function areaOffer(formation: Formation | null): JobOffer | null {
  const careerId = formationCareer(formation)
  if (!careerId || !formation) return null
  const required = REQUIREMENT_RANK[getCareer(careerId).requires]
  return { careerId, level: FORMATION_RANK[formation.level] > required ? 1 : 0 }
}

/**
 * Sorteia as vagas do primeiro emprego entre as carreiras que a formação abre:
 * a da área, que entra sempre e primeiro, e as de ensino médio, que valem para
 * qualquer formação.
 */
export function rollJobOffers(rng: Rng, formation: Formation | null): JobOffer[] {
  const area = areaOffer(formation)
  const offers: JobOffer[] = area ? [area] : []
  const pool = MEDIO_CAREERS.filter((id) => id !== area?.careerId)
  while (offers.length < BALANCE.jobs.offersPerChoice && pool.length > 0) {
    const index = rng.int(0, pool.length - 1)
    offers.push({ careerId: pool[index], level: 0 })
    pool.splice(index, 1)
  }
  return offers
}

/** Salário por mês de uma vaga, no nível de entrada. */
export function offerSalary(offer: JobOffer): number {
  return careerLevel(offer.careerId, offer.level).salaryPerMonth
}

/** Índice da vaga de maior salário. No empate, fica a primeira. */
export function bestOffer(offers: readonly JobOffer[]): number {
  let best = 0
  offers.forEach((offer, index) => {
    if (offerSalary(offer) > offerSalary(offers[best])) best = index
  })
  return best
}

/** Quem pode estudar para concurso: quem terminou pelo menos o ensino médio. */
export function canStudyForConcurso(member: Member): boolean {
  return member.education.formation !== null
}

/**
 * Abre no rascunho a escolha do primeiro emprego. A sugestão é a vaga de maior
 * salário. Quem tem ensino médio também pode estudar para concurso. O relógio
 * para até o jogador escolher.
 */
export function openFirstJobChoice(
  draft: GameState,
  rng: Rng,
  member: Member,
  concurso: boolean = canStudyForConcurso(member),
): void {
  const offers = rollJobOffers(rng, member.education.formation)
  draft.choices.push({
    type: 'firstJob',
    memberId: member.id,
    day: draft.clock.day,
    offers,
    concurso,
    suggested: bestOffer(offers),
  })
}

/**
 * Carreira de quem funda a família: uma das que pedem ensino médio, com os
 * anos de trabalho desde os 18 e as promoções que vêm só com o tempo.
 */
export function rollFounderCareer(rng: Rng, birthDay: number, day: number): CareerState {
  const yearsWorked = Math.max(0, (day - birthDay) / BALANCE.daysPerYear - BALANCE.adultAge)
  return experiencedCareer({ careerId: rng.pick(MEDIO_CAREERS), level: 0 }, yearsWorked, day)
}

/**
 * Formação e emprego de quem é sugerido como par. A formação cabe na idade:
 * só tem faculdade quem já teve tempo de se formar. Quem tem curso técnico ou
 * faculdade trabalha na área; alguns são servidores públicos. O nível conta os
 * anos de trabalho até hoje, com as promoções que vêm só com o tempo.
 */
export function rollSuitorBackground(
  rng: Rng,
  birthDay: number,
  day: number,
): { formation: Formation; career: CareerState } {
  const { suitorTechnicalChance, suitorDegreeChance, suitorPublicChance } = BALANCE.marriage
  const age = (day - birthDay) / BALANCE.daysPerYear
  const degrees = DEGREES.filter((course) => BALANCE.adultAge + course.years <= age)
  const technical = BALANCE.adultAge + BALANCE.college.technical.years <= age
  const roll = rng.next()
  let formation: Formation = { level: 'medio' }
  if (roll < suitorDegreeChance) {
    if (degrees.length > 0) formation = { level: 'superior', degree: rng.pick(degrees).id }
  } else if (roll < suitorDegreeChance + suitorTechnicalChance) {
    if (technical) formation = { level: 'tecnico', course: rng.pick(TECH_COURSES).id }
  }

  let offer: JobOffer
  if (rng.chance(suitorPublicChance)) {
    offer = { careerId: PUBLIC_CAREER, level: formation.level === 'superior' ? 1 : 0 }
  } else {
    offer = areaOffer(formation) ?? { careerId: rng.pick(MEDIO_CAREERS), level: 0 }
  }
  const yearsWorked = Math.max(0, age - startWorkingAge(formation))
  return { formation, career: experiencedCareer(offer, yearsWorked, day) }
}

/** Idade em que começa a trabalhar quem tem a formação: depois do médio, do técnico ou da faculdade. */
function startWorkingAge(formation: Formation): number {
  const afterSchool = BALANCE.adultAge
  if (formation.level === 'tecnico') return afterSchool + BALANCE.college.technical.years
  if (formation.level === 'superior') return afterSchool + degree(formation.degree).years
  return afterSchool
}

/**
 * Carreira de quem trabalha há `yearsWorked` anos desde a vaga `offer`: sobe os
 * níveis que vêm só com o tempo e fica no último deles há os anos que sobram.
 */
function experiencedCareer(offer: JobOffer, yearsWorked: number, day: number): CareerState {
  const { yearsToPromote, courseLevel } = BALANCE.careers
  let level = offer.level
  let years = yearsWorked
  while (level + 1 < courseLevel && years >= yearsToPromote[level]) {
    years -= yearsToPromote[level]
    level += 1
  }
  return {
    id: offer.careerId,
    level,
    levelSince: day - Math.floor(years * BALANCE.daysPerYear),
  }
}
