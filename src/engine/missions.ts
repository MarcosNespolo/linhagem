import { BALANCE } from '../content/balance'
import { MISSION_IDS, missionInfo, type MissionId } from '../content/missions'
import { addBoost } from './boost'
import { familyRates } from './economy'
import { ageOf, livingMembers } from './members'
import { totalProperties } from './properties'
import { createRng, hashString, type Rng } from './rng'
import type { GameEvent, GameState, MissionState } from './types'

/**
 * A meta se ajusta ao momento da família: cada missão só aparece quando dá
 * para cumprir. Formatura pede alguém na faculdade ou no técnico, e Investidor,
 * o primeiro imóvel.
 */
function isEligible(state: GameState, id: MissionId): boolean {
  const day = state.clock.day
  const living = livingMembers(state)
  switch (id) {
    case 'chaDeBebe': {
      const { minParentAge, maxParentAge } = BALANCE.children
      const fertile = (age: number) => age >= minParentAge && age <= maxParentAge
      return living.some((member) => {
        const partner = member.partnerId ? state.members[member.partnerId] : undefined
        return (
          partner?.deathDay === null && fertile(ageOf(member, day)) && fertile(ageOf(partner, day))
        )
      })
    }
    case 'casorio':
      return living.some(
        (member) =>
          member.partnerId === null &&
          member.origin !== 'married' &&
          ageOf(member, day) >= BALANCE.adultAge - 2,
      )
    case 'carteira':
      return living.some((member) => {
        const age = ageOf(member, day)
        return member.career === null && age >= 14 && age < BALANCE.retirementAge
      })
    case 'formatura':
      return living.some((member) => {
        const stage = member.education.school?.stage
        return stage === 'faculdade' || stage === 'tecnico'
      })
    case 'aprovado':
      return living.some((member) => {
        const age = ageOf(member, day)
        const school = member.education.school
        return (
          member.concurso !== null ||
          school?.stage === 'cursinho' ||
          (school !== null && age >= 13 && age < BALANCE.adultAge)
        )
      })
    case 'investidor':
      return totalProperties(state) > 0
    case 'casaCheia':
      return true
    case 'peDeMeia':
      return familyRates(state).net > 0
  }
}

/** Ordem embaralhada dos tipos, igual para a mesma família e a mesma data. */
function shuffled(rng: Rng): MissionId[] {
  const order = [...MISSION_IDS]
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/**
 * Sorteia as missões do dia. O sorteio usa a seed da família e a data, e não o
 * gerador do jogo, então o mesmo dia dá as mesmas missões em qualquer
 * aparelho com o mesmo save. Ficam as primeiras que dá para cumprir; faltando,
 * completa com as outras.
 */
export function drawMissions(state: GameState, date: string): MissionState[] {
  const order = shuffled(createRng(hashString(`${state.seed}:${date}:missoes`)))
  const eligible = order.filter((id) => isEligible(state, id))
  const others = order.filter((id) => !eligible.includes(id))
  return [...eligible, ...others]
    .slice(0, BALANCE.missions.perDay)
    .map((id) => startMission(state, id))
}

function startMission(state: GameState, id: MissionId): MissionState {
  const { goal } = missionInfo(id)
  switch (id) {
    case 'casaCheia':
      return { id, goal, progress: 0, base: livingMembers(state).length, claimed: false }
    case 'peDeMeia': {
      // Meses da renda líquida de hoje, em dinheiro.
      const target = Math.max(1, Math.round(goal * familyRates(state).net))
      return { id, goal: target, progress: 0, base: state.money, claimed: false }
    }
    default:
      return { id, goal, progress: 0, base: 0, claimed: false }
  }
}

/** Quantos acontecimentos contam para a missão. */
function countFor(id: MissionId, events: readonly GameEvent[]): number {
  let count = 0
  for (const event of events) {
    switch (id) {
      case 'chaDeBebe':
        if (event.type === 'born') count += 1
        break
      case 'casorio':
        if (event.type === 'married') count += 1
        break
      case 'carteira':
        if (event.type === 'firstJob') count += 1
        break
      case 'formatura':
        if (event.type === 'schoolFinished' && event.formation.level !== 'medio') count += 1
        break
      case 'aprovado':
        if (event.type === 'schoolStarted' && event.network === 'federal') count += 1
        if (event.type === 'concurso' && event.level !== null) count += 1
        break
      case 'investidor':
        if (event.type === 'propertyBought') count += 1
        break
    }
  }
  return count
}

/**
 * Conta o progresso das missões do dia com os acontecimentos e o estado atual.
 * Uma meta alcançada fica alcançada, mesmo que o dinheiro ou a família diminua
 * depois. Altera o rascunho.
 */
export function trackMissions(draft: GameState, events: readonly GameEvent[]): void {
  if (!draft.missions) return
  let living: number | null = null
  for (const mission of draft.missions.list) {
    if (mission.progress >= mission.goal) continue
    let progress = mission.progress
    if (mission.id === 'casaCheia') {
      living ??= livingMembers(draft).length
      progress = Math.max(progress, living - mission.base)
    } else if (mission.id === 'peDeMeia') {
      progress = Math.max(progress, draft.money - mission.base)
    } else {
      progress += countFor(mission.id, events)
    }
    mission.progress = Math.min(progress, mission.goal)
  }
}

/** A missão chegou à meta. */
export function isMissionDone(mission: MissionState): boolean {
  return mission.progress >= mission.goal
}

/** Missões cumpridas com a recompensa ainda por pegar. */
export function claimableMissions(state: GameState): MissionState[] {
  return state.missions?.list.filter((mission) => isMissionDone(mission) && !mission.claimed) ?? []
}

/** Valor de uma recompensa em meses de renda: a renda líquida de agora, vezes os meses. */
export function incomeReward(state: GameState, months: number): number {
  return months * Math.max(0, familyRates(state).net)
}

/** Dá a recompensa da missão e a marca como pega. Altera o rascunho. */
export function claimReward(draft: GameState, mission: MissionState): void {
  const { reward } = missionInfo(mission.id)
  mission.claimed = true
  if (reward.kind === 'boost') {
    addBoost(draft, reward.years)
    return
  }
  const amount = incomeReward(draft, reward.months)
  draft.money += amount
  draft.stats.totalEarned += amount
}
