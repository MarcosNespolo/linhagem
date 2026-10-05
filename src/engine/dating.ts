import { BALANCE } from '../content/balance'
import { canMeet, joinFamily, rollSuitor, weddingCost } from './marriage'
import type { Rng } from './rng'
import { calendarDate } from './time'
import type { Choice, GameEvent, GameState, Member } from './types'

type MeetChoice = Extract<Choice, { type: 'meet' }>
type ProposeChoice = Extract<Choice, { type: 'propose' }>

/** Opções da escolha de quando alguém aparece. */
export const MEET_OPTIONS = { date: 0, decline: 1 } as const

/** Opções do pedido de casamento. */
export const PROPOSE_OPTIONS = { marry: 0, wait: 1, breakUp: 2 } as const

/**
 * Dia do pedido de casamento: a mesma data do calendário, `yearsToPropose` anos
 * depois de `day`. Como o namoro começa numa data de conhecer alguém, o pedido
 * cai junto com ela e o relógio para uma vez só. Um 29 de fevereiro no caminho
 * empurra o pedido um dia.
 */
function askDayAfter(state: GameState, day: number): number {
  const years = BALANCE.dating.yearsToPropose
  const date = calendarDate(state.startDate, day).slice(5)
  const target = day + years * BALANCE.daysPerYear
  for (let shift = 0; shift <= Math.ceil(years / 4); shift++) {
    if (calendarDate(state.startDate, target + shift).slice(5) === date) return target + shift
  }
  return target
}

/**
 * Na virada do dia: nas datas de conhecer alguém, cada solteiro adulto tem uma
 * chance de conhecer uma pessoa; quem chegou ao dia do pedido recebe a escolha
 * de casar. As duas escolhas param o relógio. A sugestão é casar enquanto o
 * dinheiro cobre os casamentos sugeridos antes, no mesmo dia; depois, esperar.
 * Altera o rascunho.
 */
export function processDating(
  draft: GameState,
  rng: Rng,
  living: readonly Member[] = Object.values(draft.members),
): void {
  const day = draft.clock.day
  const meetDay = (BALANCE.dating.meetDates as readonly string[]).includes(
    calendarDate(draft.startDate, day).slice(5),
  )
  let money = draft.money
  for (const member of living) {
    if (member.deathDay !== null) continue
    if (member.dating) {
      // Com outra escolha do membro aberta, o pedido fica para quando ela for respondida.
      const busy = draft.choices.some((choice) => choice.memberId === member.id)
      if (day >= member.dating.askDay && !busy) {
        const marry = isProposeOptionAvailable(money, PROPOSE_OPTIONS.marry)
        if (marry) money -= weddingCost()
        draft.choices.push({
          type: 'propose',
          memberId: member.id,
          day,
          suggested: marry ? PROPOSE_OPTIONS.marry : PROPOSE_OPTIONS.wait,
        })
      }
      continue
    }
    if (!meetDay || !canMeet(draft, member)) continue
    if (rng.next() >= BALANCE.dating.meetChance) continue
    draft.choices.push({
      type: 'meet',
      memberId: member.id,
      day,
      person: rollSuitor(draft, rng, member),
      suggested: MEET_OPTIONS.date,
    })
  }
}

/**
 * Casar só dá com o dinheiro do casamento em `money`, o que sobra depois das
 * outras respostas; as outras opções estão sempre abertas.
 */
export function isProposeOptionAvailable(money: number, option: number): boolean {
  return option !== PROPOSE_OPTIONS.marry || money >= weddingCost()
}

/** Quanto a resposta do pedido custa na hora: casar paga o casamento. */
export function proposeCost(option: number): number {
  return option === PROPOSE_OPTIONS.marry ? weddingCost() : 0
}

/** Aplica a resposta de quando alguém aparece. Altera o rascunho. */
export function applyMeetPick(draft: GameState, choice: MeetChoice, option: number): GameEvent[] {
  if (option !== MEET_OPTIONS.date) return []
  const member = draft.members[choice.memberId]
  const day = draft.clock.day
  member.dating = { partner: choice.person, since: day, askDay: askDayAfter(draft, day) }
  return [{ type: 'datingStarted', day, memberId: member.id, partnerName: choice.person.firstName }]
}

/** Aplica a resposta do pedido de casamento. Altera o rascunho. */
export function applyProposePick(
  draft: GameState,
  rng: Rng,
  choice: ProposeChoice,
  option: number,
): GameEvent[] {
  const member = draft.members[choice.memberId]
  const dating = member.dating
  if (!dating) return []
  const day = draft.clock.day
  if (option === PROPOSE_OPTIONS.wait) {
    member.dating = { ...dating, askDay: askDayAfter(draft, day) }
    return []
  }
  member.dating = null
  if (option === PROPOSE_OPTIONS.breakUp) {
    return [{ type: 'breakup', day, memberId: member.id, partnerName: dating.partner.firstName }]
  }
  const spouse = joinFamily(draft, rng, member, dating.partner)
  const cost = weddingCost()
  draft.money -= cost
  draft.stats.totalSpent += cost
  return [{ type: 'married', day, memberId: member.id, partnerId: spouse.id }]
}
