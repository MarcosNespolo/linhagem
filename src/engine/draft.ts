import type { GameState, Member, MemberId } from './types'

/**
 * Cópia do estado para alterar sem tocar no original. Quem já morreu nunca
 * muda, então continua compartilhado com o estado original em vez de ser
 * copiado: o custo de avançar o relógio acompanha a família viva, não todos os
 * antepassados. O histórico também fica compartilhado, porque só cresce numa
 * lista nova (`appendLog`).
 */
export function draftOf(state: GameState): GameState {
  const { members, log, ...rest } = state
  const draftMembers: Record<MemberId, Member> = {}
  for (const id in members) {
    const member = members[id]
    draftMembers[id] = member.deathDay === null ? cloneData(member) : member
  }
  return { ...cloneData(rest), log, members: draftMembers }
}

/**
 * Cópia profunda de dados simples, como os do save: objetos, listas e valores.
 * Bem mais rápida que `structuredClone`, que o relógio chamaria a cada segundo.
 */
function cloneData<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value
  if (Array.isArray(value)) return value.map(cloneData) as T
  const copy: Record<string, unknown> = {}
  for (const key in value) copy[key] = cloneData((value as Record<string, unknown>)[key])
  return copy as T
}
