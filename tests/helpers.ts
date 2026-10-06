import { expect } from 'vitest'
import { BALANCE } from '@/content/balance'
import { propertyType, type PropertyId } from '@/content/properties'
import {
  advance,
  applyAction,
  canMeet,
  createRng,
  joinFamily,
  MEET_OPTIONS,
  PROPOSE_OPTIONS,
  rollSuitor,
  daysToMs,
  msToTicks,
  newGame,
  suggestedPicks,
  TICKS_PER_DAY,
  TICKS_PER_MS,
  type ActionResult,
  type Choice,
  type ChoicePick,
  type GameState,
  type Member,
} from '@/engine'

export const START = { now: 1_760_000_000_000, startDate: '2026-10-03' } as const

/** A partida como o jogo começa: uma pessoa de 18 anos, sozinha, no dia 0. */
export function makeStart(seed = 1): GameState {
  return newGame({ seed, ...START })
}

/** Idade de quem funda a família nas partidas dos testes, que já começam com um casal. */
export const COUPLE_AGE = 26

/** Dinheiro com que o casal dos testes começa: o bastante para o aluguel não o levar ao vermelho. */
export const COUPLE_SAVINGS = 20_000

/**
 * A partida da maioria dos testes: a pessoa que funda a família com
 * `COUPLE_AGE` anos, já casada com alguém de fora sorteado como no namoro, no
 * dia 0, para os dois poderem ter filhos, e com uma poupança, porque fora da
 * casa dos pais o aluguel do casal passa do que dois salários de começo pagam.
 */
export function makeGame(seed = 1): GameState {
  return withMoney(withPartner(makeStart(seed)), COUPLE_SAVINGS)
}

/**
 * Casa quem funda a família, com `COUPLE_AGE` anos, com alguém de fora
 * sorteado como no namoro, sem passar pelo pedido nem pagar o casamento.
 */
export function withPartner(state: GameState): GameState {
  const draft = structuredClone(state)
  const [founder] = Object.values(draft.members)
  founder.birthDay -= (COUPLE_AGE - BALANCE.adultAge) * BALANCE.daysPerYear
  const rng = createRng(draft.rngState)
  joinFamily(draft, rng, founder, rollSuitor(draft, rng, founder))
  draft.rngState = rng.state
  return draft
}

export function withMoney(state: GameState, money: number): GameState {
  return { ...state, money }
}

/**
 * A família com os imóveis informados, sem pagar por eles: lugar em casa para
 * mais gente. Ela fica com os primeiros lotes de cada tipo, até os da rua.
 */
