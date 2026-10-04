import { BALANCE } from '../content/balance'
import { CAREER_IDS } from '../content/careers'
import { FEMALE_NAMES, MALE_NAMES } from '../content/names'
import type { Rng } from './rng'
import { ageInYears } from './time'
import type { Appearance, CareerState, GameState, Gender, Member, MemberId, Origin } from './types'

export function isAlive(member: Member): boolean {
  return member.deathDay === null
}

/** Idade no dia informado. Para quem já morreu, a idade com que morreu. */
export function ageOf(member: Member, day: number): number {
  return ageInYears(member.birthDay, member.deathDay ?? day)
}

export function isAdult(member: Member, day: number): boolean {
  return ageOf(member, day) >= BALANCE.adultAge
}

export function isRetired(member: Member, day: number): boolean {
  return isAlive(member) && ageOf(member, day) >= BALANCE.retirementAge
}

export function livingMembers(state: GameState): Member[] {
  return Object.values(state.members).filter(isAlive)
}

/** Multiplicador de custos pelo tamanho da família viva (BALANCE.familySizeGrowth). */
export function familySizeFactor(state: GameState): number {
  let living = 0
  for (const member of Object.values(state.members)) {
    if (member.deathDay === null) living += 1
  }
  return BALANCE.familySizeGrowth ** living
}

/** Filhos do membro, do mais velho para o mais novo. */
export function childrenOf(state: GameState, memberId: MemberId): Member[] {
  return Object.values(state.members).filter((member) => member.parentIds.includes(memberId))
}

/** Cônjuge do membro, vivo ou não. */
export function partnerOf(state: GameState, member: Member): Member | undefined {
  return member.partnerId ? state.members[member.partnerId] : undefined
}

/** Expectativa de vida em anos: mínimo mais dois sorteios, que concentram os valores no meio. */
export function rollLifespan(rng: Rng): number {
  const { min, spread } = BALANCE.lifespan
  return min + rng.int(0, spread) + rng.int(0, spread)
}

export function rollStarterCareer(rng: Rng): CareerState {
  return { id: rng.pick(CAREER_IDS), level: 0, xp: 0 }
}

export function rollAvatarSeed(rng: Rng): string {
  return rng.int(0, 0x7fffffff).toString(36)
}

/**
 * Sorteia um primeiro nome que ninguém da família usa nem está em `exclude`,
 * enquanto houver opções.
 */
export function rollFirstName(
  state: GameState,
  rng: Rng,
  gender: Gender,
  exclude: ReadonlySet<string> = new Set(),
): string {
  const pool: readonly string[] = gender === 'f' ? FEMALE_NAMES : MALE_NAMES
  const used = new Set(Object.values(state.members).map((member) => member.firstName))
  const free = pool.filter((name) => !used.has(name) && !exclude.has(name))
  return rng.pick(free.length > 0 ? free : pool)
}

export type NewMember = {
  gender: Gender
  birthDay: number
  generation: number
  parentIds: MemberId[]
  origin: Origin
  appearance: Appearance
  firstName?: string
  career?: CareerState | null
  lifespan?: number
  avatarSeed?: string
}

/** Cria um membro e o registra no rascunho do estado, que é alterado. */
export function addMember(draft: GameState, rng: Rng, input: NewMember): Member {
  const id = `m${draft.nextMemberId}`
  draft.nextMemberId += 1
  const member: Member = {
    id,
    firstName: input.firstName ?? rollFirstName(draft, rng, input.gender),
    gender: input.gender,
    birthDay: input.birthDay,
    deathDay: null,
    lifespan: input.lifespan ?? rollLifespan(rng),
    generation: input.generation,
    origin: input.origin,
    parentIds: input.parentIds,
    partnerId: null,
    marriedDay: null,
    career: input.career ?? null,
    lastChildDay: null,
    traits: [],
    appearance: input.appearance,
    avatarSeed: input.avatarSeed ?? rollAvatarSeed(rng),
  }
  draft.members[id] = member
  return member
}
