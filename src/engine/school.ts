import { BALANCE } from '../content/balance'
import { degree, type Network, type SchoolStage } from '../content/schools'
import { hashString } from './rng'
import { ageInYears } from './time'
import type { Education, Enrollment, GameState, Member, MemberId } from './types'

type StageRule = {
  /** Idade que a criança faz no ano em que a etapa começa. */
  firstAge: number
  /** Idade que faz no último ano da etapa. */
  lastAge: number
  /** Mensalidade por rede, em reais por mês. Sem valor, é gratuita. */
  fees: Partial<Record<Network, number>>
  /** Pontos que a rede soma à nota ao longo da etapa inteira. */
  points: Partial<Record<Network, number>>
}

const STAGES: Record<SchoolStage, StageRule> = BALANCE.school.stages

/** Etapa de quem faz `age` anos no ano, ou null fora da idade da creche e da escola. */
export function stageForAge(age: number): SchoolStage | null {
  for (const stage of Object.keys(STAGES) as SchoolStage[]) {
    const { firstAge, lastAge } = STAGES[stage]
    if (age >= firstAge && age <= lastAge) return stage
  }
  return null
}

/** Quantos anos a etapa dura. */
export function stageYears(stage: SchoolStage): number {
  return STAGES[stage].lastAge - STAGES[stage].firstAge + 1
}

/** Mensalidade da rede na etapa, em reais por mês. */
export function stageFee(stage: SchoolStage, network: Network): number {
  return STAGES[stage].fees[network] ?? 0
}

/** Pontos que a rede soma à nota ao longo da etapa inteira. */
export function stagePoints(stage: SchoolStage, network: Network): number {
  return STAGES[stage].points[network] ?? 0
}

/** Pontos de um ano letivo na rede: os da etapa divididos pelos anos dela. */
export function yearlyPoints(stage: SchoolStage, network: Network): number {
  return stagePoints(stage, network) / stageYears(stage)
}

/** Mensalidade da matrícula, ou zero fora dos estudos e nas redes gratuitas. */
export function schoolFee(school: Enrollment | null): number {
  if (!school) return 0
  switch (school.stage) {
    case 'faculdade':
      return school.network === 'particular' && school.degree ? degree(school.degree).fee : 0
    case 'tecnico':
      return school.network === 'particular' ? BALANCE.college.technical.fee : 0
    case 'cursinho':
      return BALANCE.college.prep.fee
    default:
      return stageFee(school.stage, school.network)
  }
}

/** Vida escolar de quem nasce ou chega à família sem ter estudado no jogo. */
export function newEducation(formation: Education['formation'] = null): Education {
  return { school: null, points: 0, past: {}, formation, enem: null, tutorSince: null }
}

/** A formação mais alta entre duas: faculdade, depois técnico, depois ensino médio. */
export function higherFormation(
  current: Education['formation'],
  next: NonNullable<Education['formation']>,
): NonNullable<Education['formation']> {
  const rank = { medio: 0, tecnico: 1, superior: 2 }
  return current && rank[current.level] > rank[next.level] ? current : next
}

/**
 * Aptidão de quem chega à família de fora, de 400 a 700. Sai de uma semente
 * (a do avatar mais um identificador), então não consome o sorteio do jogo e é
 * a mesma em qualquer aparelho.
 */
export function baseAptitude(seed: string, id: string): number {
  const { min, spread } = BALANCE.aptitude
  const first = hashString(`${seed}:${id}:aptidao`) % (spread + 1)
  const second = hashString(`${id}:${seed}:aptidao`) % (spread + 1)
  return min + first + second
}

/** Aptidão de quem aparece como par, antes de ganhar um lugar na família. */
export function suitorAptitude(avatarSeed: string): number {
  return baseAptitude(avatarSeed, 'pretendente')
}

/**
 * Aptidão de um filho: a média dos pais puxa a partir do meio da faixa, e um
 * sorteio próprio, da semente do filho, soma ou tira um pouco. Pais com
 * aptidão alta tendem a ter filhos com aptidão alta.
 */
export function inheritAptitude(
  first: Pick<Member, 'aptitude'>,
  second: Pick<Member, 'aptitude'>,
  child: Pick<Member, 'id' | 'avatarSeed'>,
): number {
  const { min, spread, heritability, noise } = BALANCE.aptitude
  const middle = min + spread
  const parents = (first.aptitude + second.aptitude) / 2
  const up = hashString(`${child.avatarSeed}:${child.id}:heranca`) % (noise + 1)
  const down = hashString(`${child.id}:${child.avatarSeed}:heranca`) % (noise + 1)
  const value = middle + heritability * (parents - middle) + up - down
  return Math.min(min + 2 * spread, Math.max(min, Math.round(value)))
}

/** Aptidão para os estudos, de 400 a 700, guardada em cada pessoa. */
export function aptitudeOf(member: Pick<Member, 'aptitude'>): number {
  return member.aptitude
}

/** Pontos que a idade soma na nota no dia: `growth.perYear` por ano de vida, até `growth.years`. */
export function agePoints(member: Pick<Member, 'birthDay'>, day: number): number {
  const { perYear, years } = BALANCE.school.growth
  return perYear * Math.min(Math.max(ageInYears(member.birthDay, day), 0), years)
}

/** Nota de quem estuda no dia: a aptidão, o que a idade somou e os pontos dos estudos. */
export function schoolScore(
  member: Pick<Member, 'aptitude' | 'education' | 'birthDay'>,
  day: number,
): number {
  return member.aptitude + agePoints(member, day) + member.education.points
}

/** Quem trabalha meio período porque cuida em casa de um filho na idade da creche. */
export function halfTimeCaregivers(
  state: GameState,
  members: readonly Member[] = Object.values(state.members),
): Set<MemberId> {
  const caregivers = new Set<MemberId>()
  for (const member of members) {
    const school = member.education.school
    if (member.deathDay === null && school?.network === 'casa' && school.caregiverId) {
      caregivers.add(school.caregiverId)
    }
  }
  return caregivers
}
