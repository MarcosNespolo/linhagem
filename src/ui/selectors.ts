import { BALANCE } from '@/content/balance'
import {
  ageOf,
  canMeet,
  checkHaveChild,
  childCost,
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
  /** Quem namora, com o par e o dia do pedido de casamento. */
  dating: Member[]
  /** Adultos solteiros, sem namoro, que podem conhecer alguém. */
  singles: Member[]
  /** Casais vivos que ainda podem ter filhos. */
  couples: CoupleStatus[]
  /** Quantas ações dá para fazer agora, para o selo da aba. */
  ready: number
}

function memberOrder(id: MemberId): number {
  return Number(id.slice(1))
}

/** Quem namora, quem está solteiro e quais casais podem ter filhos, a partir do estado atual. */
export function loveActions(state: GameState): LoveActions {
  const day = state.clock.day
  const dating: Member[] = []
  const singles: Member[] = []
  const couples: CoupleStatus[] = []

  for (const member of Object.values(state.members)) {
    if (member.deathDay !== null) continue
    if (member.dating) {
      dating.push(member)
      continue
    }
    if (canMeet(state, member)) {
      singles.push(member)
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
      cost: childCost(),
    })
  }

  dating.sort((a, b) => a.birthDay - b.birthDay)
  singles.sort((a, b) => a.birthDay - b.birthDay)
  couples.sort((a, b) => a.lead.birthDay - b.lead.birthDay)
  const ready = couples.filter((couple) => couple.check.ok).length
  return { dating, singles, couples, ready }
}

export type NodeAction = 'dating' | 'child'

/** O que mostrar em cada membro na árvore: o coração de quem namora e o nó de quem pode ter filho. */
export function nodeActions(actions: LoveActions): Map<MemberId, NodeAction> {
  const map = new Map<MemberId, NodeAction>()
  for (const member of actions.dating) map.set(member.id, 'dating')
  for (const couple of actions.couples) {
    if (couple.check.ok) map.set(couple.lead.id, 'child')
  }
  return map
}

/** Identifica o conjunto de escolhas abertas. Vazio quando não há nenhuma. */
export function choicesKey(state: GameState): string {
  return state.choices.map((choice) => `${choice.memberId}@${choice.day}`).join(',')
}
