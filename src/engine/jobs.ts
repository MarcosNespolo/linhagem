import { BALANCE } from '../content/balance'
import {
  careerLevel,
  getCareer,
  MEDIO_CAREERS,
  PUBLIC_MEDIO_CAREERS,
  topLevel,
  type CareerId,
  type CareerRequirement,
} from '../content/careers'
import { DEGREES, degree, TECH_COURSES, techCourse } from '../content/schools'
import { isUnemployed, salaryPerMonth } from './economy'
import { refuse, type Refusal } from './errors'
import { ageOf, isAlive } from './members'
import { hashUnit, type Rng } from './rng'
import type {
  CareerState,
  Choice,
  Formation,
  GameEvent,
  GameState,
  JobOffer,
  Member,
  MemberId,
} from './types'

type GraduationChoice = Extract<Choice, { type: 'graduation' }>

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

/** Sorteios da proposta por pessoa e dia: o de chegar uma e o de qual carreira. */
const OFFER_ROLL = { day: 11, career: 12 }

/**
 * Carreiras de ensino médio que pagariam mais à pessoa no nível em que ela
 * está, com a folga mínima. Vazio para quem não trabalha numa carreira dessas.
 */
export function betterCareers(member: Member): CareerId[] {
  const career = member.career
  if (!career || !MEDIO_CAREERS.includes(career.id)) return []
  const current = careerLevel(career.id, career.level).salaryPerMonth
  const floor = current * (1 + BALANCE.jobs.offers.minRaise)
  return MEDIO_CAREERS.filter(
    (id) => id !== career.id && careerLevel(id, career.level).salaryPerMonth >= floor,
  )
}

/** A proposta ainda vale no dia. */
export function hasJobOffer(member: Pick<Member, 'jobOffer'>, day: number): boolean {
  return member.jobOffer !== null && day < member.jobOffer.until
}

/**
 * Propostas do dia: enquanto a família é pequena, quem trabalha numa carreira
 * de ensino médio, sem curso em andamento e sem proposta valendo, pode
 * receber uma proposta de outra carreira dessas, no mesmo nível, com salário
 * maior. O sorteio depende só da seed, do dia e da pessoa, sem gastar o
 * gerador do jogo. A proposta fica esperando resposta por alguns meses, sem
 * parar o relógio; quem não responde deixa passar. Altera o rascunho.
 */
export function processJobOffers(
  draft: GameState,
  events: GameEvent[],
  living: readonly Member[],
): void {
  const { perYear, maxFamily, validMonths } = BALANCE.jobs.offers
  const day = draft.clock.day
  let alive = 0
  for (const member of living) if (member.deathDay === null) alive += 1
  for (const member of living) {
    if (member.deathDay !== null) continue
    if (member.jobOffer && day >= member.jobOffer.until) member.jobOffer = null
    if (alive > maxFamily || member.jobOffer) continue
    if (!member.career || member.course || isUnemployed(member, day)) continue
    const age = ageOf(member, day)
    if (age < BALANCE.adultAge || age >= BALANCE.retirementAge) continue
    const id = Number(member.id.slice(1))
    if (hashUnit(draft.seed, day, id, OFFER_ROLL.day) >= perYear / BALANCE.daysPerYear) continue
    const options = betterCareers(member)
    if (options.length === 0) continue
    const pick = Math.floor(hashUnit(draft.seed, day, id, OFFER_ROLL.career) * options.length)
    const careerId = options[pick]
    const level = member.career.level
    member.jobOffer = {
      careerId,
      level,
      until: day + Math.round((validMonths * BALANCE.daysPerYear) / 12),
    }
    events.push({ type: 'jobOffered', day, memberId: member.id, careerId, level })
  }
}

/** Quem tem proposta de emprego valendo hoje. */
export function membersWithJobOffer(state: GameState): Member[] {
  const day = state.clock.day
  return Object.values(state.members).filter(
    (member) => member.deathDay === null && hasJobOffer(member, day),
  )
}

/** Aceita a proposta: troca a carreira, no mesmo nível, e zera o tempo nele. Altera o rascunho. */
export function acceptJobOffer(member: Member, day: number): GameEvent {
  const offer = member.jobOffer
  if (!offer) throw new Error('Sem proposta para aceitar')
  const { careerId, level } = offer
  member.career = { id: careerId, level, levelSince: day }
  member.jobOffer = null
  member.course = null
  return { type: 'changedJob', day, memberId: member.id, careerId, level }
}

/**
 * Começa do zero numa vaga: a carreira nova, no nível de entrada, com o tempo
 * no nível contando de hoje. O curso em andamento para, a proposta que
 * esperava resposta cai e quem estava desempregado volta a trabalhar. Na
 * mesma carreira, um nível acima, é uma promoção. Altera o rascunho.
 */
export function startCareer(member: Member, offer: JobOffer, day: number): GameEvent {
  const same = member.career?.id === offer.careerId
  const { careerId, level } = offer
  member.career = { id: careerId, level, levelSince: day }
  member.course = null
  member.jobOffer = null
  member.unemployedUntil = null
  return same
    ? { type: 'promoted', day, memberId: member.id, careerId, level }
    : { type: 'startedOver', day, memberId: member.id, careerId, level }
}

