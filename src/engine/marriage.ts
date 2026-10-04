import { BALANCE } from '../content/balance'
import { rollAppearance } from './appearance'
import { refuse, type Refusal } from './errors'
import { rollSuitorBackground } from './jobs'
import {
  addMember,
  ageOf,
  familySizeFactor,
  isAlive,
  rollAvatarSeed,
  rollFirstName,
  rollLifespan,
} from './members'
import type { Rng } from './rng'
import { newEducation, suitorAptitude } from './school'
import type { GameState, Member, MemberId, Suitor } from './types'

/**
 * Custo do próximo casamento: uma festa maior para uma família maior. Cresce
 * com o número de membros vivos, então cai de novo quando a família diminui.
 */
export function weddingCost(state: GameState): number {
  return Math.round(BALANCE.marriage.baseCost * familySizeFactor(state))
}

/**
 * Diz se o membro pode procurar um par: precisa estar vivo, ser adulto e
 * nunca ter casado. Não olha o dinheiro, que só é cobrado no casamento.
 */
export function checkSeekPartner(state: GameState, memberId: MemberId): { ok: true } | Refusal {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  if (member.partnerId !== null || member.origin === 'married') return refuse('alreadyMarried')
  if (ageOf(member, state.clock.day) < BALANCE.adultAge) return refuse('tooYoung')
  return { ok: true }
}

export type MarriageCheck = { ok: true; cost: number; suitor: Suitor } | Refusal

/** Diz se o membro pode casar agora com a pessoa sugerida de índice `suitorIndex`. */
export function checkMarry(
  state: GameState,
  memberId: MemberId,
  suitorIndex: number,
): MarriageCheck {
  const seek = checkSeekPartner(state, memberId)
  if (!seek.ok) return seek
  const suitor = state.suitors[memberId]?.[suitorIndex]
  if (!suitor) return refuse('suitorNotFound')
  const cost = weddingCost(state)
  if (state.money < cost) return refuse('notEnoughMoney')
  return { ok: true, cost, suitor }
}

/** Sorteia as pessoas sugeridas como par para o membro, sem nomes repetidos. */
export function rollSuitors(state: GameState, rng: Rng, member: Member): Suitor[] {
  const taken = new Set<string>()
  const suitors: Suitor[] = []
  for (let i = 0; i < BALANCE.marriage.suitorsPerSearch; i++) {
    const suitor = rollSuitor(state, rng, member, taken)
    taken.add(suitor.firstName)
    suitors.push(suitor)
  }
  return suitors
}

/**
 * Pessoa de outro gênero, adulta, com idade até `maxAgeGapYears` de diferença,
 * com formação e emprego sorteados.
 */
function rollSuitor(
  state: GameState,
  rng: Rng,
  member: Member,
  taken: ReadonlySet<string>,
): Suitor {
  const { daysPerYear, adultAge } = BALANCE
  const gender = member.gender === 'f' ? 'm' : 'f'
  const day = state.clock.day
  const memberAgeDays = day - member.birthDay
  const gap = BALANCE.marriage.maxAgeGapYears * daysPerYear
  const youngest = Math.max(adultAge * daysPerYear, memberAgeDays - gap)
  const oldest = Math.max(youngest, memberAgeDays + gap)
  const ageDays = rng.int(youngest, oldest)
  const firstName = rollFirstName(state, rng, gender, taken)
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

/** Traz a pessoa sugerida para a família como cônjuge do membro. Altera o rascunho. */
export function joinFamily(draft: GameState, rng: Rng, member: Member, suitor: Suitor): Member {
  const spouse = addMember(draft, rng, {
    gender: suitor.gender,
    birthDay: suitor.birthDay,
    generation: member.generation,
    parentIds: [],
    origin: 'married',
    appearance: suitor.appearance,
    firstName: suitor.firstName,
    career: suitor.career,
    lifespan: suitor.lifespan,
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
