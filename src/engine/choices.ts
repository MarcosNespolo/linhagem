import { BALANCE } from '../content/balance'
import { CAREER_IDS, careerLevel } from '../content/careers'
import { refuse, type Refusal } from './errors'
import type { Rng } from './rng'
import type { GameEvent, GameState, JobOffer, Member, MemberId } from './types'

/** Resposta a uma escolha aberta: de quem é e o índice da opção escolhida. */
export type ChoicePick = { memberId: MemberId; option: number }

/** Sorteia vagas de carreiras diferentes para o primeiro emprego. */
export function rollJobOffers(rng: Rng): JobOffer[] {
  const pool = [...CAREER_IDS]
  const offers: JobOffer[] = []
  const count = Math.min(BALANCE.jobs.offersPerChoice, pool.length)
  for (let i = 0; i < count; i++) {
    const index = rng.int(0, pool.length - 1)
    offers.push({ careerId: pool[index] })
    pool.splice(index, 1)
  }
  return offers
}

/** Salário por mês de uma vaga, que é sempre o primeiro nível da carreira. */
export function offerSalary(offer: JobOffer): number {
  return careerLevel(offer.careerId, 0).salaryPerMonth
}

/** Índice da vaga de maior salário. No empate, fica a primeira. */
export function bestOffer(offers: readonly JobOffer[]): number {
  let best = 0
  offers.forEach((offer, index) => {
    if (offerSalary(offer) > offerSalary(offers[best])) best = index
  })
  return best
}

/** Abre no rascunho a escolha do primeiro emprego. O relógio para até o jogador escolher. */
export function openFirstJobChoice(draft: GameState, rng: Rng, member: Member): void {
  const offers = rollJobOffers(rng)
  draft.choices.push({
    type: 'firstJob',
    memberId: member.id,
    day: draft.clock.day,
    offers,
    suggested: bestOffer(offers),
  })
}

/** A sugestão de cada escolha aberta, pronta para confirmar de uma vez. */
export function suggestedPicks(state: GameState): ChoicePick[] {
  return state.choices.map((choice) => ({ memberId: choice.memberId, option: choice.suggested }))
}

/** Confere se cada resposta aponta para uma escolha aberta e para uma opção que existe. */
export function checkPicks(state: GameState, picks: readonly ChoicePick[]): { ok: true } | Refusal {
  if (picks.length === 0) return refuse('choiceNotFound')
  const answered = new Set<MemberId>()
  for (const pick of picks) {
    const choice = state.choices.find((open) => open.memberId === pick.memberId)
    if (!choice || answered.has(pick.memberId)) return refuse('choiceNotFound')
    if (!Number.isInteger(pick.option) || !choice.offers[pick.option]) {
      return refuse('optionNotFound')
    }
    answered.add(pick.memberId)
  }
  return { ok: true }
}

/** Aplica no rascunho respostas já conferidas e devolve os acontecimentos. */
export function applyPicks(draft: GameState, picks: readonly ChoicePick[]): GameEvent[] {
  const events: GameEvent[] = []
  for (const pick of picks) {
    const index = draft.choices.findIndex((open) => open.memberId === pick.memberId)
    const [choice] = draft.choices.splice(index, 1)
    const { careerId } = choice.offers[pick.option]
    draft.members[pick.memberId].career = { id: careerId, level: 0, xp: 0 }
    events.push({ type: 'firstJob', day: draft.clock.day, memberId: pick.memberId, careerId })
  }
  return events
}
