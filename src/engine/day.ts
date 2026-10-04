import { BALANCE } from '../content/balance'
import { rollStarterCareer } from './members'
import type { Rng } from './rng'
import type { GameEvent, GameState } from './types'

/**
 * Processa a virada para o dia atual do relógio: aniversários, maioridade,
 * aposentadoria e morte. Altera o rascunho e devolve true quando houve algum
 * aniversário, porque aí as taxas de renda e despesa podem ter mudado.
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
      if (!member.career) {
        member.career = rollStarterCareer(rng)
        events.push({ type: 'firstJob', day, memberId: member.id, careerId: member.career.id })
      }
    }
    if (age === BALANCE.retirementAge && member.career) {
      events.push({ type: 'retired', day, memberId: member.id })
    }
  }
  return changed
}
