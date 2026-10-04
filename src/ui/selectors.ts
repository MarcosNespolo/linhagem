import { BALANCE } from '@/content/balance'
import {
  ageOf,
  checkHaveChild,
  checkSeekPartner,
  childCost,
  weddingCost,
  type ChildCheck,
  type GameState,
  type Member,
  type MemberId,
} from '@/engine'

export type CoupleStatus = {
  /** Quem representa o casal nas ações (o de menor id). */
  lead: Member
  partner: Member
  check: ChildCheck
  cost: number
}

export type LoveActions = {
  /** Adultos solteiros que podem procurar um par. */
  seekers: Member[]
  /** Casais vivos que ainda podem ter filhos. */
  couples: CoupleStatus[]
  /** Quantas ações dá para fazer agora, para o selo da aba. */
  ready: number
  weddingCost: number
}

function memberOrder(id: MemberId): number {
  return Number(id.slice(1))
}

/** Quem pode casar e quais casais podem ter filhos, a partir do estado atual. */
export function loveActions(state: GameState): LoveActions {
  const day = state.clock.day
  const seekers: Member[] = []
  const couples: CoupleStatus[] = []
  const cost = weddingCost(state)

  for (const member of Object.values(state.members)) {
    if (member.deathDay !== null) continue
    if (checkSeekPartner(state, member.id).ok) {
      seekers.push(member)
      continue
    }
    const partner = member.partnerId ? state.members[member.partnerId] : undefined
    if (!partner || partner.deathDay !== null) continue
    if (memberOrder(member.id) > memberOrder(partner.id)) continue
    const tooOld = [member, partner].some(
      (person) => ageOf(person, day) > BALANCE.children.maxParentAge,
    )
    if (tooOld) continue
    couples.push({
      lead: member,
      partner,
      check: checkHaveChild(state, member.id),
      cost: childCost(state, member.id, partner.id),
    })
  }

  seekers.sort((a, b) => a.birthDay - b.birthDay)
  couples.sort((a, b) => a.lead.birthDay - b.lead.birthDay)
  const canMarry = state.money >= cost ? seekers.length : 0
  const canHaveChild = couples.filter((couple) => couple.check.ok).length
  return { seekers, couples, ready: canMarry + canHaveChild, weddingCost: cost }
}

export type NodeAction = 'marry' | 'child'

/** Ação disponível agora para cada membro, para o selo na árvore. */
export function nodeActions(actions: LoveActions, money: number): Map<MemberId, NodeAction> {
  const map = new Map<MemberId, NodeAction>()
  if (money >= actions.weddingCost) {
    for (const seeker of actions.seekers) map.set(seeker.id, 'marry')
  }
  for (const couple of actions.couples) {
    if (couple.check.ok) map.set(couple.lead.id, 'child')
  }
  return map
}
