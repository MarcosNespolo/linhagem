import { BALANCE } from '../content/balance'
import { archiveMembers } from './archive'
import { takeExams } from './concurso'
import { incomeOf } from './economy'
import { processDating } from './dating'
import { isEnrollmentDay, processEnrollment } from './enrollment'
import { openFirstJobChoice, processJobOffers } from './jobs'
import { processMishaps } from './mishaps'
import { processPromotions } from './promotions'
import { processMarket, processVacancies } from './properties'
import type { Rng } from './rng'
import { halfTimeCaregivers } from './school'
import { calendarDate } from './time'
import type { GameEvent, GameState, Member } from './types'

/**
 * Processa a virada para o dia atual do relógio: aniversários, maioridade,
 * aposentadoria, morte, as matrículas e o arquivo da árvore de janeiro, as
 * promoções, os imprevistos, os imóveis comerciais que ficam à venda, os
 * inquilinos que saem e voltam, as propostas de emprego, as provas de
 * concurso, os namoros e o 13º salário. As escolhas abertas aqui (matrículas,
 * depois do médio, primeiro emprego, resultado do concurso, alguém que
 * aparece, pedido de casamento) param o relógio; a proposta de emprego não. Altera o rascunho.
 * `living` são as pessoas vivas do rascunho; quem morre no meio pode continuar
 * na lista.
 */
export function processNewDay(
  draft: GameState,
  rng: Rng,
  events: GameEvent[],
  living: readonly Member[] = Object.values(draft.members),
): void {
  const day = draft.clock.day

  for (const member of living) {
    if (member.deathDay !== null) continue
    const daysLived = day - member.birthDay
    if (daysLived <= 0 || daysLived % BALANCE.daysPerYear !== 0) continue

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
  }
  processPromotions(draft, events, living)
  processMishaps(draft, events, living)
  processJobOffers(draft, events, living)
  processMarket(draft)
  processVacancies(
    draft,
    living.reduce((count, member) => count + (member.deathDay === null ? 1 : 0), 0),
  )
  takeExams(draft, rng, events)
  processDating(draft, rng, living)
  payThirteenth(draft, events, living)
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
