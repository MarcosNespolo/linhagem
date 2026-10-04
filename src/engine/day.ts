import { BALANCE } from '../content/balance'
import { openFirstJobChoice } from './choices'
import { memberIncome } from './economy'
import type { Rng } from './rng'
import { calendarDate } from './time'
import type { GameEvent, GameState } from './types'

/**
 * Processa a virada para o dia atual do relógio: aniversários, maioridade,
 * aposentadoria, morte e o 13º salário. Quem faz 18 anos sem emprego ganha a
 * escolha do primeiro emprego, que para o relógio. Altera o rascunho e devolve
 * true quando houve algum aniversário, porque aí as taxas de renda e despesa
 * podem ter mudado.
 */
export function processNewDay(draft: GameState, rng: Rng, events: GameEvent[]): boolean {
  const day = draft.clock.day
  let changed = false

  for (const member of Object.values(draft.members)) {
    if (member.deathDay !== null) continue
    const daysLived = day - member.birthDay
    if (daysLived <= 0 || daysLived % BALANCE.daysPerYear !== 0) continue

    changed = true
    const age = daysLived / BALANCE.daysPerYear

    if (age >= member.lifespan) {
      member.deathDay = day
      delete draft.suitors[member.id]
      events.push({ type: 'died', day, memberId: member.id, age })
      continue
    }
    if (age === BALANCE.adultAge) {
      events.push({ type: 'becameAdult', day, memberId: member.id })
      if (!member.career) openFirstJobChoice(draft, rng, member)
    }
    if (age === BALANCE.retirementAge && member.career) {
      events.push({ type: 'retired', day, memberId: member.id })
    }
  }

  payThirteenth(draft, events)
  return changed
}

/** No dia do 13º, quem trabalha recebe um salário a mais, e quem é aposentado, uma pensão a mais. */
function payThirteenth(draft: GameState, events: GameEvent[]): void {
  const day = draft.clock.day
  if (calendarDate(draft.startDate, day).slice(5) !== BALANCE.thirteenthSalaryDate) return
  let amount = 0
  for (const member of Object.values(draft.members)) amount += memberIncome(member, day)
  if (amount <= 0) return
  draft.money += amount
  draft.stats.totalEarned += amount
  events.push({ type: 'thirteenth', day, amount })
}
