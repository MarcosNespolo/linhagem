import { applyPathPick } from './college'
import { applySchoolPick } from './enrollment'
import { refuse, type Refusal } from './errors'
import type { Rng } from './rng'
import type { GameEvent, GameState, MemberId } from './types'

/** Resposta a uma escolha aberta: de quem é e o índice da opção escolhida. */
export type ChoicePick = { memberId: MemberId; option: number }

/** A sugestão de cada escolha aberta, pronta para confirmar de uma vez. */
export function suggestedPicks(state: GameState): ChoicePick[] {
  return state.choices.map((choice) => ({ memberId: choice.memberId, option: choice.suggested }))
}

/**
 * Confere se cada resposta aponta para uma escolha aberta e para uma opção que
 * existe e que dá para escolher.
 */
export function checkPicks(state: GameState, picks: readonly ChoicePick[]): { ok: true } | Refusal {
  if (picks.length === 0) return refuse('choiceNotFound')
  const answered = new Set<MemberId>()
  for (const pick of picks) {
    const choice = state.choices.find((open) => open.memberId === pick.memberId)
    if (!choice || answered.has(pick.memberId)) return refuse('choiceNotFound')
    const options = choice.type === 'firstJob' ? choice.offers : choice.options
    if (!Number.isInteger(pick.option) || !options[pick.option]) return refuse('optionNotFound')
    if (choice.type !== 'firstJob' && !choice.options[pick.option].available) {
      return refuse('optionUnavailable')
    }
    answered.add(pick.memberId)
  }
  return { ok: true }
}

/**
 * Aplica no rascunho respostas já conferidas e devolve os acontecimentos. Uma
 * resposta pode abrir outra escolha, como trabalhar abre a do primeiro emprego.
 */
export function applyPicks(draft: GameState, rng: Rng, picks: readonly ChoicePick[]): GameEvent[] {
  const events: GameEvent[] = []
  for (const pick of picks) {
    const index = draft.choices.findIndex((open) => open.memberId === pick.memberId)
    const [choice] = draft.choices.splice(index, 1)
    switch (choice.type) {
      case 'school':
        events.push(applySchoolPick(draft, choice, pick.option))
        break
      case 'afterSchool':
        events.push(...applyPathPick(draft, rng, choice, pick.option))
        break
      case 'firstJob': {
        const { careerId } = choice.offers[pick.option]
        draft.members[pick.memberId].career = { id: careerId, level: 0, xp: 0 }
        events.push({ type: 'firstJob', day: draft.clock.day, memberId: pick.memberId, careerId })
        break
      }
    }
  }
  return events
}