export function withHomes(
  state: GameState,
  properties: Partial<Record<PropertyId, number>>,
): GameState {
  const lots = { ...state.lots }
  for (const [id, count] of Object.entries(properties) as [PropertyId, number][]) {
    const shown = Math.min(count, propertyType(id).lots)
    lots[id] = Array.from({ length: shown }, (_, lot) => lot)
  }
  return { ...state, properties: { ...state.properties, ...properties }, lots }
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

/** Como o jogador responde as escolhas abertas. */
export type Policy = (state: GameState) => ChoicePick[]

/** Recusa quem aparece para namorar; nas outras escolhas, fica com a sugestão. */
export const singlePolicy: Policy = (state) =>
  state.choices.map((choice) => ({
    memberId: choice.memberId,
    option: choice.type === 'meet' ? MEET_OPTIONS.decline : choice.suggested,
  }))

/**
 * Depois do médio, vai trabalhar e recusa quem aparece para namorar; nas outras
 * escolhas, fica com a sugestão.
 */
export const workPolicy: Policy = (state) =>
  singlePolicy(state).map((pick, i) => {
    const choice = state.choices[i]
    if (choice.type !== 'afterSchool') return pick
    return { ...pick, option: choice.options.findIndex((option) => option.path === 'trabalho') }
  })

/**
 * Avança `ms` como um jogador que responde cada escolha (com a sugestão, ou
 * com `answer`) e segue jogando: no vermelho, o jogo pausa para avisar e ele
 * continua. Com `stopAt`, para na primeira escolha desse tipo e a deixa
 * aberta; na falência, para ali.
 */
export function play(
  state: GameState,
  ms: number,
  stopAt?: Choice['type'],
  answer: Policy = suggestedPicks,
): GameState {
  let current = state
  let left = ms
  while (msToTicks(left) > 0) {
    const before = clockMs(current)
    current = advance(current, left).state
    left -= clockMs(current) - before
    // Uma resposta pode abrir outra escolha (trabalhar abre a do emprego); responde até acabar.
    while (current.choices.length > 0) {
      if (current.choices.some((choice) => choice.type === stopAt)) return current
      const picks = answer(current)
      current = expectOk(applyAction(current, { type: 'choose', picks })).state
    }
    if (current.bankruptDay !== null) return current
    if (current.clock.paused) current = expectOk(applyAction(current, { type: 'resume' })).state
  }
  return current
}

/** Posição do relógio em milissegundos reais desde o dia 0, sem arredondar. */
function clockMs(state: GameState): number {
  return (state.clock.day * TICKS_PER_DAY + state.clock.tickOfDay) / TICKS_PER_MS
}

/**
 * Partida com um filho do casal fundador já adulto e solteiro, que passou pela
 * escola com as sugestões, foi trabalhar depois do médio na vaga sugerida e tem
 * dinheiro de sobra. Devolve o id do filho.
 */
export function withAdultChild(seed = 1): { state: GameState; childId: string } {
  const born = withChild(makeGame(seed))
  const childId = lastMember(born).id
  const grown = play(born, years(BALANCE.adultAge), undefined, workPolicy)
  return { state: withMoney(grown, 1_000_000), childId }
}

/**
 * Família com dois filhos solteiros, nascidos com o intervalo mínimo entre
 * filhos e já adultos: com os fundadores, enche os 4 lugares que a família
 * consegue alugar.
 */
export function withAdultChildren(seed = 1): { state: GameState; childIds: [string, string] } {
  const first = withChild(makeGame(seed))
  const older = lastMember(first).id
  const second = withChild(play(first, days(BALANCE.children.cooldownDays), undefined, workPolicy))
  const younger = lastMember(second).id
  const grown = play(second, years(BALANCE.adultAge), undefined, workPolicy)
  return { state: withMoney(grown, 1_000_000), childIds: [older, younger] }
}

/**
 * Avança até o casal recém-casado poder ter filhos: quem casa aos 18 espera a
 * idade mínima, assim como o par mais novo.
 */
export function untilParentAge(state: GameState, answer: Policy = suggestedPicks): GameState {
  return play(state, years(BALANCE.children.minParentAge - BALANCE.adultAge), undefined, answer)
}

/**
 * Abre para o membro a escolha de quando alguém aparece, como nas datas de
 * conhecer alguém, com uma pessoa sorteada pelo gerador do jogo.
 */
export function meetSomeone(state: GameState, memberId: string): GameState {
  const member = state.members[memberId]
  if (!canMeet(state, member)) throw new Error(`${memberId} não pode conhecer alguém agora`)
  const rng = createRng(state.rngState)
  const person = rollSuitor(state, rng, member)
  const choice: Choice = {
    type: 'meet',
    memberId,
    day: state.clock.day,
    person,
    suggested: MEET_OPTIONS.date,
  }
  return { ...state, rngState: rng.state, choices: [...state.choices, choice] }
}

/** Responde a escolha aberta do membro com a opção pedida. */
export function answer(state: GameState, memberId: string, option: number): GameState {
  return expectOk(applyAction(state, { type: 'choose', picks: [{ memberId, option }] })).state
}

/**
 * O membro conhece alguém, namora e casa no pedido, pagando o casamento. Quem
 * já namora casa com quem namora.
 */
export function marryMember(state: GameState, memberId: string): GameState {
  const dating = state.members[memberId].dating
    ? state
    : answer(meetSomeone(state, memberId), memberId, MEET_OPTIONS.date)
  const proposal: Choice = {
    type: 'propose',
    memberId,
    day: dating.clock.day,
    suggested: PROPOSE_OPTIONS.marry,
  }
  const asked = { ...dating, choices: [...dating.choices, proposal] }
  return answer(asked, memberId, PROPOSE_OPTIONS.marry)
}

/** Dá ao membro a aptidão pedida. */
export function withAptitude(state: GameState, memberId: string, aptitude: number): GameState {
  return setMember(state, memberId, { aptitude })
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
