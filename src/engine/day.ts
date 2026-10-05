import { BALANCE } from '../content/balance'
import { archiveMembers } from './archive'
import { takeExams } from './concurso'
import { incomeOf } from './economy'
import { processDating } from './dating'
import { isEnrollmentDay, processEnrollment } from './enrollment'
import { openFirstJobChoice } from './jobs'
import { processMishaps } from './mishaps'
import { processPromotions } from './promotions'
import { processMarket } from './properties'
import type { Rng } from './rng'
import { halfTimeCaregivers } from './school'
import { calendarDate } from './time'
import type { GameEvent, GameState, Member } from './types'

/**
 * Processa a virada para o dia atual do relógio: aniversários, maioridade,
 * aposentadoria, morte, as matrículas e o arquivo da árvore de janeiro, as
 * promoções, os imprevistos, os imóveis comerciais que ficam à venda, as
 * provas de concurso, os namoros e o 13º salário. As escolhas abertas aqui
 * (matrículas, depois do médio, primeiro emprego, resultado do concurso,
 * alguém que aparece, pedido de casamento) param o relógio. Altera o rascunho
 * e devolve true quando algo pode ter mudado as taxas de renda e despesa.
 * `living` são as pessoas vivas do rascunho; quem morre no meio pode continuar
 * na lista.
 */
export function processNewDay(
  draft: GameState,
  rng: Rng,
  events: GameEvent[],
  living: readonly Member[] = Object.values(draft.members),
): boolean {
  const day = draft.clock.day
  let changed = false

  for (const member of living) {
    if (member.deathDay !== null) continue
    const daysLived = day - member.birthDay
    if (daysLived <= 0 || daysLived % BALANCE.daysPerYear !== 0) continue

    changed = true
    const age = daysLived / BALANCE.daysPerYear

    if (age >= member.lifespan) {
      member.deathDay = day
      member.dating = null
      member.course = null
      events.push({ type: 'died', day, memberId: member.id, age })
      continue
    }
    if (age === BALANCE.adultAge) {
      events.push({ type: 'becameAdult', day, memberId: member.id })
      // Quem terminou a escola já escolheu o caminho em janeiro. Fica a reserva para quem
      // chega aos 18 sem estudar, sem emprego e sem escolha aberta.
      const waiting = draft.choices.some((choice) => choice.memberId === member.id)
      const studying = member.education.school !== null || member.concurso !== null
      if (!member.career && !studying && !waiting) {
        openFirstJobChoice(draft, rng, member)
      }
    }
    if (age === BALANCE.retirementAge && member.career) {
      // O curso que estava pela metade fica sem terminar.
      member.course = null
      events.push({ type: 'retired', day, memberId: member.id })
    }
  }

  if (isEnrollmentDay(draft)) {
    processEnrollment(draft, rng, events)
    archiveMembers(draft)
    changed = true
  }
  if (processPromotions(draft, events, living)) changed = true
  if (processMishaps(draft, events, living)) changed = true
  processMarket(draft)
  if (takeExams(draft, rng, events)) changed = true
  processDating(draft, rng, living)
  payThirteenth(draft, events, living)
  return changed
}

/** No dia do 13º, quem trabalha recebe um salário a mais, e quem é aposentado, uma pensão a mais. */
function payThirteenth(draft: GameState, events: GameEvent[], living: readonly Member[]): void {
  const day = draft.clock.day
  if (calendarDate(draft.startDate, day).slice(5) !== BALANCE.thirteenthSalaryDate) return
  const caregivers = halfTimeCaregivers(draft, living)
  let amount = 0
  for (const member of living) amount += incomeOf(draft, member, caregivers)
  if (amount <= 0) return
  draft.money += amount
  draft.stats.totalEarned += amount
  events.push({ type: 'thirteenth', day, amount })
}
