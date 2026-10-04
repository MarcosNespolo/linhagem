import { applyPathPick } from './college'
import { applyConcursoPick, startConcurso } from './concurso'
import { applySchoolPick } from './enrollment'
import { refuse, type Refusal } from './errors'
import type { Rng } from './rng'
import type { Choice, GameEvent, GameState, MemberId } from './types'

/** Resposta a uma escolha aberta: de quem é e o índice da opção escolhida. */
export type ChoicePick = { memberId: MemberId; option: number }

/** A sugestão de cada escolha aberta, pronta para confirmar de uma vez. */
export function suggestedPicks(state: GameState): ChoicePick[] {
  return state.choices.map((choice) => ({ memberId: choice.memberId, option: choice.suggested }))
}

/**
 * Quantas opções a escolha tem. Na do primeiro emprego, estudar para concurso
 * vem depois das vagas.
 */
export function optionCount(choice: Choice): number {
  if (choice.type === 'firstJob') return choice.offers.length + (choice.concurso ? 1 : 0)
  return choice.options.length
}

/** Se a opção dá para escolher: na matrícula e depois do médio, nem toda opção está aberta. */
function isAvailable(choice: Choice, option: number): boolean {
  if (choice.type === 'school' || choice.type === 'afterSchool') {
    return choice.options[option].available
  }
  return true
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
    const { option } = pick
    if (!Number.isInteger(option) || option < 0 || option >= optionCount(choice)) {
      return refuse('optionNotFound')
    }
    if (!isAvailable(choice, option)) return refuse('optionUnavailable')
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
  const day = draft.clock.day
  for (const pick of picks) {
    const index = draft.choices.findIndex((open) => open.memberId === pick.memberId)
    const [choice] = draft.choices.splice(index, 1)
    const member = draft.members[pick.memberId]
    switch (choice.type) {
      case 'school':
        events.push(applySchoolPick(draft, choice, pick.option))
        break
      case 'afterSchool':
        events.push(...applyPathPick(draft, rng, choice, pick.option))
        break
      case 'firstJob': {
        if (pick.option === choice.offers.length) {
          events.push(startConcurso(member, day))
          break
        }
        const { careerId, level } = choice.offers[pick.option]
        member.career = { id: careerId, level, levelSince: day }
        events.push({ type: 'firstJob', day, memberId: member.id, careerId, level })
        break
      }
      case 'concurso':
        events.push(...applyConcursoPick(draft, rng, choice, pick.option))
        break
    }
  }
  return events
}
