import { BALANCE } from '../content/balance'
import { lifeEndDay, livesAway } from './members'
import type { GameState, Member, MemberId } from './types'

/**
 * Tira da árvore guardada os ramos antigos que já terminaram, para o save não
 * crescer sem limite. Quando a árvore passa de `BALANCE.archive.maxMembers`
 * pessoas, saem as que só apareciam com "Mostrar quem já faleceu": quem morreu,
 * ou saiu de casa e já passou da expectativa de vida, sem filhos na árvore,
 * sem acontecimento no histórico e com o par na mesma situação. O casal sai
 * junto, e sai primeiro quem se foi há mais tempo. Altera o rascunho e devolve
 * quantas pessoas saíram.
 */
export function archiveMembers(draft: GameState): number {
  const members = draft.members
  const excess = Object.keys(members).length - BALANCE.archive.maxMembers
  if (excess <= 0) return 0

  const day = draft.clock.day
  const kept = new Set<MemberId>()
  for (const member of Object.values(members)) {
    for (const parentId of member.parentIds) kept.add(parentId)
  }
  for (const event of draft.log) {
    if ('memberId' in event) kept.add(event.memberId)
    if ('partnerId' in event) kept.add(event.partnerId)
  }
  const ended = (member: Member) =>
    member.deathDay !== null && !livesAway(member, day) && !kept.has(member.id)

  const candidates = Object.values(members)
    .filter((member) => {
      if (!ended(member)) return false
      const partner = member.partnerId ? members[member.partnerId] : undefined
      return partner === undefined || ended(partner)
    })
    .sort((a, b) => endDay(a) - endDay(b) || idNumber(a) - idNumber(b))

  let removed = 0
  for (const member of candidates) {
    if (removed >= excess) break
    if (!(member.id in members)) continue
    delete members[member.id]
    removed += 1
    if (member.partnerId && member.partnerId in members) {
      delete members[member.partnerId]
      removed += 1
    }
  }
  draft.stats.archived += removed
  return removed
}

/** Dia em que a pessoa deixou de aparecer na árvore: o da morte ou o fim da vida fora de casa. */
function endDay(member: Member): number {
  return member.leftHome ? lifeEndDay(member) : (member.deathDay ?? 0)
}

function idNumber(member: Member): number {
  return Number(member.id.slice(1))
}
