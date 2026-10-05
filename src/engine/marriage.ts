import { BALANCE } from '../content/balance'
import { rollAppearance } from './appearance'
import { rollSuitorBackground } from './jobs'
import { addMember, ageOf, isAlive, rollAvatarSeed, rollFirstName, rollLifespan } from './members'
import type { Rng } from './rng'
import { newEducation, suitorAptitude } from './school'
import { ageInYears } from './time'
import type { GameState, Member, Suitor } from './types'

/** Custo de um casamento: festa e cartório, sempre o mesmo. */
export function weddingCost(): number {
  return BALANCE.marriage.cost
}

/**
 * Pode conhecer alguém: vivo, adulto, solteiro, sem namoro e sem outra escolha
 * aberta. Quem entrou na família pelo casamento não casa de novo.
 */
export function canMeet(state: GameState, member: Member): boolean {
  return (
    isAlive(member) &&
    member.partnerId === null &&
    member.origin !== 'married' &&
    member.dating === null &&
    ageOf(member, state.clock.day) >= BALANCE.adultAge &&
    !state.choices.some((choice) => choice.memberId === member.id)
  )
}

/**
 * Pessoa de outro gênero, adulta, com idade até `maxAgeGapYears` de diferença,
 * com formação e emprego sorteados.
 */
export function rollSuitor(state: GameState, rng: Rng, member: Member): Suitor {
  const { daysPerYear, adultAge } = BALANCE
  const gender = member.gender === 'f' ? 'm' : 'f'
  const day = state.clock.day
  const memberAgeDays = day - member.birthDay
  const gap = BALANCE.marriage.maxAgeGapYears * daysPerYear
  const youngest = Math.max(adultAge * daysPerYear, memberAgeDays - gap)
  const oldest = Math.max(youngest, memberAgeDays + gap)
  const ageDays = rng.int(youngest, oldest)
  const firstName = rollFirstName(state, rng, gender)
  const lifespan = Math.max(rollLifespan(rng), Math.floor(ageDays / daysPerYear) + 2)
  const birthDay = day - ageDays
  const { formation, career } = rollSuitorBackground(rng, birthDay, day)
  const appearance = rollAppearance(rng, gender)
  const avatarSeed = rollAvatarSeed(rng)
  return {
    firstName,
    gender,
    birthDay,
    lifespan,
    formation,
    career,
    aptitude: suitorAptitude(avatarSeed),
    appearance,
    avatarSeed,
  }
}

/**
 * Traz quem o membro namora para a família, como cônjuge. Quem namorou por
 * muitos anos ainda chega com pelo menos dois anos de vida. Altera o rascunho.
 */
export function joinFamily(draft: GameState, rng: Rng, member: Member, suitor: Suitor): Member {
  const age = ageInYears(suitor.birthDay, draft.clock.day)
  const spouse = addMember(draft, rng, {
    gender: suitor.gender,
    birthDay: suitor.birthDay,
    generation: member.generation,
    parentIds: [],
    origin: 'married',
    appearance: suitor.appearance,
    firstName: suitor.firstName,
    career: suitor.career,
    lifespan: Math.max(suitor.lifespan, age + 2),
    avatarSeed: suitor.avatarSeed,
    education: newEducation(suitor.formation),
    aptitude: suitor.aptitude,
  })
  const day = draft.clock.day
  member.partnerId = spouse.id
  spouse.partnerId = member.id
  member.marriedDay = day
  spouse.marriedDay = day
  return spouse
}