/** Salário por mês do topo da carreira. */
export function topSalary(careerId: CareerId): number {
  return careerLevel(careerId, topLevel(careerId)).salaryPerMonth
}

/**
 * Carreiras em que a pessoa pode recomeçar do zero: as de ensino médio, para
 * qualquer formação, e a da área da formação, um nível acima quando a
 * formação passa da que a carreira pede. Fica de fora a carreira de hoje; as
 * do serviço público pedem concurso. Da que paga mais no topo à que paga
 * menos.
 */
export function careerOptions(member: Pick<Member, 'career' | 'education'>): JobOffer[] {
  const area = areaOffer(member.education.formation)
  const offers: JobOffer[] = area ? [area] : []
  for (const careerId of MEDIO_CAREERS) {
    if (careerId !== area?.careerId) offers.push({ careerId, level: 0 })
  }
  return offers
    .filter((offer) => offer.careerId !== member.career?.id)
    .sort(
      (a, b) => topSalary(b.careerId) - topSalary(a.careerId) || offerSalary(b) - offerSalary(a),
    )
}

export type CareerChangeCheck = { ok: true; offer: JobOffer } | Refusal

/**
 * Diz se a pessoa pode mudar para a carreira e em que vaga entra: viva,
 * trabalhando (antes da aposentadoria), sem escolha aberta e numa carreira
 * que a formação permite. Quem estuda à noite continua estudando.
 */
export function checkChangeCareer(
  state: GameState,
  memberId: MemberId,
  careerId: CareerId,
): CareerChangeCheck {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  if (!member.career || ageOf(member, state.clock.day) >= BALANCE.retirementAge) {
    return refuse('notWorking')
  }
  if (state.choices.some((choice) => choice.memberId === memberId)) return refuse('choiceOpen')
  const offer = careerOptions(member).find((option) => option.careerId === careerId)
  if (!offer) return refuse('careerNotAllowed')
  return { ok: true, offer }
}

/** Opções da escolha de quem se forma trabalhando. */
export const GRADUATION_OPTIONS = { stay: 0, start: 1 } as const

/**
 * Quem trabalha e se formou estudando à noite ganha a escolha de continuar no
 * emprego ou começar do zero na carreira da área do curso que terminou
 * (`formation`), quando ela é outra carreira ou a mesma num nível acima do de
 * hoje. A sugestão é a que paga mais agora. Altera o rascunho.
 */
export function openGraduationChoice(draft: GameState, member: Member, formation: Formation): void {
  const career = member.career
  const offer = areaOffer(formation)
  if (!career || !offer || ageOf(member, draft.clock.day) >= BALANCE.retirementAge) return
  if (offer.careerId === career.id && offer.level <= career.level) return
  const start = offerSalary(offer) > salaryPerMonth(member)
  draft.choices.push({
    type: 'graduation',
    memberId: member.id,
    day: draft.clock.day,
    offer,
    suggested: start ? GRADUATION_OPTIONS.start : GRADUATION_OPTIONS.stay,
  })
}

/** Aplica no rascunho a resposta de quem se formou: começar na área ou continuar no emprego. */
export function applyGraduationPick(
  draft: GameState,
  choice: GraduationChoice,
  option: number,
): GameEvent[] {
  if (option !== GRADUATION_OPTIONS.start) return []
  return [startCareer(draft.members[choice.memberId], choice.offer, draft.clock.day)]
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
 * anos de trabalho desde jovem aprendiz (`founder.workSinceAge`) e as
 * promoções que vêm só com o tempo. Aos 18, já tem tempo de casa para o
 * primeiro curso.
 */
export function rollFounderCareer(rng: Rng, birthDay: number, day: number): CareerState {
  const age = (day - birthDay) / BALANCE.daysPerYear
  const yearsWorked = Math.max(0, age - BALANCE.founder.workSinceAge)
  return experiencedCareer({ careerId: rng.pick(MEDIO_CAREERS), level: 0 }, yearsWorked, day)
}

/**
 * Formação e emprego de quem é sugerido como par. A formação cabe na idade:
 * só tem faculdade quem já teve tempo de se formar. Quem tem curso técnico ou
 * faculdade trabalha na área; alguns são servidores públicos, num cargo de
 * nível médio. O nível conta os anos de trabalho até hoje, com as promoções
 * que vêm só com o tempo, até `backgroundMaxLevel`: ninguém chega de fora
 * ganhando muito mais que a família.
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
    offer = { careerId: rng.pick(PUBLIC_MEDIO_CAREERS), level: 0 }
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
 * Carreira de quem chega de fora da família e trabalha há `yearsWorked` anos
 * desde a vaga `offer`: sobe com os tempos do serviço público até
 * `backgroundMaxLevel` e fica no último nível há os anos que sobram.
 */
function experiencedCareer(offer: JobOffer, yearsWorked: number, day: number): CareerState {
  const { yearsToPromote, backgroundMaxLevel } = BALANCE.careers
  let level = offer.level
  let years = yearsWorked
  while (level < backgroundMaxLevel && years >= yearsToPromote[level]) {
    years -= yearsToPromote[level]
    level += 1
  }
  return {
    id: offer.careerId,
    level,
    levelSince: day - Math.floor(years * BALANCE.daysPerYear),
  }
}
