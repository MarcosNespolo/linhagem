import { BALANCE } from '../content/balance'
import { FAMILY_NAME_MAX_LENGTH } from './constants'
import { addMember, ageOf, childrenOf, isAlive } from './members'
import { createRng } from './rng'
import type { GameEvent, GameState, MemberId } from './types'

export type Action =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'renameFamily'; name: string }
  | { type: 'haveChild'; parentId: MemberId }

export type ActionError =
  | 'memberNotFound'
  | 'memberDeceased'
  | 'noPartner'
  | 'tooYoung'
  | 'tooOld'
  | 'cooldown'
  | 'notEnoughMoney'
  | 'invalidName'

export type ActionResult =
  { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: ActionError }

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
  }
}

export type ChildCheck =
  { ok: true; cost: number; partnerId: MemberId } | { ok: false; error: ActionError }

/** Custo do próximo filho do casal: cresce a cada filho que os dois já tiveram juntos. */
export function childCost(state: GameState, parentId: MemberId, partnerId: MemberId): number {
  const together = childrenOf(state, parentId).filter((child) =>
    child.parentIds.includes(partnerId),
  ).length
  return Math.round(BALANCE.children.baseCost * BALANCE.children.costGrowth ** together)
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
  const child = addMember(draft, rng, {
    gender: rng.chance(0.5) ? 'f' : 'm',
    birthDay: day,
    generation: Math.max(parent.generation, partner.generation) + 1,
    parentIds: [parent.id, partner.id],
  })
  parent.lastChildDay = day
  partner.lastChildDay = day
  draft.money -= check.cost
  draft.stats.totalSpent += check.cost
  draft.rngState = rng.state
  return done(draft, [{ type: 'born', day, memberId: child.id }])
}

function done(state: GameState, events: GameEvent[] = []): ActionResult {
  return { ok: true, state, events }
}

function refuse(error: ActionError): { ok: false; error: ActionError } {
  return { ok: false, error }
}
