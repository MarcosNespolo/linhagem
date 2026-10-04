import { expect } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  advance,
  applyAction,
  daysToMs,
  newGame,
  suggestedPicks,
  type ActionResult,
  type GameState,
  type Member,
} from '@/engine'

export const START = { now: 1_760_000_000_000, startDate: '2026-10-03' } as const

export function makeGame(seed = 1): GameState {
  return newGame({ seed, ...START })
}

export function withMoney(state: GameState, money: number): GameState {
  return { ...state, money }
}

/** Troca campos de um membro sem alterar o estado original. */
export function setMember(state: GameState, id: string, patch: Partial<Member>): GameState {
  const member = state.members[id]
  if (!member) throw new Error(`Membro ${id} não existe`)
  return { ...state, members: { ...state.members, [id]: { ...member, ...patch } } }
}

export function founders(state: GameState): [Member, Member] {
  const [first, second] = Object.values(state.members)
  if (!first || !second) throw new Error('Partida sem casal fundador')
  return [first, second]
}

export function lastMember(state: GameState): Member {
  const member = Object.values(state.members).at(-1)
  if (!member) throw new Error('Partida sem membros')
  return member
}

export function expectOk(result: ActionResult): Extract<ActionResult, { ok: true }> {
  if (!result.ok) throw new Error(`Ação recusada: ${result.error}`)
  return result
}

/** Partida com dinheiro de sobra e um filho recém-nascido do casal fundador. */
export function withChild(state: GameState): GameState {
  const [first] = founders(state)
  const result = applyAction(withMoney(state, 1_000_000), { type: 'haveChild', parentId: first.id })
  return expectOk(result).state
}

/** Responde todas as escolhas abertas com a sugestão, como quem confirma o painel direto. */
export function chooseSuggested(state: GameState): GameState {
  if (state.choices.length === 0) return state
  return expectOk(applyAction(state, { type: 'choose', picks: suggestedPicks(state) })).state
}

/**
 * Partida com um filho do casal fundador já adulto, com o primeiro emprego
 * sugerido e dinheiro de sobra. Devolve o id do filho.
 */
export function withAdultChild(seed = 1): { state: GameState; childId: string } {
  const born = withChild(makeGame(seed))
  const childId = lastMember(born).id
  const grown = chooseSuggested(advance(born, years(BALANCE.adultAge)).state)
  return { state: withMoney(grown, 1_000_000), childId }
}

/** Procura par para o membro e casa com a pessoa de índice `suitorIndex`. */
export function marryMember(state: GameState, memberId: string, suitorIndex = 0): GameState {
  const searched = expectOk(applyAction(state, { type: 'findSuitors', memberId })).state
  return expectOk(applyAction(searched, { type: 'marry', memberId, suitorIndex })).state
}

/** Milissegundos reais de `n` dias do jogo. */
export const days = (n: number) => daysToMs(n)
/** Milissegundos reais de `n` anos do jogo. */
export const years = (n: number) => days(n * BALANCE.daysPerYear)

/** Igualdade com tolerância relativa, para somas de ponto flutuante. */
export function expectClose(actual: number, expected: number, relative = 1e-9): void {
  const tolerance = relative * Math.max(1, Math.abs(expected))
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

/** Dois estados iguais, com tolerância só nos valores em dinheiro. */
export function expectSameState(actual: GameState, expected: GameState): void {
  const withoutMoney = (state: GameState) => ({
    ...state,
    money: 0,
    stats: { ...state.stats, totalEarned: 0, totalSpent: 0 },
  })
  expect(withoutMoney(actual)).toEqual(withoutMoney(expected))
  expectClose(actual.money, expected.money)
  expectClose(actual.stats.totalEarned, expected.stats.totalEarned)
  expectClose(actual.stats.totalSpent, expected.stats.totalSpent)
}
