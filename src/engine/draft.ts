import type { GameState, Member, MemberId } from './types'

/**
 * Cópia do estado para alterar sem tocar no original. Quem já morreu nunca
 * muda, então continua compartilhado com o estado original em vez de ser
 * copiado: o custo de avançar o relógio acompanha a família viva, não todos os
 * antepassados.
 */
export function draftOf(state: GameState): GameState {
  const { members, ...rest } = state
  const living: Record<MemberId, Member> = {}
  for (const [id, member] of Object.entries(members)) {
    if (member.deathDay === null) living[id] = member
  }
  const copy = structuredClone({ rest, living })
  const draftMembers: Record<MemberId, Member> = {}
  for (const [id, member] of Object.entries(members)) {
    draftMembers[id] = copy.living[id] ?? member
  }
  return { ...copy.rest, members: draftMembers }
}
