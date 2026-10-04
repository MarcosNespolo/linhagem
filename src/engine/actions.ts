import { BALANCE } from '../content/balance'
import { inheritAppearance } from './appearance'
import { FAMILY_NAME_MAX_LENGTH } from './constants'
import { refuse, type ActionError, type Refusal } from './errors'
import { appendLog } from './log'
import { checkMarry, checkSeekPartner, joinFamily, rollSuitors } from './marriage'
import { addMember, ageOf, childrenOf, familySizeFactor, isAlive } from './members'
import { createRng } from './rng'
import type { GameEvent, GameState, MemberId } from './types'

export type { ActionError }

export type Action =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'renameFamily'; name: string }
  | { type: 'haveChild'; parentId: MemberId }
  | { type: 'findSuitors'; memberId: MemberId }
  | { type: 'marry'; memberId: MemberId; suitorIndex: number }

export type ActionResult = { ok: true; state: GameState; events: GameEvent[] } | Refusal

/** Aplica uma ação do jogador. Função pura: devolve um estado novo ou o motivo da recusa. */
export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case 'pause':
      return done({ ...state, clock: { ...state.clock, paused: true } })
    case 'resume':
      return done({ ...state, clock: { ...state.clock, paused: false } })
    case 'renameFamily': {
      const name = action.name.trim()
      if (name.length === 0 || name.length > FAMILY_NAME_MAX_LENGTH) return refuse('invalidName')
      return done({ ...state, familyName: name })
    }
    case 'haveChild':
      return haveChild(state, action.parentId)
    case 'findSuitors':
      return findSuitors(state, action.memberId)
    case 'marry':
      return marry(state, action.memberId, action.suitorIndex)
  }
}

export type ChildCheck = { ok: true; cost: number; partnerId: MemberId } | Refusal

/**
 * Custo do próximo filho do casal: cresce a cada filho que os dois já tiveram
 * juntos e com o tamanho da família viva.
 */
export function childCost(state: GameState, parentId: MemberId, partnerId: MemberId): number {
  const together = childrenOf(state, parentId).filter((child) =>
    child.parentIds.includes(partnerId),
  ).length
  const { baseCost, coupleGrowth } = BALANCE.children
  return Math.round(baseCost * coupleGrowth ** together * familySizeFactor(state))
}

/** Dias do jogo até o casal poder ter outro filho. Zero quando já pode. */
export function childCooldownDaysLeft(state: GameState, parentId: MemberId): number {
  const parent = state.members[parentId]
  if (!parent) return 0
  const partner = parent.partnerId ? state.members[parent.partnerId] : undefined
  const last = Math.max(parent.lastChildDay ?? -Infinity, partner?.lastChildDay ?? -Infinity)
  return Math.max(0, BALANCE.children.cooldownDays - (state.clock.day - last))
}

/** Diz se o membro pode ter um filho agora e, se puder, quanto custa. */
export function checkHaveChild(state: GameState, parentId: MemberId): ChildCheck {
  const parent = state.members[parentId]
  if (!parent) return refuse('memberNotFound')
  if (!isAlive(parent)) return refuse('memberDeceased')
  const partner = parent.partnerId ? state.members[parent.partnerId] : undefined
  if (!partner || !isAlive(partner)) return refuse('noPartner')

  const { minParentAge, maxParentAge } = BALANCE.children
  const ages = [ageOf(parent, state.clock.day), ageOf(partner, state.clock.day)]
  if (ages.some((age) => age < minParentAge)) return refuse('tooYoung')
  if (ages.some((age) => age > maxParentAge)) return refuse('tooOld')
  if (childCooldownDaysLeft(state, parentId) > 0) return refuse('cooldown')

  const cost = childCost(state, parent.id, partner.id)
  if (state.money < cost) return refuse('notEnoughMoney')
  return { ok: true, cost, partnerId: partner.id }
}

function haveChild(state: GameState, parentId: MemberId): ActionResult {
  const check = checkHaveChild(state, parentId)
  if (!check.ok) return check

  const draft = structuredClone(state)
  const rng = createRng(draft.rngState)
  const day = draft.clock.day
  const parent = draft.members[parentId]
  const partner = draft.members[check.partnerId]
  const gender = rng.chance(0.5) ? 'f' : 'm'
  const child = addMember(draft, rng, {
    gender,
    birthDay: day,
    generation: Math.max(parent.generation, partner.generation) + 1,
    parentIds: [parent.id, partner.id],
    origin: 'born',
    appearance: inheritAppearance(rng, parent.appearance, partner.appearance, gender),
  })
  parent.lastChildDay = day
  partner.lastChildDay = day
  draft.money -= check.cost
  draft.stats.totalSpent += check.cost
  draft.rngState = rng.state
  const events: GameEvent[] = [{ type: 'born', day, memberId: child.id }]
  appendLog(draft, events)
  return done(draft, events)
}

/** Sorteia novas pessoas sugeridas como par. Grátis: dá para procurar quantas vezes quiser. */
function findSuitors(state: GameState, memberId: MemberId): ActionResult {
  const check = checkSeekPartner(state, memberId)
  if (!check.ok) return check

  const draft = structuredClone(state)
  const rng = createRng(draft.rngState)
  draft.suitors[memberId] = rollSuitors(draft, rng, draft.members[memberId])
  draft.rngState = rng.state
  return done(draft)
}

function marry(state: GameState, memberId: MemberId, suitorIndex: number): ActionResult {
  const check = checkMarry(state, memberId, suitorIndex)
  if (!check.ok) return check

  const draft = structuredClone(state)
  const rng = createRng(draft.rngState)
  const spouse = joinFamily(draft, rng, draft.members[memberId], check.suitor)
  delete draft.suitors[memberId]
  draft.money -= check.cost
  draft.stats.totalSpent += check.cost
  draft.rngState = rng.state
  const events: GameEvent[] = [
    { type: 'married', day: draft.clock.day, memberId, partnerId: spouse.id },
  ]
  appendLog(draft, events)
  return done(draft, events)
}

function done(state: GameState, events: GameEvent[] = []): ActionResult {
  return { ok: true, state, events }
}
